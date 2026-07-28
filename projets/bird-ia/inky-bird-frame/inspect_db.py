"""
Petit utilitaire de diagnostic. À lancer sur le Pi une fois BirdNET-Go
installé et quelques détections enregistrées :

    python inspect_db.py

Il affiche les tables, le mapping de colonnes détecté, et la dernière
détection telle que le module la lit. Si le mapping est faux, reporte
les bons noms dans la section [birdnet] de config.ini.
"""

import configparser
import os

import birdnet_db as bd


def main():
    cfg = configparser.ConfigParser()
    cfg.read(os.path.join(os.path.dirname(__file__), "config.ini"))

    db_path = cfg["birdnet"]["db_path"]
    print(f"Base : {db_path}")
    if not os.path.exists(db_path):
        print("  !! Fichier introuvable. Corrige db_path dans config.ini.")
        print("     Astuce : find ~/birdnet-go-app -name '*.db'")
        return

    con = bd._connect_ro(db_path)
    try:
        print("\nTables présentes :")
        for t in bd._list_tables(con):
            print(f"  - {t}  ({', '.join(bd._columns(con, t))})")

        overrides = {k: cfg['birdnet'].get(k, '') for k in
                     ('table', 'col_common', 'col_scientific', 'col_confidence',
                      'col_date', 'col_time', 'col_clip')}
        schema = bd.discover_schema(con, overrides)
        print("\nSchéma détecté :")
        if not schema:
            print("  Aucune table de détections reconnue.")
            return
        print(f"  table = {schema['table']}")
        for field, col in schema["mapping"].items():
            print(f"  {field:11s} -> {col}")
    finally:
        con.close()

    print("\nDernière détection lue :")
    det = bd.get_latest_detection(cfg)
    if not det:
        print("  (aucune détection pour l'instant)")
    else:
        for k, v in det.items():
            print(f"  {k:11s} : {v}")


if __name__ == "__main__":
    main()
