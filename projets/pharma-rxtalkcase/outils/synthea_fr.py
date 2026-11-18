# Cas de comptoir générés à partir de patients fictifs Synthea (synthetichealth/synthea, Apache-2.0).
# Chaque patient Synthea (traitements en cours, maladies chroniques, allergies, constantes, biologie, dernier épisode aigu)
# devient une patiente ou un patient qui vient renouveler son ordonnance et demande un conseil.
# Les médicaments américains sont remplacés par leur équivalent français ; les réponses modèles sont générées
# à partir de règles (interactions, terrain, biologie) : les cas sont ajoutés DÉSACTIVÉS et « à valider ».
import pandas as pd, numpy as np, random, re, json, sys, datetime as dt
CSV, OUT = sys.argv[1], sys.argv[2]
rnd = random.Random(4242)
P = pd.read_csv(f'{CSV}/patients.csv'); C = pd.read_csv(f'{CSV}/conditions.csv'); M = pd.read_csv(f'{CSV}/medications.csv')
O = pd.read_csv(f'{CSV}/observations.csv'); A = pd.read_csv(f'{CSV}/allergies.csv')
for d in (C, M): d['START'] = pd.to_datetime(d.START, utc=True)
O['DATE'] = pd.to_datetime(O.DATE, utc=True)
FIN = O.DATE.max()

# ---------- médicaments : équivalent français ----------
# motif (description Synthea) -> (DCI, spécialité, posologie, classe(s), vigilance)
MED = [
 (r'hydrochlorothiazide 1?2?\.?5? ?MG / lisinopril', ('lisinopril/hydrochlorothiazide', 'ZESTORETIC 20 mg/12,5 mg', '1 comprimé le matin', {'IEC', 'DIU_THIAZ', 'ANTIHTA'}, 'kaliémie, natrémie et créatinine ; toux sèche ; hypotension')),
 (r'amlodipine 10 MG / benazepril', ('périndopril/amlodipine', 'COVERAM 10 mg/10 mg', '1 comprimé le matin', {'IEC', 'ICA', 'ANTIHTA'}, 'œdèmes des chevilles, toux sèche, kaliémie et créatinine')),
 (r'Hydrochlorothiazide 25', ('hydrochlorothiazide', 'ESIDREX 25 mg', '1 comprimé le matin', {'DIU_THIAZ', 'ANTIHTA'}, 'kaliémie, natrémie, glycémie et uricémie')),
 (r'lisinopril (\d+)', ('lisinopril', 'ZESTRIL {0} mg', '1 comprimé par jour', {'IEC', 'ANTIHTA'}, 'kaliémie et créatinine ; toux sèche ; angio-œdème')),
 (r'enalapril', ('énalapril', 'RENITEC 20 mg', '1 comprimé par jour', {'IEC', 'ANTIHTA'}, 'kaliémie et créatinine ; toux sèche')),
 (r'irbesartan', ('irbésartan', 'APROVEL 150 mg', '1 comprimé par jour', {'ARA2', 'ANTIHTA'}, 'kaliémie et créatinine')),
 (r'losartan', ('losartan', 'COZAAR 25 mg', '1 comprimé par jour', {'ARA2', 'ANTIHTA'}, 'kaliémie et créatinine')),
 (r'valsartan', ('valsartan', 'TAREG 160 mg', '1 comprimé par jour', {'ARA2', 'ANTIHTA'}, 'kaliémie et créatinine')),
 (r'amLODIPine 2\.5', ('amlodipine', 'AMLOR 5 mg', '1 gélule par jour', {'ICA', 'ANTIHTA'}, 'œdèmes des chevilles, céphalées')),
 (r'metoprolol succinate (\d+)', ('métoprolol', 'LOPRESSOR 100 mg', '1/2 comprimé matin et soir', {'BB', 'ANTIHTA'}, 'fréquence cardiaque, ne pas arrêter brutalement')),
 (r'metoprolol tartrate', ('métoprolol', 'LOPRESSOR 50 mg (½ comprimé)', '½ comprimé matin et soir', {'BB', 'ANTIHTA'}, 'fréquence cardiaque, ne pas arrêter brutalement')),
 (r'atenolol (\d+)', ('aténolol', 'TÉNORMINE {0} mg', '1 comprimé par jour', {'BB', 'ANTIHTA'}, 'fréquence cardiaque, ne pas arrêter brutalement')),
 (r'bisoprolol', ('bisoprolol', 'CARDENSIEL 5 mg', '1 comprimé le matin', {'BB', 'ANTIHTA'}, 'fréquence cardiaque, ne pas arrêter brutalement')),
 (r'Furosemide', ('furosémide', 'LASILIX 40 mg', '1 comprimé le matin', {'DIU_ANSE', 'ANTIHTA'}, 'kaliémie, natrémie, créatinine, déshydratation')),
 (r'Nitroglycerin', ('trinitrine', 'NATISPRAY 0,30 mg/dose', '1 pulvérisation sous la langue en cas de douleur thoracique, à renouveler 1 fois', {'NITRE'}, "s'asseoir avant la prise ; si la douleur persiste après 2 doses : appeler le 15")),
 (r'Clopidogrel', ('clopidogrel', 'PLAVIX 75 mg', '1 comprimé par jour', {'ANTIAGREG', 'CLOPI'}, 'saignements ; ne pas arrêter sans avis du cardiologue')),
 (r'prasugrel', ('prasugrel', 'EFIENT 10 mg', '1 comprimé par jour', {'ANTIAGREG'}, 'saignements ; ne pas arrêter sans avis du cardiologue')),
 (r'aspirin 81', ('acide acétylsalicylique', 'KARDÉGIC 75 mg', '1 sachet par jour au cours du repas', {'ANTIAGREG', 'ASPIRINE'}, 'saignements, douleurs gastriques')),
 (r'warfarin', ('warfarine', 'COUMADINE 5 mg', "selon l'INR (carnet AVK), le soir à heure fixe", {'AVK'}, "INR (cible 2 à 3) ; saignements ; nombreuses interactions (AINS, antibiotiques, millepertuis)")),
 (r'[Ss]imvastatin (\d+)', ('simvastatine', 'ZOCOR {0} mg', '1 comprimé le soir', {'STATINE', 'SIMVA'}, 'douleurs musculaires ; pas de jus de pamplemousse')),
 (r'atorvastatin (\d+)', ('atorvastatine', 'TAHOR {0} mg', '1 comprimé par jour', {'STATINE'}, 'douleurs musculaires')),
 (r'pravastatin', ('pravastatine', 'ELISOR 40 mg', '1 comprimé le soir', {'STATINE'}, 'douleurs musculaires')),
 (r'rosuvastatin', ('rosuvastatine', 'CRESTOR 10 mg', '1 comprimé par jour', {'STATINE'}, 'douleurs musculaires')),
 (r'Metformin', ('metformine', 'GLUCOPHAGE 500 mg', '1 comprimé matin et soir au cours des repas', {'METFORMINE', 'ANTIDIAB'}, "fonction rénale (DFG) ; troubles digestifs ; arrêt avant injection d'iode")),
 (r'insulin isophane', ('insuline humaine biphasique 30/70', 'MIXTARD 30 FlexPen', 'selon le schéma prescrit, 2 injections par jour avant le petit-déjeuner et le dîner', {'INSULINE', 'ANTIDIAB'}, 'glycémies capillaires ; hypoglycémies ; rotation des sites')),
 (r'liraglutide', ('liraglutide', 'VICTOZA 6 mg/mL stylo', '1 injection sous-cutanée par jour', {'GLP1', 'ANTIDIAB'}, 'nausées ; douleur abdominale intense (pancréatite)')),
 (r'Levothyroxine', ('lévothyroxine', 'LEVOTHYROX 75 µg', '1 comprimé le matin à jeun', {'LEVOTHYROX'}, 'TSH ; à prendre à distance du fer et du calcium')),
 (r'Alendronic', ('acide alendronique', 'FOSAMAX 70 mg', '1 comprimé par semaine, à jeun, debout, avec un grand verre d\'eau', {'BISPHOSPHONATE'}, 'rester debout 30 minutes ; à distance du calcium et du fer ; soins dentaires')),
 (r'ferrous sulfate', ('sulfate ferreux', 'TARDYFERON 80 mg', '1 comprimé par jour avant le repas', {'FER'}, 'selles noires ; à distance de la lévothyroxine, des cyclines et des bisphosphonates')),
 (r'Vitamin B12', ('cyanocobalamine', 'VITAMINE B12 1000 µg/4 mL', '1 ampoule IM par mois', {'B12'}, '')),
 (r'tacrolimus', ('tacrolimus', 'ENVARSUS 1 mg LP', 'selon les taux sanguins, 1 prise le matin', {'TACRO'}, 'taux sanguins ; nombreuses interactions (millepertuis, macrolides, azolés, pamplemousse)')),
 (r'Penicillin V', ('phénoxyméthylpénicilline', 'ORACILLINE 1 MUI', '1 comprimé 2 fois par jour', {'PENICILLINE'}, 'allergie aux pénicillines')),
 (r'doxycycline', ('doxycycline', 'DOXY 100 mg', '1 comprimé par jour au milieu du repas, avec un grand verre d\'eau', {'CYCLINE'}, 'photosensibilisation ; ne pas se coucher juste après ; à distance du fer et du calcium')),
 (r'Acetaminophen 300 MG / Codeine', ('paracétamol/codéine', 'DAFALGAN CODÉINÉ 500 mg/30 mg', '1 à 2 comprimés jusqu\'à 3 fois par jour', {'PARACETAMOL', 'OPIOIDE'}, 'constipation, somnolence ; maximum 3 g de paracétamol par jour toutes sources')),
 (r'Hydrocodone Bitartrate 10 MG Extended', ('oxycodone', 'OXYCONTIN LP 10 mg', '1 comprimé matin et soir', {'OPIOIDE'}, 'constipation, somnolence, dépression respiratoire')),
 (r'[Hh][Yy][Dd][Rr][Oo][Cc]odone|oxyCODONE Hydrochloride 5|Oxycodone Hydrochloride 10 MG Oral Tablet \[Percocet', ('paracétamol/codéine', 'DAFALGAN CODÉINÉ 500 mg/30 mg', "1 à 2 comprimés jusqu'à 3 fois par jour", {'PARACETAMOL', 'OPIOIDE'}, 'constipation, somnolence ; maximum 3 g de paracétamol par jour toutes sources')),
 (r'Oxycontin', ('oxycodone', 'OXYCONTIN LP 10 mg', '1 comprimé matin et soir', {'OPIOIDE'}, 'constipation, somnolence, dépression respiratoire')),
 (r'Fentanyl', ('fentanyl', 'DUROGESIC 25 µg/h', '1 patch tous les 3 jours', {'OPIOIDE'}, 'pas de source de chaleur sur le patch ; somnolence ; patchs usagés repliés et rapportés')),
 (r'Meperidine|tramadol', ('tramadol', 'TOPALGIC 50 mg', "1 gélule jusqu'à 3 fois par jour", {'OPIOIDE', 'TRAMADOL'}, 'nausées, vertiges, somnolence ; risque de convulsions')),
 (r'buprenorphine', ('buprénorphine/naloxone', 'SUBOXONE 2 mg/0,5 mg', '1 comprimé sublingual par jour', {'BUPRENORPHINE'}, 'laisser fondre sous la langue ; pas d\'alcool ni de benzodiazépine sans avis médical')),
 (r'Acetaminophen 325 MG Oral Tablet', ('paracétamol', 'DOLIPRANE 500 mg', "1 à 2 comprimés jusqu'à 3 fois par jour, 4 h minimum entre les prises", {'PARACETAMOL'}, 'maximum 3 g par jour toutes sources')),
 (r'Naproxen', ('naproxène', 'ALEVE 220 mg', '1 comprimé 2 fois par jour au cours des repas', {'AINS'}, 'estomac, reins, tension')),
 (r'Ibuprofen', ('ibuprofène', 'ADVIL 400 mg', '1 comprimé jusqu\'à 3 fois par jour au cours des repas', {'AINS'}, 'estomac, reins, tension')),
 (r'Diazepam', ('diazépam', 'VALIUM 5 mg', '1 comprimé le soir', {'BZD'}, 'somnolence, dépendance, chutes chez le sujet âgé')),
 (r'FLUoxetine', ('fluoxétine', 'PROZAC 20 mg', '1 gélule le matin', {'ISRS', 'FLUOX'}, 'ne pas arrêter brutalement ; idées suicidaires en début de traitement')),
 (r'Sertraline', ('sertraline', 'ZOLOFT 50 mg', '2 gélules le matin', {'ISRS'}, 'ne pas arrêter brutalement ; troubles digestifs en début de traitement')),
 (r'Methylphenidate', ('méthylphénidate', 'RITALINE 10 mg', '1 comprimé matin et midi', {'MPH'}, 'appétit, sommeil, croissance, tension ; ordonnance sécurisée')),
 (r'atomoxetine', ('atomoxétine', 'STRATTERA 40 mg', '1 gélule le matin', {'ATOMOX'}, 'appétit, tension, fréquence cardiaque')),
 (r'Donepezil', ('donépézil', 'ARICEPT 10 mg', '1 comprimé le soir', {'ANTICHOL'}, 'bradycardie, troubles digestifs (non remboursé depuis 2018)')),
 (r'Loratadine', ('loratadine', 'LORATADINE BIOGARAN 10 mg, comprimé', '1 comprimé par jour', {'ANTIH1'}, '')),
 (r'cetirizine', ('cétirizine', 'ZYRTEC 10 mg', '1 comprimé le soir', {'ANTIH1'}, 'somnolence possible')),
 (r'Fexofenadine', ('fexofénadine', 'TELFAST 120 mg', '1 comprimé par jour', {'ANTIH1'}, 'pas de jus de fruit au moment de la prise')),
 (r'Astemizole|Terfenadine', ('desloratadine', 'AERIUS 5 mg', '1 comprimé par jour', {'ANTIH1'}, '')),
 (r'Chlorpheniramine', ('dexchlorphéniramine', 'POLARAMINE 2 mg', '1 comprimé 3 fois par jour', {'ANTIH1_SED'}, 'somnolence ; effets atropiniques (sujet âgé, glaucome, prostate)')),
 (r'diphenhydrAMINE', ('diphénhydramine', 'NAUTAMINE 90 mg', '1 comprimé avant le trajet', {'ANTIH1_SED'}, 'somnolence ; effets atropiniques')),
 (r'Hydrocortisone 10 MG/ML Topical', ('hydrocortisone', 'CORTISEDERMYL 0,5 %, crème', '1 à 2 applications par jour', {'DERMO'}, 'pas sur une peau infectée ; durée courte')),
 (r'Epinephrine', ('adrénaline', 'ANAPEN 0,30 mg/0,3 mL', "1 injection dans la cuisse en cas de réaction allergique grave, puis appeler le 15", {'ADRENALINE'}, "toujours avoir 2 stylos sur soi ; vérifier la date de péremption")),
 (r'albuterol 0\.09|Ventolin', ('salbutamol', 'VENTOLINE 100 µg/dose', '1 à 2 bouffées en cas de gêne respiratoire', {'B2CA'}, 'technique d\'inhalation ; plus de 2 prises par semaine = asthme mal contrôlé')),
 (r'albuterol', ('salbutamol', 'SALBUTAMOL ARROW 5 mg/2,5 mL, solution pour inhalation par nébuliseur', '1 nébulisation en cas de crise, selon prescription', {'B2CA'}, 'tremblements, palpitations')),
 (r'Fluticasone propionate 0\.25 MG/ACTUAT / salmeterol', ('fluticasone/salmétérol', 'SERETIDE DISKUS 250/50 µg', '1 inhalation matin et soir', {'CSI', 'B2LA'}, "se rincer la bouche après chaque prise ; traitement de fond à prendre tous les jours")),
 (r'fluticasone propionate 0\.(\d+)', ('fluticasone', 'FLIXOTIDE 125 µg/dose', '1 à 2 bouffées matin et soir', {'CSI'}, 'se rincer la bouche après chaque prise ; chambre d\'inhalation')),
 (r'mometasone', ('budésonide', 'PULMICORT TURBUHALER 200 µg/dose', '1 inhalation matin et soir', {'CSI'}, 'se rincer la bouche après chaque prise')),
 (r'budesonide', ('budésonide', 'BUDÉSONIDE ARROW 0,5 mg/2 mL, suspension pour inhalation par nébuliseur', '1 nébulisation matin et soir', {'CSI'}, 'se rincer la bouche ; nettoyer le nébuliseur')),
 (r'Levora|levonorgestrel 0\.15 MG Oral Tablet\) / 7', ('lévonorgestrel/éthinylestradiol', 'MINIDRIL 0,15 mg/0,03 mg', '1 comprimé par jour pendant 21 jours, 7 jours d\'arrêt', {'COC'}, 'oubli > 12 h ; tabac ; risque thromboembolique')),
 (r'Seasonique', ('lévonorgestrel/éthinylestradiol', 'SEASONIQUE', '1 comprimé par jour en continu (cycle de 91 jours)', {'COC'}, 'oubli > 12 h ; tabac ; risque thromboembolique')),
 (r'Yaz', ('drospirénone/éthinylestradiol', 'YAZ 0,02 mg/3 mg', '1 comprimé par jour sans interruption (24 + 4)', {'COC'}, 'oubli > 24 h ; risque thromboembolique ; kaliémie')),
 (r'Trinessa', ('norgestimate/éthinylestradiol', 'TRIAFEMI', '1 comprimé par jour pendant 21 jours, 7 jours d\'arrêt', {'COC'}, 'oubli > 12 h ; tabac ; risque thromboembolique')),
 (r'Natazia', ('diénogest/estradiol', 'QLAIRA', '1 comprimé par jour sans interruption', {'COC'}, 'oubli > 12 h ; risque thromboembolique')),
 (r'norethindrone', ('désogestrel', 'OPTIMIZETTE 75 µg', '1 comprimé par jour en continu', {'MICROPROG'}, 'oubli > 12 h')),
 (r'norelgestromin', ('norelgestromine/éthinylestradiol', 'EVRA, dispositif transdermique', '1 patch par semaine pendant 3 semaines, 1 semaine sans', {'COC'}, 'décollement du patch ; tabac ; risque thromboembolique')),
]
EXCLURE_MED = re.compile(r'Alteplase', re.I)
def med_fr(desc):
    for pat, (dci, spe, poso, cls, vig) in MED:
        m = re.search(pat, desc)
        if m:
            g = m.groups(); return dict(dci=dci, spe=spe.format(*g) if g else spe, poso=poso, cls=set(cls), vig=vig, us=desc)
    return None

# ---------- maladies (affichées et utiles au raisonnement) ----------
COND = {
 'Essential hypertension (disorder)': 'hypertension artérielle', 'Hyperlipidemia (disorder)': 'hypercholestérolémie', 'Hypertriglyceridemia (disorder)': 'hypertriglycéridémie',
 'Diabetes mellitus type 2 (disorder)': 'diabète de type 2', 'Prediabetes (finding)': 'prédiabète', 'Metabolic syndrome X (disorder)': 'syndrome métabolique',
 'Ischemic heart disease (disorder)': 'cardiopathie ischémique', 'History of myocardial infarction (situation)': 'antécédent d\'infarctus du myocarde', 'History of coronary artery bypass grafting (situation)': 'pontage coronarien',
 'Chronic congestive heart failure (disorder)': 'insuffisance cardiaque chronique', 'Aortic valve stenosis (disorder)': 'rétrécissement aortique', 'Mitral valve regurgitation (disorder)': 'insuffisance mitrale',
 'History of aortic valve replacement (situation)': 'remplacement valvulaire aortique', 'Cerebrovascular accident (disorder)': 'antécédent d\'AVC',
 'Chronic kidney disease stage 1 (disorder)': 'maladie rénale chronique stade 1', 'Chronic kidney disease stage 2 (disorder)': 'maladie rénale chronique stade 2',
 'Chronic kidney disease stage 3 (disorder)': 'maladie rénale chronique stade 3', 'Chronic kidney disease stage 4 (disorder)': 'maladie rénale chronique stade 4', 'End-stage renal disease (disorder)': 'insuffisance rénale terminale',
 'History of renal transplant (situation)': 'greffe rénale', 'Disorder of kidney due to diabetes mellitus (disorder)': 'néphropathie diabétique',
 'Microalbuminuria due to type 2 diabetes mellitus (disorder)': 'microalbuminurie (diabète)', 'Proteinuria due to type 2 diabetes mellitus (disorder)': 'protéinurie (diabète)',
 'Neuropathy due to type 2 diabetes mellitus (disorder)': 'neuropathie diabétique', 'Nonproliferative diabetic retinopathy due to type II diabetes mellitus': 'rétinopathie diabétique',
 'Asthma (disorder)': 'asthme', 'Childhood asthma (disorder)': 'asthme', 'Chronic obstructive bronchitis (disorder)': 'BPCO', 'Pulmonary emphysema (disorder)': 'emphysème',
 'Obstructive sleep apnea syndrome (disorder)': 'apnée du sommeil', 'Sleep apnea (disorder)': 'apnée du sommeil', 'Perennial allergic rhinitis (disorder)': 'rhinite allergique',
 'Perennial allergic rhinitis with seasonal variation (disorder)': 'rhinite allergique', 'Seasonal allergic rhinitis (disorder)': 'rhinite allergique saisonnière', 'Chronic sinusitis (disorder)': 'sinusite chronique',
 'Anemia (disorder)': 'anémie', 'Osteoporosis (disorder)': 'ostéoporose', 'Osteoarthritis of knee (disorder)': 'arthrose du genou', 'Osteoarthritis of hip (disorder)': 'arthrose de la hanche',
 'Localized  primary osteoarthritis of the hand (disorder)': 'arthrose des mains', 'Gout': 'goutte', 'Fibromyalgia (disorder)': 'fibromyalgie',
 'Chronic pain (finding)': 'douleurs chroniques', 'Chronic low back pain (finding)': 'lombalgie chronique', 'Chronic neck pain (finding)': 'cervicalgie chronique',
 'Chronic intractable migraine without aura (disorder)': 'migraine sans aura', 'Transformed migraine (disorder)': 'migraine chronique', 'Epilepsy (disorder)': 'épilepsie', 'Seizure disorder (disorder)': 'épilepsie',
 "Alzheimer's disease (disorder)": 'maladie d\'Alzheimer', 'Major depressive disorder (disorder)': 'épisode dépressif caractérisé', 'Severe anxiety (panic) (finding)': 'trouble anxieux (attaques de panique)',
 'Child attention deficit disorder (disorder)': 'trouble déficit de l\'attention (TDAH)', 'Gastroesophageal reflux disease (disorder)': 'reflux gastro-œsophagien',
 'Idiopathic atrophic hypothyroidism (disorder)': 'hypothyroïdie', 'Atopic dermatitis (disorder)': 'dermatite atopique', 'Contact dermatitis (disorder)': 'eczéma de contact',
 'Body mass index 30+ - obesity (finding)': 'obésité', 'Body mass index 40+ - severely obese (finding)': 'obésité sévère', 'Recurrent urinary tract infection (disorder)': 'infections urinaires récidivantes',
 'Malignant neoplasm of breast (disorder)': 'cancer du sein', 'Primary malignant neoplasm of colon (disorder)': 'cancer du côlon', 'Neoplasm of prostate (disorder)': 'tumeur de la prostate',
 'Leukemia  disease (disorder)': 'leucémie', 'History of peripheral stem cell transplant (situation)': 'greffe de cellules souches',
 'Opioid abuse': 'trouble de l\'usage des opioïdes', 'Dependent drug abuse (disorder)': 'trouble de l\'usage des opioïdes', 'Alcoholism (disorder)': 'trouble de l\'usage de l\'alcool',
 'Normal pregnancy (finding)': 'grossesse en cours',
}
ALLERG = {'Aspirin': 'aspirine', 'Lisinopril': 'lisinopril (IEC)', 'Penicillin V': 'pénicillines', 'Sulfamethoxazole / Trimethoprim': 'cotrimoxazole (sulfamides)', 'Shellfish (substance)': 'fruits de mer',
          'Peanut (substance)': 'arachide', 'Tree nut (substance)': 'fruits à coque', 'Bee venom (substance)': 'venin d\'abeille', 'Latex (substance)': 'latex', 'Eggs (edible) (substance)': 'œuf',
          "Cow's milk (substance)": 'lait de vache', 'Wheat (substance)': 'blé', 'Fish (substance)': 'poisson', 'Grass pollen (substance)': 'pollens de graminées', 'Tree pollen (substance)': 'pollens d\'arbres',
          'House dust mite (organism)': 'acariens', 'Animal dander (substance)': 'poils d\'animaux', 'Mold (organism)': 'moisissures', 'Glycine max (substance)': 'soja'}

# ---------- demandes du jour (épisode aigu récent, sinon demande de conseil) ----------
DEM = {
 'Viral sinusitis (disorder)': dict(nom='rhinopharyngite / sinusite virale', plainte="J'ai le nez bouché et mal au front depuis trois jours, vous auriez quelque chose ?", sympt=['nez bouché', 'écoulement clair', 'pesanteur du front', 'fatigue'], zone=('front', ''), emo='fatigue', theme='pneumo_orl', demande='rhume',
            conseil="Lavages de nez au sérum physiologique plusieurs fois par jour, paracétamol si douleur ou fièvre (3 g/j maximum), boire et se reposer. Pas de vasoconstricteur oral (pseudoéphédrine).", orient="Consulter si fièvre > 3 jours, douleur unilatérale intense, écoulement purulent persistant au-delà de 10 jours, ou gêne visuelle."),
 'Acute viral pharyngitis (disorder)': dict(nom='angine virale probable', plainte="J'ai très mal à la gorge depuis hier, ça me gêne pour avaler.", sympt=['mal de gorge', 'douleur à la déglutition', 'petite fièvre'], zone=('gorge', ''), emo='douleur', theme='pneumo_orl', demande='gorge',
            conseil="Paracétamol, pastilles ou collutoire adoucissants, boissons tièdes. Le TROD angine (score de McIsaac) permet de distinguer une angine bactérienne.", orient="Consulter si fièvre élevée, gêne respiratoire, difficulté à ouvrir la bouche, ou TROD positif (antibiotique sur ordonnance)."),
 'Streptococcal sore throat (disorder)': dict(nom='angine (TROD à réaliser)', plainte="J'ai mal à la gorge avec de la fièvre, c'est très douloureux.", sympt=['mal de gorge intense', 'fièvre à 38,8 °C', 'ganglions au cou'], zone=('gorge', ''), emo='douleur', theme='pneumo_orl', demande='gorge',
            conseil="Score de McIsaac et TROD angine à l'officine : si positif, orientation vers le médecin ou dispensation d'amoxicilline selon le protocole en vigueur ; paracétamol contre la douleur.", orient="TROD positif : antibiotique ; consulter en urgence si gêne respiratoire ou impossibilité d'avaler."),
 'Acute bronchitis (disorder)': dict(nom='bronchite aiguë', plainte="Je tousse depuis une semaine, ça ne passe pas.", sympt=['toux grasse', 'gêne dans la poitrine', 'pas d\'essoufflement au repos'], zone=('poitrine', ''), emo='fatigue', theme='pneumo_orl', demande='toux',
            conseil="Hydratation, miel, paracétamol si besoin. Pas de fluidifiant ni de sirop codéiné sans avis ; arrêt du tabac.", orient="Consulter si fièvre > 3 jours, essoufflement, crachats sanglants, ou terrain fragile (BPCO, insuffisance cardiaque, âge > 75 ans)."),
 'Acute bacterial sinusitis (disorder)': dict(nom='sinusite', plainte="J'ai une douleur sous l'œil d'un côté, ça tape quand je me penche.", sympt=['douleur sous-orbitaire d\'un côté', 'écoulement épais', 'fièvre'], zone=('front', '-droite'), emo='douleur', theme='pneumo_orl', demande='rhume',
            conseil="Lavages de nez, paracétamol. Une sinusite unilatérale fébrile justifie une consultation.", orient="Orientation médicale : sinusite probablement bactérienne (douleur unilatérale, fièvre)."),
 'Acute infective cystitis (disorder)': dict(nom='cystite', plainte="J'ai des brûlures quand je fais pipi depuis hier, et j'ai envie tout le temps.", sympt=['brûlures urinaires', 'envies fréquentes', 'pas de fièvre'], zone=('ventre', ''), emo='gene', theme='nephro_urologie', demande='urinaire',
            conseil="Boire abondamment ; chez la femme de 16 à 65 ans sans signe de gravité, TROD bandelette urinaire puis fosfomycine selon le protocole officinal.", orient="Consulter si fièvre, douleur lombaire, homme, grossesse, plus de 65 ans, ou récidives (> 3 par an)."),
 'Sprain of ankle (disorder)': dict(nom='entorse de cheville', plainte="Je me suis tordu la cheville hier en descendant un trottoir, c'est gonflé.", sympt=['cheville gonflée', 'douleur à la marche', 'peut poser le pied'], zone=('cuisse', '-droite'), emo='douleur', theme='douleur_antalgie', demande='douleur',
            conseil="Repos, glace, compression, surélévation ; paracétamol. Orthèse de cheville si entorse bénigne.", orient="Consulter si impossibilité de faire 4 pas, douleur osseuse à la palpation (règles d'Ottawa)."),
 'Otitis media (disorder)': dict(nom='otite', plainte="J'ai mal à l'oreille depuis cette nuit.", sympt=['douleur d\'oreille', 'fièvre'], zone=('front', '-gauche'), emo='douleur', theme='pneumo_orl', demande='douleur',
            conseil="Paracétamol ; pas de gouttes auriculaires sans examen du tympan.", orient="Consultation : examen du tympan nécessaire."),
}
DEMANDES_LIBRES = {
 'douleur': dict(nom='mal de tête', plainte="J'ai mal à la tête depuis ce matin, vous me conseillez quoi ?", sympt=['céphalée', 'pas de fièvre'], zone=('front', ''), emo='douleur', theme='douleur_antalgie',
                 conseil="Paracétamol 1 g, à renouveler si besoin après 4 à 6 h (3 g/j maximum). Repos, hydratation.", orient="Consulter si céphalée brutale, inhabituelle, avec fièvre, raideur de nuque ou trouble neurologique."),
 'estomac': dict(nom='brûlures d\'estomac', plainte="J'ai des brûlures d'estomac après les repas, ça remonte.", sympt=['brûlures après les repas', 'remontées acides'], zone=('ventre', ''), emo='gene', theme='hepato_gastro', demande='estomac',
                 conseil="Alginate après les repas et au coucher, fractionner les repas, surélever la tête du lit ; IPP en automédication possible sur courte durée chez l'adulte.", orient="Consulter si plus de 50 ans avec symptômes récents, amaigrissement, difficulté à avaler, vomissements, saignement."),
 'sommeil': dict(nom='troubles du sommeil', plainte="Je dors très mal en ce moment, vous avez quelque chose pour m'aider ?", sympt=['difficultés d\'endormissement', 'réveils nocturnes'], zone=None, emo='fatigue', theme='neuro_psychiatrie', demande='sommeil',
                 conseil="Règles d'hygiène du sommeil ; mélatonine ou phytothérapie (valériane, passiflore) sur courte durée. Pas d'antihistaminique sédatif chez le sujet âgé.", orient="Consulter si insomnie durable, retentissement important ou signes dépressifs."),
 'stress': dict(nom='stress', plainte="Je suis très stressée en ce moment, on m'a parlé du millepertuis, ça marche ?", sympt=['stress', 'irritabilité'], zone=None, emo='anxieux', theme='neuro_psychiatrie', demande='stress',
                conseil="Le millepertuis est un puissant inducteur enzymatique : nombreuses interactions. Préférer des mesures d'hygiène de vie, une phytothérapie sans interaction (passiflore, aubépine) et en parler au médecin si le stress dure.", orient="Consulter si le trouble dure, retentit sur la vie quotidienne, ou en cas d'idées noires."),
}

# ---------- interactions (règles par classe ; niveaux d'après le thésaurus ANSM, à vérifier) ----------
INTER = [
 ({'AINS'}, {'IEC', 'ARA2', 'DIU_THIAZ', 'DIU_ANSE'}, "précaution d'emploi", "AINS + IEC, ARA2 ou diurétique : insuffisance rénale aiguë chez le patient à risque (sujet âgé, déshydratation), baisse de l'effet antihypertenseur.", "Éviter l'AINS ; sinon hydrater et surveiller la fonction rénale."),
 ({'AINS'}, {'AVK'}, 'association déconseillée', "Augmentation du risque hémorragique (agression de la muqueuse gastroduodénale).", "Éviter l'AINS ; paracétamol en première intention."),
 ({'AINS'}, {'ANTIAGREG'}, 'à prendre en compte', "Majoration du risque hémorragique et ulcérogène.", "Éviter l'AINS ; paracétamol en première intention."),
 ({'AINS'}, {'ISRS'}, 'à prendre en compte', "Majoration du risque hémorragique.", "Éviter l'AINS si possible."),
 ({'AINS'}, {'TACRO'}, 'à prendre en compte', "Risque d'addition des effets néphrotoxiques.", "Éviter l'AINS."),
 ({'ASPIRINE'}, {'CLOPI'}, "association déconseillée, précaution d'emploi", "Majoration du risque hémorragique par addition des activités antiagrégantes plaquettaires.", "Association validée dans les syndromes coronariens aigus ; surveillance clinique."),
 ({'ASPIRINE'}, {'IEC'}, 'à prendre en compte', "Aux doses antiagrégantes : peu de risque ; à doses anti-inflammatoires, insuffisance rénale aiguë chez le patient à risque.", "Surveiller la fonction rénale si doses élevées."),
 ({'IEC'}, {'DIU_THIAZ', 'DIU_ANSE'}, "précaution d'emploi", "Risque d'hypotension artérielle brutale et/ou d'insuffisance rénale aiguë à l'instauration de l'IEC en cas de déplétion hydrosodée.", "Surveiller la créatininémie dans les premières semaines."),
 ({'ARA2'}, {'DIU_THIAZ', 'DIU_ANSE'}, "précaution d'emploi", "Risque d'hypotension artérielle brutale et/ou d'insuffisance rénale aiguë à l'instauration de l'ARA II en cas de déplétion hydrosodée.", "Surveiller la créatininémie dans les premières semaines."),
 ({'SIMVA'}, {'ICA'}, "précaution d'emploi", "Amlodipine + simvastatine : risque majoré d'effets indésirables musculaires (rhabdomyolyse).", "Limiter la simvastatine à 20 mg par jour ou utiliser une autre statine."),
 ({'DIU_ANSE'}, {'METFORMINE'}, "précaution d'emploi", "Acidose lactique due à la metformine, déclenchée par une insuffisance rénale fonctionnelle liée au diurétique.", "Ne pas utiliser la metformine si la créatininémie dépasse les seuils (DFG < 30 mL/min)."),
 ({'BB'}, {'INSULINE', 'GLP1'}, 'à prendre en compte', "Les bêta-bloquants masquent les signes d'hypoglycémie (palpitations, tachycardie).", "Renforcer l'autosurveillance glycémique."),
 ({'B2CA', 'B2LA'}, {'INSULINE'}, "précaution d'emploi", "Élévation de la glycémie par le bêta-2 mimétique.", "Renforcer la surveillance glycémique."),
 ({'OPIOIDE'}, {'BZD'}, 'à prendre en compte', "Risque majoré de dépression respiratoire, pouvant être fatale en cas de surdosage.", "Limiter doses et durée ; surveiller la vigilance et la respiration."),
 ({'OPIOIDE'}, {'BUPRENORPHINE'}, 'association déconseillée', "Diminution de l'effet antalgique par blocage compétitif des récepteurs, risque de syndrome de sevrage.", "Éviter l'association."),
 ({'BUPRENORPHINE'}, {'BZD'}, 'à prendre en compte', "Risque majoré de dépression respiratoire pouvant être fatale.", "Évaluer attentivement le rapport bénéfice/risque."),
 ({'OPIOIDE', 'BZD', 'BUPRENORPHINE'}, {'ANTIH1_SED'}, 'à prendre en compte', "Majoration de la dépression centrale (somnolence, chutes).", "Éviter l'association, surtout chez le sujet âgé."),
 ({'TRAMADOL'}, {'ISRS'}, 'à prendre en compte', "Risque d'apparition de convulsions et/ou de syndrome sérotoninergique.", "Surveillance clinique."),
 ({'FLUOX'}, {'BB'}, "précaution d'emploi", "Fluoxétine (inhibiteur du CYP2D6) + métoprolol : risque de bradycardie excessive.", "Surveillance clinique ; adapter la posologie du bêta-bloquant."),
 ({'FER'}, {'LEVOTHYROX'}, "précaution d'emploi", "Diminution de l'absorption digestive des hormones thyroïdiennes.", "Prendre la lévothyroxine à distance du fer (plus de 2 heures)."),
 ({'FER'}, {'BISPHOSPHONATE'}, "précaution d'emploi", "Diminution de l'absorption digestive des bisphosphonates.", "Prendre le fer à distance du bisphosphonate (plus de 2 heures)."),
 ({'FER'}, {'CYCLINE'}, "précaution d'emploi", "Diminution de l'absorption digestive des cyclines.", "Prendre le fer à distance de la cycline (plus de 2 heures)."),
 ({'AVK'}, {'CYCLINE'}, "précaution d'emploi", "Augmentation de l'effet de l'antivitamine K et du risque hémorragique.", "Contrôle plus fréquent de l'INR."),
 ({'AVK'}, {'ANTIAGREG'}, 'à prendre en compte', "Augmentation du risque hémorragique.", "Surveillance clinique et de l'INR."),
]
CONSEIL_PRODUIT = {   # produit que l'étudiant pourrait proposer -> règles de prudence (alertes_conseils)
 'ains': ('ibuprofène|advil|nurofen|spedifen|naproxène|aleve|antarène|ains|anti-inflammatoire|kétoprofène|aspirine 500', {'IEC', 'ARA2', 'DIU_THIAZ', 'DIU_ANSE', 'AVK', 'ANTIAGREG', 'ISRS', 'TACRO', 'AINS'}, 'AINS à éviter chez ce patient ({0}) : préférer le paracétamol.'),
 'vasoc': ('pseudoéphédrine|actifed|humex rhume|dolirhume|rhinadvil|nurofen rhume|vasoconstricteur', {'ANTIHTA', 'NITRE'}, 'Vasoconstricteur oral contre-indiqué ou déconseillé (hypertension, cardiopathie) : lavages de nez à la place.'),
 'antih1sed': ('doxylamine|donormyl|diphénhydramine|nautamine|antihistaminique sédatif|dexchlorphéniramine|polaramine', {'OPIOIDE', 'BZD', 'BUPRENORPHINE'}, "Antihistaminique sédatif + dépresseur du système nerveux central ({0}) : somnolence et risque respiratoire majorés."),
 'millepertuis': ('millepertuis', {'COC', 'MICROPROG', 'AVK', 'TACRO', 'ISRS'}, "Millepertuis contre-indiqué ({0}) : inducteur enzymatique (contraceptif inefficace, baisse de l'AVK ou du tacrolimus) ou syndrome sérotoninergique."),
 'codeine': ('codéine|dafalgan codéiné|néo-codion|sirop codéiné|antitussif opiacé', {'OPIOIDE', 'BZD', 'BUPRENORPHINE'}, 'Antitussif ou antalgique opiacé à éviter : patient déjà sous dépresseur respiratoire ({0}).'),
 'ipp': ('oméprazole|ésoméprazole|pantoprazole|ipp|inhibiteur de la pompe', {'CLOPI'}, "Avec le clopidogrel, éviter l'oméprazole et l'ésoméprazole (baisse de l'effet antiagrégant) : préférer le pantoprazole."),
}

PRENOMS_F = ['Martine', 'Sylvie', 'Nathalie', 'Isabelle', 'Catherine', 'Sophie', 'Claire', 'Julie', 'Camille', 'Léa', 'Manon', 'Chloé', 'Monique', 'Françoise', 'Nicole', 'Laura', 'Inès', 'Sarah', 'Anne', 'Hélène']
PRENOMS_H = ['Jean', 'Michel', 'Philippe', 'Alain', 'Patrick', 'Pierre', 'Nicolas', 'Thomas', 'Julien', 'Lucas', 'Hugo', 'Karim', 'Bernard', 'Daniel', 'Marc', 'Antoine', 'Paul', 'Louis', 'Yanis', 'Gérard']
NOMS = ['Martin', 'Bernard', 'Dubois', 'Durand', 'Lefebvre', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Andre', 'Mercier', 'Blanc', 'Guerin', 'Boyer', 'Garnier', 'Chevalier', 'Francois', 'Legrand', 'Gauthier', 'Perrin', 'Robin', 'Clement']
LABS = {  # description Synthea -> (libellé, unité FR, conversion, référence, (bas, haut))
 'Hemoglobin A1c/Hemoglobin.total in Blood': ('HbA1c', '%', 1, '< 6,5 (objectif < 7 chez le diabétique)', (None, 7.0)),
 'Glucose [Mass/volume] in Blood': ('Glycémie à jeun', 'mmol/L', 0.0555, '3,9 - 6,1', (3.9, 6.1)),
 'Creatinine [Mass/volume] in Blood': ('Créatinine', 'µmol/L', 88.4, '45 - 105', (45, 105)),
 'Glomerular filtration rate [Volume Rate/Area] in Serum or Plasma by Creatinine-based formula (MDRD)/1.73 sq M': ('DFG (MDRD)', 'mL/min/1,73 m²', 1, '> 60', (60, None)),
 'Potassium [Moles/volume] in Blood': ('Potassium', 'mmol/L', 1, '3,5 - 5,0', (3.5, 5.0)),
 'Sodium [Moles/volume] in Blood': ('Sodium', 'mmol/L', 1, '135 - 145', (135, 145)),
 'Hemoglobin [Mass/volume] in Blood': ('Hémoglobine', 'g/dL', 1, '12 - 16 (F), 13 - 17 (H)', (12, None)),
 'Cholesterol in LDL [Mass/volume] in Serum or Plasma by Direct assay': ('LDL-cholestérol', 'g/L', 0.01, '< 1,6 (cible selon le risque)', (None, 1.6)),
 'Low Density Lipoprotein Cholesterol': ('LDL-cholestérol', 'g/L', 0.01, '< 1,6 (cible selon le risque)', (None, 1.6)),
 'Triglycerides': ('Triglycérides', 'g/L', 0.01, '< 1,5', (None, 1.5)),
}
fr = lambda x, d=1: (f'{x:.{d}f}').replace('.', ',')

def age(bd): b = dt.date.fromisoformat(bd); f = FIN.date(); return f.year - b.year - ((f.month, f.day) < (b.month, b.day))
cas = []; ignores = 0
for _, p in P.sample(frac=1, random_state=7).iterrows():
    pid = p.Id; a = age(p.BIRTHDATE)
    if a < 16 or not pd.isna(p.DEATHDATE): continue
    meds = M[(M.PATIENT == pid) & M.STOP.isna()]
    if meds.DESCRIPTION.str.contains(EXCLURE_MED).any(): continue
    L = []
    for d in meds.sort_values('START').DESCRIPTION.unique():
        m = med_fr(d)
        if not m: ignores += 1; continue
        if m['dci'] not in [x['dci'] for x in L]: L.append(m)
    if not L: continue
    if len(cas) >= 70: break
    cls = set().union(*[m['cls'] for m in L])
    cc = C[(C.PATIENT == pid)]; act = cc[cc.STOP.isna()]
    maladies = [];  [maladies.append(COND[d]) for d in act.DESCRIPTION if d in COND and COND[d] not in maladies]
    if 'grossesse en cours' in maladies: continue                                # hors champ : grossesse (autre type de cas)
    femme = p.GENDER == 'F'; prenom = rnd.choice(PRENOMS_F if femme else PRENOMS_H); nom = rnd.choice(NOMS)
    al = A[A.PATIENT == pid]; allerg = sorted({ALLERG[x] for x in al.DESCRIPTION if x in ALLERG})
    # constantes et biologie (dernières valeurs)
    ob = O[O.PATIENT == pid].sort_values('DATE')
    last = lambda desc: (lambda s: float(s.iloc[-1]) if len(s) else None)(pd.to_numeric(ob[ob.DESCRIPTION == desc].VALUE, errors='coerce').dropna())
    poids, taille, pas, pad, pouls = last('Body Weight'), last('Body Height'), last('Systolic Blood Pressure'), last('Diastolic Blood Pressure'), last('Heart rate')
    bilan = []
    for k, (lib, u, f, ref, (lo, hi)) in LABS.items():
        v = last(k)
        if v is None or any(b['analyse'] == lib for b in bilan): continue
        v = v * f; d = 2 if u in ('g/L',) else 0 if u in ('µmol/L', 'mL/min/1,73 m²') else 1
        bilan.append(dict(ech='Sang', analyse=lib, resultat=fr(v, d), unite=u, ref=ref, v=v, anormal=(lo is not None and v < lo) or (hi is not None and v > hi)))
    dfg = next((b['v'] for b in bilan if b['analyse'].startswith('DFG')), None)
    # demande du jour : épisode aigu des 12 derniers mois si connu, sinon demande de conseil adaptée au terrain
    rec = cc[(cc.START > FIN - pd.Timedelta(days=400)) & cc.DESCRIPTION.isin(DEM.keys())].sort_values('START')
    if len(rec): D = DEM[rec.DESCRIPTION.iloc[-1]]
    else:
        opts = ['douleur', 'sommeil', 'estomac']
        if cls & {'COC', 'MICROPROG', 'AVK', 'TACRO', 'ISRS'} and femme: opts += ['stress', 'stress']
        D = DEMANDES_LIBRES[rnd.choice(opts)]
    # interactions présentes dans l'ordonnance
    inter = []
    for A1, A2, niv, meca, cond in INTER:
        x = [m for m in L if m['cls'] & A1]; y = [m for m in L if m['cls'] & A2 and m not in x]
        for m1 in x:
            for m2 in y:
                if not any({m1['dci'], m2['dci']} == set(i['entre']) for i in inter): inter.append(dict(entre=[m1['dci'], m2['dci']], rubrique='', niveau=niv.split(', '), mecanisme=meca, conduite=cond))
    # redondances (fréquentes dans les historiques Synthea : on en fait un point d'analyse)
    REDOND = [({'IEC', 'ARA2'}, 'bloqueurs du système rénine-angiotensine (IEC / ARA II)'), ({'STATINE'}, 'statines'), ({'BB'}, 'bêta-bloquants'), ({'AINS'}, 'AINS'),
              ({'OPIOIDE'}, 'opioïdes'), ({'ISRS'}, 'ISRS'), ({'COC', 'MICROPROG'}, 'contraceptifs hormonaux'), ({'ANTIH1', 'ANTIH1_SED'}, 'antihistaminiques'), ({'CSI'}, 'corticoïdes inhalés'), ({'ICA'}, 'inhibiteurs calciques')]
    redond = []
    for k, lib in REDOND:
        x = [m['dci'] for m in L if m['cls'] & k]
        if len(x) > 1: redond.append(f"{lib} en double ({', '.join(x)}) : redondance à signaler au prescripteur avant de délivrer")
    p2y12 = [m['dci'] for m in L if m['dci'] in ('clopidogrel', 'prasugrel')]
    if len(p2y12) > 1: redond.append(f"deux inhibiteurs P2Y12 ({', '.join(p2y12)}) : association non justifiée, risque hémorragique majeur, contacter le prescripteur")
    # terrain
    terrain = []
    if a >= 75: terrain.append(f'sujet âgé ({a} ans) : risque de chutes, de iatrogénie et d\'insuffisance rénale')
    if dfg is not None and dfg < 60: terrain.append(f'fonction rénale diminuée (DFG {fr(dfg, 0)} mL/min/1,73 m²) : adapter les médicaments éliminés par le rein' + (' ; metformine : demi-dose si DFG 30-45, arrêt si < 30' if 'METFORMINE' in cls else ''))
    if 'aspirine' in allerg and 'ASPIRINE' in cls: terrain.append("ALLERGIE à l'aspirine signalée alors qu'elle figure sur l'ordonnance : vérifier la nature de la réaction avec le prescripteur avant de délivrer")
    if 'lisinopril (IEC)' in allerg and 'IEC' in cls: terrain.append("ALLERGIE (angio-œdème ?) à un IEC signalée alors qu'un IEC figure sur l'ordonnance : contacter le prescripteur")
    if 'pénicillines' in allerg and 'PENICILLINE' in cls: terrain.append("ALLERGIE aux pénicillines signalée alors qu'une pénicilline figure sur l'ordonnance : contacter le prescripteur")
    if {'ANTIAGREG', 'AVK'} & cls: terrain.append('risque hémorragique : pas d\'AINS ni d\'aspirine en automédication')
    if 'OPIOIDE' in cls or 'BUPRENORPHINE' in cls: terrain.append('dépresseurs respiratoires : pas d\'antitussif opiacé ni d\'antihistaminique sédatif, prévenir la constipation')
    # alertes de conseils (vérification des propositions de l'étudiant au débriefing)
    alertes = []
    for k, (motif, risque, msg) in CONSEIL_PRODUIT.items():
        hit = [m['dci'] for m in L if m['cls'] & risque]
        if hit or (k == 'ains' and dfg is not None and dfg < 60) or (k == 'ains' and a >= 75):
            raison = ', '.join(hit) if hit else ('fonction rénale diminuée' if dfg is not None and dfg < 60 else 'sujet âgé')
            alertes.append(dict(si=motif, rappel=msg.format(raison)))
    il = 'elle' if femme else 'il'; Il = il.capitalize(); Mme = 'Mme' if femme else 'M.'
    txt_mal = ', '.join(maladies) if maladies else 'pas d\'antécédent notable connu'
    enonce = (f"{Mme} {prenom} {nom}, {a} ans, vient à l'officine renouveler son ordonnance. {Il} est suivi{'e' if femme else ''} pour : {txt_mal}. "
              f"Traitement en cours : {', '.join(m['spe'] for m in L)}. Allergies : {', '.join(allerg) if allerg else 'aucune connue'}. "
              + (f"Dernières mesures : tension {int(pas)}/{int(pad)} mmHg, fréquence cardiaque {int(pouls)}/min, poids {fr(poids, 0)} kg pour {fr(taille, 0)} cm. " if pas and pad and pouls and poids and taille else '')
              + (f"{Il} apporte son dernier bilan sanguin. " if bilan else '')
              + f"Au comptoir, {il} vous dit : « {D['plainte']} »")
    ordo = dict(type='ordonnance', titre='Ordonnance', medecin=rnd.choice(NOMS) + ', médecin généraliste', patient=f"{Mme} {prenom} {nom}, {a} ans",
                date=(FIN - pd.Timedelta(days=rnd.randint(1, 20))).strftime('%d/%m/%Y'), lignes=[dict(medicament=m['spe'], posologie=m['poso'], duree='3 mois, à renouveler') for m in L], origine='synthea')
    docs = [ordo] + ([dict(type='bilan', titre='Bilan sanguin', lignes=[{k: b[k] for k in ('ech', 'analyse', 'resultat', 'unite', 'ref')} for b in bilan], origine='synthea')] if bilan else [])
    # réponses modèles
    r1 = '\n'.join(f"- {m['spe']} ({m['dci']}) : {m['poso']}." + (f" Vigilance : {m['vig']}." if m['vig'] else '') for m in L)
    r2 = ('Redondances :\n' + '\n'.join('- ' + x for x in redond) + '\nInteractions :\n' if redond else '') + ('\n'.join(f"- {' + '.join(i['entre'])} ({i['niveau'][0]}) : {i['mecanisme']} {i['conduite']}" for i in inter) if inter else "- Pas d'interaction notable entre les médicaments de l'ordonnance.") \
        + ('\nTerrain :\n' + '\n'.join('- ' + t for t in terrain) if terrain else '')
    anorm = [b for b in bilan if b['anormal']]
    r3 = ('Valeurs anormales : ' + ' ; '.join(f"{b['analyse']} {b['resultat']} {b['unite']} (réf. {b['ref']})" for b in anorm) + '.' if anorm else 'Bilan sans anomalie notable.') if bilan else ''
    eviter = [x['rappel'] for x in alertes]
    r4 = f"{D['nom'].capitalize()}. {D['conseil']}" + (' À éviter chez ce patient : ' + ' '.join(eviter) if eviter else '') + f" Orientation : {D['orient']}"
    Q = [dict(n='1', type='analyse', question="Analysez l'ordonnance de renouvellement (rôle de chaque médicament, posologie, points de vigilance).", reponse_modele=r1),
         dict(n='2', type='interactions', question="Relevez les interactions et les points de vigilance liés au terrain du patient.", reponse_modele=r2)]
    if bilan: Q.append(dict(n='3', type='biologie', question='Interprétez le bilan sanguin.', reponse_modele=r3))
    Q.append(dict(n=str(len(Q) + 1), type='conseil', question='Quelle réponse apportez-vous à sa demande du jour ?', reponse_modele=r4))
    sid = f"SY{len(cas) + 1:03d}"
    theme = ('cardiovasculaire' if cls & {'ANTIAGREG', 'AVK', 'NITRE', 'ANTIHTA', 'STATINE'} else 'endocrino_metabolisme' if cls & {'ANTIDIAB', 'LEVOTHYROX'} else
             'pneumo_orl' if cls & {'CSI', 'B2CA', 'B2LA'} else 'douleur_antalgie' if cls & {'OPIOIDE', 'BUPRENORPHINE'} else 'neuro_psychiatrie' if cls & {'ISRS', 'BZD', 'MPH', 'ATOMOX', 'ANTICHOL'} else
             'pediatrie_gyneco' if cls & {'COC', 'MICROPROG'} else D['theme'])
    cas.append(dict(
        id=sid, theme=theme, specialites=[], apercu=f"{Mme} {prenom} {nom}, {a} ans : renouvellement ({len(L)} médicament{'s' if len(L) > 1 else ''}) et {D['nom']}", enonce=enonce, questions=Q,
        indices=dict(documents_possibles=['ordonnance'] + (['bilan'] if bilan else []), valeurs_chiffrees=len(bilan), traitement_nomme=True, question_verification_traitement=True),
        documents=docs, sources=[dict(fichier='Synthea (synthetichealth/synthea, Apache-2.0), graine 4242', ids=[pid])],
        connaissances=dict(medicaments=[dict(terme=m['spe'], substances=[m['dci']]) for m in L], interactions=inter, origine='règles du générateur Synthea (à vérifier dans le thésaurus ANSM)'),
        pop='officine', pop_origine='synthea', metier='pharmacien d\'officine', a_valider=True, actif=False,
        fiche=dict(sexe='F' if femme else 'M', age=a, age_unite='ans', poids_kg=round(poids) if poids else None, taille_cm=round(taille) if taille else None, grossesse=None, allaitement=None,
                   allergies=', '.join(allerg) if allerg else 'aucune connue', traitements=[m['spe'] for m in L], origine='synthea'),
        patient=dict(emotion=D['emo'], profil='', zone=dict(partie=D['zone'][0], cote=D['zone'][1].strip('-') or None) if D.get('zone') else None, plainte=D['plainte'], symptomes=D['sympt']),
        constantes=dict(pas=int(pas), pad=int(pad), pouls=int(pouls)) if pas and pad and pouls else None,
        alertes_conseils=alertes or None,
    ))
json.dump(dict(cas=cas, ignores_medicaments=ignores), open(OUT, 'w'), ensure_ascii=False, indent=1)
from collections import Counter
print(len(cas), 'cas ;', 'médicaments non convertis', ignores, '; thèmes', Counter(c['theme'] for c in cas), '; interactions', sum(len(c['connaissances']['interactions']) for c in cas))
