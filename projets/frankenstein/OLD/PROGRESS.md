# Frankenstein's Lab: Mad Science! — Suivi de dev

## Étapes
- [x] 1. Protocole réseau host<->pad → voir PROTOCOL.md (2 nouveaux types seulement : `alerte`, `monstre_etat`)
- [x] 2. Reskin complet controller.html → thème labo (violet/vert acide), textes FR "labo/assistant", overlay `alerte`, classe `monstre-eveille` sur la zone tactile
- [x] 3. worker.js / wrangler.toml : renommage cosmétique seulement (`pharma-cook` → `frankenstein-lab`), zéro changement logique
- [x] 4. Écran host (index.html) : reskin complet du jeu existant (2864 lignes, moteur Three.js intact) — voir détail ci-dessous
- [ ] 5. Passe d'intégration + notes de déploiement + (optionnel) mécaniques additionnelles du concept (torches, monstre qui se réveille)

## Correctif post-livraison (retour utilisateur avec capture d'écran)
Deux trous laissés par le script de reskin initial, tous deux corrigés :
- Chaînes "Ordonnance" oubliées dans 3 endroits non couverts par les 46
  remplacements (carte flottante du client "Ordonnance ?", titre/sous-titre
  de la fiche commande côté HUD droit) → renommées en "Contrat ?" / "Contrat
  non lu" / "À prendre au portail".
- Le cimetière gardait la géométrie du meuble d'herboriste (tiges + fleurs
  colorées) : seule la couleur avait changé, pas la forme, d'où la capture
  montrant toujours des "fleurs". Remplacé par une vraie tombe (dalle,
  tertre de terre, croix de bois, ruban coloré du donneur, main décharnée
  qui dépasse). Le corps porté en main (mesh de l'objet 'plante') a aussi
  été refait : linceul + bandelettes + étiquette colorée, au lieu du brin
  végétal d'origine.
## Correctif visuel #2 — mortier/alambic/étuve remodelés (pas juste recolorés)
Suite à un second retour avec capture : les 3 stations de transformation
gardaient leur géométrie Pharma-Cook (bol+pilon, ballon+serpentin, four à
hublot), seule la couleur avait changé. Refaits en conservant les clés
`userData` que le moteur anime (`pilon`, `flamme`, `liquide`, `vitre`) pour
ne rien casser dans `majPostes()` :
- **Table de découpe** (ex-mortier) : bac de découpe en zinc à rebord relevé
  + rainure d'écoulement, couperet en biais qui remplace le pilon (même
  va-et-vient de hachage, juste une lame au lieu d'un pilon de pierre).
- **Cuve de formol** (ex-alambic) : cuve cylindrique en verre épais cerclée
  de fer (au lieu du ballon rond de chimiste), embase électrique avec
  étincelle violette (au lieu du réchaud à flamme), couvercle + tuyauterie
  de dérivation conservés.
- **Tour Tesla** (ex-étuve) : mât + bobine de cuivre empilée + sphère
  sommitale avec arcs violets figés (décor), le hublot d'état devient un
  petit indicateur sur le socle de contrôle (même logique de couleur
  cuisson/prêt/surchauffe qu'avant).
Syntaxe revalidée par `node --check` après chaque changement.

- [x] 5a. Disposition de la salle repensée (voir détail ci-dessous)
- [x] 5b. Monstre incomplet qui se réveille (fail-state actif) — voir détail
- [x] 5c. Animations d'ambiance (voir détail ci-dessous) — carte blanche
- [x] 5e. Modèles 3D des objets portés + animations idle des personnages
- [ ] 5f. Torches des villageois / extincteur, sol glissant (pas encore fait)

## Objets portés — dernière dette technique visuelle liquidée
Les 4 formes qui restaient héritées de Pharma-Cook (signalées à l'étape 4)
sont refaites, cohérentes avec la station qui les produit :
- **Membre découpé** (ex-sachet de poudre) : petit cylindre bandé, teinté
  du donneur, articulation osseuse visible au bout coupé.
- **Assemblage / raté** (ex-fiole) : mini bocal de formol (même langage
  visuel que la cuve : verre cylindrique cerclé de fer) avec un spécimen
  géométrique flottant dedans, teinté du résultat.
- **Reste calciné** : garde sa forme (lisible universellement) mais gagne
  une braise incandescente et une fumée teintée violette au lieu de gris
  neutre.
- **Caisse** (ex-carton pharma) : caisse en bois clouée, planches
  apparentes, coins renforcés, sceau coloré du monstre commandé au lieu
  du bandeau medicament.
- **Contrat** (ex-ordonnance) : parchemin + cachet de cire (au lieu du
  papier à en-tête rouge).

## Animations idle (respiration + regard)
`humanoide()` expose maintenant `torse`/`tête` dans `userData` ;
`animerHumanoide()` leur applique une respiration discrète et un léger
regard qui pivote lentement dès que le personnage est à l'arrêt, et
s'efface automatiquement dès qu'il bouge (pour ne jamais interférer avec
le cycle de marche). Un déphasage aléatoire par personnage évite que
tout le monde respire en cadence. S'applique gratuitement aux joueurs,
aux commanditaires ET au monstre puisqu'ils partagent tous `humanoide()`.

Syntaxe revalidée par `node --check` après chaque bloc.

## Animations d'ambiance (purement décoratives, zéro impact sur les règles)
Un système `Ambiance` + `majAmbiance(dt)` tourne en continu dans `boucle()`,
même au lobby, pour que la salle soit vivante avant que la partie démarre :

- **Bougies/lanternes qui vacillent** : une par tombe (vert acide), une sur
  chaque table de découpe et chaque cuve de formol (violet). Vacillement
  organique (plusieurs sinus superposés + bruit), lumière et flamme liées.
- **Vapeur des cuves de formol** : 5 petites particules par cuve qui
  montent en boucle et s'estompent — donne enfin un signe de vie au
  liquide même quand la station est inactive.
- **Arcs de la tour Tesla animés** : ils étaient statiques depuis le
  reskin ; ils tournent et crépitent en continu maintenant, et
  s'intensifient automatiquement pendant la charge (`p.etat ===
  'cuisson'/'pret'`) — un retour visuel gratuit en plus du hublot.
- **Éclairs d'orage** : flash bref du fond de scène + du brouillard,
  spike de lumière ponctuelle, tonnerre décalé façon distance réelle
  (parfois double-flash). Toutes les 9-23 s.
- **Chauve-souris** : traverse le labo en diagonale de temps en temps
  (toutes les 14-32 s), bat des ailes, repart hors champ.

Tout est dans un bloc autonome inséré après `groupeMonde` (state +
générateurs `creerFlamme`/`creerVapeur`/`creerChauveSouris` + la fonction
`majAmbiance`), accroché aux meshes existants sans toucher à la logique de
jeu. Syntaxe revalidée par `node --check`.

**Non fait par choix de scope** (proposé mais pas demandé cette fois) :
pas de particules de poussière flottante ni de toiles d'araignée — la
liste ci-dessus couvrait déjà bien le "carte blanche" sans surcharger la
scène ni le budget de perf (une quinzaine de lumières au total, aucune
avec ombre portée sauf le soleil).

## Mécanique du monstre incomplet
Déclencheurs (deux, comme prévu à l'étape 2) :
- **Narratif** : 2 assemblages ratés d'affilée à la cuve de formol
  (`Jeu.rateSuite`) réveillent la créature directement — "si vous vous
  trompez d'organe, la créature se réveille incomplète", comme dans le
  concept d'origine.
- **Aléatoire** : ajouté au tirage de `declencherEvenement()` au même
  titre que panne/livraison/rush, pour les équipes qui ne se trompent
  jamais.

Comportement (`majMonstre`, appelée depuis `boucle()`) :
- Erre vers l'assistant le plus proche, bloquée par les murs comme un
  joueur (collision sur 4 coins, même logique que `bloque()`).
- Piétine et fait disparaître les gravats ("livraison") sur son passage —
  petit bonus mécanique en plus du chaos.
- Bouscule un assistant trop proche (cooldown 1.4 s/joueur) : il lâche ce
  qu'il porte au sol (réutilise `atterrir()`) et se fait repousser.
- Pour l'apaiser : s'approcher (portée `REGL.monstrePortee`) et maintenir
  B ; l'effort de plusieurs joueurs se cumule (comme au mortier/à
  l'alambic). Personne ne s'en occupe → l'apaisement redescend
  doucement au lieu de rester acquis.
- Calmée = +60 points, annonce, son dédié, et le protocole existant
  (`monstre_etat`, déjà prévu dans `controller.html` depuis l'étape 2)
  éteint le halo rouge sur les manettes.

Réutilise le générateur `humanoide()` existant (agrandi ×1.55, un bras et
une jambe recolorés pour l'effet "rapiécé", deux boulons au cou) plutôt
que de la géométrie neuve — cohérent avec le reste du reskin.

Remise à zéro ajoutée dans `demarrer()` (créature recalmée, invisible,
compteur de ratés à 0, et un `monstre_etat: calme` envoyé aux manettes
au cas où l'écran rouge serait resté affiché d'une partie précédente).

Syntaxe revalidée par `node --check`.

## Refonte de la disposition de la salle
Demande explicite : abandonner le plan façon Overcooked hérité de Pharma-Cook
pour quelque chose de plus proche du concept (le diagramme de flux linéaire).

Nouvelle grille 15×16 (au lieu de 15×12), organisée **de haut en bas dans le
même ordre que le diagramme d'origine** :

```
Cimetière (2 tombes de chaque type)
        ↓  (arche)
Salle de dissection : Table de découpe ×2 → Fosse à rebuts → Cuve de formol ×2 → Tour Tesla ×2
        ↓  (arche + trappe d'expédition)
Tapis roulant → Table de réception
        ↓
Quai : tableau des contrats + 3 portails
```

Postes doublés (découpe/formol/tesla en x2, un de chaque côté de la salle)
pour permettre un vrai travail en parallèle à plusieurs joueurs plutôt qu'une
file d'attente sur un poste unique. Le tableau des contrats a été déplacé du
cimetière (où il n'avait pas de sens) vers le quai, à côté des portails —
narrativement plus logique : on récupère le contrat au portail, on va le
signer au tableau juste à côté.

Toutes les constantes dépendantes de la grille ont été recalculées et
**validées par script** (BFS de connectivité + vérification qu'aucun poste
n'est isolé) avant patch, pas par relecture visuelle :
- `SPAWNS` (points d'apparition des 4 joueurs)
- `TAPIS_Z` (8.5 → 12.5, la ligne du tapis a changé de rangée)
- position visuelle du tapis (`tapisSalle`, z 9.7 → 13.7)
- `points` de l'événement "éboulement à dégager"

Résultat de la validation : 142 cases de sol, 142 atteignables (100 %),
aucun poste isolé. Syntaxe revalidée par `node --check`.

**Non modifié intentionnellement** : la durée de service (`REGL.duree`,
240 s) n'a pas été ajustée alors que la salle est ~30 % plus grande — à
tester en jeu, il faudra peut-être l'allonger un peu pour compenser les
trajets plus longs.

## Détail étape 4 — reskin de index.html

Le fichier `index.html` fourni était déjà un jeu complet et fonctionnel (PharmaCook,
~2864 lignes, moteur Three.js top-down façon Overcooked). Plutôt que de le
réécrire from scratch (risque de régression énorme sur un moteur déjà rodé :
mouvement, collisions, lancer d'objets, tapis roulant, QR code, reconnexion
réseau, synthèse audio, rig humanoïde animé...), j'ai fait un **reskin
chirurgical par script Python** (46 + 15 remplacements ciblés, tous vérifiés
appliqués, syntaxe validée par `node --check`) :

Mapping thématique (identifiants internes du code INCHANGÉS pour zéro risque,
seul le contenu affiché change) :
| Concept Pharma-Cook (code) | Devient à l'écran |
|---|---|
| Étagères (plante) | Fosses du cimetière (corps : Vagabond / Soldat / Noble) |
| Mortier (broyage) | Table de découpe |
| Alambic (mélange 2-3) | Cuve de formol (assemblage du monstre) |
| Étuve (cuisson + fenêtre avant que ça brûle) | Tour Tesla (charge + fenêtre avant surcharge) |
| Passe-plat / tapis / table | Trappe d'expédition / tapis / réception |
| Comptoir + client + ordonnance | Portail + commanditaire + contrat |
| Boîte / mixture ratée / lot carbonisé | Caisse / assemblage difforme / reste calciné |
| Médailles Bronze/Argent/Or | Apprenti / Assistant / Docteur Frankenstein |
| Palette pharma (vert menthe, ambre chaud) | Palette labo (vert acide, violet, cyan électrique) |
| Ambiance scène (fog vert, soleil chaud) | Fog sombre, lumière lunaire froide + rim violet |

Recolorations de décor : cimetière (caveaux sombres au lieu de meubles bois
d'herboriste), cuve de formol (fer terni au lieu de cuivre, verre teinté
vert formol), tour Tesla (caisson métal sombre, fenêtre violette au repos),
portail/trappe (métal sombre au lieu de bois).

**Ce qui n'a PAS été retouché (dette technique assumée, à faire en V2) :**
géométrie des meshes (les formes restent bol+pilon, ballon+serpentin, four —
juste recolorées, pas remodelées en table de dissection / cuve gothique /
bobine Tesla réaliste), et les mécaniques additionnelles du concept d'origine
(sol glissant, torches des villageois/extincteur, monstre incomplet qui se
réveille et détruit le mobilier) ne sont **pas encore implémentées** — le
jeu actuel reprend le squelette de règles de Pharma-Cook (score, combo,
pannes aléatoires, rush, livraison à ranger) simplement rethémé.

## Décisions prises
- Architecture réseau : inchangée (Worker + Durable Object agnostique au thème).
- Deux mini-jeux d'énergie distincts pour éviter la redondance :
  - Bobines Tesla = maintenance continue du labo (dégrade les stations si négligée)
  - Levier de foudre = finisher spectaculaire par monstre assemblé
- Monstre incomplet qui se réveille = fail-state actif (pas un game over), doit être apaisé.

## ÉTAPE 6 — Sélecteur de niveau + 4 nouveaux mondes

### Refactor préalable (le vrai travail)
Le monde était construit UNE SEULE FOIS au chargement, en code top-level,
avec `const PLAN / LARG / HAUT / SPAWNS / TAPIS_*`. Impossible de changer
de niveau sans refactor. Fait :
- Ces constantes deviennent des `let` alimentés par `niveauCourant`.
- Tout le code de décor est encapsulé dans `construireMonde()`, qui purge
  d'abord le monde précédent (dispose des géométries ET matériaux, pour ne
  pas fuir de mémoire à chaque changement de monde).
- `cadrerCamera()` recalcule le centre et le cadrage (les plans n'ont pas
  tous la même taille : le village fait 15x14, les autres 15x16).
- Piège attrapé au passage : `texTapis` s'était retrouvé enfermé dans
  `construireMonde()`, ce qui aurait cassé `majAmbiance()` (ReferenceError
  à la première frame). Remonté au niveau module.

### Validation des plans par script (avant tout patch)
Un validateur a vérifié les 5 plans : lignes de longueur homogène,
connectivité BFS totale, aucun poste isolé, tapis contigu, table `O` en
bout de tapis, présence de tous les postes requis.
Il a attrapé 2 vrais bugs que je n'aurais pas vus à l'oeil :
- **Genève** : l'ouverture du mur tombait pile sur la table `O` (solide),
  ce qui coupait tout le quai du reste de la carte (35 cases + 3 postes
  inaccessibles). Ouverture décalée.
- **Orcades** : la chambre de la Fiancée était entièrement murée — les
  joueurs n'auraient jamais pu l'atteindre. Ouverte par le bas.
Spawns et points d'événement générés par échantillonnage du point le plus
éloigné (sinon ils s'agglutinaient tous sur la même rangée).

### Les 5 mondes
Tous gardent la même chaîne (déterrer → découper → tremper → charger →
expédier). Ce qui change, c'est la contrainte par-dessus — principe
d'Overcooked.

1. **Le Laboratoire d'Ingolstadt** — le niveau de référence, inchangé.
2. **La Banquise** (`glace`) — plaques de glace qui s'escamotent par
   cycles de 12 s, avec préavis de 1,8 s (clignotement) pour que ce soit
   tendu et non frustrant. Une plaque ouverte coupe l'accès, ne tue
   personne (le joueur est repoussé sur une case voisine libre), mais
   **engloutit les objets laissés dessus**. Plus le sol glissant :
   inertie sur les déplacements (les commandes deviennent une
   accélération, pas une vitesse).
3. **Le Village** (`discretion`) — trois lanternes de patrouille balaient
   la grange. Travailler dans un faisceau fait du bruit, pondéré par
   station (découpe = bruyante, formol = discret). Jauge pleine → les
   villageois jettent des pierres et cassent une station.
4. **Genève** (`defense`) — objectif inversé : tenir, pas livrer. Le vent
   souffle les bougies une à une ; plus il fait noir, plus la créature
   avance vite. Rallumer (A) est la corvée permanente. Les barricades
   ralentissent sa progression.
5. **Les Orcades** (`demontage`) — la chaîne est inversée : la Fiancée
   est déjà assemblée, il faut la **démonter** membre par membre. Chaque
   membre retiré fait monter sa conscience (retournement du roman) ;
   à 100 % elle se réveille et réutilise le code du monstre existant.

### Sélecteur
Cartes cliquables dans le lobby + flèches ← → au clavier. Réinjecté dans
l'écran de fin (sinon il disparaissait avec `$voile.innerHTML`, bug
attrapé à la relecture). Changement de monde interdit en pleine partie.
Les joueurs déjà connectés sont repositionnés sur les spawns du nouveau
monde et lâchent ce qu'ils portaient.
Un bandeau d'état sous le chrono affiche la jauge propre à chaque monde.

### Vérifications
- `node --check` après chaque patch (une dizaine de fois).
- Passe finale : aucune fonction appelée qui ne soit déclarée.
- Bug attrapé : j'avais écrit `Jeu.sol` au lieu de `Jeu.ausol` (la vraie
  propriété) dans l'engloutissement des objets sur la banquise.

### NON TESTÉ EN JEU
Je n'ai pas pu lancer de partie réelle ici. La syntaxe, la connectivité
des cartes et la cohérence des appels sont vérifiées, mais l'équilibrage
des 4 nouveaux modes (cycles de glace, vitesse de la jauge de bruit,
progression de la menace à Genève, vitesse de conscience aux Orcades) est
**posé au jugé et demandera du playtest**. Les constantes à toucher sont
groupées en haut de `majMode()` et dans `construireDecorNiveau()`.

## ÉTAPE 7 — Audit des nouveaux mondes : 2 bugs critiques + identité visuelle

### BUG CRITIQUE 1 — les joueurs étaient détruits au changement de monde
`creerJoueur()` attachait le personnage à `groupeMonde`, que
`construireMonde()` purge intégralement (avec dispose des géométries et
matériaux). Concrètement : changer de niveau **détruisait tous les
personnages déjà connectés**, puis `choisirNiveau()` faisait
`j.mesh.position.set(...)` sur un mesh retiré de la scène → joueurs
invisibles et injouables.
Corrigé par un second groupe `groupeActeurs`, ajouté à la scène et JAMAIS
purgé. Joueurs et créature y vivent désormais.

### BUG CRITIQUE 2 — la créature réutilisait un mesh détruit
Même cause : `creerMonstreMesh()` ajoutait à `groupeMonde`, et
`Jeu.monstre.mesh` gardait la référence après purge. Au réveil suivant,
`if (!Jeu.monstre.mesh)` étant faux, elle réutilisait un mesh mort.
Réglé par le même `groupeActeurs`.

### Bugs mineurs attrapés
- `Ambiance.derive` vs `Mode.derive` : j'avais écrit le mauvais registre
  dans `construireDecorNiveau()` — les icebergs n'auraient jamais été
  animés.
- `Mode.ventProchain` était créé implicitement (`|| 7`) et jamais remis à
  zéro entre deux mondes : quitter Genève puis y revenir héritait de
  l'ancien compte à rebours. Déclaré et réinitialisé proprement.

### Identité visuelle par monde
Les mondes ne se distinguaient que par la teinte du sol. Ajouté :
- **Murs à la couleur du monde** (nouvelle clé `mur` sur les 5 niveaux).
- **Banquise** : 9 icebergs à l'horizon, qui **tanguent et roulent**
  doucement (la banquise dérive, elle n'est pas figée).
- **Village** : poutres de charpente au plafond, bottes de paille.
- **Genève** : tapis d'apparat rouge dans l'axe du manoir, portraits
  encadrés accrochés aux murs.
- **Orcades** : rochers battus par la mer autour de l'atelier.

### Animation manquante comblée
Le démontage de la Fiancée ne se voyait pas : seule une jauge bougeait.
Maintenant **chaque membre retiré disparaît réellement du modèle**
(bras gauche, bras droit, jambe gauche, jambe droite dans l'ordre), donc
l'état d'avancement se lit directement sur la créature.

### Vérifications
- `node --check` après chaque patch.
- Audit automatique : toutes les propriétés `Mode.*` et `Ambiance.*`
  utilisées sont déclarées ; les 5 niveaux possèdent bien les 12 clés
  attendues.
- Toujours **pas de playtest réel possible ici** : l'équilibrage des
  4 modes reste à valider en jeu.

## ÉTAPE 8 — Diversification des plans (chaque monde a sa propre forme)

Les 5 salles étaient quasi le même rectangle 15x16 recoloré. Refait pour
que la disposition serve la mécanique de chaque monde, pas juste son
palette :

| Monde | Dimensions | Silhouette | Pourquoi |
|---|---|---|---|
| Labo | 15×16 | rectangle compartimenté | référence, inchangé |
| Banquise | 19×15 | **un seul grand espace ouvert, presque aucune cloison** | cohérent avec "la glace se dérobe" — un labo cloisonné n'aurait aucun sens sur la banquise |
| Village | 17×15 | **grange asymétrique en L** (aile droite fermée par des stalles) | cohérent avec la discrétion : des recoins pour se cacher, pas un hall ouvert |
| Genève | 13×17 | **couloir de manoir en zigzag**, alcôves | cohérent avec la défense : un couloir qu'on tient, pas une salle qu'on traverse dans tous les sens |
| Orcades | 17×17 | **atelier octogonal** (coins coupés) avec **chambre centrale murée à 2 portes** | la Fiancée est vraiment enfermée dans sa propre pièce, pas posée au milieu d'une salle ouverte |

### Méthode : grille programmatique, pas de saisie manuelle de chaînes
Après l'échec de plusieurs plans tapés à la main lors de la première passe
(largeurs de ligne incohérentes, chambre murée sans porte pour Genève —
retrouvé par le même script de validation que pour le labo), tout a été
reconstruit via une grille Python (liste de listes) avec des fonctions
`creuser()`/`grille()` plutôt que des chaînes ASCII comptées à l'oeil.
Chaque plan revalidé : connectivité BFS totale, aucun poste isolé, tapis
contigu, table `O` en bout de tapis. Spawns et points d'événement
recalculés pour les nouvelles géométries (échantillonnage du point le
plus éloigné, comme pour le labo).

### Bug attrapé par la revue, pas par le hasard
`Mode.fiancee` aux Orcades utilisait une position codée en dur
(`cz = 4.8`) héritée de l'ancien plan rectangulaire. Avec la nouvelle
chambre centrale murée, la Fiancée serait apparue **hors de sa propre
pièce**, dans le couloir des tables de découpe. Corrigé en
`HAUT * 0.47`, qui retombe au centre de la chambre quel que soit le plan.

### Vérifications
- Script de connectivité sur les 4 nouveaux plans (comme à l'étape 5a).
- `node --check` après chaque patch.
- Vérifié explicitement que les lanternes de patrouille du village
  (coordonnées codées en dur) tombent bien sur du sol ouvert dans la
  nouvelle géométrie — c'était le risque le plus probable de collision
  entre l'ancien décor codé en dur et le nouveau plan.
- Toujours aucun playtest réel possible ici : la traversabilité et le
  rythme de chaque nouvelle forme restent à sentir en jouant.

## ÉTAPE 9 — Banquise : de vraies dalles au lieu de vrais blocs (corrigé)

### Bug de gameplay trouvé en creusant la demande
En vérifiant la mécanique avant de la retravailler visuellement, j'ai
trouvé qu'une case de glace "ouverte" ne bloquait en fait jamais le
passage : le code ne repoussait le joueur qu'à l'INSTANT de l'ouverture,
mais rien n'empêchait de remarcher dessus la frame suivante (`estSolide`
ne connaissait que le plan statique, jamais l'état des plaques). Le texte
disait "coupe l'accès", le code ne le faisait pas.
Corrigé : `estSolide()` consulte maintenant `Mode.plaques` sur la
banquise — une case ouverte est un vrai trou tant qu'elle n'est pas
remontée.

### De la dalle plate aux vrais blocs
Remplacé entièrement la représentation visuelle :
- **Eau sombre permanente** sous chaque emplacement (texture tissée,
  légèrement moirée) — c'est elle qu'on découvre, pas un trou noir.
- **Bloc de glace volumétrique** (`BoxGeometry`, pas un plan) : largeur/
  profondeur légèrement aléatoires et rotation aléatoire pour casser
  l'effet "dalle industrielle identique", matériau `MeshPhysicalMaterial`
  avec `transmission` pour un vrai rendu de glace translucide.
- **Craquelures** : une texture de fissures generée par canvas, invisible
  au repos, qui se révèle progressivement pendant le préavis (1,8 s) —
  le joueur voit littéralement la glace se fendre avant la chute.
- **Tremblement** : le bloc vibre légèrement pendant le préavis.
- **Immersion progressive** : le bloc s'enfonce et remonte en douceur
  (interpolé sur ~0,3 s) au lieu de disparaître/réapparaître net.
- **Éclaboussure** : un anneau qui s'étend et s'estompe, déclenché aux
  DEUX transitions (rupture ET résurgence) — avant, seule l'ouverture
  avait un effet (`Son.chute()`), la résurgence était silencieuse et
  invisible. Elle a maintenant son propre son (`Son.pret()`, réutilisé,
  aucun nouveau son ajouté).

### Vérifications
- Grep exhaustif pour confirmer qu'aucune référence à l'ancien format
  (`p.mesh` sur une plaque) ne subsistait après la réécriture.
- Audit automatique des propriétés `Mode.*` (aucune non déclarée).
- Vérifié que les deux nouvelles textures (`texEauSombre`,
  `texGlaceFissure`) sont bien déclarées avant leur premier usage dans
  le fichier.
- `node --check` après chaque patch.

### Non fait (scope)
Le village, Genève et les Orcades n'ont pas encore reçu le même niveau de
relecture "mécanique" que la banquise cette fois — seule la banquise a
été explicitement demandée. Si la même exigence s'applique aux autres
mondes (patrouilles du village avec de vrais faisceaux qui révèlent,
bougies de Genève avec une vraie mèche qui raccourcit, etc.), il faudra
une passe dédiée.

## ÉTAPE 10 — Warning matériau + le village ne sentait pas assez la grange

### Warning console corrigé
`MeshPhysicalMaterial.transmission/thickness` n'existent que depuis r134 ;
le jeu charge r128 (cdnjs). Remplacé par `MeshStandardMaterial` avec
transparence standard pour la glace — visuellement très proche, aucun
warning. Grep exhaustif fait pour vérifier qu'aucune autre propriété
post-r128 (`iridescence`, `sheen`, `clearcoat`, `anisotropy`...) ne
traînait ailleurs dans le fichier : aucune trouvée.

### La vraie cause du "ça ressemble au labo" : l'éclairage était global
Le sol, les murs, le décor changent déjà par monde — mais les 3 lumières
de la scène (`AmbientLight`, 2×`DirectionalLight`) étaient créées UNE FOIS
au chargement et ne variaient jamais. Un monde peut avoir des murs en
bois et de la paille au sol, si la lumière ambiante reste le même violet
froid que le labo, l'oeil lit quand même "labo". C'est presque
certainement la vraie raison du retour.
Corrigé : chaque niveau a maintenant sa propre entrée `eclairage`
(couleur + intensité des 3 lumières), appliquée par
`appliquerEclairageNiveau()` à chaque construction de monde.
- Labo : violet froid (inchangé, référence)
- Banquise : blanc-bleu éclatant, lumière polaire
- Village : ambre chaud, comme une lanterne — le contraste le plus fort avec le labo
- Genève : rouge sombre, lumière de veilleuse
- Orcades : gris-teal orageux

### Décor du village refait
- **Sol en planches** : texture bois générée par canvas (au lieu du même
  sol carrelé que les autres mondes), avec le damier générique désactivé
  pour ce monde (il aurait recouvert la moitié des lattes).
- **Poutres corrigées** : elles couvraient toute la largeur (17 cases)
  et flottaient donc au-dessus de l'aile murée des stalles, qui n'a pas
  de plafond à cette hauteur dans le plan. Limitées à la grange
  principale (colonnes 1-9) + 4 poteaux de soutien aux coins.
- **Paille au sol** dans les stalles (en plus des bottes déjà présentes).
- **Porte de grange entrouverte** avec une lumière ambrée qui filtre —
  point focal chaud dans un monde qui doit se lire "abri", pas "donjon".

### Vérifications
- `node --check` après chaque patch.
- Grep de toutes les propriétés THREE.js post-r128 dans tout le fichier.
- Confirmé que les 5 niveaux ont bien 5 couleurs d'ambiante distinctes
  (pas de copier-coller resté identique par erreur).
- `texBois` déclaré avant son premier usage (même risque de TDZ que
  `texTapis`/`texGlaceFissure` précédemment).

## ÉTAPE 11 — Banquise : refonte complète (référence Overcooked)

Sur la base d'une capture de référence : deux rives, un chenal, un
radeau qui fait la navette, l'eau qui noie et renvoie à un ponton fixe.
Ce n'était pas un ajustement — la mécanique précédente ("l'eau bloque
comme un mur, on repousse d'une case") allait à l'opposé de ce qui était
demandé, donc je l'ai d'abord annulée avant de reconstruire.

### Changement de nature de la mécanique
- **Avant** : `estSolide()` traitait une plaque ouverte comme un mur —
  on ne pouvait pas y marcher, juste être poussé au bord au moment où
  elle s'ouvrait.
- **Maintenant** : l'eau n'est plus un mur. `estSolide()` est revenu à
  sa version simple (mur/poste uniquement). C'est `majMode('glace')` qui
  détecte chaque frame si un joueur se tient sur une case d'eau
  (plaque ouverte OU brèche du chenal sans le radeau dessus) et
  déclenche une vraie noyade : objet porté perdu, son, éclaboussure,
  téléportation au ponton sûr (`niveauCourant.abri`), 1,4 s de grâce
  pour éviter de renoyer instantanément en réapparaissant.

### Nouveau plan : deux rives + chenal + radeau
Le plan de la banquise a été refondu (19×15, revalidé par script) :
rive gauche (cimetière, découpe, formol, rebuts) et rive droite
(tour Tesla, expédition) séparées par un mur plein sauf **une seule
brèche** (nouveau caractère `~`, jamais ajouté à `SOLIDE`) à mi-hauteur.
Cette brèche est en permanence de l'eau visible ; seul le radeau
(`niveauCourant.radeau`, un va-et-vient continu avec pause de 1,1 s à
chaque rive) la rend franchissable, et seulement pendant qu'il la
recouvre. Manquer le radeau = tomber à l'eau.
Les anciennes plaques éparses (glace qui se fissure puis s'ouvre) sont
conservées sur chaque rive comme danger secondaire, réduites à 4 pour
tenir dans le nouvel espace plus resserré.

### Vérifications
- Validateur adapté : BFS séparé par rive (le pont n'existant pas en
  dur, la carte n'est plus un seul bloc connexe — c'est voulu), postes
  requis présents de chaque côté, brèche confirmée adjacente aux deux
  rives, tapis contigu.
- Audit `Mode.*` : `radeau` n'était pas déclaré dans l'état initial ni
  remis à zéro entre deux mondes — corrigé (sinon un second passage sur
  la banquise aurait pu hériter d'un radeau fantôme le temps d'une frame
  avant réassignation).
- `node --check` après chaque patch (une bonne dizaine cette fois).
- Piège Unicode attrapé pendant la manipulation : mon premier essai de
  remplacement du bloc `banquise` échouait silencieusement parce que
  Python interprétait `\u00e9` comme un caractère littéral `é` dans ma
  propre chaîne de remplacement, alors que le fichier stocke l'échappement
  littéral `\u00e9`. Corrigé en doublant l'antislash.

### Non fait (transparence)
Le radeau ne "porte" pas littéralement le joueur par parenté d'objet :
la traversée fonctionne parce que la case qu'il recouvre devient sûre
au bon moment, pas parce que le joueur est physiquement attaché au
radeau et suit sa vitesse. Ça se joue et se ressent pareil dans 95 % des
cas (il suffit d'être sur la case au bon moment), mais un joueur qui
s'arrête pile au bord pendant que le radeau glisse sous lui ne sera pas
"emporté" activement. Si ça se sent mal en jeu, la vraie solution est
d'ajouter une vélocité empruntée comme le fait déjà le tapis roulant
(`REGL.poussetapis`) — mécanisme prêt, juste pas branché ici pour ne pas
complexifier une refonte déjà large.

## ÉTAPE 12 — Banquise : le sol ne ressemblait toujours pas à de la glace

Deux retours sur capture d'écran, tous les deux justes :
1. Les floes étaient des blocs carrés grands comme une case de damier —
   des accessoires posés sur un sol de labo, pas un vrai sol de banquise.
2. Le passage du chenal ressemblait à une porte étroite entre deux murs
   sombres, pas à une étendue d'eau qu'on traverse.

### Le sol lui-même a changé de nature
Avant : `sol` = un plan de couleur unie (comme tous les autres niveaux)
+ un damier + quelques blocs de glace éparpillés dessus. Résultat : le
sol "de base" restait un carrelage de labo, la glace n'étant qu'un
décor local.
Maintenant, sur la banquise uniquement :
- Le plan `sol` complet devient de l'**eau** (texture tissée déjà
  utilisée ailleurs, réappliquée en fond de scène).
- Un **tapis de floes organiques** est posé au-dessus, une pièce par
  case praticable : 5 textures de glace généreées par canvas (contour
  irrégulier à 9 points, dégradé, fissures internes), avec alpha-test
  pour qu'on voie vraiment l'eau dans les interstices entre les formes,
  chacune légèrement décalée et pivotée au hasard pour casser l'effet
  de grille. Le damier générique est désactivé pour ce monde (comme
  pour le plancher du village).
- Ce tapis est posé APRÈS la création des plaques temporaires et
  exclut explicitement leurs cases : sinon un floe fixe serait resté
  affiché en permanence au-dessus d'une plaque censée disparaître.

### Le chenal n'est plus un mur percé d'un trou
Le plan séparait les rives par un mur plein avec UNE SEULE case d'eau à
mi-hauteur — vu du dessus, ça ressemble à une porte étroite, pas à un
lac. Toute la colonne (13 cases, du haut en bas de la carte) est
maintenant de l'eau ouverte, sans aucun mur entre les deux rives : un
vrai couloir de lac qu'on voit sur toute sa largeur, avec quelques
éclats de glace flottants purement décoratifs dedans. Le radeau reste
la seule case sûre à un instant donné, mais il ne dessert qu'une seule
rangée (celle de sa traversée) — s'aventurer ailleurs dans le chenal
noie toujours, ce qui est voulu : le joueur doit repérer LA rangée du
radeau, pas n'importe quel point du lac.

### Revalidation complète
Nouveau plan revalidé par le même script BFS par rive (96 cases
atteintes de chaque côté, aucun poste manquant, brèche confirmée
adjacente aux deux rives à la rangée du radeau, tapis contigu).
`node --check` après chaque patch. Audit `Mode.*` : `brecheX`/`brecheZ`
remplacés par un tableau `casesEau` partagé entre le décor et la
détection de noyade — vérifié qu'aucune référence à l'ancien nom ne
subsistait.

### Non fait (transparence)
Les floes sont posés une fois à la construction et ne bougent plus
(pas de dérive individuelle comme les icebergs d'arrière-plan) — un
vrai plan d'eau aurait des floes qui se déplacent légèrement avec le
courant. Faisable en réutilisant le pattern de `Mode.derive`, pas fait
ici pour contenir la portée d'une refonte déjà large.
