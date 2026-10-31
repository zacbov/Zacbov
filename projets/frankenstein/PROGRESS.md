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

## ÉTAPE 13 — Banquise : gros blocs, radeau-plateforme, murs-iceberg

Quatre demandes concrètes après capture d'écran :

### 1. Blocs de glace 4x4 (au lieu de la taille du damier)
L'ancien tapis posait un floe organique par case (1,28×1,28 ≈ une case).
Remplacé par **12 gros blocs** (6 par rive, ~3,7×3,7 à 3,7×4,7 chacun,
donc 4 cases de large ou plus), positionnés en dur sur les zones de
chaque rive. Pour que les plaques temporaires (qui, elles, plaisaient
déjà) restent visibles quand elles s'ouvrent malgré un gros bloc statique
juste en dessous, leur propre nappe d'eau est remontée légèrement
au-dessus (0,015 → 0,036) : elle reste donc toujours au premier plan,
peu importe ce qu'il y a dessous.

### 2. Le radeau devient une vraie plateforme
Avant : une dalle plate 1,3×0,4×1,05. Maintenant : un pavé 1,9×0,46×1,6
avec un dessus organique (même famille de texture que les gros floes),
pour qu'il se lise comme "un morceau de banquise sur lequel on monte",
pas un ponton qui glisse.

### 3. Chauve-souris retirée sur ce monde
Gardée partout ailleurs, désactivée spécifiquement quand
`niveauCourant.mode === 'glace'` (une chauve-souris au-dessus d'un lac
gelé n'avait pas de sens). Garde-fou ajouté : si elle était en vol au
moment de basculer vers la banquise depuis un autre monde, elle est
figée hors champ plutôt que de rester suspendue dans le ciel polaire.

### 4. Tapis roulant retiré (visuellement)
Le retirer entièrement aurait demandé de restructurer la chaîne
trappe→réception, commune à tous les mondes (`TAPIS_X0/X1/Z`,
`majTapis()`) — trop risqué pour ce qui reste une demande esthétique.
Compromis assumé : sur la banquise, les cases de tapis gardent leur
fonction (les objets s'y déplacent toujours) mais perdent leur habillage
de convoyeur — plus de texture à chevrons qui défile, remplacée par une
simple planche de glace immobile. Une bande de caoutchouc qui roule
n'a de toute façon aucun sens posée sur la glace.

### 5. Murs en forme d'iceberg
Les murs extérieurs de la banquise (auparavant des `boite(1,1.5,1,...)`
identiques à tous les autres mondes) utilisent maintenant
`creerMurIceberg()` : 2-3 pics de glace de hauteur et rayon aléatoires,
même famille visuelle que les icebergs d'arrière-plan déjà en place.
La collision reste basée sur la grille (case pleine, peu importe la
forme du mesh) donc aucun risque de nouveau trou dans les murs.

### Vérifications
- `node --check` après chaque patch (6 cette fois).
- Audit `Mode.*` : aucune clé non déclarée.
- Vérifié que `creerMurIceberg` est bien défini avant son premier appel.
- Vérifié qu'il y a bien deux gardes `niveauCourant.mode !== 'glace'`
  (déclenchement + boucle d'animation de la chauve-souris).

### Non fait (transparence)
- Le tapis roulant garde sa fonction interne sur la banquise (voir
  point 4) — ce n'est pas une suppression complète du mécanisme, juste
  de son habillage visuel.
- Les gros blocs sont positionnés en dur pour cette carte précise (pas
  un algorithme générique de clustering) : si le plan de la banquise
  est encore remanié, ces coordonnées devront être revues à la main.

## ÉTAPE 14 — Déploiement réel : la manette ne se synchronisait pas

Retour utilisateur après déploiement sur Cloudflare : le jeu tourne sur
deux domaines séparés (Pages pour les fichiers statiques
`frankenstein-lab.pages.dev`, Worker pour le relais WebSocket
`frankenstein-lab.zacharybov.workers.dev`), et le code ne le savait pas.

### Cause exacte (confirmée par le message d'erreur console)
`const RELAY = params.get('relay') || (... + location.host);` — sans
paramètre `?relay=` dans l'URL, le relais se rabat sur le domaine de LA
PAGE ELLE-MÊME. Ouvrir `frankenstein-lab.pages.dev` sans paramètre fait
donc tenter une connexion à `wss://frankenstein-lab.pages.dev/ws` —
un domaine Pages, qui n'a aucune route `/ws` puisque c'est le Worker qui
héberge le relais. D'où l'échec immédiat visible dans la console.

### Corrigé dans index.html ET controller.html
Ajout d'une constante `RELAY_PAR_DEFAUT` pointant vers l'URL du Worker
donnée par l'utilisateur (`wss://frankenstein-lab.zacharybov.workers.dev`),
utilisée comme repli à la place de `location.host`. Le paramètre
`?relay=...` reste prioritaire s'il est présent (donc rien ne casse pour
qui préfère tout servir depuis un seul Worker avec le binding `[site]`
mentionné dans `wrangler.toml`).

Point d'attention laissé au propriétaire du dépôt : cette URL est
maintenant **codée en dur** dans les deux fichiers. Si le Worker est un
jour redéployé sous un autre nom/domaine, il faudra mettre à jour
`RELAY_PAR_DEFAUT` aux deux endroits (repéré par un commentaire à
chaque emplacement).

### Vérifications
- `node --check` sur les scripts extraits d'`index.html` ET de
  `controller.html` (ce dernier n'avait jamais été validé par ce moyen
  jusqu'ici puisque les modifications précédentes ne le touchaient pas).
- Pas de souci de contenu mixte attendu : la page est servie en HTTPS et
  se connecte en `wss://` (sécurisé) vers un autre domaine HTTPS — les
  navigateurs autorisent ce cas, contrairement à `ws://` non sécurisé
  depuis une page HTTPS.

## ÉTAPE 15 — Banquise : trous réels dans les gros blocs + difficulté revue à la baisse

### Le carré qui restait visible : cause trouvée
Les gros blocs 4x4 (étape 13) sont statiques et couvrent toute une zone
sans savoir qu'une plaque temporaire vit dessous. Quand celle-ci
s'ouvrait, seul son propre petit carré d'eau (remonté au-dessus pour
rester visible) apparaissait — flottant sur un gros bloc qui, lui, ne
bougeait jamais. D'où l'impression de "toujours un carré".

Corrigé en perçant un vrai trou dans la texture du gros bloc concerné,
à l'endroit exact de la plaque qu'il contient :
- `creerTextureFloe()` accepte maintenant une liste de trous (position
  relative + rayon), découpés au montage via
  `globalCompositeOperation = 'destination-out'` — un contour organique
  irrégulier, pas un cercle parfait.
- Pour chaque gros bloc, on calcule quelles plaques tombent dans son
  emprise et à quelle position relative (formule dérivée de la rotation
  du plan, vérifiée par le calcul plutôt que devinée : `rx = 0.5 +
  dx/largeur`, `ry = 0.5 + dz/hauteur`).
- Un bloc qui contient un trou perd sa rotation/décalage aléatoires
  (sinon le trou se désaligne de la plaque qu'il est censé découper) —
  seuls les blocs sans plaque gardent la variation organique.
- Vérifié qu'aucune case de plaque ne tombe dans une zone non couverte
  entre deux blocs (les limites des blocs ont été choisies pour que
  chaque centre de case entière tombe strictement dans un seul bloc).

### "Trop dur" : plus de surface sûre, moins souvent dangereuse
- Plaques piégeuses : 4 → 2 par carte (deux fois plus de sol
  définitivement sûr).
- Cycle de chaque plaque allongé et rééquilibré : 12 s → 13 s, mais la
  part dangereuse passe de 3,6 s à 2 s (35 % → 17 % du temps), et
  l'avertissement (fissures visibles) passe de 1,8 s à 2,5 s — plus de
  temps pour réagir.
- Pause du radeau à quai : 1,1 s → 1,6 s, pour laisser plus de marge
  pour monter dessus.
- Bug trouvé en corrigeant : le bandeau d'état en haut de l'écran
  (jauge "la glace craque") utilisait encore l'ancien cycle de 12 s en
  dur — recalé sur 13 s, sinon son avertissement visuel aurait été
  légèrement désynchronisé du vrai comportement des plaques.

### Vérifications
- `node --check` après chaque patch.
- Audit `Mode.*` : aucune clé non déclarée.
- Vérifié que `creerTextureFloe` est bien déclarée avant son usage avec
  trous.
- Grep de `% 12` dans tout le fichier pour s'assurer qu'aucune autre
  référence à l'ancien cycle ne traînait ailleurs.

## ÉTAPE 16 — Banquise : les floes ne remplissaient pas leur propre bloc

Retour précis sur capture : les gros blocs (étape 13) étaient bien
positionnés, mais leur forme organique ne couvrait qu'environ 30-46 %
du rectangle qui leur était alloué — d'où toute cette eau visible même
À L'INTÉRIEUR de chaque rive, pas seulement dans le chenal central.

### Corrigé à deux niveaux
- **Rayon du contour organique** : 0,3-0,46×T → 0,49×T (avec une
  variation réduite pour rester grand de façon constante plutôt que de
  retomber parfois à 30 %). Le floe remplit maintenant quasiment tout
  son rectangle, ne laissant que des criques irrégulières sur les
  bords plutôt qu'une grosse marge d'eau tout autour.
- **Taille des blocs** : 3,7×3,7-4,7 → 4,1×4,1-5,1, avec un léger
  chevauchement volontaire des rectangles voisins (les rives n'ont pas
  changé de taille, donc les blocs se referment davantage les uns sur
  les autres).

### Effet de bord corrigé au passage
Le chevauchement volontaire entre blocs voisins créait un risque de
scintillement (z-fighting) si deux blocs contenant chacun un trou se
retrouvaient exactement à la même hauteur dans leur zone commune (les
blocs à trou n'ont plus de décalage aléatoire, pour rester alignés
avec la plaque qu'ils découpent — voir étape 15). Corrigé par un
minuscule décalage vertical déterministe par indice de bloc.

### Vérifications
- Recalculé à la main la couverture de chaque case de la grille par les
  nouvelles marges de contention (colonnes et rangées), pour confirmer
  qu'aucune case n'est orpheline (non couverte) ni comptée deux fois
  (ce qui aurait pu percer un double trou par erreur). Toutes les
  cases retombent proprement dans exactement un seul bloc.
- `node --check` après chaque patch.
- Audit `Mode.*` : aucune clé non déclarée.

Le chenal central (colonne d'eau, franchissable uniquement par le
radeau) n'a pas été touché : il reste la seule zone d'eau ouverte,
comme demandé.

## ÉTAPE 17 — Banquise : quatre retours précis sur capture d'écran

### 1. Les zones sombres aux bords doivent clairement se lire comme de l'eau
Techniquement déjà de l'eau (le sol entier est la texture `texEauSol`),
mais trop sombre pour être sans ambiguïté. Couleur de base éclaircie
(0x123240 → 0x1a4258) et **22 éclats de glace flottants dispersés sur
toute l'eau visible** (pas seulement le chenal comme avant) — confirme
partout que le noir est un lac vivant, pas du vide.

### 2. Il n'y avait que 2 plaques piégeuses, carrées : plus nombreuses, organiques, variées
- 2 → **5 plaques**, phase de cycle randomisée indépendamment (plus de
  décalage régulier `i/2*12`).
- Taille randomisée **1,1 à 2,0** (toujours plus grande qu'une case).
- La nappe d'eau révélée était un simple carré (`PlaneGeometry(0.98,0.98)`
  avec la texture d'eau générique) : remplacée par une vraie forme
  organique dédiée (`creerTextureTrouEau`, même famille de contour
  irrégulier que les floes, mais teintée eau sombre), 1,5× la taille du
  bloc — le "trou qui fond" est maintenant visiblement plus grand et
  plus irrégulier que le bloc de glace qui a disparu.
- Le trou percé dans le gros bloc englobant (étape 15) est maintenant
  **proportionnel à la taille réelle de chaque plaque** au lieu d'un
  rayon fixe, et sa marge de contention aussi (`b.w/2 - p.taille*0.5`).

### 3. Le radeau : le "carré en dessous" retiré, et il porte vraiment
- Le socle (`BoxGeometry`) est passé de 1,9×1,6 à 1,25×0,95 -- largement
  sous l'emprise du dessus organique (2×1,7), donc son contour
  rectangulaire ne dépasse plus visuellement.
- **Vraie prise en charge** : le radeau expose maintenant sa vitesse
  instantanée (`Mode.radeau.vitesse`), et tout joueur dont la case
  actuelle coïncide avec la case du radeau reçoit cette vitesse en plus
  de la sienne à chaque frame -- exactement le même principe que le
  tapis roulant (`REGL.poussetapis`), qui existait déjà dans le moteur
  mais n'avait jamais été branché sur le radeau (dette signalée à
  l'étape 11). On se déplace maintenant *avec* la plateforme, pas juste
  "autorisé à ne pas se noyer" en restant dessus.

### 4. 12 blocs uniformes → 3 tailles franchement différentes
Un seul **GRAND** floe regroupe toute la zone du cimetière (au lieu de
deux blocs identiques), deux **MOYENS** couvrent la zone de
découpe/formol, trois **PETITS** fragmentent la zone basse (au lieu de
deux) -- 12 pièces au total mais réparties en 3 échelles reconnaissables,
chacune avec sa propre variation aléatoire de taille (`gigue()`).

**Vérification numérique faite avant de considérer que c'était bon** :
calcul à la main du bord droit maximal de chaque bloc dans le pire
tirage aléatoire, pour garantir qu'aucun ne peut jamais déborder dans le
chenal central (ce qui masquerait visuellement l'eau censée être
infranchissable). Deux tailles ont dû être resserrées après ce calcul
(le grand bloc débordait de 0,4 unité dans le chenal avec les valeurs
initiales, les petits blocs de droite débordaient de 0,6 unité).

### Vérifications
- `node --check` après chaque patch (une dizaine cette fois).
- Audit `Mode.*` : aucune clé non déclarée, `taille` bien transmise à
  chaque plaque et utilisée pour dimensionner son trou.
- `creerTextureTrouEau` confirmée déclarée avant son premier usage.

### Non fait / limites assumées
- Les trois tailles de blocs et les 5 plaques, avec leurs jitters
  aléatoires respectifs, peuvent occasionnellement laisser une plaque
  proche d'une frontière de bloc sans trou parfaitement percé (la
  plaque reste fonctionnelle -- la noyade ne dépend jamais du rendu
  visuel -- juste un peu moins nette visuellement dans ce cas de bord).
- Les éclats flottants dispersés (point 1) sont placés au hasard sans
  vérifier s'ils tombent sous un gros floe (invisibles dans ce cas,
  inoffensif, juste un peu de géométrie inutile).

## ÉTAPE 18 — Le vrai coupable des carrés : le bloc lui-même, pas le trou

Bonne relecture de la capture précédente : les trous de fonte (étape 17)
étaient déjà organiques, mais l'ICE BLOCK visible avant qu'il fonde était
resté une `BoxGeometry` -- une boîte a forcément une face du dessus
carrée/rectangulaire, quelle que soit la forme du trou qu'elle laisse
derrière elle une fois fondue. C'est ce panneau carré net, posé sur les
floes organiques, qui se voyait dans la capture.

Corrigé avec la même recette que pour le radeau (étape 17) : le socle
(`BoxGeometry`) rétréci à 62 % de la taille annoncée de la plaque, et un
**dessus organique** (même famille de texture que les gros floes,
`MAT_FLOES`) posé par-dessus, assez grand pour cacher entièrement le
contour carré du socle en dessous. Le socle garde son rôle (épaisseur,
animation d'enfoncement/résurgence, support des fissures) mais n'est
plus jamais visible tel quel.

Vérifié qu'aucun autre élément de la banquise n'utilise encore une
géométrie carrée nue sans forme organique par-dessus (radeau et gros
floes déjà corrigés aux étapes précédentes ; les fissures et la nappe
d'eau révélée utilisent des textures à fond transparent, pas de fond
carré visible).

`node --check` après le patch. Audit `Mode.*` inchangé (aucune clé
nouvelle).

## ÉTAPE 19 — Les derniers "carrés" : écrêtage de canevas + désalignement

Deux causes distinctes, plus subtiles que les précédentes (d'où "on sent
encore quelques carrés" plutôt qu'un vrai carré net) :

### 1. Écrêtage du canevas sur les gros floes
Le rayon du contour organique avait été poussé jusqu'à 0,49×T pour que
les floes se touchent (étape 16) -- avec la variation ajoutée, certains
pics dépassaient 0,5×T, la limite du canevas. Un contour qui sort du
canevas s'y fait couper net par un bord... droit. D'où le sentiment de
carré résiduel. Plafonné explicitement à 0,485×T : ne peut plus jamais
toucher le bord, quelle que soit la variation aléatoire.

### 2. Le dessus de glace ne recouvrait pas toute la nappe d'eau
Sur chaque plaque temporaire, le "dessus" de glace visible à l'état
stable (1,05×taille) était plus **petit** que la nappe d'eau qu'il est
censé cacher en dessous (1,5×taille) -- et les deux tournaient de façon
indépendante. Résultat : même quand la plaque était encore fermée, des
bords de la forme d'eau (plus grande, tournée différemment) pouvaient
dépasser autour du dessus glacé, créant des arêtes qui ne suivaient pas
un contour organique cohérent.
Corrigé : les deux utilisent maintenant exactement la **même taille**
(1,35×taille) et la **même rotation** (`rotPartagee`, tirée une seule
fois par plaque) -- ils se recouvrent parfaitement, plus aucun bord ne
dépasse à aucun moment du cycle.

### Vérifications
- `node --check` après chaque patch.
- Audit `Mode.*` inchangé.
- Raisonnement explicite sur l'ordre des transformations (`bloc` n'a
  plus de rotation propre depuis l'étape 18, donc la rotation locale de
  `dessus` correspond directement à sa rotation monde, cohérente avec
  celle d'`eau` qui est un mesh de premier niveau).

## ÉTAPE 20 — Le trou percé dans les gros blocs était anguleux, pas rond

Nouvelle capture : un carré noir encore visible, mais cette fois avec
une forme ronde et lisse dedans -- signature typique d'un décalage entre
deux contours de qualité différente plutôt qu'un vrai carré plein.

### Diagnostic
Le trou percé dans les gros floes (étape 15, pour laisser voir la nappe
d'eau d'une plaque qu'ils recouvrent) était dessiné avec seulement
**10 points reliés par des segments droits** (`lineTo`), avec une forte
amplitude de variation (±22 %). À l'échelle d'un gros bloc, un décagone
irrégulier à forte variance peut se lire comme un polygone anguleux,
presque carré, plutôt qu'un vrai trou rond -- alors que la nappe d'eau
et le dessus de glace À L'INTÉRIEUR de ce trou (corrigés à l'étape 19)
utilisent, eux, un contour lissé à la courbe de Bézier. D'où l'effet
"cercle lisse dans un carré anguleux".

### Corrigé
Le trou utilise maintenant la même recette que tous les autres contours
organiques du niveau : **14 points reliés par des courbes quadratiques**
(`quadraticCurveTo`, comme pour les floes et la nappe d'eau) plutôt que
des segments droits, et une amplitude réduite (±13 % / ±6 % sur deux
fréquences superposées, contre ±22 % sur une seule avant) pour un
contour rond et régulier au lieu d'anguleux.

Vérifié au passage : le rayon du trou et la taille de la nappe d'eau
qu'il est censé encadrer sont proches à moins de 2 % l'un de l'autre
(calcul fait pour une plaque de taille moyenne dans un bloc moyen) --
pas de décalage d'échelle entre les deux, seule la forme du contour
posait problème.

### Vérifications
- `node --check` après le patch.
- Audit `Mode.*` inchangé.

### Honnêteté sur cette étape
Je raisonne ici sur la géométrie du code (nombre de points, type de
courbe, rayons comparés) plutôt que sur un rendu que je peux observer
moi-même -- je n'ai pas de moyen de faire tourner le jeu ici pour
vérifier visuellement. Si ce carré persiste après ce correctif, la
prochaine capture d'écran aidera à confirmer si le diagnostic était le
bon ou s'il faut chercher ailleurs (par exemple un défaut d'alphaTest
sur un élément que je n'ai pas encore identifié).

## ÉTAPE 21 — Arrêt des correctifs à l'aveugle : outil de diagnostic ajouté

Après une nouvelle capture montrant encore une arête droite (mais cette
fois un rond lisse coupé net, motif différent des deux fois précédentes),
j'ai vérifié `creerTextureGlace` (les fissures) : son fond est bien
transparent, aucun rectangle de fond dessiné. Ce n'est donc probablement
pas elle -- mais je ne peux pas le confirmer à l'oeil sans faire tourner
le jeu, et deviner une quatrième fois sans certitude n'est pas un bon
usage de ton temps.

### Ajouté : `?debugfloes=1`
Ouvrir l'écran avec ce paramètre dans l'URL (ex : `...?relay=...&debugfloes=1`)
dessine le contour RECTANGULAIRE réel de chaque plan, avec une couleur
différente par type :
- **Cyan** : les gros floes de fond
- **Magenta** : le dessus de glace d'une plaque temporaire
- **Jaune** : la nappe d'eau révélée d'une plaque temporaire
- **Orange** : la couche de fissures

Une seule capture avec ce mode activé, prise sur une plaque qui montre
encore une arête droite, dira immédiatement laquelle des 4 formes
superposées est en cause -- son rectangle de contour touchera l'endroit
exact du bord droit visible, les autres non.

### Vérifications
- `node --check` après le patch.
- Audit `Mode.*` inchangé.
- `ajouterContourDebug` confirmée déclarée avant son premier usage.

Cet outil est un rappel utile pour la suite du projet : pour ce genre de
défaut purement visuel (superposition de formes générées par canevas),
un contour de debug coûte quelques minutes à écrire et évite plusieurs
allers-retours de correctifs devinés à l'aveugle.

## ÉTAPE 22 — Formes anguleuses au lieu de rondes, rupture des plaques plus marquée

### Générateur de contour entièrement changé de nature
Tous les contours organiques du niveau (gros floes, trous percés dans
les gros floes, nappe d'eau révélée) utilisaient des sinus superposés
reliés par des courbes de Bézier -- une méthode qui, quelle que soit la
variation ajoutée, converge presque toujours vers un résultat lisse et
rond (c'est mathématiquement ce que fait un sinus). C'est probablement
la vraie raison pour laquelle chaque correctif précédent finissait par
recréer un "cercle" sous une forme ou une autre.

Remplacé par du **bruit déterministe par hachage** (`bruitHash`, pas de
sinus) et des **segments droits** (`lineTo`, pas de lissage en courbe) :
5 à 8 points par forme, rayon très irrégulier point par point plutôt
qu'une onde continue. Résultat : des facettes nettes façon banquise
fracturée, jamais rondes, jamais deux formes identiques. Une seule
fonction partagée (`contourAngulaire` + `tracerPolygone`) alimente les
trois usages (floes, trous, nappe d'eau), donc plus de dérive entre eux.

Bénéfice attendu sur les artefacts des étapes 19-21 : un bord droit fait
maintenant partie du style voulu (une facette de glace fracturée) plutôt
que d'être un défaut à corriger au cas par cas.

### La rupture d'une plaque est maintenant un vrai événement
Ajout de `fracasser()` : 4 à 7 éclats anguleux giclent au moment exact
où une plaque s'ouvre, volent en s'écartant du point de rupture,
tournent sur eux-mêmes, retombent puis s'enfoncent et s'estompent
(~0,7 s). Vient s'ajouter à l'anneau d'éclaboussure déjà présent, pas le
remplacer.

Bug attrapé avant livraison : le matériau des éclats n'avait pas
`transparent: true`, donc l'animation de fondu (`opacity`) n'aurait eu
strictement aucun effet visible -- les éclats auraient disparu net à la
fin de leur trajectoire plutôt que de s'estomper.

### Vérifications
- `node --check` après chaque patch.
- Audit `Mode.*` : nouvelle clé `eclats` bien déclarée et remise à zéro
  entre deux mondes.
- Confirmé que `bruitHash`, `contourAngulaire` et `fracasser` sont
  toutes déclarées avant leur premier appel.

### Outil de diagnostic (étape 21) conservé
`?debugfloes=1` reste disponible si un artefact resurgit malgré le
changement de générateur -- utile pour trancher vite plutôt que deviner.

## ÉTAPE 23 — "Un peu régressé" : le trou et la plaque ne s'emboîtaient pas

Bon diagnostic sur la capture : les formes étaient bien devenues
anguleuses (comme demandé), mais le **trou percé dans le gros floe** et
**la forme de la plaque elle-même** (son dessus glacé / sa nappe d'eau)
étaient générés avec deux graines aléatoires complètement indépendantes
(`rx*13+ry*7` d'un côté, `cx*2.3+cz*1.1` de l'autre) et deux rotations
indépendantes. Résultat : deux polygones différents censés représenter
la même fracture, qui ne s'emboîtaient jamais -- d'où l'effet "mordu de
travers" plutôt qu'une vraie cassure nette. Avec des contours ronds
(avant l'étape 22), l'imprécision se remarquait moins ; avec des
contours anguleux, le décalage devient flagrant. D'où la sensation de
régression alors que le changement de forme, lui, allait dans le bon
sens.

### Corrigé : une seule graine, une seule rotation, partagées
Chaque plaque calcule sa graine et sa rotation UNE FOIS
(`grainePartagee`, `rotPartagee`) et les garde en mémoire
(`p.graine`, `p.rot`). Le trou percé dans le gros floe qui la contient
utilise maintenant exactement ces mêmes valeurs (transmises via le
tableau `trous`) au lieu d'en tirer de nouvelles sur place -- le trou et
la plaque dessinent maintenant le même polygone.

`contourAngulaire()` accepte désormais un paramètre de rotation en plus
(ajouté à l'angle de chaque point, donc tourne bien la forme entière
sans changer sa silhouette).

### Limite assumée, dite clairement
Le trou et la plaque restent dessinés sur deux canevas de tailles
différentes (le gros floe fait plusieurs unités, la plaque une seule) :
même graine et même rotation garantissent la même silhouette, mais
l'échelle finale peut différer d'environ 15-20 % selon la taille tirée.
C'est une nette amélioration par rapport à deux formes totalement
indépendantes, mais pas un emboîtement pixel-parfait. Si ça se voit
encore en jeu, la prochaine étape serait de calculer le rayon du trou
en fonction de la taille RÉELLE en pixels de la plaque plutôt que
d'une formule approximative séparée.

### Vérifications
- `node --check` après chaque patch.
- Audit `Mode.*` inchangé.
- Confirmé que `p.graine`/`p.rot` sont bien transmis jusqu'au
  hole-punch, et que `creerTextureTrouEau` accepte bien le nouveau
  paramètre de rotation.

## ÉTAPE 24 — Vrai bug signalé par la console : variable hors de sa portée

`Uncaught ReferenceError: grainePartagee is not defined`, remonté
directement depuis le jeu déployé.

### Cause
À l'étape 23, `creerBloc()` calculait `grainePartagee`/`rotPartagee` en
interne (pour que le trou du gros floe et la plaque partagent la même
forme), mais la fonction ne les renvoyait pas -- son `return` ne
contenait que `{ bloc, fissures, eau }`. Le code appelant, juste après,
essayait quand même d'utiliser `grainePartagee`/`rotPartagee` pour les
stocker sur l'objet `Mode.plaques` -- alors que ces variables
n'existent que dans la portée de `creerBloc`, pas dans celle de la
fonction appelante. Résultat : plantage dès qu'une plaque temporaire
est créée, donc dès l'entrée sur la banquise.

### Pourquoi `node --check` ne l'a pas attrapé
`node --check` valide uniquement la SYNTAXE (le code est un programme
JS bien formé). Référencer un identifiant hors de sa portée n'est pas
une erreur de syntaxe -- c'est un programme parfaitement valide qui ne
plante qu'à l'EXÉCUTION, sur cette ligne précise. Aucune de mes
vérifications jusqu'ici n'exécutait réellement le code (je n'ai pas de
navigateur ici pour faire tourner Three.js) ; ce type de bug ne peut
être attrapé que par une relecture attentive de la portée des variables,
ou par une exécution réelle -- ce que seul un retour utilisateur en
conditions réelles permet ici.

### Corrigé
`creerBloc()` renvoie maintenant aussi `graine` et `rot` dans son objet
de retour. Le code appelant les récupère par déstructuration
(`const { bloc, fissures, eau, graine, rot } = creerBloc(...)`) et les
range sur la plaque.

### Vérifications
- `node --check` (syntaxe, comme toujours).
- Recherche explicite de toute référence résiduelle à
  `grainePartagee`/`rotPartagee` en dehors de `creerBloc` : aucune.
- Confirmé que le `return` de `creerBloc` inclut bien les deux
  nouvelles clés, et que l'appel les déstructure correctement.

Point de vigilance noté pour la suite du projet : quand une fonction
locale calcule une valeur destinée à être réutilisée par son appelant,
vérifier systématiquement qu'elle est bien incluse dans le `return`
avant de considérer le refactor terminé -- `node --check` ne le
signalera jamais.

## ÉTAPE 25 — Le trou était bien plus grand que ce qu'il contenait

Plus de plantage (la correction précédente tient), mais capture montrant
de grandes zones noires uniformes, parfois avec la fracture visible
dedans mais minuscule par rapport au vide, parfois sans rien de visible
dedans du tout.

### Calcul refait, pas juste ajusté
Recalculé précisément la taille réelle (en unités du monde) de la forme
d'eau/dessus d'une plaque : `0,42 (rayon de base) × 1,35 (tailleCommune)
× taille` ≈ `0,567 × taille`. Puis dérivé la formule du rayon du trou à
l'envers pour qu'elle retombe EXACTEMENT sur cette même taille une fois
reconvertie dans le système de coordonnées du gros bloc (qui a sa propre
échelle, différente de celle de la plaque). L'ancienne formule
(`taille*0,5+0,25`) était une approximation indépendante qui, une fois
les deux échelles comparées, donnait un trou 40 à 75 % plus grand que
son contenu réel -- d'où les grandes zones noires vides.

Marge de contention resserrée en cohérence (`taille*0,6` au lieu de
`taille*0,5`) pour garder le trou, maintenant mieux dimensionné, toujours
bien à l'intérieur de son bloc.

### Vérifications
- `node --check` après le patch.
- Audit `Mode.*` inchangé.
- Calcul vérifié à la main pour une plaque de taille 1,5 dans un gros
  bloc : rayon du trou et rayon de la forme qu'il contient tombent
  maintenant sur la même valeur (~0,85 unité), contre un écart de
  40-75 % avant.

### Limite non résolue, dite clairement
Les gros blocs se chevauchent légèrement entre eux par construction
(étape 16, pour qu'ils se touchent). Si une plaque tombe près d'une
zone de chevauchement, le bloc voisin (qui n'a pas le trou, puisque la
plaque n'est "contenue" que par un seul bloc à la fois) peut encore
recouvrir partiellement la zone fraîchement bien dimensionnée. Pas
corrigé ici -- je ne suis pas certain que ce soit ce qui apparaît sur
la dernière capture, donc je préfère attendre un retour plutôt que
deviner un correctif supplémentaire à l'aveugle.

## ÉTAPE 26 — Refonte complète : abandon des plaques, mécanique simplifiée

Demande explicite : abandonner tout le système de glace qui craque/se
troue (source de tous les bugs visuels des étapes 15 à 25) et reprendre
la mécanique de référence d'Overcooked -- des blocs qui émergent et
s'immergent du chenal en flot continu, sans craquelures ni trous à
découper.

### Ce qui a été entièrement retiré
- `creerBloc()`, `creerTextureTrouEau()` et la logique de perçage de
  trous (`trous`) dans `creerTextureFloe()` -- plus aucune texture
  générée à la volée pour représenter une "fonte".
- `Mode.plaques`, `Mode.eclats`, `Mode.radeau` et tout leur cycle
  (phase/préavis/ouverture, fissures, fracas de débris).
- Le portage du joueur par le radeau (`vx += Mode.radeau.vitesse * dt`
  dans `majJoueurs`) -- plus nécessaire, les nouvelles plateformes ne
  se déplacent plus horizontalement.
- Le champ `radeau: {...}` du niveau banquise dans `NIVEAUX`.

### Ce qui remplace : des plateformes en vague continue
Une ligne du chenal sur deux reçoit une plateforme (même style visuel
propre que le radeau précédent : socle + dessus organique, sans trou à
découper puisqu'il n'y a plus rien à percer). Chacune suit un cycle de
7 s (3 s émergée/sûre, 4 s immergée/dangereuse), avec un **déphasage
réparti régulièrement** entre elles -- c'est ce déphasage qui donne
l'effet de vague parcourant le chenal, pas une case isolée qui
clignote. Les rangées sans plateforme restent de l'eau nue en
permanence, donnant de vrais intervalles entre les passages.

La noyade reste la même mécanique qu'avant (objet perdu, son,
éclaboussure, téléportation au ponton sûr `abri`, 1,4 s de grâce), mais
la condition est plus simple : sûr uniquement si la plateforme de cette
rangée est bien émergée au moment présent.

### Vérifications (méthode renforcée après le bug de l'étape 24)
Ayant appris que `node --check` ne détecte pas les références hors
portée, j'ai cette fois systématiquement grep tout le fichier après
suppression pour confirmer qu'aucune trace de `creerBloc`,
`Mode.plaques`, `Mode.radeau`, `Mode.eclats`, `creerTextureTrouEau`,
`grainePartagee`, `rotPartagee` ne subsistait nulle part -- pas
seulement dans les zones que je pensais avoir modifiées.
- `node --check` après chaque patch (3 passes cette fois).
- Audit `Mode.*` dans les deux sens : aucune clé utilisée sans être
  déclarée, ET aucune clé déclarée sans être utilisée (code mort).
- Confirmé que toutes les fonctions encore appelées
  (`eclabousser`, `noyer`, `contourAngulaire`, etc.) sont bien
  déclarées quelque part dans le fichier.
- Vérifié à l'oeil la jointure exacte entre le bloc remplacé et le
  code adjacent (l'animation des icebergs, juste avant, n'a pas été
  touchée par erreur).

### Ce qui reste (assumé, pas oublié)
Les gros floes de fond, l'éclairage par niveau, les icebergs qui
dérivent, le sol en eau permanente : tout ça vient des étapes
précédentes et n'a pas été retouché, seulement réutilisé tel quel dans
le nouveau bloc de décor.

## ÉTAPE 27 — Retour au radeau (unique), mais vertical : 4 zones isolées

Retour explicite sur croquis annoté : le système de plateformes en vague
(étape 26) n'était pas ce qui était voulu. Reprise du radeau unique,
mais avec un mécanisme différent de celui d'origine (étapes 11-19) :
il parcourt maintenant tout le chenal **de haut en bas en continu**,
et non plus seulement d'une rive à l'autre.

### Nouveau plan : 4 zones isolées, reliées uniquement par le radeau
Une rangée de mur plein (rangée 7, sur les deux rives, sauf la colonne
du chenal) sépare maintenant chaque rive en haut/bas -- en plus de la
séparation gauche/droite déjà existante. Résultat : 4 zones de travail
isolées (haut-gauche, bas-gauche, haut-droite, bas-droite), aucune
connectée aux autres à pied. Seul le radeau, en circulant verticalement
dans le chenal, permet de passer d'une zone à l'autre -- en traversant
le chenal (gauche/droite) OU en restant dessus pendant qu'il avance
(haut/bas).

Un poste a dû être relogé : la fosse à rebuts (X) occupait la rangée 7,
désormais un mur plein. Déplacée en bas-gauche, près de la table de
découpe qui s'y trouve déjà.

### Validé par script avant d'écrire une ligne de JS
Comme pour chaque refonte de plan précédente : BFS depuis un point de
chaque zone, confirmation que les 4 zones sont bien des composantes
séparées (aucun chemin direct entre haut-gauche et bas-gauche, ni entre
haut-droite et bas-droite), vérification que chaque zone contient bien
les postes qui lui sont assignés, et que le chenal touche bien les 4
zones (sinon le radeau ne pourrait désservir l'une d'elles).

### Portage vertical du joueur
Le radeau expose sa vitesse instantanée (`Mode.radeau.vitesse`, le long
de l'axe Z cette fois) ; un joueur sur la même case que le radeau la
reçoit en plus de son propre mouvement, exactement comme pour le tapis
roulant. Repris du principe de l'étape 17, adapté à un déplacement
vertical plutôt qu'horizontal.

### Incident technique en cours de route
Le bac à sable s'est réinitialisé entre deux commandes, effaçant mes
deux premiers patchs de cette étape avant que je ne les sauvegarde. Pas
de dégât : j'ai récupéré la dernière version déjà livrée dans
`/mnt/user-data/outputs/` (persistante, contrairement à mon dossier de
travail) et tout refait, cette fois en vérifiant par `grep` le résultat
de CHAQUE patch individuellement avant de passer au suivant, plutôt que
d'enchaîner plusieurs patchs puis de vérifier à la fin seulement.

### Vérifications
- Script de connectivité (BFS par zone) avant tout patch JS.
- Après chaque patch : `grep` ciblé confirmant que l'ancien code a bien
  disparu ET que le nouveau est bien présent (pas seulement `node
  --check`, qui n'aurait pas détecté une suppression incomplète).
- Audit final `Mode.*` dans les deux sens (aucune clé orpheline, aucune
  référence non déclarée).
- Relu à la main les coordonnées `spawns`, `abri` et `points` du niveau
  contre le NOUVEAU plan (et pas seulement contre l'ancien) pour
  confirmer qu'aucune ne tombe sur le mur de la rangée 7 ajoutée.

## ÉTAPE 28 — Zones pleines, flux continu de 3 radeaux, jauge du monstre

### Les trois demandes
1. **Zones de travail entièrement remplies de glace.** Les gros floes
   venaient de l'ancien plan à deux zones (gauche/droite) et n'avaient
   jamais été redimensionnés après l'ajout du mur de la rangée 7 à
   l'étape 27 -- d'où les interstices visibles entre le floe et les
   postes. Remplacés par **un seul floe par quadrant** (4 au total),
   largeur pile 8 (la rive fait exactement 8 cases, donc couverture
   totale sans jamais déborder dans le chenal, ce qui aurait fait
   paraître le chenal praticable alors qu'il ne l'est pas).
2. **Flux continu de radeaux, plus d'aller-retour.** 3 radeaux
   simultanés, espacés régulièrement, qui montent toujours dans le même
   sens (bas vers haut) ; chacun disparaît en sortant du chenal par le
   haut et réapparaît aussitôt en bas. Une case du chenal est sûre si
   n'importe lequel des radeaux la recouvre. Le portage du joueur
   cherche le radeau qui le recouvre parmi les 3 (`vz -= vitesse * dt`,
   négatif puisqu'ils montent).
3. **Jauge du monstre au lieu de la progression du radeau.** Le bandeau
   du haut affiche maintenant le risque de réveil de la créature
   (`Jeu.rateSuite`, déjà global à tous les mondes, 0 à 2 ratés
   consécutifs avant réveil) à la place de la position du radeau.

### Deux incidents de bac à sable, une corruption trouvée
- Le bac à sable s'est **réinitialisé deux fois** en cours d'étape,
  effaçant à chaque fois tout mon travail non sauvegardé. Leçon
  appliquée immédiatement : sauvegarde vers `/mnt/user-data/outputs/`
  (persistant) après CHAQUE groupe de patchs, pas à la fin.
- Mes premiers patchs échouaient silencieusement (`count == 0`) quand
  je les écrivais en heredoc shell : une divergence de transcription
  que je n'ai pas pu repérer à l'oeil. Passer par un fichier script
  `/tmp/patchN.py` plutôt qu'un heredoc, et afficher d'abord le texte
  EXACT du fichier (`repr()`) avant d'écrire l'ancre, a réglé le
  problème de façon fiable pour tous les patchs suivants.
- **Corruption préexistante trouvée** : deux fragments de code cassés
  (`/* Lanternes de patrouille  }` jamais refermé, et
  `Mode.lanternes.forEach  }` -- un `if` fantôme sans parenthèse) étaient
  déjà dans le fichier livré à l'étape 27, résidus de mes anciens patchs
  qui réutilisaient ce texte comme ancre de fin sans nettoyer le
  précédent. Syntaxiquement valides (un commentaire non refermé avale
  tout jusqu'au prochain `*/`, donc `node --check` ne s'en plaignait
  pas) mais fragiles et illisibles. Nettoyés.

### Vérifications
- `node --check` après chaque groupe de patchs.
- Aucune référence résiduelle à `Mode.radeau` (singulier) : grep
  exhaustif, zéro résultat.
- Audit `Mode.*` dans les deux sens : aucune clé non déclarée, aucune
  clé morte.
- `rateSuite` confirmé présent dans l'état global `Jeu`.
- Compte des blocs `if (m === 'discretion')` ramené à 4, cohérent avec
  la structure réelle (décor poutres, décor lanternes, animation,
  bandeau).

### Non vérifié (honnêteté)
Je n'ai aucun moyen de voir le rendu : l'espacement visuel des 3
radeaux (6,5 s pour traverser le chenal, donc un écart de ~2,2 s
entre deux radeaux consécutifs) est calculé, pas observé. Si c'est
trop dense ou trop clairsemé en jeu, `NB_RADEAUX` et le diviseur
`6.5` dans la vitesse sont les deux seules valeurs à ajuster.

## ÉTAPE 29 — Village : patrouille réelle (passe mécanique)

### Test d'exécution ajouté à la méthode
Harnais Node (THREE/DOM bouchonnés par Proxy) qui charge le script, puis
simule 300 s de partie à 2 joueurs sur chacun des 5 mondes. Attrape les
`ReferenceError` d'exécution que `node --check` ne voit pas (cf. étape 24).
Ne vérifie ni le rendu ni l'équilibrage.

### Lanternes du village
- **Plage de patrouille bornée par le plan** : avant, chaque lanterne
  balayait de x=1,5 à LARG-2,5 en dur, donc traversait murs et stalles
  (rangées 2 et 6). Maintenant, tronçon de sol libre autour du point de
  départ (`estSolide`), ex. rangée 6 : colonnes 4 à 9 seulement.
- **Un villageois porte chaque lanterne** (`humanoide()`, marche animée,
  tourné dans le sens de patrouille) : la menace se lit physiquement.
- **Halo rouge** tant qu'un joueur travaille dedans (jauge qui monte),
  ambre sinon.

### Non fait
Pas de cône de lumière orienté ni d'occlusion par les murs (le bruit
reste un test de distance au halo, rayon 1,8). Genève (mèche qui
raccourcit) et Orcades non repris. 5f (extincteur, sol glissant hors
banquise) toujours ouvert. Équilibrage à playtester.

## ÉTAPE 30 — Banquise : radeaux deux fois plus grands
Socle 0,95×1,25 → 1,9×2,5 et dessus 1,15×1,5 → 2,3×3,0. La logique suit :
case sûre si un radeau est à moins de 1,25 en z (avant 0,62), et portage
du joueur sur la même fenêtre. Largeur > chenal (1 case) : le radeau
déborde visuellement sur les deux rives, voulu. Test de partie simulée OK.
Non vérifié en jeu : l'espacement des 3 radeaux (~4,3 cases) laisse
maintenant ~1,8 case d'eau nue entre deux radeaux.

## ÉTAPE 31 — Banquise : grands floes, chaîne de pics retirée, radeau sans socle
(Retour sur capture annotée : zones vertes = forme voulue, rouge = à supprimer.)
- **Floes agrandis** : 4 blocs de 8,8×6,5 (au lieu de 8,0×6,6) avec une
  nouvelle texture `creerTextureFloeGrand` (polygone de 12 facettes qui
  remplit ~90 % de son rectangle, contre 55-110 % d'un blob avant). Plus de
  rotation/décalage aléatoire. Bord intérieur à x=9,3 / 9,7 : ne mord pas
  sur le chenal (colonne 9, de x=9 à 10). Un trou d'eau d'~0,7 case subsiste
  entre haut et bas (rangée 7).
- **Chaîne de pics du milieu supprimée** (rangée 7) : seul le pourtour garde
  des icebergs. La rangée reste un obstacle par la grille (les 4 zones
  restent isolées), elle n'est simplement plus dessinée : de l'eau libre.
- **Radeau** : socle (boîte) retiré, il ne reste que le dessus facetté
  (2,3×3,0, texture grand floe). Logique inchangée.
Test de partie simulée OK sur 5 mondes. Rendu non vérifié visuellement.

## ÉTAPE 32 — Banquise : ponts de glace haut/bas
Régression de l'étape 31 : en retirant les pics de la rangée 7, on ne
pouvait plus passer de haut en bas (la rangée restait solide).
- Plan rangée 7 : `'###...###~###...###'` → cases libres aux colonnes 3-5
  (rive gauche) et 13-15 (rive droite). Le chenal (col. 9) reste la seule
  liaison gauche/droite, via les radeaux.
- Visuel : deux ponts pleins 3,5×2,4 centrés en z=7,5 (x=4,5 et 14,5), même
  texture grand floe, qui mordent sur les floes haut et bas.
- Vérifié par BFS sur le plan : haut-gauche → bas-gauche OK ; haut-gauche →
  droite impossible sans radeau (voulu). Partie simulée OK sur 5 mondes.
Non vérifié en jeu : largeur du passage (3 cases), et décor/postes à
proximité (aucun poste ne touche la rangée 7).

## ÉTAPE 33 — Mécaniques propres aux mondes (option 3 des propositions)

### Genève — la mèche se consume
Chaque bougie a `meche` (1→0, ~90 s) et `reserve`. La cire raccourcit et la
flamme rétrécit à l'écran ; à 0 le cierge s'éteint ("Consumée"). Le rallumer
(A) a deux cas : cierge soufflé par le vent → simple rallumage, mèche
conservée ; cierge consumé → "Remplacer le cierge", mèche = `reserve`, et
`reserve` baisse de 0,12 (plancher 0,4) : chaque remplacement tient moins
longtemps, sans jamais devenir impossible. Le vent existant est inchangé.

### Orcades — marée
Bande d'eau (rangées 11-12, le couloir vers le tapis). Cycle : basse
~30-42 s → alerte 3 s ("La marée monte !", nappe qui clignote) → haute 8 s
(nappe visible, joueurs à 55 % de vitesse dans la bande). Ralentit
seulement, ne bloque rien. Fonction `facteurSol(j)` (branche non-glace).

### Village — occlusion par les murs
`ligneLibre()` : le halo ne compte un joueur que s'il y a ligne de vue libre
jusqu'à la lanterne (échantillonnage 0,25 case sur la grille solide). Se
cacher derrière une stalle ou un mur marche enfin. Toujours pas de cône
orienté : le halo reste un disque de rayon 1,8.

### NON fait
5f banquise (extincteur, sol glissant hors banquise) : pas d'idée de
règle assez claire pour la livrer sans playtest, volontairement laissé.

### NON validé en jeu (équilibrage)
Charge de corvées à Genève : vent (~1 bougie / 8 s) + mèches (~1 / 18 s).
Si trop dur : allonger la mèche ou espacer le vent. Marée : 8 s tous les
~40 s sur le couloir du tapis, peut-être trop ou pas assez gênant.
Test simulé OK sur les 5 mondes (partie complète) ; mèches et cycle de marée
observés évoluer comme prévu, rendu non vu.

## ÉTAPE 34 — Playtest simulé (bots) : 2 bugs réels corrigés
Pas un vrai playtest sur téléphones (impossible ici). Bots dans le harnais
Node (THREE/DOM bouchonnés) : inactifs, aléatoires, et « malins » avec
recherche de chemin BFS sur la grille. Scripts dans `tests/`
(`smoke_parties.js` : 5 mondes × partie complète ; `bot_geneve.js` : bots
qui rallument les bougies — à charger dans le même contexte vm).

### Bugs trouvés et corrigés
1. **Actions de mode sans poste à portée** (Genève « Rallumer la bougie »,
   Orcades « Retirer un membre ») : le relâchement de A n'appelait
   `actionA` que si un poste était à portée (`cible` non nul), sinon
   `actionTapis` qui ignore ces actions. L'écran affichait l'action mais
   elle ne faisait rien. Corrigé : `(cible || cibleMode(j)) && action`.
   Antérieur à l'étape 33.
2. **Rejouer le même monde ne remettait pas l'état de mode à zéro**
   (`choisirNiveau` sort si même niveau ; `demarrer` ne remettait que
   postes/tapis/joueurs). Menace de Genève, bougies/réserves, conscience et
   membres des Orcades, alerte, radeaux, marée repartaient de la partie
   précédente. Corrigé : drapeau `Jeu.dejaJoue`, `construireMonde()` appelé
   au départ d'une partie rejouée.

### Mesures Genève (bots qui ne font QUE rallumer, 300 s)
2 / 3 / 4 bots : 4,0 / 3,5 / 4,4 bougies allumées sur 5 en moyenne ;
menace oscille entre ~60 et ~98 (attaque à 100 puis retour à 60) ; réserves
de cierge descendent vers 0,76-0,88. Les vrais joueurs ont en plus la
chaîne de production : Genève est probablement TROP dur. Pistes : espacer
le vent (7-11 s → 12-18 s) ou allonger la mèche.
### Non mesuré
Équilibrage Orcades/village/banquise, réseau, rendu, ressenti.

## ÉTAPE 35 — Genève : vent espacé
`ventProchain` : 6-11 s → 11-18 s entre deux bourrasques. Re-mesure (bots
qui ne font que rallumer, 300 s) : 4,6 bougies allumées sur 5 en moyenne
(avant 3,5-4,4), rallumages 24-26 (avant 32-53). La menace monte quand même
vers ~85-90 à 150 s : cadence de base 0,55/s même tout allumé ; ce sont les
barricades (que les bots ne construisent pas) qui la freinent. À vérifier
en vrai : le contre-jeu « barricades » est-il assez accessible ?

### Orcades : mesure non concluante
`tests/bot_orcades.js` : les bots retirent un membre puis restent
bloqués (`j.objet` non nul, ils ne livrent pas) → au plus 1 membre/joueur.
Constat seulement : sans retrait la conscience atteint 100 vers 90 s
(+1,1/s) ; chaque membre retiré ajoute +16 et accélère. Pour juger
l'équilibrage il faut un bot qui livre le membre au bon poste.

## ÉTAPE 36 — Écran de fin : boutons et record
- Boutons cliquables « Rejouer ce monde » (appelle `demarrer()`, qui
  reconstruit le monde depuis l'étape 34) et « Monde suivant ▸ » (même
  logique que la flèche droite). Avant : clavier seulement (Entrée, ← →),
  pénible quand l'écran principal est une TV sans clavier.
- Record par monde en `localStorage` (`frankencook_record_<id>`) :
  « Record de ce monde : N » ou « Nouveau record ! » (affiché seulement si
  un record existait déjà, pas à la toute première partie). Try/catch si
  le stockage est indisponible.
- Non fait : relance depuis la manette (téléphone). Les boutons ne sont
  testables qu'en vrai (le test simulé ne clique pas). Le record est local
  à l'écran principal, pas partagé entre appareils.

## ÉTAPE 37 — Mode debug (F2)
Panneau en bas à droite (`Debug`, `majDebug`, `toucheDebug`) : monde, phase,
temps, score, servis/ratés, et l'état propre au monde (menace, barricades,
% de mèche de chaque bougie ; conscience, membres, marée ; alerte).
Raccourcis actifs seulement quand le panneau est ouvert : 1-5 choisir le
monde (hors partie), F finir dans 5 s, G +300 points, H remet menace /
alerte / conscience à 0, R rallume toutes les bougies et remet les mèches.
F2 reste libre (T = joueur clavier, Entrée, ← →). Touches vérifiées par test
simulé (`tests/smoke_parties.js` les appelle en fin de script) ; l'affichage
du panneau n'a pas été vu à l'écran.
NB : les sorties d'outil affichent les antislashs doublés ; le fichier a
bien `\d` et `\n` simples (vérifié par exécution).

## ÉTAPE 38 — Flèches d'aide « où porter ce que je tiens »
`majAides()` (appelée chaque image) : une flèche flotte au-dessus des
postes où l'objet porté par un joueur serait utile, tant qu'il est à plus de
`porteeAction + 0,4` ; couleur du joueur. Mêmes règles que le libellé
d'action (`libelleAction`), sauf 'Jeter', 'En panne', 'Contrat non lu' et
'Maintenir pour lancer'. Rien ne s'affiche les mains vides (pas de flèche
sur les étagères/comptoirs : seulement l'aide « tu tiens quelque chose,
va là »). Vérifié par test : mixture → étuves, poudre → alambics, ticket →
tableau, boîte → passe + table, plante → mortiers, vide → aucune.
Piège rencontré : les postes ont `p.centre.{x,z}`, pas `p.x/p.z`.
Non vu à l'écran : lisibilité (deux flèches de même poste, flèche cachée
derrière un décor haut). Si trop bavard, option : ne l'afficher qu'aux
nouveaux joueurs ou le désactiver via le panneau debug.

## ÉTAPE 39 — Orcades : bot complété, incohérence corrigée
`tests/bot_orcades.js` : le bot retire un membre, puis porte la poudre reçue
à un poste (poubelle en priorité) avant de recommencer.
### Corrigé
Après « La Fiancée est démontée » (mesh masqué, `Son.apaise`, +240), la
conscience continuait de monter (jusqu'à 4,7/s) et réveillait le monstre à
répétition. Maintenant : conscience figée à 0 et plus de réveil dès que
`membresRestants <= 0`.
### Mesures (300 s, bots)
3 et 4 bots démontent la Fiancée en 25-30 s ; 1-2 bots n'y arrivent pas
(bloqués à 3-4 membres, conscience ~50-100, 1 réveil de monstre) : cause
non élucidée (monstre qui assomme le bot ? bot coincé ?), à ne pas prendre
pour un résultat d'équilibrage.
### À juger en vrai
À 3+ joueurs l'objectif propre aux Orcades est expédié en ~30 s, après
quoi le monde n'a plus de pression propre (hors marée et contrats).
Pistes : démontage plus long (action maintenue), ou conscience qui reprend
après un répit.

## ÉTAPE 40 — Réglages du son
`Son.muet` existait mais aucune touche ne l'appelait. Ajouts : touche **M**
(muet / son), **-** et **+** (clavier principal ou pavé numérique) pour le
volume (pas de 0,06 sur le gain maître, plage 0,04-0,6, défaut 0,32). Une
annonce confirme (« Volume N % » / « Son coupé »). Mémorisé dans
`localStorage` (`frankencook_son`) et relu au chargement. Vérifié par test
simulé (pas, bornes min/max, bascule muet). Pas de contrôle à l'écran : seul
le clavier de l'écran principal règle le son, ni la manette ni un menu.

## ÉTAPE 41 — Retour à la sélection + accessoires de joueurs
### Retour à la sélection depuis le tableau des scores
Avant : l'écran de fin écrasait `#voile.innerHTML`, l'écran d'accueil (QR,
liste des joueurs) était perdu ; on ne pouvait que relancer ou changer de
monde. Maintenant `terminer()` met de côté les nœuds de l'accueil
(`lobbyNoeuds`, pas un innerHTML : le canvas du QR reste dessiné) et
`retourMenu()` les remet : bouton « Retour à la sélection » ou touche
**Échap**. Phase repassée à 'lobby' ; relancer (Entrée) reconstruit le monde.
### Personnalisation légère
4 accessoires de tête : Bonnet (défaut), Haut-de-forme, Lunettes de
protection, Boulons (cheveux + boulons de Frankenstein). Aux couleurs du
joueur (ruban, monture). On change d'un clic sur sa fiche au lobby
(`changerAccessoire`) ; mémorisé par nom (`localStorage`
`frankencook_perso`), réappliqué à la connexion. `humanoide()` expose
`userData.coiffe` pour masquer le bonnet.
Limites : choix sur l'écran principal seulement (la manette n'en sait rien,
fichier non modifié) ; clic uniquement, pas de touche clavier ; deux joueurs
du même nom partagent le choix. Test simulé OK (cycle, fin → menu → fin →
menu → relance) ; rendu des accessoires non vu.

## ÉTAPE 42 — Aperçu 3D des joueurs à l'accueil
Chaque fiche joueur du lobby affiche maintenant une image du personnage
(accessoire compris, 3/4 face), rafraîchie à chaque changement d'accessoire
ou de joueur. `apercuJoueur(j)` : second `WebGLRenderer` 208×264 créé à la
demande (alpha, `preserveDrawingBuffer`), qui rend une copie (`clone(true)`)
de `j.mesh` puis `toDataURL`. Si le second contexte WebGL échoue, l'aperçu
est désactivé (`Apercu.ok=false`) et l'accueil fonctionne comme avant.
Fiche en colonne (aperçu, avatar + nom, accessoire). Vérifié en simulation :
le rendu est créé et appelé sans erreur ; image réelle non vue (clone inclut
l'étiquette de nom et le halo : à juger visuellement, cadrage 30°, caméra
(0;1,2;4,6)).

## ÉTAPE 43 — Coloris des habits
9 coloris (blanc, rouge, bleu, vert, jaune, violet, orange, rose, noir) qui
recolorent la blouse (torse, bassin, bras) et le pantalon, chacun avec son
pantalon assorti plus sombre. `humanoide()` expose `userData.tenueMat` et
`pantalonMat`. Pastilles cliquables sur la fiche du joueur (lobby) ; clic
sur la pastille ≠ clic sur la fiche (qui change l'accessoire,
`stopPropagation`). **Un coloris = un seul joueur** : les pastilles déjà
prises sont grisées et refusées. Défaut par place : vert, violet, bleu,
rouge (avant : 4 blouses blanches, seule la bande de col différait).
Mémorisé par nom (`localStorage` `frankencook_coloris`) ; si le coloris
mémorisé est déjà pris, repli sur le défaut de la place, sinon le premier
libre. Couleur d'identification du slot (bande de col, bonnet, halo, HUD,
manette) inchangée. Vérifié en simulation : défauts, refus d'un coloris
pris, 4 coloris uniques sur 4 joueurs ; rendu non vu.

## ÉTAPE 44 — Personnalisation depuis la manette : côté écran principal
`controller.html` n'était PAS fourni dans cette session : seul le côté
`index.html` est fait. L'interface de la manette reste à écrire.
### Protocole (via le relais existant, `versPad` / `sock.onmessage`)
- manette → écran : `{ t:'perso', acc?:'hautdeforme', col?:'rouge' }`
  (`acc` ∈ bonnet, hautdeforme, lunettes, boulons ; `col` ∈ blanc, rouge,
  bleu, vert, jaune, violet, orange, rose, noir ; l'un, l'autre ou les deux).
- écran → manette : `{ t:'perso_etat', acc, col, pris:[...], accessoires:
  [{id,nom}], coloris:[{id,nom,hex}], apercu? }` — `pris` = coloris portés
  par les AUTRES joueurs (à griser) ; `apercu` = PNG 208×264 en data-URL,
  seulement quand l'apparence change ; envoyé à chaque rafraîchissement de
  l'accueil et en réponse à chaque `perso`.
- Refus silencieux (mais l'état est renvoyé) : coloris déjà pris,
  accessoire inconnu, partie en cours (changement possible au lobby seulement).
- Code : `definirAccessoire`, `persoDepuisManette`, `diffuserPersos`.
  Vérifié en simulation avec un faux WebSocket (2 téléphones : changement
  accepté, doublon refusé, accessoire invalide ignoré, rien en pleine partie).
### À faire dans controller.html
Au lobby : afficher l'aperçu reçu, des pastilles de coloris (griser `pris`),
et des boutons d'accessoire qui envoient `perso`. Nécessite que le fichier
soit fourni.

## ÉTAPE 45 — Apparence depuis la manette (controller.html)
`controller.html` et `worker.js` fournis. Worker INCHANGÉ : il relaie déjà
n'importe quel message (`to` ciblé host→pad, `id` ajouté pad→host).
### controller.html
- Bouton « Apparence » dans le bandeau, visible dès que l'écran envoie
  `perso_etat` (donc seulement au lobby).
- Panneau plein écran (`#perso`) : aperçu 3D reçu, 4 boutons d'accessoire,
  9 pastilles de coloris (les coloris pris par d'autres sont grisés et ne
  s'envoient pas), bouton OK. Envoie `{t:'perso', acc}` ou `{t:'perso', col}`.
- L'état affiché vient toujours de l'écran (pas d'optimisme local) : une
  pastille refusée ne change rien.
- `perso_fin` (nouveau, envoyé par `demarrer()` de l'écran) ferme le panneau
  et cache le bouton quand la partie commence. Après « Retour à la
  sélection », `perso_etat` revient avec l'accueil.
### Vérifié (tests/e2e_manette.js : faux navigateur + faux relais)
Bouton visible ; 4 accessoires et 9 coloris dessinés ; clic haut-de-forme
→ message correct → appliqué sur l'écran principal ; pastille prise : aucun
envoi ; coloris orange appliqué et renvoyé à la manette ; partie lancée →
bouton et panneau cachés.
### Non vu sur un vrai téléphone
Mise en page du panneau (petit écran, encoche), taille de l'aperçu PNG via
le relais, ordre des événements tactiles (le body a `touch-action:none`,
le panneau le surcharge pour ses boutons).
### Déploiement
Redéployer `index.html` ET `controller.html` ensemble (nouveaux messages).
