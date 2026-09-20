using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Singleton central de la partie. Génère le seed aléatoire au lancement,
/// détermine le coupable et les fausses pistes parmi les pools définis,
/// et fait le pont avec le NetworkClient pour synchroniser Watson (AR).
/// </summary>
public class CaseManager : MonoBehaviour
{
    public static CaseManager Instance { get; private set; }

    [Header("Pools de génération (à remplir dans l'inspecteur)")]
    public List<string> suspectPool = new List<string> { "Colonel Moran", "Mrs. Hudson", "Collectionneur rival", "Inspecteur Lestrade" };
    public List<string> inscriptionVariants = new List<string> {
        "Pour Moriarty seul — 14",
        "Rendez-vous au 14, comme convenu",
        "M. — minuit"
    };

    [Header("État de la partie (généré au runtime)")]
    public int seed;
    public string culprit;
    public List<string> redHerrings = new List<string>();

    [Header("Références scène (à assigner dans l'inspecteur)")]
    public AccusationUI accusationUI;

    private Dictionary<string, bool> clueRevealedState = new Dictionary<string, bool>();
    private Dictionary<string, string> clueInscriptions = new Dictionary<string, string>();

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;
    }

    private void Start()
    {
        // Le seed est désormais reçu du serveur relais via NetworkClient
        // (voir NetworkClient.HandleIncomingEvent → "session_seed"),
        // afin que Watson (AR) et Holmes (VR) génèrent exactement le même
        // scénario. Un seed local n'est utilisé qu'en secours si le relais
        // n'est pas joignable après un court délai (voir NetworkClient).
    }

    public void GenerateCase(int caseSeed)
    {
        seed = caseSeed;
        var rng = new System.Random(seed);

        // Niveau structurel : coupable + 2 fausses pistes parmi le pool restant
        var pool = new List<string>(suspectPool);
        culprit = pool[rng.Next(pool.Count)];
        pool.Remove(culprit);

        redHerrings.Clear();
        int herringCount = Mathf.Min(2, pool.Count);
        for (int i = 0; i < herringCount; i++)
        {
            int idx = rng.Next(pool.Count);
            redHerrings.Add(pool[idx]);
            pool.RemoveAt(idx);
        }

        // Niveau cosmétique : inscriptions assignées par indice
        clueInscriptions.Clear();
        clueInscriptions["indice_1_bureau"] = inscriptionVariants[rng.Next(inscriptionVariants.Count)];

        Debug.Log($"[CaseManager] Partie générée — seed={seed}, coupable={culprit}, fausses pistes={string.Join(", ", redHerrings)}");
    }

    public string GetClueInscription(string clueId)
    {
        return clueInscriptions.TryGetValue(clueId, out var text) ? text : "???";
    }

    public void NotifyClueRevealed(string clueId, bool isRedHerring)
    {
        clueRevealedState[clueId] = true;

        NetworkClient.Instance?.SendEvent(new GameEvent
        {
            type = "clue_revealed_vr",
            clueId = clueId,
            isRedHerring = isRedHerring
        });

        CheckWinCondition();
    }

    private void CheckWinCondition()
    {
        // Condition de résolution : les 4 indices doivent être révélés
        // ET recoupés (logique de recoupement à affiner selon le scénario final)
        string[] requiredClues = { "indice_1_bureau", "indice_2_bibliotheque", "indice_3_cheminee", "indice_4_fenetre" };
        foreach (var id in requiredClues)
        {
            if (!clueRevealedState.ContainsKey(id) || !clueRevealedState[id])
                return;
        }

        Debug.Log("[CaseManager] Tous les indices révélés — accusation possible.");
        accusationUI?.MarkAllCluesReady();
        NetworkClient.Instance?.SendEvent(new GameEvent { type = "all_clues_ready" });
    }
}
