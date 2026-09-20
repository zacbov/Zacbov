using UnityEngine;
using UnityEngine.XR.Interaction.Toolkit;
using UnityEngine.Events;

/// <summary>
/// Classe de base pour tout objet-indice manipulable dans le Palais mental (VR).
/// Chaque indice concret (tiroir, livre, cendres, botte) hérite de cette classe
/// et implémente sa propre condition de révélation dans CheckRevealCondition().
/// </summary>
[RequireComponent(typeof(XRGrabInteractable))]
public abstract class ClueObject : MonoBehaviour
{
    [Header("Identité de l'indice")]
    public string clueId; // ex: "indice_1_bureau"
    public bool isRedHerring = false; // défini au lancement par CaseManager (génération aléatoire)

    [Header("Événements")]
    public UnityEvent OnRevealed;
    public UnityEvent OnRejected; // fausse piste confirmée comme fausse

    protected bool isRevealed = false;
    protected XRGrabInteractable grabInteractable;

    protected virtual void Awake()
    {
        grabInteractable = GetComponent<XRGrabInteractable>();
    }

    protected virtual void Update()
    {
        if (isRevealed) return;

        if (CheckRevealCondition())
        {
            Reveal();
        }
    }

    /// <summary>
    /// Condition spécifique à chaque type d'indice (retournement, assemblage,
    /// fouille haptique, superposition). À implémenter dans les sous-classes.
    /// </summary>
    protected abstract bool CheckRevealCondition();

    protected virtual void Reveal()
    {
        isRevealed = true;

        if (isRedHerring)
        {
            OnRejected?.Invoke();
        }
        else
        {
            OnRevealed?.Invoke();
        }

        // Notifie le CaseManager pour la synchro réseau avec le joueur AR
        CaseManager.Instance?.NotifyClueRevealed(clueId, isRedHerring);
    }

    public bool IsRevealed => isRevealed;
}
