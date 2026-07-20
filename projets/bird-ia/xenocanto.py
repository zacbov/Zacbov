"""
Chant de référence via xeno-canto (API v3).

Quand la capture de jardin est trop bruitée (ou absente), on affiche le
sonagramme d'un enregistrement de référence "propre" de l'espèce. Le
téléchargement se fait UNE fois par espèce, puis tout est mis en cache.

Découpage volontaire en deux fonctions :
  - prefetch_reference()      -> fait le RÉSEAU (requête + téléchargement).
                                 À appeler en tâche de fond.
  - reference_sonagram()      -> ne lit QUE le cache (pas de réseau).
                                 Utilisé dans le chemin qui sert l'ESP32.

API v3 : https://xeno-canto.org/api/3/recordings  (clé requise depuis oct. 2025).
La clé vit dans config.ini [xenocanto] api_key, jamais dans le code.

Usage test en ligne de commande (sur le Pi, une fois la clé renseignée) :
    python xenocanto.py "Erithacus rubecula"
"""

import json
import os
import time
import urllib.parse
import urllib.request

from spectrogram import spectrogram_image

API_URL = "https://xeno-canto.org/api/3/recordings"
_QUALITIES = ["A", "B", "C"]          # ordre de préférence
USER_AGENT = "InkyBirdFrame/1.0 (personal, non-commercial)"


# ------------------------- utilitaires cache -------------------------

def _slug(scientific):
    return scientific.strip().replace(" ", "_")


def _species_dir(scientific, cfg):
    base = cfg["xenocanto"].get("cache_dir", "").strip() or \
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "refs")
    d = os.path.join(base, _slug(scientific))
    os.makedirs(d, exist_ok=True)
    return d


def _meta_path(d):
    return os.path.join(d, "metadata.json")


def _find_audio(d):
    for name in os.listdir(d):
        if name.startswith("reference."):
            return os.path.join(d, name)
    return None


def load_metadata(scientific, cfg):
    d = _species_dir(scientific, cfg)
    p = _meta_path(d)
    if os.path.exists(p):
        try:
            with open(p, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None


# ------------------------- requête API v3 -------------------------

def _http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def _length_seconds(s):
    """'0:12' -> 12 ; '1:03' -> 63."""
    try:
        parts = [int(x) for x in str(s).split(":")]
        sec = 0
        for p in parts:
            sec = sec * 60 + p
        return sec
    except Exception:
        return 0


def _query(scientific, key, quality, want_type):
    parts = scientific.split()
    gen = parts[0] if parts else scientific
    sp = parts[1] if len(parts) > 1 else ""
    q = f'gen:"{gen}"'
    if sp:
        q += f' sp:"{sp}"'
    q += " grp:birds"
    if want_type:
        q += f" type:{want_type}"
    if quality:
        q += f" q:{quality}"
    params = urllib.parse.urlencode({"query": q, "key": key})
    return f"{API_URL}?{params}"


def _pick_best(recordings):
    """Préfère un enregistrement court et net (3–30 s)."""
    def score(r):
        length = _length_seconds(r.get("length", "0:00"))
        good_len = 1 if 3 <= length <= 30 else 0
        qual = r.get("q", "E")
        qrank = {"A": 4, "B": 3, "C": 2, "D": 1}.get(qual, 0)
        return (good_len, qrank, -abs(length - 12))
    return sorted(recordings, key=score, reverse=True)[0] if recordings else None


def search_recording(scientific, cfg):
    """Renvoie le meilleur enregistrement (dict brut xeno-canto) ou None."""
    key = cfg["xenocanto"].get("api_key", "").strip()
    if not key:
        return None
    want_type = cfg["xenocanto"].get("type", "song").strip()

    for quality in _QUALITIES + [""]:      # A, puis B, C, puis sans filtre
        try:
            data = _http_json(_query(scientific, key, quality, want_type))
        except Exception as e:
            print(f"[xeno-canto] requête échouée ({quality or 'any'}) : {e}")
            time.sleep(1)
            continue
        recs = data.get("recordings") or []
        best = _pick_best(recs)
        if best:
            return best
    return None


# ------------------------- téléchargement -------------------------

def _download(url, key, dest):
    if url.startswith("//"):
        url = "https:" + url
    elif not url.startswith("http"):
        url = "https://" + url.lstrip("/")
    # La clé est requise pour télécharger via l'API v3.
    if key and "key=" not in url:
        url += ("&" if "?" in url else "?") + "key=" + urllib.parse.quote(key)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())


def prefetch_reference(scientific, cfg):
    """
    RÉSEAU. Télécharge (une fois) un enregistrement de référence pour l'espèce.
    Renvoie True si un audio de référence est disponible en cache à la fin.
    """
    if not scientific:
        return False
    d = _species_dir(scientific, cfg)
    if _find_audio(d):
        return True                      # déjà en cache

    key = cfg["xenocanto"].get("api_key", "").strip()
    if not key:
        print("[xeno-canto] pas de clé API dans config.ini -> référence ignorée.")
        return False

    rec = search_recording(scientific, cfg)
    if not rec:
        print(f"[xeno-canto] aucun enregistrement trouvé pour {scientific}.")
        return False

    file_url = rec.get("file") or ""
    file_name = rec.get("file-name") or "reference.mp3"
    ext = os.path.splitext(file_name)[1].lower() or ".mp3"
    dest = os.path.join(d, "reference" + ext)
    try:
        _download(file_url, key, dest)
    except Exception as e:
        print(f"[xeno-canto] téléchargement échoué : {e}")
        return False

    meta = {
        "xc_id": rec.get("id"),
        "recordist": rec.get("rec"),
        "license": rec.get("lic"),
        "quality": rec.get("q"),
        "type": rec.get("type"),
        "length": rec.get("length"),
        "en": rec.get("en"),
        "scientific": scientific,
        "fetched_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    with open(_meta_path(d), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"[xeno-canto] référence XC{meta['xc_id']} pour {scientific} mise en cache.")
    return True


# ------------------------- lecture cache (sans réseau) -------------------------

def reference_sonagram(scientific, width, height, cfg):
    """
    CACHE UNIQUEMENT. Renvoie (image 'L', credit_str) ou (None, None).
    Calcule le sonagramme depuis l'audio en cache la première fois, puis
    réutilise le PNG.
    """
    if not scientific:
        return None, None
    d = _species_dir(scientific, cfg)
    audio = _find_audio(d)
    if not audio:
        return None, None

    png = os.path.join(d, f"sonagram_{width}x{height}.png")
    from PIL import Image
    if os.path.exists(png):
        img = Image.open(png).convert("L")
    else:
        max_sec = float(cfg["display"].get("max_spectrogram_seconds", "5.0"))
        fmax = int(cfg["display"].get("freq_max_hz", "12000"))
        img = spectrogram_image(audio, width, height, max_sec, fmax)
        if img is None:
            return None, None
        img.save(png)

    meta = load_metadata(scientific, cfg) or {}
    credit = None
    if meta.get("xc_id"):
        bits = [f"réf. XC{meta['xc_id']}"]
        if meta.get("recordist"):
            bits.append(str(meta["recordist"]))
        lic = _short_license(meta.get("license"))
        if lic:
            bits.append(lic)
        credit = " · ".join(bits)
    return img, credit


def _short_license(lic):
    """'//creativecommons.org/licenses/by-nc-sa/4.0/' -> 'CC BY-NC-SA'."""
    if not lic:
        return None
    s = str(lic).lower()
    if "publicdomain" in s or "/zero/" in s or "cc0" in s:
        return "CC0"
    marker = "licenses/"
    if marker in s:
        code = s.split(marker, 1)[1].split("/", 1)[0]   # ex. 'by-nc-sa'
        if code:
            return "CC " + code.upper()
    return None


if __name__ == "__main__":
    import configparser
    import sys
    if len(sys.argv) < 2:
        print('Usage : python xenocanto.py "Genre espece"')
        raise SystemExit(1)
    name = " ".join(sys.argv[1:])
    cfg = configparser.ConfigParser()
    cfg.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini"))
    print(f"Recherche d'une référence pour : {name}")
    ok = prefetch_reference(name, cfg)
    print("Référence en cache :", ok)
    if ok:
        img, credit = reference_sonagram(name, 760, 300, cfg)
        print("Crédit :", credit)
        if img is not None:
            out = os.path.join(_species_dir(name, cfg), "apercu.png")
            img.save(out)
            print("Aperçu écrit :", out)
