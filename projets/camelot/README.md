# Camelot : La Première Pierre

Citybuilder arthurien en Three.js, avec des événements à choix tirés du cycle en prose du XIIIe siècle.

## Jouer
Double-clic sur `lancer.bat` (Windows) ou `./lancer.sh` (Mac/Linux), ou `python3 serveur.py`.
Le navigateur s'ouvre sur http://localhost:8000. Python 3 suffit. Au premier lancement, three.js est
téléchargé dans `jeu/vendor/` (connexion requise une fois), puis le jeu fonctionne hors ligne.

## Architecture
| Dossier | Rôle |
| --- | --- |
| `jeu/` | Racine du mini serveur : `index.html`, `styles/`, `fonts/`, `assets/`, `js/` (généré) |
| `jeu/assets/models/` | Modèles 3D `.glb` |
| `jeu/assets/data/evenements.json` | Événements et choix du récit : à éditer sans toucher au code |
| `src/game/camelot-rules.ts` | Règles pures : grille 16×12, coûts, production, sauvegarde |
| `src/game/camelot-story.ts` | Moteur d'événements pur : ères, jauges, drapeaux, effets |
| `src/game/camelot-world.ts` | Scène 3D, caméra, placement, boucle économique et narrative |
| `src/game/camelot-assets.ts` | Table des modèles 3D par bâtiment |
| `src/ui/camelot-ui.ts` | Interface HTML/CSS (ressources, jauges, quête, événements) |
| `src/engine/` | Rendu, entrées, boucle fixe, sauvegarde, chargement d'assets |
| `tests/` | Tests des règles et du récit |
| `tools/construire.mjs` | Transpile `src/` vers `jeu/js/` |

## Modifier le jeu
1. Éditez `src/` (TypeScript) ou `jeu/assets/data/evenements.json`.
2. `node tools/construire.mjs` (Node ≥ 22.13) régénère `jeu/js/`.
3. Rechargez la page. Pour les tests : `npm install && npm test`.

## Ajouter vos modèles 3D
Déposez le `.glb` dans `jeu/assets/models/`, puis référencez-le dans `BUILDING_MODELS` (`src/game/camelot-assets.ts`).
Un modèle `null` utilise un modèle procédural (c'est le cas du donjon pour l'instant).
Pour un nouveau bâtiment, ajoutez-le dans `BUILDINGS` (`camelot-rules.ts`), `BUILDING_ICONS` et `BUILDING_MODELS`.

## Ères et récit
Ère 1 Estoire de Merlin et Estoire del Saint Graal, ère 2 Lancelot (après le donjon), ère 3 Queste, ère 4 Mort le Roi Artu.
Un événement a une ère, des conditions (`requires`) et des choix aux effets (ressources, jauges Honneur/Piété/Concorde, drapeaux, `era`).
Chaque événement doit garder au moins un choix sans coût (vérifié par les tests).

## Licences
Polices ManusCC0 : CC0. three.js : MIT. Textes : écrivez vos propres adaptations (les traductions modernes sont protégées).
**Les 3 modèles `.glb` fournis dans le brouillon n'ont pas de licence documentée : vérifiez leur provenance avant de publier.**

## Cité ronde (lot 1)
- La cité est un cercle autour de la Table Ronde : trois anneaux (le 2e s'ouvre à 6 bâtiments, le 3e à 14), puis les remparts.
- Six secteurs de 60°, un par chevalier : Gauvain (tour des remparts), Lancelot (donjon), Galaad (cathédrale), Tristan (port et tavernes), Perceval (marché), Bohort (hôtel de ville). Chaque structure ne se pose que dans le secteur de son chevalier.
- Tout bâtiment doit toucher une route reliée à la Table Ronde. Terrain : forêts (scierie à proximité), rochers (carrière dessus), eau (port à proximité).
- Au placement : aperçu fantôme, cercle d'influence et raison du refus près du curseur.
- Les remparts de base (`walls` dans `CityState`) sont posés d'office, prêts pour les événements extérieurs et les améliorations.

## Économie (lot 3)
- Un cycle dure 7 s ; une saison dure 12 cycles, une année 48. Les fermes rendent ×1 au printemps, ×1,3 l'été, ×1,6 à l'automne, ×0,25 l'hiver.
- Chaque tranche de 4 habitants mange 1 vivre par cycle ; en hiver, chaque chaumière brûle 1 bois par cycle.
- Trésor en deniers : impôts (1 par 2 habitants), marché (+4), taverne (+3), moins l'entretien des bâtiments (`UPKEEP`).
- Pénalités au cycle suivant : famine ×0,6, froid ×0,8, caisse vide ×0,7.
- Chaînes : boulangerie (6 vivres vers 10 vivres et 2 deniers) et charpenterie (8 bois vers 9 deniers), limitées par les matières disponibles.

## Tension (lot 4)
- **Espoir et Colère** (0–100) évoluent à chaque cycle : famine, froid et caisse vide les abîment ; cathédrale et taverne remontent l'espoir. Colère ≥ 70 : production ×0,85. Espoir à 0 ou colère à 100 : défaite.
- **Codex des Lois** (bouton Codex, Hôtel de Ville requis) : une loi définitive par groupe (Travail, Greniers, Ordre). Les lois sont dans `LAWS` (`camelot-rules.ts`).
- **Crises** : assaut saxon, tempête, fièvre noire, toutes les 30 à 44 cycles environ (la première au cycle 40). Seules les tours de guet (Gauvain) les annoncent, 8 cycles plus 2 par tour à l'avance.
- **Remparts** : défense = (25 × niveau des murs + 10 × niveaux des tours + 20 avec un donjon) × état des murs. Un assaut plus fort que la défense pille les stocks et entame les murs ; murs à 0 : Camelot est prise. Les murs se réparent de 1 point par cycle (+1 par tour).

## Récit (lot 5)
- **Cinq chapitres, un par volume** : Estoire del Saint Graal (une scierie et une carrière), Estoire de Merlin (le donjon), Lancelot en prose (la cathédrale), Queste del Saint Graal (la Queste), Mort le Roi Artu (Salesbières). Les objectifs sont dans `CHAPTERS` / `advanceChapter` (`camelot-story.ts`).
- **Table Ronde** (bouton Table) : un chevalier siège quand sa structure est achevée, qu'il est vivant et que sa loyauté est d'au moins 30. Chaque siège donne un pouvoir (`KNIGHT_POWERS`). Les événements peuvent changer la loyauté (`loyalty`) ou tuer un chevalier (`fall`).
- **Merlin** (dès le chapitre 2) : trois enchantements à 15 deniers (moisson, muraille, sérénité), puis Viviane l'enferme.
- **Fins** : `ending: "auto"` dans un choix déclenche la fin, calculée par `endingFor` : Avalon (Graal trouvé, vérité dite, piété ≥ 60), règne apaisé (concorde ≥ 65, rumeur non étouffée) ou Salesbières.
- **Écrire vos événements** : `jeu/assets/data/evenements.json`. Champs : `id`, `volume`, `era` (chapitre 1 à 5), `title`, `text`, `requires` (`buildings`, `flags`, `notFlags`, `seen`), `choices` (`label`, `result`, `effects`). Effets : `wood`, `stone`, `food`, `gold`, `honneur`, `piete`, `concorde`, `hope`, `discontent`, `flag` (plusieurs séparés par des virgules), `loyalty` (par chevalier), `fall`, `era`, `ending`. Chaque événement doit garder un choix sans coût (vérifié par les tests).

## Interface et données (lot 6)
- **Temps** : boutons ⏸ ×1 ×2 ×3 (ou Espace, touches 1 à 3). La partie se fige pendant un événement ; on peut bâtir en pause.
- **Tendances** : chaque réserve affiche sa variation prévue au prochain cycle (`forecast`). **Alertes** cliquables sous la barre du haut : famine, caisse ou bois épuisés dans moins de 6 cycles, entrepôts pleins, colère, crise annoncée (un clic sélectionne le bâtiment utile).
- **Calques** : « Trajets » (disque vert, jaune ou rouge selon le rendement logistique de chaque atelier) et « Secteurs » (les six sièges des chevaliers).
- **Jour et nuit** : un jour dure 8 cycles ; lumière, ombres et ciel suivent l'heure et la saison.
- **Équilibrage par données** : `jeu/assets/data/batiments.json` (nom, coût, production, intrant, influence, `buildTime`, `upkeep`) et `lois.json` (le Codex) sont chargés au démarrage. Modifiez-les sans recompiler ; seuls les bâtiments existants sont concernés (leur emplacement, leur chevalier et leur terrain restent dans `camelot-rules.ts`). `node tools/exporter-donnees.mjs` régénère ces fichiers depuis le code (après `node tools/construire.mjs`).

## Main-d'œuvre, réfugiés, déménagements
- **Main-d'œuvre** : les habitants (4 par chaumière, +2 par niveau, plus les réfugiés) se partagent entre **bâtisseurs** (seulement s'il y a des chantiers ; part réglable à 25, 50 ou 75 %) et **ouvriers**. Chaque atelier a des postes (`JOBS`) ; si les ouvriers manquent, tous les ateliers produisent proportionnellement moins. Le pavé « Travail » indique ouvriers / postes.
- **Réfugiés** : les événements `refugies-saxons` et `refugies-famine` (effet `refugees`) ajoutent des habitants, donc des bras et des bouches à nourrir.
- **Déplacer** (bouton Déplacer) : un clic sur un bâtiment achevé, un second sur la nouvelle parcelle (mêmes règles que pour bâtir). Coût : 25 % du prix de base ; le bâtiment redevient un chantier mais garde son niveau. Routes et donjon ne se déplacent pas.

## Forêts et gisements finis
- Chaque parcelle de forêt contient 90 bois, chaque parcelle de rocher 400 pierres (`DEPOSITS` dans `camelot-rules.ts`). Une scierie puise dans les forêts à sa portée, une carrière dans les rochers à sa portée, en commençant par la parcelle la plus riche ; sans stock, l'atelier chôme et un message l'annonce.
- La forêt repousse de 2 par cycle et par parcelle ; le rocher ne repousse pas. Les arbres et rochers rapetissent à vue d'œil quand leur stock baisse.
- Au placement d'une scierie ou d'une carrière, l'infobulle indique la réserve à portée. Le calque « Réserves » colore chaque parcelle (vert, jaune, rouge) selon son stock.

## Secteurs des chevaliers : comment ça marche
- La carte est divisée en six zones colorées autour de la Table Ronde, chacune portant le nom d'un chevalier et de sa structure.
- Sélectionner une structure de chevalier (Tour des remparts, Donjon, Cathédrale, Port et tavernes, Marché, Hôtel de Ville) **surligne automatiquement sa zone** : elle ne se bâtit que là.
- Une fois la structure **achevée**, le chevalier prend son siège à la Table et son **bonus** s'applique tant qu'il est vivant et loyal (au moins 30). Le détail est dans le bouton Table et dans l'infobulle de chaque carte.
- Les autres bâtiments (chaumière, ferme, scierie, carrière, entrepôt, etc.) se posent dans n'importe quel secteur.

## Rythme
- Un cycle d'économie dure 10 s (`ECONOMY_TICK_SECONDS`) et un événement du récit survient toutes les 24 s environ (`STORY_TICK_SECONDS`), soit un peu moins de trois cycles. Les vitesses ×2 et ×3 accélèrent les deux ensemble.
- Nouveaux bâtiments de vivres : Pêcherie (près de l'eau), Élevage (demande une ferme), Pavillon de chasse (près d'une forêt, sans l'épuiser).

## Commerce et usure
- **Caravanes** : avec un marché achevé, des marchands s'installent 6 cycles sur 20 (bouton Commerce). On achète ou vend par lots de 10 unités (achat à 115 % du prix, vente à 80 %). Les prix varient avec la saison : les vivres sont chers l'hiver et bon marché à l'automne.
- **Usure** : chaque bâtiment achevé gagne de l'usure à chaque cycle (1 pour un atelier, 0,4 pour les autres, 0,3 pour une chaumière, 0 pour routes et remparts). À 100 d'usure, la production est amputée de moitié. Le bouton Réparer remet à neuf pour 30 % du prix de base au prorata de l'usure ; améliorer rénove aussi. Le calque « Usure » et une alerte (à partir de 70) aident à repérer les bâtiments fatigués.

## Expéditions de chevaliers
- Bouton **Expéditions** : envoyez un chevalier vivant et loyal (au moins 30) vers l'une de quatre destinations (`DESTINATIONS` dans `camelot-rules.ts`) : forêt profonde (3 cycles, bois et vivres), ruines saxonnes (5 cycles, pierre et deniers), hameau isolé (4 cycles, +4 habitants et espoir), chapelle perdue (6 cycles, espoir et deniers).
- Pendant son absence, le chevalier ne siège plus : son bonus et la défense qu'il apporte disparaissent (attention aux crises). Au retour, un jet décide : butin, blessure (loyauté −10) ou mort (définitive). Le risque baisse avec la loyauté et monte en hiver ; il est affiché à côté de chaque destination.

## Modes de jeu et affichage
- **Contempler** (mode par défaut, touche Échap pour y revenir) : aucun aperçu de construction, aucun marqueur, aucun cercle d'influence, aucun voile sur les anneaux verrouillés, clics sans effet sur le terrain. Choisir un bâtiment (ou un bouton Bâtir, Améliorer, Démolir, Déplacer, Réparer) passe en mode d'action.
- **Quadrillage** : visible uniquement quand un calque est actif (Trajets, Secteurs, Réserves, Usure). Sans calque, le sol est continu.
- **Noms des secteurs** : affichés uniquement avec le calque Secteurs (ou en sélectionnant une structure de chevalier), au-dessus des remparts et du décor.
- **Interface** : tout élément fixe de l'interface doit réactiver `pointer-events:auto` (la couche `#ui` laisse passer les clics vers le terrain) ; un test (`camelot-interface.test.ts`) le vérifie pour la barre de vitesse et les pastilles.

## Défense
- Bouton **Défense** : défense totale = (25 × niveau des murs + 10 × niveaux des tours + 20 avec un donjon + bonus des chevaliers assis) × solidité des murs, plus 8 par soldat de la garnison et le bonus d'attitude.
- **Garnison** : recrutez des soldats (15 vivres, 10 deniers, 1 denier d'entretien par cycle) avec une tour des remparts ou un donjon ; plafond 2 + 2 par tour + 2 avec un donjon (10 au maximum).
- **Attitude face au prochain assaut** (remise à « Tenir les murs » après chaque assaut) : Sortie (+20 de défense, mais 2 soldats perdus en cas d'échec, et un succès remonte davantage l'espoir) ou Barricades (+10 de défense, et la moitié du pillage évitée en cas d'échec). Tout assaut qui perce les murs coûte au moins 1 soldat.
- **Murs** : renforcer (niveau +1 jusqu'à 5, 30 bois et 60 pierre par niveau actuel, solidité remise à 100) et réparer (0,4 bois et 0,4 pierre par point manquant). La force d'un assaut est de 20 + 12 par crise déjà subie ; elle n'est connue que si une tour de guet annonce la menace.

## Priorités de main-d'œuvre
- Trois boutons (Vivres, Matériaux, Services) cyclent entre priorité basse, normale et haute. Quand les ouvriers manquent, les catégories prioritaires sont servies d'abord (pondération 0,5, 1 ou 2).

## Ambiance
- **Fumées** : des volutes montent des cheminées des boulangeries et pavillons de chasse, et, dès l'automne, des chaumières et tavernes (logique pure dans `camelot-fx.ts`, testée).
- **Eau** : la surface du lac scintille doucement ; au loin, des collines décoratives bordent l'horizon. Les échafaudages des chantiers palpitent légèrement.

## Test de fumée (sans navigateur)
- `npm run fumee` (après `node tools/construire.mjs`) exécute la couche 3D du jeu avec un faux Three.js (`tools/fumee/`) : construction, chantiers, tous les outils, calques, défense, commerce, expéditions, lois, et 198 cycles de simulation (saisons, caravanes, crises). Il détecte les erreurs d'exécution (variable inconnue, appel impossible), mais pas les défauts de rendu (couleurs, positions, performances) : seul un vrai navigateur les montre.
- Quand les événements du chapitre courant sont épuisés, une rumeur du chapitre suivant peut survenir, pour éviter de longs silences.

## Écrire de nouveaux événements
- `jeu/assets/data/evenements.json` contient 100 événements répartis sur les cinq chapitres (dont plusieurs qui dépendent de vos choix précédents). Un événement par ligne, deux choix, chacun avec au moins un choix sans coût. Les tests vérifient les identifiants uniques, les chaînes `seen` et la présence d'un choix gratuit.
- Pour ajouter un épisode de vos volumes : copiez une ligne, changez `id`, `volume`, `era` (1 à 5), `title`, `text`, `choices`, puis relancez `npm test` (ou simplement le jeu).
