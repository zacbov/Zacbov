using UnityEngine;

/// <summary>
/// Indice 2 — Bibliothèque saccagée.
/// Mécanique : le joueur doit localiser deux fragments distincts (signet
/// + page arrachée) dans le Palais mental et les rapprocher pour les
/// fusionner. Chaque fragment est un objet séparé ; celui-ci représente
/// le fragment "maître" qui détecte la proximité de l'autre.
/// </summary>
public class BookAssemblyClue : ClueObject
{
    [Header("Fragments à assembler")]
    public Transform fragmentA; // ex: le signet, tenu par une main
    public Transform fragmentB; // ex: la page arrachée, tenue par l'autre main

    [Header("Config assemblage")]
    public float mergeDistance = 0.08f; // distance (m) sous laquelle la fusion se déclenche
    public float mergeAngle = 20f;      // tolérance d'orientation entre les deux fragments

    [Header("Objets visuels")]
    public GameObject mergedBookVisual; // le livre reconstitué, affiché après fusion
    public TMPro.TextMeshPro marginNoteText;

    private bool fragmentsMerged = false;

    protected override void Awake()
    {
        base.Awake();
        if (mergedBookVisual != null) mergedBookVisual.SetActive(false);
    }

    protected override bool CheckRevealCondition()
    {
        if (fragmentsMerged) return false; // déjà traité
        if (fragmentA == null || fragmentB == null) return false;

        float distance = Vector3.Distance(fragmentA.position, fragmentB.position);
        float angle = Quaternion.Angle(fragmentA.rotation, fragmentB.rotation);

        return distance <= mergeDistance && angle <= mergeAngle;
    }

    protected override void Reveal()
    {
        fragmentsMerged = true;

        // Les deux fragments disparaissent, remplacés par le livre reconstitué
        fragmentA.gameObject.SetActive(false);
        fragmentB.gameObject.SetActive(false);

        if (mergedBookVisual != null)
        {
            mergedBookVisual.transform.position = (fragmentA.position + fragmentB.position) / 2f;
            mergedBookVisual.SetActive(true);
        }

        if (marginNoteText != null)
        {
            marginNoteText.text = CaseManager.Instance.GetClueInscription(clueId);
        }

        base.Reveal();
    }
}
