using UnityEngine;

/// <summary>
/// Indice 4 — Botte suspecte vs gabarit d'empreinte.
/// Mécanique : le joueur approche la semelle de la botte du gabarit
/// translucide représentant l'empreinte trouvée en AR. Si la distance
/// et l'orientation sont proches d'un seuil, un effet d'aimantation
/// aide à l'alignement final.
/// </summary>
public class BootCompareClue : ClueObject
{
    [Header("Config comparaison")]
    public Transform solePoint;       // point de référence sous la botte
    public Transform templateTarget;  // le gabarit translucide flottant
    public float snapDistance = 0.05f; // distance (m) sous laquelle l'aimantation s'active
    public float snapAngle = 15f;      // tolérance d'angle (degrés)

    [Header("Résultat")]
    public bool isCorrectMatch; // défini par CaseManager selon le seed (une seule botte "match" par partie)

    [Header("Feedback visuel")]
    public Renderer templateRenderer;
    public Color matchColor = Color.green;
    public Color rejectColor = Color.red;

    private bool aligned = false;

    protected override bool CheckRevealCondition()
    {
        if (solePoint == null || templateTarget == null) return false;

        float distance = Vector3.Distance(solePoint.position, templateTarget.position);
        float angle = Quaternion.Angle(solePoint.rotation, templateTarget.rotation);

        aligned = distance <= snapDistance && angle <= snapAngle;
        return aligned;
    }

    protected override void Reveal()
    {
        // Aimantation finale : on aligne parfaitement l'objet au gabarit
        transform.position = templateTarget.position;
        transform.rotation = templateTarget.rotation;

        if (templateRenderer != null)
        {
            templateRenderer.material.color = isCorrectMatch ? matchColor : rejectColor;
        }

        base.Reveal();
    }
}
