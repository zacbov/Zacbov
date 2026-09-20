# Outil Pharma — Site statique

Aucun backend. Un seul fichier HTML/JS qui appelle les API directement
depuis le navigateur, + les tables locales réutilisées du projet
pharmatlas pour l'autocomplétion, la résolution de substance et la
classification ATC.

## Utilisation

1. Copie ces éléments depuis ton dossier `pharmatlas/data/` vers
   `pharma_static/data/` (mêmes noms, rien à renommer) :

   ```
   pharma_static/
   ├── index.html
   ├── README.md
   ├── build_bdpm_index.py   (optionnel, voir plus bas)
   └── data/
       ├── medicaments_light.json
       ├── cis_to_group.json
       ├── medicaments_groups/          (depuis pharmatlas)
       ├── atc_index.json               (généré ici, fourni avec cette livraison)
       └── symptomes_atc.json           (généré ici, fourni avec cette livraison)
   ```

   `atc_index.json` et `symptomes_atc.json` sont fournis directement
   (construits à partir de `medicaments_groups/`, pas la peine de les
   régénérer sauf si tu modifies la table des symptômes ou mets à jour
   `medicaments_groups/`).

2. Héberge le dossier tel quel (GitHub Pages, Netlify, ou juste
   `python -m http.server` en local). Aucune configuration serveur requise.

## Cinquième tour (19/09/2026) — audit complet des API pharmatlas + module symptômes

Audit de tous les domaines appelés en `fetch()` dans le code de
pharmatlas (~2900 lignes grep'ées), pour identifier ce qui est
réellement confirmé CORS-safe en production plutôt que supposé :

| API | CORS confirmé (fetch direct, sans le proxy optionnel `_paProxied` de pharmatlas) |
|---|---|
| RxClass (rxnav.nlm.nih.gov/REST/rxclass) | ✅ — ajouté ici en repli ATC |
| DailyMed (dailymed.nlm.nih.gov) | ✅ — ajouté ici, notice structurée US |
| Crossref (api.crossref.org) | ✅ (confirmé pour `/works/{doi}`, `/works?query=` non re-testé individuellement mais même domaine) — ajouté ici en repli littérature |
| GBIF, iNaturalist, PubChem, ClinicalTrials.gov v2, MyGene.info | ✅ — GBIF/iNaturalist hors périmètre (botanique), les autres déjà intégrés |
| **Europe PMC** | Code présent dans pharmatlas mais **jamais réellement validé** — même endpoint que celui confirmé bloqué chez toi en test réel. Pas une régression de notre côté : c'est déjà cassé dans pharmatlas aussi. |
| AlphaFold, RCSB PDB, NIH 3D, imagerie DICOM cancer | ✅ mais hors périmètre (structures protéiques/imagerie, pertinent seulement pour les biomédicaments) |
| UniProt, OPM, EDQM | Liens seulement, jamais interrogés en `fetch()` — non exploitables tels quels |

pharmatlas a aussi un mécanisme de proxy CORS **optionnel**
(`_paProxied`, désactivé par défaut, activable via `localStorage`) — à
garder en tête si une des API ci-dessus cesse un jour d'accepter le
direct.

**Nouveaux modules ajoutés** :
- **RxClass en repli ATC** : utilisé uniquement si pharmatlas n'a pas
  déjà le code ATC (cas d'une DCI internationale tapée directement).
- **DailyMed** : notice structurée US (indications/posologie/contre-
  indications), port simplifié de la logique pharmatlas (parsing XML
  SPL). Complète ou remplace openFDA selon les cas.
- **Crossref en repli littérature** : tenté automatiquement quand
  Europe PMC échoue (donc systématiquement, vu le point ci-dessus),
  avant d'afficher le lien manuel de dernier recours.
- **Recherche par symptôme** (nouvel onglet) : table de correspondance
  symptôme → préfixe(s) ATC (`data/symptomes_atc.json`, classification
  OMS stable, ~27 entrées couvrant douleur/fièvre, digestif, respiratoire,
  psy, cardio-métabolique, dermato...), croisée avec un index ATC inversé
  construit à partir de `medicaments_groups/` (`data/atc_index.json`,
  1021 codes ATC distincts, généré et testé ici avec les vraies données).
  Clic sur une substance → relance la fiche complète (chimie, notices,
  littérature, essais) sur cette substance directement.

  **Limite honnête, testée sur les vraies données** : la couverture est
  bonne pour les pathologies chroniques (diabète : 31 substances,
  antibiotiques : 84, hypertension : 46) mais **faible pour les
  symptômes OTC courants** — "Toux sèche" retourne 0 résultat, "Rhume"
  seulement 1 (`MUPIROCINE`, un antibiotique, pas un décongestionnant).
  `medicaments_groups/` semble orienté hospitalier/spécialiste plutôt
  que pharmacie de ville — à garder en tête, ce n'est pas un bug du
  module mais une limite de la donnée source. Ce n'est de toute façon
  pas un outil de diagnostic — le disclaimer est affiché dans l'onglet.

## Quatrième tour (19/09/2026) — intégration des tables pharmatlas

Au lieu de télécharger/parser la BDPM soi-même, le site réutilise
directement trois éléments du dossier `pharmatlas/data/` :

| Fichier | Rôle |
|---|---|
| `medicaments_light.json` | 12 054 spécialités (CIS, nom, composition, forme, voie) — autocomplétion |
| `cis_to_group.json` | CIS → identifiant de groupe/substance (slug) |
| `medicaments_groups/<slug>.json` | Détail par substance : nom propre + code(s) ATC, chargé à la demande |

**Testé avec les vraies données** :
- `DOLIPRANE 1000 mg, comprimé` → substance `PARACÉTAMOL`, ATC `N02BE51` ✅
- `ABACAVIR SANDOZ 300 mg, comprimé pelliculé sécable` → `ABACAVIR`, ATC `J05AF06` ✅
- Combinaisons (ex. `ABACAVIR/LAMIVUDINE ...`) : seule la première
  substance du nom de groupe est retenue pour les requêtes chimie
  (limite connue, acceptable à ce stade).
- 151 noms de spécialités apparaissent en double dans la table (CIS
  différents, même libellé). Sans impact : même substance des deux côtés.

`build_bdpm_index.py` reste utilisable en repli si tu préfères une
donnée BDPM téléchargée à la volée plutôt que la table figée de
pharmatlas (au prix de la perte du code ATC pharmatlas — RxClass prend
le relais automatiquement dans ce cas).

## Troisième tour (19/09/2026) — changement de stratégie sur CORS

Les deux proxys de repli testés se sont révélés morts en conditions
réelles : `corsproxy.io` exige désormais une clé (401), `allorigins.win`
renvoyait des erreurs serveur (520/522). Plutôt que de continuer à
empiler des proxys publics non garantis, **le code affiche un lien
direct vers la source** (Europe PMC, page ANSM) quand l'appel échoue,
au lieu de rester silencieux ou de dépendre d'un service tiers fragile.
`rss2json.com` reste tenté une fois pour le flux ANSM (service dédié
RSS, pas un proxy générique — à voir s'il tient dans la durée).

Deux autres bugs corrigés à ce tour :
- **Noms accentués** : PubChem/openFDA/ClinicalTrials/Europe PMC ne
  reconnaissent pas `PARACÉTAMOL` (accent) — `stripAccents()` est
  appliqué avant ces requêtes.
- **Nomenclature US pour openFDA** : `paracétamol` reste un 400 sur
  openFDA même sans accent, car openFDA utilise parfois `acetaminophen`
  (nom US). Le code interroge RxNorm en amont pour tenter une traduction
  DCI française → nom US avant d'appeler openFDA, avec repli silencieux
  sur le nom sans accent si RxNorm échoue ou ne connaît pas la substance.

## Deuxième tour (19/09/2026)

- **URL BDPM corrigée** : le site a changé de structure, l'ancienne URL
  `/telechargement/file/...` renvoyait 404. La bonne URL est
  `/download/file/CIS_bdpm.txt` (pertinent seulement si tu utilises
  `build_bdpm_index.py` en repli — voir plus haut).
- **PubChem/openFDA en 404/400** : ces API attendent un nom de substance
  active, pas un nom commercial complet avec dosage/forme — d'où la
  résolution de substance ajoutée au tour suivant.
- **Europe PMC confirmé sans CORS**, comme l'ANSM. Bonne nouvelle en
  revanche : **PubChem, openFDA et ClinicalTrials.gov acceptent bien les
  requêtes cross-origin** (ils répondent avec de vrais codes HTTP, pas
  un blocage CORS) — pas besoin de proxy pour ceux-là.

## Limites connues de l'approche "tout client"

- **Rate limiting** : sans backend pour mutualiser/cacher les requêtes,
  chaque visiteur consomme son propre quota sur chaque API. openFDA
  autorise ~40 req/min sans clé — largement suffisant pour un usage perso,
  à surveiller si le site prend du trafic.
- **Clé API** : openFDA accepte une clé gratuite en paramètre d'URL pour
  augmenter la limite — visible dans le code source côté client (pas de
  secret côté navigateur possible sans backend). À voir si openFDA sans
  clé suffit avant de se poser la question.
- **ANSM/Europe PMC** : dépendance à `rss2json.com` pour le premier,
  liens de repli manuels pour le second — le point le plus fragile de
  l'approche "tout client". Une petite fonction serverless gratuite
  (Cloudflare Worker) réglerait ça si ça devient gênant.

## Ce qui manque pour une V1 complète

- Le module "recherche par symptôme" (table de correspondance à
  construire à part — le code ATC récupéré via pharmatlas pourrait
  servir de point de départ pour une classification par système)
- Gestion plus fine des erreurs par source (actuellement : silencieux
  avec message "source indisponible" ou lien de repli)
- Scanner code-barres (pharmatlas a déjà `cis_cip.json` — CIP13 → CIS —
  et une lib zxing en vendor : réutilisable pour scanner une boîte à la
  caméra, non intégré ici pour l'instant)
