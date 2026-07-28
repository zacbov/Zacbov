# Boîtier e-ink — Affichage de planning de salle

Remplacement des feuilles de planning papier affichées sur les portes de salle par un boîtier e-ink autonome, synchronisé en WiFi avec le système de planification ADE de la faculté.

## Le problème

Chaque jour, un agent imprime et scotche une feuille A4 sur la porte de chaque salle pour indiquer les créneaux réservés. Ce projet remplace la feuille par un écran e-paper qui se met à jour tout seul, sans intervention quotidienne.

## Principe de fonctionnement

- Un **ESP32** se réveille 2 fois par jour (6h00 et 12h30), se connecte au WiFi de l'université en **WPA2-Enterprise**, télécharge le flux **iCal** de la salle depuis ADE, et affiche le planning du jour sur un écran **e-ink 7,5" (800×480)**.
- Entre les créneaux, l'ESP32 se réveille brièvement **sans WiFi** pour déplacer l'encadré "EN COURS" — coût énergétique quasi nul.
- L'écran e-ink ne consomme rien pour *afficher* : il ne consomme que pendant le rafraîchissement (quelques secondes, 2 à 5 fois par jour).
- Tout le système est **autonome, sans serveur intermédiaire** : chaque boîtier parle directement à ADE.

## Autonomie

Avec une cellule **18650 remplaçable** (3400–3500 mAh) et le régime de synchro décrit ci-dessus :
- Réveils WiFi (2/jour) : ~300 mAh/an
- Deep sleep (ESP32 ~10 µA) : ~130 mAh/an
- **Autonomie estimée : plusieurs années**, l'autodécharge de la cellule devenant le facteur limitant avant la consommation réelle.

La batterie est logée dans un support à clips accessible par une trappe : le remplacement (ou la recharge sur un chargeur externe) prend quelques secondes, lors d'une tournée annuelle.

## Matériel

| Composant | Rôle |
|---|---|
| FireBeetle 2 ESP32-E | Microcontrôleur, deep sleep très bas (~10 µA) |
| Waveshare 7,5" e-Paper V2 (800×480 N&B) | Affichage, lisible depuis le couloir |
| Cellule 18650 protégée + support à clips | Alimentation, remplaçable sans outil |
| MOSFET canal P | Coupure totale de l'alimentation de l'écran pendant le sommeil |
| Boîtier imprimé en 3D | Plaque murale fixe + corps amovible (accès batterie protégé) |

Voir [`LISTE_DE_COURSES.md`](./LISTE_DE_COURSES.md) pour le détail et les références.

## Configuration sur site (WPA2-Enterprise)

Le ticket WiFi de la fac étant unique et renouvelé chaque année, chaque boîtier embarque un **portail de configuration local** :

1. Maintenir le bouton au démarrage → le boîtier ouvre un point d'accès WiFi (`PLANNING-<id_salle>`)
2. Se connecter depuis un téléphone, ouvrir `192.168.4.1`
3. Renseigner SSID / identifiant / ticket / salle ADE
4. Le bouton "Enregistrer et tester" valide **immédiatement** la connexion et le fetch ADE, avant de refermer le portail

Un seul firmware sert donc tous les boîtiers ; seule la configuration change à la pose (et lors du renouvellement annuel du ticket).

## Structure du dépôt

```
firmware/
├── planning_eink.ino   — point d'entrée, machine à états du réveil
├── config.h            — broches, horaires de synchro, constantes ADE
├── net.cpp / net.h      — connexion WPA2-Enterprise, synchro NTP
├── ical.cpp / ical.h    — parseur iCal en streaming (RFC 5545), filtre jour+lendemain
├── cache.cpp / cache.h  — persistance du planning en NVS (survit au deep sleep)
├── render.cpp / render.h— mise en page e-ink (GxEPD2)
└── portal.cpp / portal.h— portail web de configuration WiFi

test/
└── test_ade_wifi.ino   — sketch de validation isolé (WiFi + fetch, sortie série)

LISTE_DE_COURSES.md
```

## Où en est le projet

- [x] Architecture logicielle et énergétique définie
- [x] Firmware complet écrit (réveil, cache, rendu, portail de config)
- [ ] **Validation sur site** : connexion WPA2-Enterprise + comportement réel du flux ADE face à un client non-navigateur (bloquant avant tout achat en série)
- [ ] Mesure de consommation réelle en deep sleep (multimètre)
- [ ] Modèle 3D du boîtier (dépend des cotes exactes de l'écran reçu)

## Points techniques notables

- **Parsing iCal en streaming** : le flux est lu ligne par ligne sans jamais être chargé entier en RAM, avec gestion des lignes repliées (RFC 5545) et conversion UTC → Europe/Paris (DST géré via la TZ POSIX `CET-1CEST,M3.5.0,M10.5.0/3`).
- **Reprise après coupure batterie** : si la RTC interne n'est plus fiable (pile changée), une resynchronisation complète est forcée au prochain réveil, quelle que soit l'heure.
- **Mode dégradé** : en cas d'échec réseau ou serveur ADE indisponible, le dernier planning connu reste affiché avec un horodatage de dernière synchro, plutôt qu'un écran d'erreur.
