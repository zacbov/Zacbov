"""
Serveur de rendu du cadre.

Endpoints :
  GET /frame.bin   -> buffer brut 48000 octets pour l'ESP32 (le plat principal)
  GET /frame.png   -> même image en PNG, pour vérifier dans un navigateur
  GET /latest.json -> la dernière détection lue (debug)
  GET /            -> petite page HTML de prévisualisation

Lancement :
  python server.py
"""

import configparser
import io
import os
import threading
import time

from flask import Flask, Response, jsonify, send_file

import birdnet_db as bd
import xenocanto
from render import render_frame, pack_frame

HERE = os.path.dirname(os.path.abspath(__file__))
cfg = configparser.ConfigParser()
cfg.read(os.path.join(HERE, "config.ini"))

app = Flask(__name__)

_lock = threading.Lock()
_cache = {"img": None, "bin": None, "key": None, "ts": 0.0, "det": None}
_prefetched = set()      # espèces déjà tentées côté xeno-canto (cette session)


def _maybe_prefetch_reference(det):
    """Lance en tâche de fond le téléchargement du chant de référence."""
    if not det or not det.get("scientific"):
        return
    if not cfg.has_section("xenocanto"):
        return
    if cfg["xenocanto"].get("use_reference", "fallback").strip().lower() == "never":
        return
    if not cfg["xenocanto"].get("api_key", "").strip():
        return
    sci = det["scientific"]
    if sci in _prefetched:
        return
    _prefetched.add(sci)
    threading.Thread(
        target=xenocanto.prefetch_reference, args=(sci, cfg), daemon=True
    ).start()


def _detection_key(det):
    if not det:
        return "none"
    return f"{det.get('scientific')}|{det.get('when')}"


def _get_frame():
    """Renvoie (img_1bit, buffer_bytes), régénéré si besoin."""
    cache_seconds = float(cfg["server"].get("cache_seconds", "30"))
    with _lock:
        det = bd.get_latest_detection(cfg)
        key = _detection_key(det)
        fresh = _cache["img"] is not None
        same = key == _cache["key"]
        recent = (time.time() - _cache["ts"]) < cache_seconds
        if fresh and same and recent:
            return _cache["img"], _cache["bin"]

        # Nouvelle espèce -> on tente de précharger sa référence (async).
        if not same:
            _maybe_prefetch_reference(det)

        img = render_frame(det, cfg)
        buf = pack_frame(img)
        _cache.update(img=img, bin=buf, key=key, ts=time.time(), det=det)
        return img, buf


@app.route("/frame.bin")
def frame_bin():
    _, buf = _get_frame()
    return Response(buf, mimetype="application/octet-stream")


@app.route("/frame.png")
def frame_png():
    img, _ = _get_frame()
    out = io.BytesIO()
    img.convert("L").save(out, format="PNG")
    out.seek(0)
    return send_file(out, mimetype="image/png")


@app.route("/latest.json")
def latest_json():
    with _lock:
        det = _cache["det"] if _cache["det"] is not None else bd.get_latest_detection(cfg)
    return jsonify(det or {})


@app.route("/")
def index():
    W = cfg["display"]["width"]
    H = cfg["display"]["height"]
    return f"""<!doctype html><html><head><meta charset="utf-8">
    <title>Inky Bird Frame</title>
    <meta http-equiv="refresh" content="15">
    <style>body{{font-family:sans-serif;background:#eee;text-align:center;padding:20px}}
    img{{border:1px solid #999;background:#fff;image-rendering:pixelated}}</style>
    </head><body>
    <h2>Inky Bird Frame — prévisualisation ({W}×{H})</h2>
    <img src="/frame.png?t={int(time.time())}" width="{W}">
    <p>Rafraîchissement auto toutes les 15 s · <a href="/latest.json">/latest.json</a></p>
    </body></html>"""


if __name__ == "__main__":
    host = cfg["server"].get("host", "0.0.0.0")
    port = int(cfg["server"].get("port", "8090"))
    print(f"Inky Bird Frame — serveur sur http://{host}:{port}")
    print("  /frame.bin  (ESP32)   /frame.png  /latest.json")
    app.run(host=host, port=port, threaded=True)
