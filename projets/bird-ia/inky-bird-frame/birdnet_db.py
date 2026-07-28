"""
Lecture de la dernière détection dans la base SQLite de BirdNET-Go.

Le schéma exact de BirdNET-Go peut varier selon les versions, donc au lieu
de coder en dur des noms de colonnes, ce module *découvre* la table de
détections et associe les colonnes par correspondance de noms. Tu peux
forcer les noms via la section [birdnet] de config.ini si besoin.

Utilise inspect_db.py pour voir ce qui est réellement détecté.
"""

import os
import glob
import sqlite3

# Pour chaque champ logique, des noms de colonnes plausibles (minuscules).
FIELD_CANDIDATES = {
    "scientific": ["scientific_name", "sci_name", "scientificname", "sciname", "latin", "species"],
    "common":     ["common_name", "com_name", "commonname", "comname", "en_name", "vernacular"],
    "confidence": ["confidence", "conf", "score", "probability"],
    "date":       ["date", "detection_date"],
    "time":       ["time", "detection_time"],
    "timestamp":  ["timestamp", "datetime", "date_time", "created_at", "begin_time"],
    "clip":       ["clip_name", "clip", "file_name", "filename", "clip_path", "path", "audio", "file"],
}

# Tables qu'on privilégie si plusieurs candidates existent.
PREFERRED_TABLE_HINTS = ["note", "detection", "result", "observation"]


def _connect_ro(db_path):
    """Ouvre la base en lecture seule (BirdNET-Go écrit dedans en parallèle)."""
    try:
        return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=5)
    except sqlite3.OperationalError:
        # Repli : ouverture normale.
        return sqlite3.connect(db_path, timeout=5)


def _list_tables(con):
    cur = con.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return [r[0] for r in cur.fetchall()]


def _columns(con, table):
    cur = con.execute(f'PRAGMA table_info("{table}")')
    return [r[1] for r in cur.fetchall()]  # r[1] = nom de colonne


def _match_column(columns, candidates):
    """Trouve la meilleure colonne : exact d'abord, puis sous-chaîne."""
    lower = {c.lower(): c for c in columns}
    for cand in candidates:
        if cand in lower:
            return lower[cand]
    for cand in candidates:
        for lc, orig in lower.items():
            if cand in lc:
                return orig
    return None


def discover_schema(con, overrides=None):
    """
    Renvoie un dict décrivant la table de détections et le mapping des
    colonnes, ou None si rien de convaincant n'est trouvé.
    """
    overrides = overrides or {}

    forced_table = overrides.get("table") or ""
    tables = _list_tables(con)
    if forced_table:
        tables = [forced_table] if forced_table in tables else tables

    best = None
    for table in tables:
        cols = _columns(con, table)
        mapping = {}
        for field, cands in FIELD_CANDIDATES.items():
            ov = overrides.get(f"col_{field}") if field in ("common", "scientific",
                                                             "confidence", "date",
                                                             "time", "clip") else None
            mapping[field] = ov or _match_column(cols, cands)

        # Une vraie table de détections a au minimum une confiance
        # et un nom (commun ou scientifique).
        if mapping["confidence"] and (mapping["common"] or mapping["scientific"]):
            score = sum(1 for v in mapping.values() if v)
            if any(h in table.lower() for h in PREFERRED_TABLE_HINTS):
                score += 5
            if best is None or score > best["score"]:
                best = {"table": table, "columns": cols, "mapping": mapping, "score": score}

    return best


def _order_clause(con, table, mapping, columns):
    """Comment récupérer la ligne la PLUS RÉCENTE."""
    lower = [c.lower() for c in columns]
    if "id" in lower:
        return "id DESC"
    if mapping.get("timestamp"):
        return f'"{mapping["timestamp"]}" DESC'
    if mapping.get("date") and mapping.get("time"):
        return f'"{mapping["date"]}" DESC, "{mapping["time"]}" DESC'
    return "rowid DESC"


def _resolve_clip(clip_value, clips_dir):
    """Transforme la valeur stockée en chemin de fichier réel, si possible."""
    if not clip_value:
        return None
    # Chemin absolu déjà bon ?
    if os.path.isabs(clip_value) and os.path.exists(clip_value):
        return clip_value
    # Relatif au dossier des clips ?
    cand = os.path.join(clips_dir, clip_value)
    if os.path.exists(cand):
        return cand
    # Sinon, on cherche par nom de fichier dans l'arborescence des clips.
    name = os.path.basename(clip_value)
    if name and os.path.isdir(clips_dir):
        hits = glob.glob(os.path.join(clips_dir, "**", name), recursive=True)
        if hits:
            return hits[0]
    return None


def get_latest_detection(cfg):
    """
    Renvoie un dict :
      { 'common', 'scientific', 'confidence' (float 0..1),
        'when' (str lisible), 'clip_path' (str|None) }
    ou None s'il n'y a aucune détection / base introuvable.
    """
    db_path = cfg["birdnet"]["db_path"]
    clips_dir = cfg["birdnet"]["clips_dir"]
    if not os.path.exists(db_path):
        return None

    overrides = {k: cfg["birdnet"].get(k, "") for k in
                 ("table", "col_common", "col_scientific", "col_confidence",
                  "col_date", "col_time", "col_clip")}

    con = _connect_ro(db_path)
    try:
        schema = discover_schema(con, overrides)
        if not schema:
            return None

        table = schema["table"]
        m = schema["mapping"]
        order = _order_clause(con, table, m, schema["columns"])

        # On sélectionne toutes les colonnes ; on lira par nom.
        row = con.execute(f'SELECT * FROM "{table}" ORDER BY {order} LIMIT 1').fetchone()
        if not row:
            return None
        colnames = [d[0] for d in con.execute(f'SELECT * FROM "{table}" LIMIT 0').description]
        rec = dict(zip(colnames, row))

        def val(field):
            col = m.get(field)
            return rec.get(col) if col else None

        # Confiance -> float 0..1
        conf = val("confidence")
        try:
            conf = float(conf)
            if conf > 1.5:      # certaines bases stockent des %
                conf = conf / 100.0
        except (TypeError, ValueError):
            conf = None

        # Horodatage lisible
        when = ""
        if val("timestamp"):
            when = str(val("timestamp"))
        else:
            d, t = val("date"), val("time")
            when = " ".join(str(x) for x in (d, t) if x)

        clip_path = _resolve_clip(val("clip"), clips_dir)

        return {
            "common":     (val("common") or "").strip() or None,
            "scientific": (val("scientific") or "").strip() or None,
            "confidence": conf,
            "when":       when.strip(),
            "clip_path":  clip_path,
        }
    finally:
        con.close()
