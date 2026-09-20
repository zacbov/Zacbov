"""
Génère un index léger (JSON) des spécialités BDPM pour l'autocomplétion,
en incluant la substance active de chaque spécialité (nécessaire pour
interroger correctement PubChem/openFDA, qui attendent un nom de substance
et non un nom commercial complet type "DOLIPRANE 1000 mg, comprimé").

Ne crée AUCUNE base de données : le résultat est un simple fichier JSON
rechargé en mémoire par le serveur/navigateur, régénéré périodiquement
(cron ou lancement manuel, la BDPM est mise à jour chaque jour ouvré).

Sources officielles (confirmées le 19/09/2026) :
https://base-donnees-publique.medicaments.gouv.fr/telechargement

Fichiers utilisés (encodage Latin-1, séparateur tabulation, sans en-tête) :

CIS_bdpm.txt (spécialités) :
    0: Code CIS
    1: Dénomination de la spécialité
    2: Forme pharmaceutique
    3: Voie(s) d'administration
    4: Statut administratif de l'AMM
    5: Type de procédure d'AMM
    6: État de commercialisation
    7: Date de commercialisation
    8: Statut BDM (bon usage du médicament)
    9: Numéro d'autorisation européenne
    10: Titulaire(s)
    11: Surveillance renforcée

CIS_COMPO_bdpm.txt (compositions) :
    0: Code CIS
    1: Désignation de l'élément pharmaceutique
    2: Code de la substance
    3: Dénomination de la substance
    4: Dosage
    5: Référence dosage
    6: Nature du composant (ex. "SA" = substance active)
    7: Numéro de lien (optionnel)
"""

import csv
import json
import sys
import tempfile
import urllib.request
from pathlib import Path

BDPM_URL = "https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_bdpm.txt"
COMPO_URL = "https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_COMPO_bdpm.txt"
# Autres fichiers disponibles au même schéma d'URL (download/file/<nom>),
# pas encore exploités ici mais utiles pour la suite :
#   CIS_CIP_Dispo_Spec.txt  -> ruptures de stock, pour le module alertes
#   CIS_GENER_bdpm.txt      -> groupes génériques
#   CIS_MITM.txt            -> médicaments d'intérêt thérapeutique majeur

# Généré directement à côté d'index.html : le JS du site le charge en fetch('./bdpm_index.json')
OUTPUT_PATH = Path(__file__).parent / "bdpm_index.json"


def download(url: str, dest: Path) -> None:
    print(f"Téléchargement de {url} ...")
    urllib.request.urlretrieve(url, dest)
    print(f"Fichier brut sauvegardé dans {dest}")


def load_substances(compo_path: Path) -> dict[str, str]:
    """
    Retourne un dict {code_cis: nom_substance_active}.
    Ne garde que la première substance active (nature = 'SA') rencontrée
    par CIS — suffisant pour interroger PubChem/openFDA sur le principe
    actif principal ; les associations multi-substances (ex. Doliprane
    Codéine) perdront le détail des composants secondaires, acceptable
    pour ce niveau de prototype.
    """
    substances: dict[str, str] = {}
    with open(compo_path, encoding="latin-1") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 7:
                continue
            code_cis = row[0].strip()
            denomination = row[3].strip()
            nature = row[6].strip()
            if not code_cis or not denomination:
                continue
            if code_cis in substances:
                continue  # on garde la première trouvée
            if nature == "SA" or code_cis not in substances:
                substances[code_cis] = denomination
    return substances


def build_index(raw_path: Path, compo_path: Path, output_path: Path) -> int:
    """
    Construit l'index nom -> code CIS + substance active à partir des
    fichiers bruts. Retourne le nombre d'entrées indexées.
    """
    substances = load_substances(compo_path)

    entries = {}
    with open(raw_path, encoding="latin-1") as f:
        reader = csv.reader(f, delimiter="\t")
        for row in reader:
            if len(row) < 7:
                continue
            code_cis = row[0].strip()
            nom = row[1].strip()
            statut_commercialisation = row[6].strip()
            if not code_cis or not nom:
                continue
            entries[code_cis] = {
                "cis": code_cis,
                "nom": nom,
                "statut": statut_commercialisation,
                # Utilisé pour interroger PubChem/openFDA (attendent un nom
                # de substance, pas un nom commercial avec dosage/forme).
                # None si aucune composition trouvée : le front-end retombe
                # alors sur le nom de recherche brut.
                "substance": substances.get(code_cis),
            }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(list(entries.values()), f, ensure_ascii=False)

    return len(entries)


if __name__ == "__main__":
    tmp = Path(tempfile.gettempdir())
    raw_specialites = tmp / "CIS_bdpm.txt"
    raw_compo = tmp / "CIS_COMPO_bdpm.txt"

    if "--skip-download" not in sys.argv:
        download(BDPM_URL, raw_specialites)
        download(COMPO_URL, raw_compo)
    else:
        print(f"Utilisation des fichiers locaux existants : {raw_specialites}, {raw_compo}")

    count = build_index(raw_specialites, raw_compo, OUTPUT_PATH)
    print(f"Index généré : {count} spécialités (avec substance active) -> {OUTPUT_PATH}")
