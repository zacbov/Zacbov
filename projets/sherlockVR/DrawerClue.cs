using UnityEngine;

/// <summary>
/// Indice 1 — Tiroir du bureau.
/// Mécanique : le joueur doit retourner le tiroir à ~180° puis appuyer
/// sur le fond (déclenché par un second XRSimpleInteractable enfant)
/// pour révéler le double-fond.
/// </summary>
public class DrawerClue : ClueObject
{
    [Header("Config retournement")]
    [Tooltip("Angle minimal (en degrés) par rapport à l'orientation initiale pour valider le retournement")]
    public float requiredFlipAngle = 150f;

    [Header("Config pression")]
    public bool bottomPressed = false; // mis à true par un événement XR sur le collider "fond du tiroir"

    [Header("Objets visuels")]
    public GameObject doubleFondPanel; // panneau qui glisse pour révéler l'inscription
    public TMPro.TextMeshPro inscriptionText;

    private Quaternion initialRotation;
    private bool hasBeenFlipped = false;

    protected override void Awake()
    {
        base.Awake();
        initialRotation = transform.rotation;
        if (doubleFondPanel != null) doubleFondPanel.SetActive(false);
    }

    protected override void Update()
    {
        base.Update();

        if (!hasBeenFlipped)
        {
            float angle = Quaternion.Angle(initialRotation, transform.rotation);
            if (angle >= requiredFlipAngle)
            {
                hasBeenFlipped = true;
            }
        }
    }

    protected override bool CheckRevealCondition()
    {
        return hasBeenFlipped && bottomPressed;
    }

    protected override void Reveal()
    {
        base.Reveal();

        if (doubleFondPanel != null)
        {
            doubleFondPanel.SetActive(true);
        }

        if (inscriptionText != null)
        {
            // Le texte exact est fourni par CaseManager (varie selon le seed de la partie)
            inscriptionText.text = CaseManager.Instance.GetClueInscription(clueId);
        }
    }

    /// <summary>
    /// À appeler depuis un XRSimpleInteractable placé sur le fond du tiroir
    /// (event OnSelectEntered → this.OnBottomPressed).
    /// </summary>
    public void OnBottomPressed()
    {
        bottomPressed = true;
    }
}
