using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;

/// <summary>
/// Indice 3 — Cendres de la cheminée.
/// Mécanique : le joueur plonge la main dans le tas de cendres et la
/// déplace lentement ; la manette vibre plus fort à mesure qu'elle
/// s'approche du fragment caché. Une pression du trigger au point de
/// vibration maximale déclenche l'extraction.
/// </summary>
public class AshSearchClue : ClueObject
{
    [Header("Config fouille")]
    public Transform hiddenFragmentPoint; // position cachée du fragment dans le tas de cendres
    public float searchRadius = 0.25f;    // rayon (m) au-delà duquel il n'y a plus de retour haptique
    public float extractionThreshold = 0.03f; // distance sous laquelle l'extraction devient possible

    [Header("Références runtime")]
    public XRBaseController activeController; // assigné dynamiquement via OnSelectEntered sur le collider "tas de cendres"

    [Header("Objets visuels")]
    public GameObject fragmentVisual; // le bouton de manteau, révélé à l'extraction

    private bool withinExtractionRange = false;

    protected override void Update()
    {
        base.Update();

        if (isRevealed || activeController == null || hiddenFragmentPoint == null) return;

        float distance = Vector3.Distance(activeController.transform.position, hiddenFragmentPoint.position);
        withinExtractionRange = distance <= extractionThreshold;

        // Intensité haptique inversement proportionnelle à la distance (0 = loin, 1 = très proche)
        float intensity = Mathf.Clamp01(1f - (distance / searchRadius));
        if (intensity > 0f)
        {
            activeController.SendHapticImpulse(intensity, 0.1f);
        }
    }

    protected override bool CheckRevealCondition()
    {
        // La révélation nécessite d'être dans la zone d'extraction ET
        // que le joueur presse le trigger (détecté via l'événement XR ci-dessous)
        return withinExtractionRange && triggerPressedThisFrame;
    }

    private bool triggerPressedThisFrame = false;

    /// <summary>
    /// À appeler depuis un événement d'input XR (ex: OnActivate de l'interactor)
    /// pendant que la main est dans le tas de cendres.
    /// </summary>
    public void OnExtractionAttempt()
    {
        triggerPressedThisFrame = true;
    }

    private void LateUpdate()
    {
        // Réinitialise le flag après chaque frame pour n'accepter qu'une pression ponctuelle
        triggerPressedThisFrame = false;
    }

    protected override void Reveal()
    {
        if (fragmentVisual != null)
        {
            fragmentVisual.transform.position = hiddenFragmentPoint.position;
            fragmentVisual.SetActive(true);
        }

        if (activeController != null)
        {
            activeController.SendHapticImpulse(1f, 0.2f); // confirmation forte à l'extraction
        }

        base.Reveal();
    }

    /// <summary>
    /// À appeler quand la main du joueur entre en contact avec le collider
    /// du tas de cendres (ex: via un XRSimpleInteractable englobant).
    /// </summary>
    public void OnHandEnterAshes(XRBaseController controller)
    {
        activeController = controller;
    }

    public void OnHandExitAshes()
    {
        activeController = null;
    }
}
