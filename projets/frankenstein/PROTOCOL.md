# Protocole host ↔ pad — Frankenstein's Lab

Le Worker relaie tel quel (aucune règle côté réseau). Tous les messages sont du JSON.
`id` = identifiant numérique du pad, ajouté automatiquement par le Room DO sur tout
message pad→host. Pour host→pad, `to: <id>` cible une manette, l'absence de `to` diffuse
à toutes les manettes.

## Pad → Host (existant, inchangé)

| t        | champs                          | usage |
|----------|----------------------------------|-------|
| `join`   | `nom, photo, jeton`               | connexion / reconnexion d'un joueur |
| `in`     | `x, z, a, b`                      | état stick + boutons, ~25 Hz |

## Host → Pad (existant, inchangé)

| t         | champs            | usage |
|-----------|-------------------|-------|
| `assigne` | `place, couleur`  | attribution du numéro de joueur + couleur thème |
| `hud`     | `porte`           | libellé de ce que le joueur porte en main |
| `action`  | `txt`             | libellé contextuel du bouton A selon la station proche |
| `buzz`    | `fort` (bool)      | vibration (retour haptique) |

Rien à changer ici : `porte` et `txt` sont déjà des chaînes libres décidées par l'host,
donc les libellés du labo ("Découper", "Tremper", "Assembler"...) passent sans
modifier le protocole existant.

## Nouveaux messages Host → Pad (spécifiques Frankenstein's Lab)

| t              | champs                              | usage |
|----------------|--------------------------------------|-------|
| `role_couleur` | `couleur, icone`                     | look du joueur (déjà couvert par `assigne`, `icone` en plus : 'bras'/'cerveau'/etc. si on veut varier le curseur) |
| `alerte`       | `type, texte`                        | événement ponctuel affiché en overlay pad (ex: "Torche ! Cours à l'extincteur") — réutilise `buzz` pour le vibreur en plus |
| `monstre_etat` | `phase` ('calme'\|'eveille'\|'apaise') | change l'ambiance visuelle de la manette (bordure rouge pulsante si le monstre est réveillé et proche du joueur) |

Note de design : on reste minimaliste. `alerte` et `monstre_etat` sont les deux SEULS
ajouts au protocole existant. Tout le reste (quel objet je porte, quelle action est
possible) passe déjà par `hud`/`action`/`buzz`, qui sont génériques par construction.
Ça confirme que le choix initial d'un protocole abstrait (PharmaCook) tenait la route
pour un reskin complet de thème sans toucher au Worker.

## Recette monstre (gérée 100% côté host, jamais envoyée aux pads en détail)

Structure interne (pour référence lors du dev de l'écran) :
```js
{
  nom: "Monstre Agile",
  slots: [
    { type: 'bras', variante: 'mince', qte: 2 },
    { type: 'coeur', variante: 'loup', qte: 1 },
    { type: 'cerveau', variante: 'criminel', qte: 1 },
    { type: 'tete', variante: null, qte: 1 }, // variante null = n'importe laquelle
    { type: 'jambe', variante: null, qte: 2 },
  ]
}
```
Les pads n'ont pas besoin de connaître la recette : le joueur voit tout sur l'écran
partagé (comme dans Overcooked). Le pad ne reçoit que "ce que je porte" et "ce que je
peux faire ici", ce qui garde le protocole léger et le rend réutilisable pour
d'autres jeux futurs.
