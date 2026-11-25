"""Lot « Industrie et recherche » (IR001…) : cas rédigés d'après les cours IR3-IR5 de Tice (qualité, CAPA, vigilances
et PGR, accès au marché, accès dérogatoires, MTI, médico-économie, recherche clinique, DM) et les études de cas UEIR5
(projet de développement d'un candidat médicament, 5 « business units »), sans reprendre les sujets mot pour mot.
Un collègue (joué par l'IA) soumet une situation ; l'étudiant joue le pharmacien de l'entreprise.
usage : python3 -I industrie.py sortie.json"""
import json, random, sys
from industrie_calc import *

THEMES = {
    'ir_controle_qualite': 'Contrôle qualité et libération des lots',
    'ir_stabilite_galenique': 'Stabilité et développement galénique',
    'ir_assurance_qualite': 'Assurance qualité, déviations et CAPA',
    'ir_pharmacovigilance': 'Pharmacovigilance et gestion des risques',
    'ir_essais_cliniques': 'Essais cliniques',
    'ir_acces_marche': 'Accès au marché et médico-économie',
    'ir_dispositifs': 'Dispositifs médicaux',
    'ir_projet_developpement': 'Projet de développement d’un candidat médicament',
}
CAS = []
rng = random.Random(2027)


def cas(theme, spec, apercu, role, sexe, age, situation, plainte, questions, docs=(), sources=(), emotion='neutre', points=()):
    i = len(CAS) + 1
    enonce = (f"INDUSTRIE ET RECHERCHE. Vous êtes {role}. Vous sollicitez le pharmacien (l'étudiant) sur la situation suivante.\n"
              f"{situation}\nRépondez à ses questions avec les éléments du dossier ; ne donnez pas les conclusions à sa place.")
    qs = [{'n': str(k), 'type': t, 'question': q, 'reponse_modele': r} for k, (t, q, r) in enumerate(questions, 1)]
    ds = []
    for d in docs:
        d = dict(d); d.setdefault('libre', True); d.setdefault('origine', 'données simulées pour l’exercice'); ds.append(d)
    CAS.append({
        'id': f'IR{i:03d}', 'theme': theme, 'theme_libelle': THEMES[theme], 'specialites': list(spec), 'apercu': apercu, 'enonce': enonce,
        'questions': qs,
        'indices': {'documents_possibles': [], 'valeurs_chiffrees': sum(c.isdigit() for c in situation) // 6, 'traitement_nomme': False, 'question_verification_traitement': False},
        'documents': ds, 'sources': [{'fichier': 'Cas rédigés (Industrie et recherche, à valider)', 'ids': list(sources) or ['cours IR3-IR5']}],
        'connaissances': {'medicaments': [], 'interactions': [], 'origine': 'cas rédigés d’après les cours IR3-IR5 ; référentiels cités dans les réponses'},
        'pop': 'industrie_recherche', 'pop_origine': 'cas rédigés pour l’outil (à relire)', 'metier': 'industrie et recherche',
        'a_valider': True, 'actif': True,
        'fiche': {'sexe': sexe, 'age': age, 'age_unite': 'ans', 'poids_kg': None, 'taille_cm': None, 'allergies': None, 'traitements': None, 'origine': 'interlocuteur fictif'},
        'patient': {'plainte': plainte, 'emotion': emotion, 'profil': '', 'zone': None, 'symptomes': []},
        'points': list(points),
    })


def tab(titre, colonnes, lignes, sous_titre=''):
    return {'type': 'tableau', 'titre': titre, 'sous_titre': sous_titre, 'colonnes': colonnes, 'lignes': lignes}


def cr(titre, texte):
    return {'type': 'compte_rendu', 'titre': titre, 'texte': texte}


PRODUITS = ['MÉTOPROLINE 100 mg, comprimé', 'LÉVOTHYRINE 75 µg, comprimé', 'APIXOR 5 mg, comprimé pelliculé', 'SERTRADINE 50 mg, gélule',
            'AMLODÉRA 10 mg, comprimé', 'CANDÉSOL 16 mg, comprimé', 'PRÉGALINE 150 mg, gélule', 'RIVAXOR 20 mg, comprimé pelliculé']

# ============================================================== CONTRÔLE QUALITÉ (calculés)
for scen, prod in (('conforme', PRODUITS[1]), ('stade2_ok', PRODUITS[2]), ('stade2_ko', PRODUITS[3])):
    lignes, r, concl = uniformite(rng, scen)
    lot = f"L{rng.randint(24000, 26999)}"
    cas('ir_controle_qualite', ['contrôle qualité'], f"Uniformité de teneur du lot {lot} ({prod.split(',')[0]})",
        "responsable du laboratoire de contrôle qualité d'un site de production de formes sèches", 'Femme', 44,
        f"Lot {lot} de {prod} (teneur cible T = 100 % de la teneur déclarée). L'essai d'uniformité de teneur (Ph. Eur. 2.9.40) vient d'être réalisé ; "
        f"le pharmacien doit conclure avant la revue du dossier de lot par la personne qualifiée. Les résultats individuels (% de la teneur déclarée) sont dans le tableau. "
        f"Le dosage moyen du lot (essai de teneur) est conforme. Aucun incident n'a été noté en compression.",
        f"Bonjour, j'ai les résultats d'uniformité de teneur du lot {lot}, tu peux me dire si on peut le libérer ?",
        [('calcul', "Calculez la valeur d'acceptation (AV) et concluez au stade 1.", r.split('\nStade 2')[0]),
         ('analyse', "Quelle est la suite à donner ?", (r.split('\n')[1] + '\n' if '\n' in r else '') + concl),
         ('analyse', "Qui décide de la libération du lot et sur quelle base ?",
          "La certification du lot revient à la personne qualifiée (pharmacien responsable ou délégué) : elle s'appuie sur le dossier de lot complet (fabrication, conditionnement, contrôles, "
          "déviations clôturées ou évaluées) et sa conformité à l'AMM et aux BPF. Le contrôle qualité seul ne suffit pas : il ne voit que l'échantillon et ce qu'il cherche.")],
        [tab('Uniformité de teneur — résultats individuels', ['Unité', 'Teneur (% de la teneur déclarée)'], lignes, prod)],
        ['Ph. Eur. 2.9.40', 'cours IR4 qualité'])

for cible, prod in (('S2', PRODUITS[0]), ('S3', PRODUITS[5]), ('echec', PRODUITS[6])):
    lignes, r, concl = dissolution(rng, cible)
    lot = f"L{rng.randint(24000, 26999)}"
    cas('ir_controle_qualite', ['contrôle qualité', 'galénique'], f"Essai de dissolution du lot {lot} ({prod.split(',')[0]})",
        "technicien supérieur au contrôle qualité, référent dissolution", 'Homme', 31,
        f"Lot {lot} de {prod}. Spécification de dissolution à libération immédiate : Q = 80 % dissous en 30 minutes (Ph. Eur. 2.9.3, appareil à palette). "
        f"Les résultats unitaires obtenus jusqu'ici sont dans le tableau (le nombre d'unités testées dépend des stades déjà réalisés).",
        f"J'ai fini la dissolution du lot {lot}. Je ne suis pas sûr de la conclusion, tu regardes avec moi ?",
        [('calcul', "Appliquez les critères d'acceptation S1, S2, S3 et concluez.", r + '\n' + concl),
         ('analyse', "Que faire si le résultat est hors spécification ?",
          "Procédure OOS : phase I au laboratoire (erreur évidente ? appareil, milieu, désaération, filtration, calculs) ; si une erreur est démontrée, le résultat est invalidé et l'essai refait. "
          "Sinon phase II : investigation de fabrication (granulation, dureté, lubrification, matière première), éventuel nouvel essai selon un protocole préétabli, jamais « tester jusqu'à conformité ». "
          "Ouverture d'une déviation et d'une CAPA ; lot bloqué jusqu'à décision de la personne qualifiée.")],
        [tab('Dissolution — % dissous à 30 min', ['Unité', '% dissous'], lignes, prod)],
        ['Ph. Eur. 2.9.3', 'cours CAPA (OOS)'])

# OOS dosage : erreur de laboratoire vs pas d'erreur
for erreur in (True, False):
    lot = f"L{rng.randint(24000, 26999)}"
    val = rng.choice([93.4, 93.9, 94.2])
    sit = (f"Dosage HPLC du lot {lot} de {PRODUITS[7]} : {fr(val)} % de la teneur déclarée (spécification 95,0–105,0 %). "
           + ("En relisant le cahier, l'analyste a constaté que la fiole de dilution de l'échantillon était de 100 mL au lieu de 50 mL (erreur notée, témoin d'adéquation du système conforme)."
              if erreur else "Phase I terminée : système chromatographique conforme, étalons conformes, calculs vérifiés, verrerie et dilutions conformes, aucune erreur trouvée. "
              "Le chef d'atelier propose de « refaire 6 dosages et de prendre la moyenne »."))
    cas('ir_controle_qualite', ['contrôle qualité', 'assurance qualité'], f"Résultat hors spécification au dosage (lot {lot})",
        "responsable assurance qualité opérationnelle", 'Femme', 39, sit,
        f"On a un OOS au dosage sur le lot {lot}. Comment on gère ça proprement ?",
        [('analyse', "Comment classez-vous ce résultat et quelle est la démarche ?",
          ("Résultat hors spécification (OOS) avec erreur de laboratoire documentée en phase I (dilution erronée). L'erreur est assignable et prouvée : le résultat initial est invalidé, "
           "l'analyse est refaite sur la même solution mère si possible ou un nouvel échantillonnage selon la procédure ; on trace la cause (CAPA laboratoire : vérification croisée des dilutions, formation)."
           if erreur else
           "OOS confirmé en phase I sans erreur de laboratoire : passer en phase II (investigation étendue à la fabrication : pesées, mélange, uniformité, matière première, autres lots de la campagne). "
           "Refaire 6 dosages et prendre la moyenne est interdit (« testing into compliance », et la moyenne masquerait la variabilité). Un nouvel essai n'est possible que s'il est prévu par la procédure, "
           "avec un nombre défini à l'avance et réalisé par un autre analyste ; un test de valeur aberrante ne s'applique pas à un dosage chimique.")),
         ('analyse', "Quel est le statut du lot et qui doit être informé ?",
          "Lot en quarantaine (bloqué). Déviation ouverte, information de l'AQ et de la personne qualifiée ; si d'autres lots sont concernés (même campagne, même matière première), évaluation d'impact. "
          "Si un lot déjà libéré est concerné : évaluation du risque patient, notification éventuelle à l'ANSM (défaut qualité) et décision de rappel par le pharmacien responsable."),
         ('analyse', "Quelles actions correctives et préventives proposez-vous ?",
          "Cause racine (5 pourquoi, Ishikawa 5M), correction immédiate, actions correctives SMART (procédure, formation, double vérification), actions préventives sur les autres méthodes, "
          "vérification d'efficacité à 3 niveaux (exécution, efficacité à court terme sur les lots suivants, pérennité à 6–12 mois), clôture signée par l'AQ.")],
        [tab('Résultats de dosage', ['Essai', 'Résultat (%)', 'Spécification'], [['Dosage initial', fr(val), '95,0–105,0'], ['Témoin d’adéquation', 'conforme', '—']], PRODUITS[7])],
        ['cours CAPA', 'guide FDA OOS 2006'])

# ============================================================== STABILITÉ ET GALÉNIQUE (calculés)
for pente, bruit, prop, prod in ((-0.085, 0.25, 36, PRODUITS[4]), (-0.16, 0.35, 36, PRODUITS[2]), (-0.12, 0.3, 24, PRODUITS[3])):
    lignes, r, concl, ok = stabilite(rng, pente, bruit, propose=prop)
    cas('ir_stabilite_galenique', ['développement pharmaceutique', 'affaires réglementaires'], f"Durée de conservation de {prod.split(',')[0]} (ICH Q1E)",
        "pharmacien en affaires réglementaires CMC, chargé du module 3 du dossier d'AMM", 'Homme', 47,
        f"Dossier d'AMM de {prod}. Études de stabilité à long terme 25 °C / 60 % HR sur 3 lots pilotes (le tableau donne la moyenne des 3 lots, lots poolables). "
        f"Spécification de fin de vie : titre ≥ 95,0 %. Aucun « changement significatif » en accéléré (40 °C / 75 % HR, 6 mois). Le marketing souhaite une durée de conservation de {prop} mois.",
        f"Le marketing veut {prop} mois de péremption. Avec nos données à 18 mois, on peut le revendiquer ?",
        [('calcul', "Estimez la durée de conservation selon ICH Q1E.", r),
         ('analyse', "Quelle durée proposez-vous dans le dossier et comment l'allonger ensuite ?", concl),
         ('analyse', "Quels autres attributs faut-il examiner que le titre ?",
          "Produits de dégradation (spécifiés, non spécifiés, totaux, seuils ICH Q3B), dissolution, aspect, teneur en eau, dureté/friabilité, microbiologie si pertinent ; "
          "photostabilité (Q1B) ; la durée retenue est celle de l'attribut le plus limitant.")],
        [tab('Stabilité long terme 25 °C / 60 % HR', ['Mois', 'Titre moyen (%)'], lignes, prod)], ['ICH Q1A(R2)', 'ICH Q1E'])

lignes, r, concl = arrhenius(rng)
cas('ir_stabilite_galenique', ['développement pharmaceutique'], "Prévoir la stabilité d'une solution buvable (Arrhenius)",
    "chercheur en développement galénique (préformulation)", 'Femme', 29,
    "Nouvelle solution buvable en préformulation. Dégradation d'ordre 1 de la substance active mesurée à 40, 50 et 60 °C (constantes de vitesse dans le tableau, en jour⁻¹). "
    "La chef de projet demande une première estimation du temps de perte de 10 % à 25 °C pour choisir les conditions des lots cliniques.",
    "On a nos constantes de dégradation à 40, 50 et 60 °C. Tu peux m'estimer le t90 à 25 °C ?",
    [('calcul', "Calculez l'énergie d'activation et le t90 à 25 °C.", r), ('analyse', "Quelles limites à cette estimation ?", concl)],
    [tab('Constantes de vitesse (ordre 1)', ['Température (°C)', 'k (j⁻¹)'], lignes)], ['ICH Q1A(R2)'])

for c_ in ('similaire', 'different', 'rapide'):
    lignes, r, concl, val = f2(rng, c_)
    prod = rng.choice(PRODUITS)
    cas('ir_stabilite_galenique', ['galénique', 'affaires réglementaires'], f"Changement de fournisseur d'excipient : profils de dissolution ({prod.split(',')[0]})",
        "pharmacienne en développement galénique, chargée de la gestion des changements", 'Femme', 36,
        f"{prod} : changement de fournisseur de cellulose microcristalline. Profils de dissolution comparés (12 unités par lot, pH 6,8 ; % dissous moyen) entre le lot de référence (avant changement) "
        f"et le lot test (après changement). CV conformes aux exigences.",
        "On change de fournisseur de cellulose. J'ai les deux profils de dissolution : est-ce qu'ils sont similaires ?",
        [('calcul', "Comparez les profils (f2) et concluez.", r + '\n' + concl),
         ('analyse', "Comment ce changement est-il géré réglementairement ?",
          "Gestion des changements (change control, ICH Q10) : évaluation d'impact qualité, données de comparaison (dissolution, stabilité de suivi), puis variation de l'AMM selon la classification "
          "européenne (règlement 1234/2008 et lignes directrices : changement de fournisseur d'excipient non critique généralement de type IA/IB ; type II si impact sur les performances). "
          "Pas de mise sur le marché de lots modifiés avant que la variation ne soit acceptée quand elle l'exige.")],
        [tab('Profils de dissolution (% dissous)', ['Temps (min)', 'Référence', 'Test'], lignes, prod)], ['EMA CPMP/EWP/QWP/1401/98 Rev.1', 'ICH Q10'])

# ============================================================== ASSURANCE QUALITÉ / CAPA (rédigés)
cas('ir_assurance_qualite', ['assurance qualité', 'microbiologie'], "Contamination en zone de répartition aseptique (grade A)",
    "responsable de l'assurance qualité d'un site de produits injectables stériles", 'Homme', 51,
    "Le monitoring environnemental a trouvé Bacillus sp. sur une boîte de sédimentation en grade A (poste de remplissage des flacons, 3 UFC/4 h ; limite grade A : aucune croissance) "
    "pendant le remplissage du lot 25F112 (40 000 flacons). Lors des 3 dernières semaines, 2 résultats en alerte en grade B dans le sas. Le filtre de la centrale de traitement d'air "
    "n'a pas été changé depuis 18 mois (périodicité prévue 12 mois). Le test de stérilité du lot sera disponible dans 14 jours. Le dernier media fill date de 5 mois.",
    "On a une croissance en grade A pendant le remplissage du lot 25F112. Il faut décider quoi faire du lot et lancer l'investigation.",
    [('analyse', "Quelles actions immédiates (confinement) dans les 24 heures ?",
      "Lot 25F112 en quarantaine ; information de la direction qualité et du pharmacien responsable ; évaluation du risque patient ; identification de la souche (comparaison aux isolats de l'environnement) ; "
      "recherche des autres lots remplis sur la même ligne depuis le dernier résultat conforme ; nettoyage-désinfection renforcés (sporicide pour un Bacillus) ; arrêt de la ligne si nécessaire ; tout documenter."),
     ('analyse', "Le test de stérilité conforme suffira-t-il pour libérer le lot ?",
      "Non : le test de stérilité a une sensibilité très limitée (échantillon). La libération repose sur l'ensemble des preuves de maîtrise du procédé aseptique (BPF annexe 1) : une croissance en grade A "
      "pendant le remplissage remet en cause l'assurance de stérilité ; décision de la personne qualifiée après investigation, le plus souvent rejet si la cause n'est pas exclue."),
     ('analyse', "Menez l'analyse des causes et proposez un plan CAPA.",
      "Ishikawa (5M) : milieu (filtre CTA dégradé, dérive des débits/surpressions, tendance des alertes en grade B ignorée), méthode (procédure de désinfection sans sporicide ou obsolète), "
      "main-d'œuvre (habillage, gestes), matériel (maintenance), matière. Actions : remplacement du filtre, requalification CTA (débits, intégrité HEPA, récupération), sporicide dans la rotation, "
      "revue du plan de maintenance (périodicité respectée et suivie), analyse de tendance du monitoring avec seuils d'alerte réellement suivis, formation ; media fill de requalification ; "
      "vérification d'efficacité (zéro récurrence sur 6–12 mois)."),
     ('analyse', "Quels autres lots et quelles autorités sont concernés ?",
      "Tous les lots remplis depuis la dérive (tendance en grade B) : évaluation d'impact, rappel si un lot libéré est en cause (décision du pharmacien responsable, information de l'ANSM). "
      "Les écarts critiques aux BPF doivent pouvoir être présentés en inspection ; si un produit défectueux a été distribué, déclaration de défaut qualité à l'ANSM.")],
    [tab('Monitoring environnemental (extrait)', ['Date', 'Classe', 'Point', 'Résultat', 'Limite'], [['J−21', 'B', 'sas matériel', '7 UFC/plaque (alerte)', 'action 5 UFC/4 h'], ['J−9', 'B', 'sas personnel', '6 UFC/plaque (alerte)', 'action 5 UFC/4 h'], ['J0', 'A', 'remplissage', '3 UFC/4 h', 'pas de croissance']])],
    ['BPF annexe 1 (2022)', 'cours CAPA'], emotion='anxieux')

cas('ir_assurance_qualite', ['assurance qualité', 'production'], "Confusion d'étuis au conditionnement (mix-up)",
    "chef d'atelier de conditionnement", 'Femme', 42,
    "Une pharmacie a signalé une boîte de PRÉGALINE 150 mg contenant des plaquettes de PRÉGALINE 75 mg (lot 25C044). Le même jour, la ligne 3 a conditionné successivement les deux dosages ; "
    "le vide de ligne a été signé mais la vérification par une seconde personne n'apparaît pas. Le lecteur de code des plaquettes était en maintenance et a été contourné.",
    "Une officine nous signale une boîte de 150 avec des plaquettes de 75. Je pense qu'on a raté le vide de ligne… Qu'est-ce qu'on fait ?",
    [('analyse', "Quelle est la gravité et quelles mesures immédiates ?",
      "Défaut critique (risque de sous-dosage ou de surdosage, confusion de dosage) : blocage des stocks des deux lots, évaluation de l'étendue (combien de boîtes, quels clients), information du pharmacien "
      "responsable qui décide du rappel (niveau pharmacie, voire patient), déclaration du défaut qualité à l'ANSM, communication aux grossistes-répartiteurs."),
     ('analyse', "Quelles causes et quelles actions correctives ?",
      "Causes : vide de ligne sans double vérification, contournement d'un contrôle automatique (lecteur en maintenance sans procédure dégradée validée), enchaînement de dosages proches sans séparation. "
      "Actions : procédure de vide de ligne avec double signature et liste de contrôle, interdiction de produire sans lecteur ou mode dégradé validé avec contrôle à 100 %, séparation physique/temporelle des "
      "dosages, formation, audit des 6 derniers mois de dossiers de lot ; vérification d'efficacité."),
     ('analyse', "Quel rôle joue le dossier de lot dans cette investigation ?",
      "Il retrace toute l'histoire du lot (BPF) : réconciliation des articles (étuis, plaquettes, notices) — un écart de réconciliation non expliqué aurait dû bloquer le lot — signatures, contrôles en cours. "
      "La personne qualifiée a certifié un lot dont le dossier comportait une anomalie : revoir aussi la revue des dossiers de lot.")],
    [], ['BPF chapitre 5', 'cours CAPA'], emotion='anxieux')

cas('ir_assurance_qualite', ['assurance qualité', 'distribution'], "Excursion de température chez un dépositaire (chaîne du froid)",
    "responsable qualité d'un dépositaire (établissement de distribution en gros)", 'Homme', 38,
    "Une palette de vaccins (2–8 °C) est restée 5 h 40 à 13 °C sur un quai à la suite d'une panne de la chambre froide. Données de stabilité du fabricant (sur demande) : "
    "exposition cumulée tolérée jusqu'à 25 °C pendant 72 h sans impact. L'enregistreur montre une seule excursion. Les clients attendent la livraison demain.",
    "On a eu une panne de chambre froide, une palette de vaccins est restée presque six heures à 13 °C. On peut livrer demain ?",
    [('analyse', "Quelle démarche avant toute livraison ?",
      "Mettre la palette en quarantaine, documenter l'excursion (durée, température maximale, données de l'enregistreur), informer l'exploitant/fabricant qui seul juge de l'impact à partir de ses données de stabilité, "
      "et attendre sa décision écrite. Ici l'exposition (5 h 40 à 13 °C) est dans le budget toléré (72 h jusqu'à 25 °C) : remise en stock probable, en décomptant l'exposition consommée."),
     ('analyse', "Quels textes encadrent cette situation et quelles actions correctives ?",
      "Bonnes pratiques de distribution (BPD) : maîtrise des températures, cartographie et qualification des zones, alarmes, plan de continuité. Actions : réparation, alarme reliée à une astreinte, "
      "procédure de transfert vers une chambre de secours, revue de la maintenance, formation ; déviation et CAPA tracées.")],
    [], ['BPD (2014)'])

cas('ir_assurance_qualite', ['assurance qualité', 'gestion des risques'], "Analyse de risques (AMDEC) sur une nouvelle ligne de remplissage",
    "ingénieur qualité en charge de la qualification d'une nouvelle ligne", 'Femme', 33,
    "Nouvelle ligne de remplissage de seringues préremplies. L'équipe a coté trois modes de défaillance (gravité G, occurrence O, détectabilité D, de 1 à 10) : "
    "1) fuite au piston : G 8, O 3, D 4 ; 2) bulle d'air > 2 mm : G 4, O 6, D 3 ; 3) particule visible : G 9, O 2, D 6. Seuil d'action interne : criticité ≥ 100.",
    "On a coté notre AMDEC sur la nouvelle ligne de seringues. Tu m'aides à prioriser les actions ?",
    [('calcul', "Calculez la criticité de chaque mode et priorisez.",
      "Criticité = G × O × D : fuite au piston 8 × 3 × 4 = 96 ; bulle d'air 4 × 6 × 3 = 72 ; particule visible 9 × 2 × 6 = 108. Seule la particule visible dépasse le seuil (≥ 100) : priorité 1. "
      "Mais la gravité élevée (8–9) justifie aussi des actions sur la fuite au piston, même sous le seuil (on ne se fie pas au seul produit)."),
     ('analyse', "Quelles actions pour réduire la criticité des particules ?",
      "Réduire l'occurrence (nettoyage des composants, maîtrise des sources : frottements, joints, environnement) et surtout améliorer la détection (inspection visuelle automatisée qualifiée avec kits de défauts, "
      "inspection à 100 %, niveaux AQL), puis recoter. Cadre : ICH Q9 (gestion du risque qualité), BPF annexe 1.")],
    [], ['ICH Q9(R1)'])

cas('ir_assurance_qualite', ['assurance qualité'], "Réclamation : signature manquante et dossier de lot",
    "pharmacienne responsable de l'assurance qualité système", 'Femme', 46,
    "Un audit interne a trouvé une signature manquante à l'étape de vérification de l'étiquetage du dossier de lot 25B201 (10 000 boîtes, déjà libéré). Le contrôle a bien été fait (photo horodatée de la ligne) "
    "mais l'opérateur ne savait pas que la signature était obligatoire : la dernière révision de la procédure a omis cette mention.",
    "L'audit a trouvé une signature manquante dans le dossier de lot 25B201. Le lot est sur le marché : c'est grave ?",
    [('analyse', "Classez la déviation et dites si le lot est impacté.",
      "Déviation mineure documentaire : le contrôle a été réalisé (preuve objective), pas d'impact sur la qualité du produit ; pas de rappel. On complète le dossier par une note signée datée expliquant l'écart (pas de signature antidatée)."),
     ('analyse', "Quelle cause racine et quel plan CAPA ?",
      "5 pourquoi : opérateur non informé ← procédure peu claire ← révision ayant supprimé la clause ← pas de relecture croisée des procédures critiques. Actions : révision de la procédure, formation, "
      "revue rétrospective des dossiers des 6 derniers mois, relecture en double des procédures critiques ; vérification d'efficacité (zéro récurrence à 6 mois). Délai cible pour une CAPA mineure : 6–8 semaines.")],
    [], ['cours CAPA (cas pratique)'])

# nettoyage : MACO
pde, lot_kg, dmax = rng.choice([(0.01, 100, 1000), (0.005, 150, 800), (0.02, 80, 1500)])
m = maco(pde, lot_kg, dmax)
cas('ir_assurance_qualite', ['assurance qualité', 'production'], "Validation du nettoyage : limite de résidus (MACO)",
    "pharmacien de production responsable de la validation du nettoyage", 'Homme', 41,
    f"Un mélangeur est partagé entre le produit A (substance très active, PDE = {fr(pde, 3)} mg/jour d'après l'évaluation toxicologique) et le produit B fabriqué ensuite "
    f"(taille de lot {lot_kg} kg, dose journalière maximale de B : {dmax} mg). Surface de contact de l'équipement : 25 m² ; écouvillonnage de 100 cm², taux de récupération 80 %.",
    "On doit fixer la limite de nettoyage entre A et B sur le mélangeur. Tu peux me faire le calcul ?",
    [('calcul', "Calculez la quantité maximale de A admissible dans le lot de B (MACO) puis la limite par écouvillon.",
      f"MACO = PDE(A) × taille du lot B / dose journalière max de B = {fr(pde, 3)} mg × {lot_kg} 000 000 mg / {dmax} mg = {fr(m, 0)} mg de A au plus dans tout le lot de B. "
      f"Par surface partagée : {fr(m, 0)} mg / 250 000 cm² = {fr(m * 1000 / 250000, 2)} µg/cm², soit {fr(m * 1000 / 250000 * 100, 0)} µg par écouvillon de 100 cm² ; "
      f"le prélèvement ne récupère que 80 % : la limite à appliquer au résultat analytique est {fr(m * 1000 / 250000 * 100 * 0.8, 0)} µg par écouvillon. "
      "On retient la plus basse de cette limite et des limites pratiques (propreté visuelle, 10 ppm), et la méthode analytique doit quantifier en dessous."),
     ('analyse', "Pourquoi utiliser la PDE plutôt que l'ancien critère « 1/1000 de la dose » ?",
      "Depuis la ligne directrice EMA de 2014 (installations partagées), la limite repose sur une valeur toxicologique (PDE) fondée sur les données de sécurité, plus pertinente pour les substances très actives "
      "(cytotoxiques, hormones, sensibilisants) ; si la PDE est très basse, des installations dédiées peuvent être nécessaires. La méthode analytique doit être validée (spécificité, limite de quantification sous la limite).")],
    [], ['EMA/CHMP/CVMP/SWP/169430/2012', 'BPF annexe 15'])

cas('ir_assurance_qualite', ['assurance qualité', 'RSE'], "Système qualité : ISO 9001, BPF et démarche RSE",
    "directeur du site, qui prépare la revue de direction", 'Homme', 55,
    "Le site est certifié ISO 9001 et ISO 14001 et inspecté par l'ANSM au titre des BPF. Le directeur s'interroge : la certification ISO 9001 dispense-t-elle des BPF ? "
    "Il souhaite aussi engager une démarche RSE (ISO 26000) et réduire l'empreinte carbone (solvants, chaîne du froid, emballages).",
    "On est certifiés ISO 9001 : est-ce que ça suffit pour l'ANSM ? Et par où commencer sur la RSE ?",
    [('analyse', "ISO 9001 et BPF : quelles différences ?",
      "ISO 9001 : norme volontaire de management de la qualité (satisfaction client, approche processus, amélioration continue PDCA), certifiée par un organisme tiers. "
      "BPF : exigences réglementaires obligatoires pour tout établissement pharmaceutique (directive 2001/83/CE, CSP), vérifiées par inspection de l'autorité ; ICH Q10 s'appuie sur ISO 9001 et les BPF. "
      "La certification ISO ne dispense pas des BPF."),
     ('analyse', "Comment structurer une démarche RSE dans un site pharmaceutique ?",
      "ISO 26000 (lignes directrices, non certifiable) : identifier les parties prenantes, analyse de matérialité, objectifs mesurables (bilan carbone, solvants, eau, déchets, emballages, achats responsables, "
      "conditions de travail), indicateurs, rapport (CSRD pour les grandes entreprises) ; toute modification (emballage, procédé) passe par la gestion des changements et, si besoin, une variation d'AMM.")],
    [], ['cours IR4 qualité', 'cours RSE'])

# ============================================================== PHARMACOVIGILANCE
for (a, b, c, d, med, eff) in ((14, 2986, 120, 497880, 'SERTRADINE', 'hyponatrémie'), (4, 1796, 260, 497940, 'APIXOR', 'alopécie'), (25, 4975, 210, 994790, 'PRÉGALINE', 'œdème périphérique')):
    p, lo, hi, chi = prr(a, b, c, d)
    signal = p >= 2 and chi >= 4 and a >= 3
    cas('ir_pharmacovigilance', ['pharmacovigilance'], f"Détection de signal : {med} et {eff} (PRR)",
        "responsable de la détection du signal dans le service de pharmacovigilance d'un laboratoire", 'Femme', 37,
        f"Revue mensuelle de la base de sécurité : couple {med} – {eff}. Notifications spontanées : {a} cas de {eff} sous {med} sur {a + b} notifications pour {med} ; "
        f"{c} cas de {eff} sur {c + d} notifications pour tous les autres médicaments de la base.",
        f"J'ai un couple {med} – {eff} qui ressort. Tu peux calculer la disproportionnalité et me dire si c'est un signal ?",
        [('calcul', "Calculez le PRR et concluez selon les critères d'Evans.",
          f"Tableau 2×2 : a = {a}, b = {b}, c = {c}, d = {d}. PRR = [a/(a+b)] / [c/(c+d)] = {fr(a / (a + b) * 100, 2)} % / {fr(c / (c + d) * 100, 3)} % = {fr(p, 2)} "
          f"(IC95 % {fr(lo, 2)}–{fr(hi, 2)}) ; χ² (Yates) = {fr(chi, 1)}. Critères d'Evans : PRR ≥ 2, χ² ≥ 4 et au moins 3 cas → "
          f"{'signal statistique à valider' if signal else 'pas de signal statistique à ce stade'}."),
         ('analyse', "Que faire ensuite ?",
          ("Un signal statistique n'est pas une preuve de causalité : revue clinique des cas (chronologie, dé/réintroduction, facteurs de confusion — âge, diurétiques pour une hyponatrémie), littérature, "
           "plausibilité pharmacologique, données d'essais ; si le signal est validé, information de l'autorité (EudraVigilance/PRAC via le processus européen de gestion des signaux), mise à jour du PSUR et, "
           "le cas échéant, du RCP et du PGR." if signal else
           "Pas de signal statistique, mais la disproportionnalité est un outil de tri : poursuivre la surveillance (cumul des cas), revue qualitative si cas graves ou d'évolution inhabituelle. "
           "Limites : sous-notification (≈ 5 à 10 % des effets graves notifiés), biais de notification, pas de dénominateur (pas d'incidence).")),
         ('analyse', "Quelles sont les limites de la notification spontanée ?",
          "Sous-notification, biais (notoriété, nouveauté, médiatisation), qualité variable des observations, détection surtout des effets de délai court, absence de dénominateur : on ne peut pas calculer une fréquence.")],
        [tab('Tableau de contingence', ['', f'{eff}', 'autres effets'], [[med, str(a), str(b)], ['autres médicaments', str(c), str(d)]])], ['Evans SJW 2001', 'cours Vigilances et PGR'])

cas('ir_pharmacovigilance', ['pharmacovigilance', 'essais cliniques'], "Effet grave inattendu dans un essai de phase III (SUSAR)",
    "médecin de pharmacovigilance clinique chez le promoteur", 'Homme', 49,
    "Essai de phase III en double aveugle (médicament expérimental X contre placebo). Le 3 mars, l'investigateur d'un centre français déclare au promoteur une hépatite fulminante avec greffe hépatique "
    "chez une patiente de 58 ans ; il juge le lien avec le traitement « possible ». La brochure investigateur ne mentionne pas d'atteinte hépatique grave. La levée d'aveugle (par une personne indépendante) "
    "montre que la patiente recevait X.",
    "On a reçu une hépatite fulminante dans l'essai, avec greffe. Je dois tout déclarer dans les temps, tu vérifies avec moi ?",
    [('analyse', "Est-ce un SUSAR ? Justifiez.",
      "Oui : effet indésirable grave (mise en jeu du pronostic vital, hospitalisation, séquelle), suspecté (lien possible retenu par l'investigateur ; le promoteur ne peut pas abaisser cette imputabilité, "
      "les deux avis sont notés), et inattendu au regard du document de référence (brochure investigateur pour un produit sans AMM). Sous X (levée d'aveugle) : c'est un SUSAR (sous placebo, ce n'en serait pas un)."),
     ('analyse', "Quels délais et quelles voies de déclaration ?",
      "Mise en jeu du pronostic vital : déclaration dans EudraVigilance (module essais cliniques) sans délai et au plus tard 7 jours après que le promoteur en a eu connaissance (soit le 10 mars), "
      "rapport de suivi dans les 8 jours suivants. Délai de 15 jours pour les autres SUSAR. L'investigateur devait déclarer sans délai (au plus tard 24 h). Déclaration directe à l'ANSM en plus seulement "
      "pour les essais chez les volontaires sains en France."),
     ('analyse', "Quelles autres conséquences pour l'essai ?",
      "Évaluation du rapport bénéfice/risque ; mesures urgentes de sécurité si nécessaire (surveillance hépatique renforcée, critères d'arrêt, suspension des inclusions) avec information de l'autorité et du CPP ; "
      "modification substantielle du protocole et de la brochure investigateur ; information des investigateurs et des participants ; mise à jour du rapport annuel de sécurité (DSUR).")],
    [], ['règlement (UE) 536/2014', 'cours Vigilances et PGR'], emotion='anxieux')

cas('ir_pharmacovigilance', ['pharmacovigilance'], "Validité d'une notification et critères de gravité",
    "chargée de pharmacovigilance au service d'information médicale", 'Femme', 28,
    "Trois appels reçus ce matin : 1) une infirmière signale « des vertiges chez un patient sous AMLODÉRA », sans âge ni sexe ni initiales ; 2) un pharmacien signale une éruption bulleuse étendue chez "
    "une femme de 72 ans sous CANDÉSOL, hospitalisée ; 3) un patient décrit des maux de tête sous MÉTOPROLINE (homme, 50 ans).",
    "J'ai trois signalements ce matin. Lesquels sont des cas valides, et lesquels sont graves ?",
    [('analyse', "Lesquels sont des cas valides ?",
      "Un cas valide comporte 4 éléments : un notificateur identifiable, un patient identifiable (âge, sexe, tranche d'âge ou initiales), un médicament suspect, un effet indésirable. "
      "Cas 1 incomplet (patient non identifiable) : relancer pour compléter. Cas 2 et 3 valides (les signalements de patients sont recevables)."),
     ('analyse', "Lesquels sont graves et dans quels délais déclarer ?",
      "Grave = décès, mise en jeu du pronostic vital, hospitalisation ou prolongation, invalidité/incapacité, anomalie congénitale, ou médicalement important. Cas 2 grave (hospitalisation, éruption bulleuse : "
      "rechercher un syndrome de Stevens-Johnson / Lyell). Pour le titulaire d'AMM : effets graves déclarés dans EudraVigilance sous 15 jours, non graves sous 90 jours.")],
    [], ['cours Vigilances et PGR', 'BPPV'])

cas('ir_pharmacovigilance', ['pharmacovigilance', 'affaires réglementaires'], "Construire le plan de gestion des risques d'un nouvel anticorps",
    "pharmacien en affaires réglementaires qui prépare le dossier d'AMM centralisée d'un anticorps anti-PD-1", 'Homme', 34,
    "Nouvel anticorps anti-PD-1 (développement en mélanome métastatique). Données : 1 100 patients exposés, effets immunologiques (colite, hépatite, thyroïdite, pneumopathie), "
    "pas de données chez la femme enceinte, l'insuffisant hépatique sévère ni le greffé d'organe.",
    "Je dois rédiger le PGR pour notre anti-PD-1. Tu m'aides à structurer les risques et les mesures ?",
    [('analyse', "Quelles sont les spécifications de sécurité ?",
      "Risques importants identifiés : effets indésirables d'origine immunologique (pneumopathie, colite, hépatite, endocrinopathies, néphrite, atteintes cutanées sévères), réactions à la perfusion. "
      "Risques importants potentiels : rejet de greffe d'organe, réactions graves en association. Informations manquantes : grossesse/allaitement, insuffisance hépatique sévère, patients avec maladie auto-immune, "
      "greffés. Plus l'épidémiologie de l'indication et les limites de la population exposée."),
     ('analyse', "Quel plan de pharmacovigilance et quelles mesures de minimisation ?",
      "Pharmacovigilance de routine (notifications, PSUR selon la liste EURD) + études post-AMM si nécessaire (registre, étude de sécurité). Minimisation de routine : RCP, notice, conditionnement, "
      "prescription réservée (spécialistes en oncologie, réserve hospitalière). Mesures additionnelles : guide de prise en charge des effets immunologiques pour les professionnels et carte d'alerte patient, "
      "dont le contenu est validé par chaque autorité nationale ; mesure de l'efficacité de ces mesures."),
     ('analyse', "Ce médicament sera-t-il sous surveillance supplémentaire ?",
      "Oui : nouvelle substance active biologique → triangle noir inversé sur la notice et le RCP pendant 5 ans (liste tenue par le PRAC, révisée chaque mois). Ce n'est pas un signe de danger particulier, "
      "mais une incitation à notifier.")],
    [], ['GVP module V', 'cours Vigilances et PGR (exemple Keytruda)'])

cas('ir_pharmacovigilance', ['pharmacovigilance'], "Bénéfice/risque : risque relatif contre risque absolu",
    "directeur médical qui prépare une réponse au PRAC", 'Femme', 52,
    "Un antiagrégant en prévention secondaire réduit de 20 % (en relatif) les AVC ischémiques (risque de base 10 % sur la durée de suivi) et augmente de 20 % (en relatif) les AVC hémorragiques "
    "(risque de base 1 %). Un article de presse titre : « autant de risque que de bénéfice ».",
    "La presse dit que notre médicament a autant de risque que de bénéfice : +20 % contre −20 %. Comment on répond ?",
    [('calcul', "Comparez bénéfice et risque en termes absolus pour 1 000 patients traités.",
      "Bénéfice : 10 % × 20 % = 2 % → 20 AVC ischémiques évités pour 1 000 patients. Risque : 1 % × 20 % = 0,2 % → 2 AVC hémorragiques provoqués pour 1 000. "
      "Bilan : environ 18 événements graves évités pour 1 000 patients traités (nombre de sujets à traiter pour éviter 1 AVC ischémique : 50 ; nombre pour en provoquer 1 hémorragique : 500)."),
     ('analyse', "Quelles précautions de raisonnement ?",
      "Comparer des événements de gravité comparable (un AVC hémorragique est souvent plus grave), raisonner en risque absolu selon le risque de base de la population, identifier les sous-groupes où le rapport s'inverse "
      "(risque hémorragique élevé, faible risque ischémique) ; communication factuelle aux professionnels.")],
    [], ['cours Vigilances et PGR'])

# ============================================================== ESSAIS CLINIQUES (protocoles réels de ClinicalTrials.gov)
ESSAIS = [
    ('NCT07025629', 'DAPA-ICU', "dapagliflozine 10 mg contre placebo pendant 1 an après une sortie de réanimation (AP-HP, phase III)",
     "inclusion : ≥ 18 ans ; ventilation mécanique et/ou vasopresseurs plus de 24 h ; sortie de réanimation prévue ; consentement signé ; NT-proBNP > 800 ng/L ou BNP > 90 ng/L et/ou DFG entre 25 et 90 mL/min/1,73 m². "
     "Exclusion notamment : grossesse, allaitement, DFG < 25, dapagliflozine avant l'admission, cirrhose Child-Pugh C, infection urinaire ou périnéale pendant le séjour ou escarre sacrée, patients pour qui la dapagliflozine est déjà "
     "recommandée (diabète de type 2 mal équilibré, insuffisance cardiaque chronique symptomatique, maladie rénale chronique éligible), absence d'assurance maladie (ou AME), participation à une autre étude interventionnelle.",
     "Homme de 67 ans, choc septique d'origine urinaire (pyélonéphrite), 4 jours de noradrénaline, sortie prévue demain. NT-proBNP 2 100 ng/L, DFG 41 mL/min/1,73 m². Pas de diabète. Consentement possible.",
     "Non éligible : infection urinaire pendant le séjour en réanimation = critère d'exclusion (risque d'infection génito-urinaire sous inhibiteur de SGLT2), bien que les critères d'inclusion (vasopresseurs > 24 h, NT-proBNP, DFG) soient remplis."),
    ('NCT05410275', 'CARD-AXA', "pharmacocinétique de 3 doses réduites de rivaroxaban (5, 10, 15 mg/j) chez l'hémodialysé (CHU de Tours, phase III)",
     "inclusion : ≥ 18 ans, hémodialyse chronique depuis ≥ 3 mois, affilié à la sécurité sociale, consentement écrit. Exclusion notamment : toute indication d'anticoagulation au long cours (FA, MTEV, valve mécanique…), "
     "double antiagrégation ou aspirine > 160 mg/j, PA > 180/110, AVC ischémique ou chirurgie < 30 jours, antécédent d'hémorragie majeure, thrombopénie < 100 G/L, insuffisance hépatique sévère, "
     "inducteur puissant du CYP3A4 (rifampicine, millepertuis, carbamazépine, phénytoïne, phénobarbital), grossesse/allaitement, tutelle/curatelle, autre étude < 30 jours.",
     "Femme de 61 ans, hémodialysée depuis 2 ans, épilepsie traitée par carbamazépine, aspirine 75 mg/j, PA 150/85, plaquettes 210 G/L.",
     "Non éligible : carbamazépine = inducteur puissant du CYP3A4 (diminue l'exposition au rivaroxaban et fausserait la pharmacocinétique étudiée). L'aspirine à 75 mg/j n'est pas un motif d'exclusion."),
    ('NCT06790693', 'INAVO123', "inavolisib + inhibiteur de CDK4/6 + létrozole contre placebo + CDK4/6 + létrozole en 1re ligne (Roche, phase III)",
     "inclusion : cancer du sein RH+ HER2− avancé, mutation PIK3CA, de novo ou en rechute après ≥ 2 ans d'hormonothérapie adjuvante et ≥ 1 an sans maladie après sa fin, maladie mesurable RECIST 1.1, ECOG 0–1. "
     "Exclusion notamment : traitement systémique antérieur au stade avancé, diabète de type 2 nécessitant un traitement systémique ou diabète de type 1, métastases cérébrales actives non traitées, "
     "maladie inflammatoire de l'intestin, inhibiteurs ou inducteurs puissants du CYP3A4 dans les 4 semaines.",
     "Femme de 63 ans, cancer du sein RH+ HER2− métastatique osseux et hépatique (lésion hépatique mesurable 24 mm), PIK3CA muté, rechute 3 ans après la fin de 5 ans d'anastrozole, ECOG 1, diabète de type 2 sous metformine.",
     "Non éligible : diabète de type 2 nécessitant un traitement systémique (metformine) — l'inhibition de PI3Kα par l'inavolisib provoque des hyperglycémies. Tous les autres critères sont remplis."),
    ('NCT06767514', 'HARMONi-7', "ivonescimab (anticorps bispécifique PD-1 × VEGF) contre pembrolizumab en 1re ligne du CBNPC métastatique PD-L1 élevé (phase III)",
     "inclusion : ≥ 18 ans, ECOG 0–1, CBNPC stade IV épidermoïde ou non, PD-L1 TPS > 50 % (22C3), ≥ 1 lésion mesurable non cérébrale, aucun traitement systémique au stade métastatique. "
     "Exclusion notamment : altération génomique ciblable disposant d'un traitement de 1re ligne approuvé (recherche exigée pour les non épidermoïdes), métastases cérébrales symptomatiques ou ≥ 1,5 cm, "
     "maladie auto-immune ou pulmonaire nécessitant un traitement systémique, neuropathie ≥ grade 2, pneumopathie non infectieuse ayant nécessité des corticoïdes.",
     "Homme de 58 ans, adénocarcinome pulmonaire stade IV, PD-L1 70 %, mutation EGFR exon 19 (délétion), ECOG 0, pas de métastase cérébrale.",
     "Non éligible : mutation EGFR (délétion de l'exon 19) = altération ciblable avec un traitement de 1re ligne approuvé (osimertinib). PD-L1 élevé ne suffit pas."),
    ('NCT06878261', 'JOURNEY', "tézépélumab contre placebo dans la BPCO modérée à très sévère avec exacerbations (AstraZeneca, phase III)",
     "inclusion : 40 à 80 ans, BPCO ≥ 1 an, VEMS post-bronchodilatateur 20–70 % et VEMS/CVF < 0,70, trithérapie (ou bithérapie) inhalée ≥ 3 mois, ≥ 2 exacerbations modérées ou ≥ 1 sévère dans l'année, "
     "éosinophiles ≥ 150/µL, CAT ≥ 15, tabagisme ≥ 10 paquets-années. Exclusion notamment : autre maladie respiratoire, asthme, tuberculose traitée < 12 mois, cancer actuel ou passé, immunosuppresseurs, "
     "macrolides depuis < 6 mois, oxygénothérapie > 4 L/min.",
     "Homme de 69 ans, BPCO, VEMS 45 %, VEMS/CVF 0,52, trithérapie depuis 2 ans, 1 exacerbation hospitalisée l'an dernier, éosinophiles 320/µL, CAT 21, 40 paquets-années, carcinome basocellulaire opéré il y a 4 ans.",
     "Non éligible en l'état du critère tel qu'écrit (« malignités actuelles ou passées ») : le carcinome basocellulaire opéré est un antécédent de cancer. À faire préciser au promoteur (de nombreux protocoles "
     "exceptent les carcinomes cutanés non mélaniques traités) : question d'éligibilité à poser au moniteur, jamais tranchée seul."),
]
for nct, acr, design, crit, patient, rep in ESSAIS:
    cas('ir_essais_cliniques', ['recherche clinique'], f"Éligibilité d'un patient à l'essai {acr} ({nct})",
        f"attaché(e) de recherche clinique (ARC) du promoteur pour l'essai {acr}", rng.choice(['Femme', 'Homme']), rng.randint(27, 45),
        f"Essai {acr} ({nct}, ClinicalTrials.gov) : {design}. Critères (résumé) — {crit}\nUn investigateur propose d'inclure : {patient}",
        f"L'investigateur veut inclure un patient dans {acr} demain. Tu peux vérifier son éligibilité avant qu'on randomise ?",
        [('analyse', "Le patient est-il éligible ?", rep),
         ('analyse', "Que se passe-t-il si un patient non éligible est inclus ?",
          "Déviation majeure au protocole (non-respect des critères) : à documenter et déclarer au promoteur ; le patient peut être exposé à un risque ; selon le protocole, arrêt du traitement à l'étude ou "
          "poursuite après accord médical, et analyse statistique en intention de traiter avec analyse de sensibilité. Prévention : liste de contrôle des critères signée par l'investigateur avant randomisation."),
         ('analyse', "Quel cadre réglementaire pour cet essai en France ?",
          "Essai clinique de médicament (règlement européen 536/2014, catégorie 1 de la loi Jardé) : autorisation via le portail européen CTIS (évaluation ANSM pour la partie I) et avis d'un CPP tiré au sort (partie II), "
          "consentement écrit, assurance du promoteur, conformité CNIL (MR-001), bonnes pratiques cliniques (ICH E6). La PUI de chaque centre reçoit, stocke et dispense les médicaments expérimentaux (traçabilité, insu).")],
        [], [nct, 'ClinicalTrials.gov', 'cours Recherche clinique'])

cas('ir_essais_cliniques', ['recherche clinique', 'pharmacie'], "Excursion de température d'un médicament expérimental",
    "pharmacien de la PUI référent essais cliniques d'un CHU", 'Femme', 35,
    "Le week-end, la sonde du réfrigérateur dédié aux essais a enregistré 11 °C pendant 9 heures (stockage prévu 2–8 °C). Il contient 14 kits d'un anticorps expérimental en double aveugle et "
    "2 kits d'un comparateur commercial. Un patient doit recevoir sa perfusion lundi à 10 h.",
    "Le frigo des essais est monté à 11 °C ce week-end. On a un patient à perfuser lundi : qu'est-ce qu'on fait des kits ?",
    [('analyse', "Quelle conduite à tenir immédiate ?",
      "Mettre les kits en quarantaine dans un réfrigérateur conforme (étiquetés « ne pas utiliser »), relever les données de l'enregistreur, déclarer l'excursion au promoteur (formulaire prévu par le protocole), "
      "qui seul décide de l'utilisabilité d'après ses données de stabilité ; ne pas dispenser avant sa réponse ; si besoin, demander un réapprovisionnement urgent ou décaler l'administration avec l'investigateur."),
     ('analyse', "Pourquoi ne pas trier soi-même les kits de produit actif et de placebo ?",
      "La PUI ne doit pas lever l'insu : la décision porte sur tous les kits sans distinction ; le promoteur répond par numéro de kit. Traçabilité complète (déviation, CAPA : alarme reliée à une astreinte, "
      "procédure de secours) ; archivage 25 ans des documents de l'essai.")],
    [], ['cours Recherche clinique (rôle de la PUI)', 'BPC'])

# ============================================================== ACCÈS AU MARCHÉ, ACCÈS DÉROGATOIRES, MÉDICO-ÉCONOMIE
cas('ir_acces_marche', ['accès au marché'], "Du SMR au prix : avis de la commission de la transparence",
    "responsable de l'accès au marché d'une filiale française", 'Femme', 41,
    "Nouvel antidiabétique oral, AMM européenne obtenue. Étude pivot de non-infériorité contre un iDPP-4 (HbA1c), sans donnée de morbi-mortalité. "
    "Le siège espère une ASMR III et un prix supérieur de 30 % au comparateur.",
    "On a l'AMM. Le siège vise une ASMR III et 30 % de plus que le comparateur… c'est réaliste ?",
    [('analyse', "Quels sont les critères du SMR et le niveau attendu ?",
      "SMR (indication par indication) : efficacité et effets indésirables, place dans la stratégie thérapeutique, gravité de l'affection, caractère préventif/curatif/symptomatique, intérêt de santé publique. "
      "Pour un antidiabétique efficace sur l'HbA1c dans une maladie grave : SMR vraisemblablement important (taux de remboursement de 65 %)."),
     ('analyse', "Quelle ASMR attendre et pourquoi ?",
      "Probablement ASMR V : démonstration de non-infériorité sur un critère intermédiaire (HbA1c), sans supériorité en morbi-mortalité ni en tolérance. L'ASMR dépend de la qualité de la démonstration "
      "(comparateur pertinent, critère, schéma), de la quantité d'effet et de sa pertinence clinique, et du besoin médical."),
     ('analyse', "Quelles conséquences sur le prix ?",
      "Le prix est négocié avec le CEPS (avis de la CT non contraignant pour lui, mais structurant). Avec une ASMR V, le médicament ne peut être inscrit que s'il procure une économie dans le coût du traitement "
      "(art. R.163-5 CSS) : prix inférieur ou égal au comparateur, pas +30 %. Une ASMR I à III permet de revendiquer un prix européen cohérent (garantie de prix) ; avis d'efficience de la CEESP si ASMR I–III "
      "et chiffre d'affaires prévisionnel > 20 M€.")],
    [], ['cours Accès au marché (PRville)', 'doctrine CT'])

cas('ir_acces_marche', ['accès au marché', 'affaires réglementaires'], "Accès précoce (AAP) avant l'AMM",
    "directeur médical d'une biotech française", 'Homme', 48,
    "Thérapie ciblée dans une leucémie aiguë rare en rechute après 2 lignes, sans traitement approprié. Phase II monobras : 42 % de rémissions complètes ; demande d'AMM prévue dans 10 mois. "
    "Des hématologues réclament le produit pour leurs patients.",
    "Les hématologues veulent notre molécule avant l'AMM. Quel dispositif on peut demander, et qu'est-ce que ça nous engage ?",
    [('analyse', "Quel dispositif et quels critères ?",
      "Autorisation d'accès précoce pré-AMM (AP1, art. L.5121-12 CSP), demandée par l'industriel à la HAS (décision du collège sur avis conforme de l'ANSM pour le rapport bénéfice/risque). "
      "5 critères : maladie grave, rare ou invalidante ; pas de traitement approprié ; mise en œuvre ne pouvant être différée ; efficacité et sécurité fortement présumées ; présomption d'innovation "
      "(nouvelle modalité de prise en charge, besoin non couvert, plan de développement adapté). Instruction en 3 mois (4 au plus)."),
     ('analyse', "Quels engagements pour le laboratoire ?",
      "Mettre le médicament à disposition dans les 2 mois ; déposer l'AMM dans le délai fixé (≤ 2 ans) ; demander le remboursement dans le mois suivant l'AMM ; financer le recueil de données (PUT-RD) ; "
      "assurer la continuité des traitements 1 an après l'arrêt de la prise en charge ; prix libre pendant l'accès précoce mais remises rétroactives (sur la base du prix ensuite négocié)."),
     ('analyse', "Et si un seul patient est concerné, sans projet d'AMM dans l'indication ?",
      "Autorisation d'accès compassionnel (AAC), demandée par le prescripteur à l'ANSM pour un patient nommément désigné ; le cadre de prescription compassionnelle (CPC, ex-RTU) sécurise un usage hors AMM "
      "d'un médicament déjà autorisé dans une autre indication.")],
    [], ['cours Accès dérogatoires', 'doctrine HAS accès précoce'])

for cA, eA, cB, eB, nom in ((48000, 4.1, 93000, 5.6, 'immunothérapie'), (21000, 2.3, 19500, 2.5, 'injection mensuelle'), (61000, 6.2, 66000, 6.0, 'nouvelle formulation')):
    dc, de, ratio, typ = rdcr(cA, eA, cB, eB)
    ml = lambda v: f"{v:,.0f}".replace(',', ' ')
    if typ == 'ratio':
        rep = f"ΔC = {ml(dc)} € ; ΔE = {fr(de, 2)} QALY ; RDCR = ΔC/ΔE = {ml(ratio)} € par QALY gagné."
    elif typ == 'dominante':
        rep = f"ΔC = {ml(dc)} € (économie) et ΔE = +{fr(de, 2)} QALY : la nouvelle stratégie est dominante (moins chère et plus efficace), pas de ratio à calculer."
    else:
        rep = f"ΔC = +{ml(dc)} € et ΔE = {fr(de, 2)} QALY : la nouvelle stratégie est dominée (plus chère et moins efficace) : elle n'est pas efficiente."
    cas('ir_acces_marche', ['médico-économie'], f"Évaluation médico-économique : {nom}",
        "économiste de la santé dans un laboratoire, qui prépare le dossier d'efficience pour la CEESP", 'Homme', 32,
        f"Modèle coût-utilité sur la durée de vie, perspective collective. Stratégie de référence : coût {ml(cA)} €, {fr(eA, 1)} QALY. Nouvelle stratégie ({nom}) : coût {ml(cB)} €, {fr(eB, 1)} QALY.",
        "J'ai les résultats du modèle. Tu peux me calculer le RDCR et m'aider à l'interpréter ?",
        [('calcul', "Calculez le ratio différentiel coût-résultat (RDCR) et situez la stratégie.", rep),
         ('analyse', "Comment interpréter ce résultat et quelles analyses ajouter ?",
          "Il n'existe pas de seuil officiel en France ; la CEESP juge la robustesse (choix structurants : perspective, horizon, comparateurs, population, modélisation) et l'incertitude : analyses de sensibilité "
          "déterministes et probabilistes, courbe d'acceptabilité. Un critère intermédiaire extrapolé sur la vie entière fragilise le RDCR (exemple Orkambi : 574 390 €/QALY jugé non efficient au prix revendiqué). "
          "L'avis d'efficience est pris en compte par le CEPS dans la négociation du prix ; il est requis si ASMR I à III et chiffre d'affaires > 20 M€/an.")],
        [tab('Résultats du modèle', ['Stratégie', 'Coût (€)', 'QALY'], [['Référence', ml(cA), fr(eA, 1)], [nom, ml(cB), fr(eB, 1)]])],
        ['cours EME', 'guide méthodologique HAS 2020'])

cas('ir_acces_marche', ['accès au marché', 'MTI'], "Prix et remboursement d'une thérapie génique « one-shot »",
    "responsable accès au marché d'une entreprise de thérapie génique", 'Femme', 44,
    "Thérapie génique AAV administrée une seule fois dans une maladie rare de l'enfant (≈ 30 patients/an en France). Données pivots : étude monobras de 24 patients, suivi médian 2 ans, "
    "comparaison à une cohorte historique. Prix revendiqué : 2,1 M€ par patient.",
    "Notre thérapie génique a 2 ans de recul sur 24 patients et on demande 2,1 millions. Comment préparer la négociation ?",
    [('analyse', "Quelles incertitudes la HAS va-t-elle souligner ?",
      "Niveau de preuve (monobras, contrôle externe : qualité méthodologique de la comparaison indirecte), durabilité de l'effet inconnue au-delà de 2 ans, critères intermédiaires, faible effectif, "
      "sécurité à long terme (intégration, immunogénicité, hépatotoxicité). La doctrine 2023 permet de valoriser une réponse univoque là où l'évolution péjorative est quasi certaine."),
     ('analyse', "Quels mécanismes de prix et de financement envisager ?",
      "Évaluation clinique commune européenne (JCA, règlement HTA 2021/2282, obligatoire pour les MTI depuis janvier 2025) puis SMR/ASMR nationaux et avis d'efficience CEESP ; négociation CEPS : "
      "paiement échelonné ou à la performance (contrat de partage de risque fondé sur des résultats en vie réelle), remises, liste en sus pour un médicament hospitalier ; recueil de données en vie réelle (registre) "
      "pour lever les incertitudes. Sources de financement adaptées aux MTI : débat sur l'étalement du paiement.")],
    [], ['cours Market access MTI', 'règlement (UE) 2021/2282'])

# ============================================================== DISPOSITIFS MÉDICAUX
cas('ir_dispositifs', ['dispositifs médicaux', 'affaires réglementaires'], "Classe et investigation clinique d'un nouveau stent",
    "chef de projet dans une start-up de dispositifs médicaux cardiovasculaires", 'Homme', 30,
    "Nouveau stent coronaire biorésorbable libérant un antiprolifératif (sirolimus). La start-up veut le marquage CE en s'appuyant sur des données d'un stent concurrent « équivalent », sans investigation clinique.",
    "On veut le marquage CE en s'appuyant sur les données d'un concurrent pour aller vite. C'est possible avec le nouveau règlement ?",
    [('analyse', "Quelle classe et quel circuit de marquage CE ?",
      "Classe III (dispositif implantable en contact avec le cœur/système circulatoire central, intégrant une substance médicamenteuse à action accessoire) selon le règlement (UE) 2017/745. "
      "Marquage CE par un organisme notifié choisi et payé par le fabricant, avec consultation d'une autorité du médicament (EMA ou autorité nationale) pour la substance accessoire et procédure de consultation "
      "d'un panel d'experts (évaluation clinique des classes III implantables)."),
     ('analyse', "Peut-on se passer d'investigation clinique ?",
      "Pour les implantables et classe III, investigation clinique obligatoire sauf équivalence démontrée (techniques, biologiques, cliniques) ET, depuis le MDR, accès contractuel complet à la documentation technique "
      "du dispositif équivalent (presque jamais possible avec un concurrent). Ici, biorésorbable + molécule : investigation clinique nécessaire, autorisée par l'ANSM et avis du CPP ; suivi clinique après "
      "commercialisation (SCAC/PMCF)."),
     ('analyse', "Quelles leçons des « affaires » ont conduit au règlement de 2017 ?",
      "Endoprothèses aortiques (essais précliniques/cliniques insuffisants), prothèses mammaires PIP (gel non conforme, contrôles de l'organisme notifié sans visites inopinées), implants de hanche : "
      "renforcement des organismes notifiés, visites inopinées, preuves cliniques, identifiant unique (IUD), base EUDAMED, matériovigilance et carte d'implant pour le patient.")],
    [], ['règlement (UE) 2017/745', 'cours Développement clinique des DM'])

cas('ir_dispositifs', ['dispositifs médicaux', 'matériovigilance'], "Incident grave avec une pompe à perfusion",
    "correspondant de matériovigilance d'un fabricant de pompes", 'Femme', 43,
    "Un CHU déclare un surdosage de morphine chez une patiente (dépression respiratoire, réanimation) avec une pompe PCA : le journal de la pompe montre un débit 10 fois supérieur à la programmation "
    "après une mise à jour logicielle. Trois autres établissements ont la même version.",
    "Un CHU nous déclare un surdosage de morphine avec une de nos pompes après la mise à jour. Qu'est-ce qu'on doit faire et dans quels délais ?",
    [('analyse', "Quelles obligations de déclaration ?",
      "Incident grave (dégradation grave de l'état de santé) : déclaration par le fabricant à l'autorité compétente (ANSM, via EUDAMED à terme) dès qu'un lien est établi ou raisonnablement possible, "
      "au plus tard 15 jours ; 2 jours en cas de menace grave pour la santé publique, 10 jours en cas de décès ou de détérioration grave imprévue. L'établissement déclare aussi (correspondant local de matériovigilance)."),
     ('analyse', "Quelles mesures correctives ?",
      "Investigation (logs, reproduction du défaut), action corrective de sécurité sur le terrain (FSCA) : avis de sécurité aux utilisateurs (FSN), retour à la version précédente ou correctif, "
      "information des autres établissements, mesure de l'efficacité ; analyse dans le système qualité du fabricant (ISO 13485) et mise à jour de la gestion des risques (ISO 14971).")],
    [], ['règlement (UE) 2017/745 art. 87', 'cours DM'], emotion='anxieux')

# ============================================================== PROJETS DE DÉVELOPPEMENT (5 « business units » par projet)
PROJETS = [
    {'nom': 'NEUROVEX', 'sujet': "thérapie génique AAV9 délivrant un ARN interférent anti-PMP22 par voie intrathécale dans la maladie de Charcot-Marie-Tooth de type 1A (CMT1A)",
     'contexte': "CMT1A : neuropathie héréditaire due à la duplication du gène PMP22 (prévalence ≈ 1/5 000), sans traitement curatif ; preuves de concept publiées chez la souris (diminution de PMP22, amélioration de la myélinisation et de la conduction nerveuse).",
     'classe': 'MTI (médicament de thérapie génique)', 'orphelin': True},
    {'nom': 'TARGADC', 'sujet': "anticorps conjugué (ADC) ciblant B7-H3 (CD276) couplé à un inhibiteur de topo-isomérase I dans le cancer de la prostate métastatique résistant à la castration (CPRCm)",
     'contexte': "B7-H3 est surexprimé dans la majorité des CPRCm et peu exprimé dans les tissus sains ; des ADC anti-B7-H3 ont montré des réponses dans des essais de phase I/II publiés.",
     'classe': 'médicament biologique (anticorps conjugué)', 'orphelin': False},
    {'nom': 'LUPICAR', 'sujet': "cellules NK allogéniques porteuses d'un CAR anti-CD19 (« prêtes à l'emploi ») dans le lupus systémique réfractaire avec néphrite",
     'contexte': "Des CAR-T anti-CD19 autologues ont induit des rémissions prolongées sans traitement dans de petites séries de lupus réfractaire ; les CAR-NK allogéniques pourraient réduire le coût et le risque de syndrome de relargage cytokinique.",
     'classe': 'MTI (médicament de thérapie cellulaire génétiquement modifié)', 'orphelin': False},
    {'nom': 'BRONCHEX', 'sujet': "vésicules extracellulaires de cellules stromales mésenchymateuses administrées par voie intratrachéale pour prévenir la dysplasie bronchopulmonaire du grand prématuré",
     'contexte': "Dysplasie bronchopulmonaire : 30 à 40 % des moins de 28 semaines, sans traitement préventif efficace ; les vésicules de cellules stromales ont réduit l'atteinte alvéolaire et vasculaire dans des modèles d'hyperoxie chez le rongeur.",
     'classe': 'médicament biologique (vésicules extracellulaires, statut MTI à discuter)', 'orphelin': True},
]
BU = {
    'non_clinique': ("responsable du développement non clinique", "Quel plan de développement non clinique proposez-vous avant la première administration chez l'humain ?"),
    'pharmaceutique': ("pharmacien responsable du développement pharmaceutique (CMC)", "Quels sont les points critiques de production et de contrôle de ce produit ?"),
    'clinique': ("médecin responsable du développement clinique", "Quel premier essai chez l'humain proposez-vous (population, schéma, critères) ?"),
    'reglementaire': ("pharmacien des affaires réglementaires", "Quelle stratégie réglementaire envisagez-vous ?"),
    'medico_eco': ("responsable médico-économie et accès au marché", "Comment préparez-vous l'accès au marché dès maintenant ?"),
}
REP = {
 ('NEUROVEX', 'non_clinique'): "Rationnel et preuve de concept : modèle murin C61/C22 de CMT1A (diminution de PMP22, conduction, myélinisation, force), relation dose-effet. Pharmacologie et biodistribution par la voie clinique (intrathécale) : persistance du vecteur, "
   "expression dans les cellules de Schwann, excrétion (shedding). Toxicologie dans une espèce pertinente (primate non humain pour la biodistribution AAV9 et la toxicité des ganglions rachidiens dorsaux), "
   "immunogénicité (capside, transgène), toxicité hépatique, effets hors cible de l'ARN interférent (sous-expression excessive de PMP22 = neuropathie HNPP). Lignes directrices : EMA thérapie génique, ICH S6 adapté, ICH S12 (biodistribution).",
 ('NEUROVEX', 'pharmaceutique'): "Production du vecteur (cellules HEK293 par transfection ou système baculovirus), purification (rapport capsides pleines/vides), titre en génomes de vecteur (ddPCR), essai d'activité (potency : extinction de PMP22 in vitro), "
   "identité, pureté (ADN résiduel de la cellule hôte, protéines, plasmides), sécurité virale (virus adventices, AAV réplicatif), stérilité, endotoxines ; BPF partie IV (MTI), établissement autorisé ; stabilité congelée, "
   "formulation compatible avec la voie intrathécale (osmolalité, absence de conservateur).",
 ('NEUROVEX', 'clinique'): "Phase I/II ouverte d'escalade de dose (2–3 cohortes, schéma 3+3 ou bayésien), adultes ou adolescents avec CMT1A confirmée génétiquement et atteinte modérée ; critères : tolérance (DRG, foie, immunité), "
   "puis biomarqueurs (PMP22 sur biopsie cutanée, neurofilaments), électrophysiologie, score CMTNS-v2 ; suivi long terme de 5 à 15 ans (thérapie génique) ; immunosuppression prophylactique à discuter.",
 ('NEUROVEX', 'reglementaire'): "Statut MTI (règlement 1394/2007) : procédure centralisée obligatoire, évaluation par le CAT puis CHMP. Désignation orpheline (prévalence ≤ 5/10 000 dans l'UE, besoin non couvert) : exclusivité 10 ans, "
   "assistance protocole. Éligibilité PRIME, avis scientifiques précoces (EMA, ANSM), PIP pédiatrique (PDCO). Essai : règlement 536/2014 (CTIS) + exigences OGM (dossier d'utilisation confinée/dissémination). "
   "AMM conditionnelle envisageable si besoin non couvert et données complètes attendues ; PGR avec suivi long terme.",
 ('NEUROVEX', 'medico_eco'): "Épidémiologie (≈ 1/5 000), histoire naturelle et coûts de la maladie (orthèses, chirurgie orthopédique, perte d'autonomie), comparateur = prise en charge symptomatique ; critères attendus par la HAS "
   "(cliniquement pertinents, qualité de vie), consultation scientifique conjointe européenne (JSC) pour aligner les PICO, accès précoce possible, avis d'efficience CEESP, modèles de paiement à la performance pour un traitement unique.",
 ('TARGADC', 'non_clinique'): "Expression de B7-H3 dans les tumeurs et tissus sains (immunohistochimie), internalisation, activité cytotoxique in vitro et dans des xénogreffes (dont modèles dérivés de patients), effet « bystander » de la charge utile. "
   "Toxicologie : espèce pertinente où l'anticorps reconnaît la cible (souvent singe cynomolgus), toxicités attendues de la charge utile topo-I (myélotoxicité, pneumopathie interstitielle : point de vigilance de la classe), "
   "lignes directrices ICH S9 (anticancéreux) et S6 (biotechnologies) ; dose de départ selon la HNSTD ou le MABEL.",
 ('TARGADC', 'pharmaceutique'): "Trois composants : anticorps (lignée CHO, banque de cellules), lieur et charge utile (synthèse chimique, substance très active : confinement), conjugaison. Attributs critiques : DAR (rapport médicament/anticorps) et sa distribution, "
   "charge utile libre, agrégats, fixation à la cible, activité cytotoxique (potency), charge variants, glycosylation, impuretés ; stabilité (déconjugaison) ; lyophilisat pour perfusion ; nettoyage et installations "
   "adaptées aux cytotoxiques (PDE).",
 ('TARGADC', 'clinique'): "Phase I d'escalade de dose chez des patients atteints de CPRCm après hormonothérapie de nouvelle génération et taxane (pas de volontaires sains pour un cytotoxique), puis expansion ; critères : toxicités limitant la dose, "
   "dose recommandée (projet Optimus : comparer 2 doses), PK de l'ADC/anticorps total/charge libre, réponse PSA50 et RECIST/PCWG3 ; recherche de biomarqueur (expression B7-H3) ; surveillance des pneumopathies.",
 ('TARGADC', 'reglementaire'): "Biologique, oncologie : procédure centralisée obligatoire. Avis scientifique EMA, désignation PRIME possible si données précoces fortes. Essai via CTIS (règlement 536/2014). Demande d'AMM sur phase III randomisée "
   "contre le traitement de référence (ex. cabazitaxel ou lutétium-PSMA selon la ligne) ; AMM conditionnelle si phase II très convaincante. PGR : pneumopathie interstitielle, myélotoxicité.",
 ('TARGADC', 'medico_eco'): "Population cible (CPRCm après ARPI et taxane), comparateurs pertinents (cabazitaxel, ¹⁷⁷Lu-PSMA, olaparib si BRCA), place dans la stratégie, critères valorisés (survie globale, qualité de vie). Évaluation clinique "
   "commune européenne obligatoire en oncologie depuis 2025 (JCA), puis SMR/ASMR, CEESP si ASMR I–III, liste en sus pour un médicament hospitalier onéreux.",
 ('LUPICAR', 'non_clinique'): "Preuve de concept : déplétion des lymphocytes B CD19+ in vitro et dans des modèles murins de lupus (néphrite, auto-anticorps), persistance limitée des NK, absence de réaction du greffon contre l'hôte. "
   "Sécurité : tumorigénicité et intégration du vecteur (lentiviral), cytokines (relargage), biodistribution, gène suicide éventuel ; modèles animaux peu prédictifs pour un produit humain allogénique : justification au cas par cas "
   "(approche fondée sur le risque, RBA).",
 ('LUPICAR', 'pharmaceutique'): "Source des cellules NK (sang de cordon, iPSC), transduction, expansion, banque cellulaire, cryoconservation. Libération : identité (CD56+CD3−), pureté (lymphocytes T résiduels : risque de GVH), expression du CAR, "
   "nombre de copies de vecteur, activité cytotoxique anti-CD19, viabilité, stérilité, mycoplasmes, endotoxines, lentivirus réplicatif. BPF partie IV, chaîne du froid cryogénique, comparabilité entre lots.",
 ('LUPICAR', 'clinique'): "Phase I d'escalade de dose dans le lupus systémique réfractaire avec néphrite active malgré ≥ 2 lignes (dont un anti-CD20 ou bélimumab), lymphodéplétion (fludarabine-cyclophosphamide) ; critères : tolérance (CRS, ICANS, infections), "
   "aplasie B, puis réponse rénale (protéinurie, DFG), SLEDAI-2K, arrêt des corticoïdes ; suivi au long cours (15 ans pour un produit génétiquement modifié).",
 ('LUPICAR', 'reglementaire'): "MTI (thérapie cellulaire génétiquement modifiée) : procédure centralisée, CAT ; dossier OGM ; essai via CTIS. Maladie non orpheline (lupus) mais sous-population réfractaire : discuter avec l'EMA. PRIME si besoin non couvert. "
   "Exigences pédiatriques (PIP). Accès précoce possible si les critères sont remplis.",
 ('LUPICAR', 'medico_eco'): "Comparateurs : traitements immunosuppresseurs et biothérapies (bélimumab, anifrolumab), dialyse et greffe évitées (coûts élevés) ; modèle coût-utilité intégrant les rémissions sans traitement ; prix d'un produit allogénique "
   "potentiellement inférieur aux CAR-T autologues ; incertitude sur la durabilité : paiement à la performance, recueil en vie réelle.",
 ('BRONCHEX', 'non_clinique'): "Preuve de concept dans le modèle d'hyperoxie néonatale du rongeur (alvéolarisation, vascularisation, inflammation), relation dose-effet, voie intratrachéale ; mécanisme (miARN, protéines). Toxicologie juvénile "
   "(organes en développement : poumon, cerveau), biodistribution des vésicules, immunogénicité ; espèce pertinente discutable (nouveau-né agneau ou porcelet pour la voie et la taille).",
 ('BRONCHEX', 'pharmaceutique'): "Banque de cellules stromales qualifiée, production en bioréacteur, isolement des vésicules (ultrafiltration tangentielle, chromatographie), caractérisation (taille et nombre : NTA, marqueurs CD63/CD81/TSG101, protéines contaminantes), "
   "essai d'activité lié au mécanisme (difficulté majeure), stérilité, endotoxines, virus ; stabilité ; présentation adaptée au prématuré (volume, osmolalité, absence de conservateur, dispositif d'administration).",
 ('BRONCHEX', 'clinique'): "Phase I chez le grand prématuré ventilé à haut risque (âge gestationnel < 28 SA), escalade de dose prudente, comité de surveillance indépendant ; critères : tolérance respiratoire et hémodynamique, puis survie sans dysplasie à 36 SA "
   "d'âge corrigé (critère de référence). Exigences éthiques renforcées (consentement des deux parents, mineurs : catégorie protégée), essai pédiatrique soumis au PIP.",
 ('BRONCHEX', 'reglementaire'): "Qualification du produit (MTI ou médicament biologique ? les vésicules ne contiennent pas de cellules vivantes : en principe médicament biologique, avis du CAT sur la classification). Désignation orpheline (dysplasie bronchopulmonaire), "
   "PIP obligatoire (indication pédiatrique), PUMA éventuelle ; avis scientifiques ; procédure centralisée (biotechnologie/orphelin).",
 ('BRONCHEX', 'medico_eco'): "Épidémiologie (naissances < 28 SA, ≈ 30–40 % de dysplasie), coûts évités (durée de ventilation et d'hospitalisation, réhospitalisations, oxygène à domicile, séquelles neurodéveloppementales), comparateur = soins standard "
   "(caféine, corticoïdes postnataux), critère valorisé = survie sans dysplasie ; accès précoce possible si présomption d'innovation.",
}
for P in PROJETS:
    for bu, (role, question) in BU.items():
        rep = REP[(P['nom'], bu)]
        q2 = {
            'non_clinique': ("Quelle différence entre rationnel scientifique, preuve de concept et développement non clinique réglementaire ?",
                             "Rationnel : hypothèse argumentée (cible, mécanisme, physiopathologie). Preuve de concept : démonstration expérimentale publiée ou interne que l'approche agit sur la maladie (modèles). "
                             "Développement non clinique réglementaire : études organisées (souvent BPL pour la toxicologie) répondant aux lignes directrices pour justifier la première administration chez l'humain et la dose."),
            'pharmaceutique': ("Pourquoi le profil cible du produit (TPP) conditionne-t-il votre travail ?",
                               "Le TPP fixe voie d'administration, gamme de doses, rythme, PK attendue, cibles, pureté et stabilité espérées : sans lui, impossible de choisir la forme, la concentration, le contenant et les spécifications "
                               "(démarche QbD, ICH Q8)."),
            'clinique': ("Comment définissez-vous la dose de départ ?",
                         "À partir des données non cliniques : NOAEL ou HNSTD convertie en dose équivalente humaine avec facteur de sécurité, ou MABEL pour les produits à haut risque immunologique (leçon du TGN1412) ; "
                         "progression prudente avec sentinelles et comité de surveillance."),
            'reglementaire': ("Quels documents réglementaires préparer pour le premier essai ?",
                              "Dossier CTIS : protocole, brochure investigateur, dossier du médicament expérimental (IMPD qualité, non clinique), consentement, assurance ; avis du CPP ; documents OGM si thérapie génique/cellulaire modifiée."),
            'medico_eco': ("Pourquoi ne pas attendre l'AMM pour penser à l'accès au marché ?",
                           "Parce que le choix du comparateur, des critères et de la population dans les essais conditionne l'ASMR et le prix : un essai sans comparateur pertinent ou sur un critère non reconnu "
                           "conduit à une ASMR V. Rencontres précoces HAS et consultations scientifiques conjointes européennes permettent d'aligner le développement."),
        }[bu]
        cas('ir_projet_developpement', ['développement du médicament', bu.replace('_', ' ')], f"Projet {P['nom']} — {role.split(' (')[0]}",
            f"{role} de la start-up qui développe le projet {P['nom']}", rng.choice(['Femme', 'Homme']), rng.randint(28, 52),
            f"Projet {P['nom']} : {P['sujet']}. Contexte scientifique : {P['contexte']} Classification envisagée : {P['classe']}. "
            f"La start-up prépare son plan de développement jusqu'à l'AMM pour une levée de fonds ; vous coordonnez votre « business unit » ({bu.replace('_', ' ')}) avec les autres.",
            f"Pour le projet {P['nom']}, j'ai besoin de ton avis pour notre partie avant la réunion avec les investisseurs.",
            [('analyse', question, rep), ('analyse', q2[0], q2[1]),
             ('analyse', "Avec quelles autres équipes devez-vous vous coordonner, et sur quoi ?",
              "Les cinq unités sont interdépendantes : le non clinique et le clinique fixent le profil cible (voie, doses, rythme, PK, cibles) dont dépend la galénique ; le pharmaceutique fournit des lots représentatifs "
              "pour la toxicologie et l'essai ; le réglementaire encadre chaque étape (avis scientifiques, désignations, CTIS) ; la médico-économie a besoin du produit, de la place dans la stratégie et du comparateur.")],
            [], ['études de cas UEIR5 (inspiration)', 'cours MTI et stratégie fondée sur le risque'])

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'lot_industrie.json'
    json.dump({'cas': CAS}, open(out, 'w'), ensure_ascii=False, indent=1)
    import collections
    print(len(CAS), 'cas', dict(collections.Counter(c['theme'] for c in CAS)))
