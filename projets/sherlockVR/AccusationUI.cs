using UnityEngine;
using UnityEngine.Events;
using System.Collections.Generic;

/// <summary>
/// Écran d'accusation final. À afficher une fois que CaseManager a signalé
/// "all_clues_ready". Chaque bouton d'accusation (un par suspect) appelle
/// Accuse(string suspectName). Pense à désactiver ce composant/canvas tant
/// que tous les indices ne sont pas révélés, pour empêcher une accusation
/// prématurée (cf. condition de résolution validée dans le fichier de suivi).
/// </summary>
public class AccusationUI : MonoBehaviour
{
    [Header("État")]
    public bool allCluesReady = false;
    public bool caseResolved = false;

    [Header("Événements")]
    public UnityEvent OnCorrectAccusation;
    public UnityEvent OnWrongAccusation;
    public UnityEvent<string> OnPrematureAccusationAttempt; // déclenché si on accuse trop tôt

    [Header("Suivi des indices déjà révélés (facultatif, pour affichage)")]
    public List<string> revealedNonHerringClues = new List<string>();

    private void OnEnable()
    {
        // S'abonne à l'état global exposé par CaseManager pour savoir
        // quand l'accusation devient possible.
        if (CaseManager.Instance != null)
        {
            allCluesReady = false;
        }
    }

    /// <summary>
    /// À appeler par NetworkClient ou CaseManager quand l'événement
    /// "all_clues_ready" est reçu/déclenché.
    /// </summary>
    public void MarkAllCluesReady()
    {
        allCluesReady = true;
    }

    /// <summary>
    /// Appelé par un bouton d'accusation dans le Palais mental (un par suspect).
    /// </summary>
    public void Accuse(string suspectName)
    {
        if (caseResolved) return;

        if (!allCluesReady)
        {
            Debug.LogWarning($"[AccusationUI] Accusation prématurée contre {suspectName} — tous les indices ne sont pas encore révélés.");
            OnPrematureAccusationAttempt?.Invoke(suspectName);
            return;
        }

        caseResolved = true;

        bool isCorrect = CaseManager.Instance != null && suspectName == CaseManager.Instance.culprit;

        if (isCorrect)
        {
            Debug.Log($"[AccusationUI] Accusation correcte : {suspectName} est bien le coupable.");
            OnCorrectAccusation?.Invoke();
        }
        else
        {
            Debug.Log($"[AccusationUI] Accusation erronée : {suspectName} n'est pas le coupable (c'était {CaseManager.Instance?.culprit}).");
            OnWrongAccusation?.Invoke();
        }
    }
}
