#!/usr/bin/env python3
"""
Auto-Director - Point d'entrée principal.

Lance :
- Le moteur de détection audio + décision de switch (director.py)
- La connexion OBS (obs_controller.py)
- Une WebUI locale (http://localhost:8765) pour configurer les mappings,
  voir les niveaux audio en direct, et faire un override manuel.

Conçu pour tourner en continu sur la station de travail, sans surveillance.
"""
import logging
import logging.handlers
import sys

import yaml
from flask import Flask, jsonify, request, render_template
from flask_socketio import SocketIO

from director import Director
from obs_controller import ObsController
from midi_controller import MidiController

CONFIG_PATH = "config.yaml"


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_config(cfg):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(cfg, f, allow_unicode=True, sort_keys=False)


def setup_logging(cfg):
    level = getattr(logging, cfg["logging"]["level"].upper(), logging.INFO)
    handlers = [
        logging.StreamHandler(sys.stdout),
        logging.handlers.RotatingFileHandler(
            cfg["logging"]["file"], maxBytes=2_000_000, backupCount=3, encoding="utf-8"
        ),
    ]
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=handlers,
    )


config = load_config()
setup_logging(config)
logger = logging.getLogger("auto_director.app")

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

obs_controller = ObsController(
    host=config["obs"]["host"],
    port=config["obs"]["port"],
    password=config["obs"].get("password", ""),
)


def push_level_update(mic_index, level, speaking):
    socketio.emit("level_update", {"mic_index": mic_index, "level": level, "speaking": speaking})


director = Director(config, obs_controller, on_level_update=push_level_update)


# ---------------- MIDI ----------------

def handle_midi_note(key: str):
    """Une touche/pad MIDI a été pressée : applique le mapping configuré, s'il existe."""
    mapping = next((m for m in config.get("midi", {}).get("mappings", []) if m["key"] == key), None)
    if mapping is None:
        logger.info("Touche MIDI '%s' pressée mais non mappée (ignorée)", key)
        return
    action = mapping["action"]
    if action == "__auto__":
        director.set_manual_override(None)
    else:
        director.set_manual_override(action)
    socketio.emit("midi_triggered", {"key": key, "action": action})


def push_midi_devices(devices):
    socketio.emit("midi_devices", {"devices": devices})


midi_controller = MidiController(on_note_press=handle_midi_note, on_devices_changed=push_midi_devices)


# ---------------- Routes WebUI ----------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/status")
def api_status():
    return jsonify(director.get_status())


@app.route("/api/config")
def api_get_config():
    return jsonify(config)


@app.route("/api/scenes")
def api_scenes():
    return jsonify(obs_controller.list_scenes())


@app.route("/api/override", methods=["POST"])
def api_override():
    scene = request.json.get("scene_name")  # None pour désactiver l'override
    director.set_manual_override(scene)
    return jsonify({"ok": True})


@app.route("/api/config/mappings", methods=["POST"])
def api_update_mappings():
    """Met à jour les mappings micro<->scène et les seuils à chaud, puis persiste dans config.yaml."""
    data = request.json
    global config
    if "mappings" in data:
        config["mappings"] = data["mappings"]
    if "detection" in data:
        config["detection"].update(data["detection"])
    if "obs" in data and "default_scene" in data["obs"]:
        config["obs"]["default_scene"] = data["obs"]["default_scene"]
    save_config(config)
    return jsonify({"ok": True, "note": "Redémarre le service pour appliquer les changements de mapping micro."})


@app.route("/api/midi/devices")
def api_midi_devices():
    return jsonify(midi_controller.list_ports() if config.get("midi", {}).get("enabled") else [])


@app.route("/api/midi/mappings")
def api_midi_mappings():
    return jsonify(config.get("midi", {}).get("mappings", []))


@app.route("/api/midi/learn/start", methods=["POST"])
def api_midi_learn_start():
    if not config.get("midi", {}).get("enabled"):
        return jsonify({"ok": False, "error": "MIDI désactivé dans config.yaml"}), 400
    midi_controller.start_learn()
    return jsonify({"ok": True})


@app.route("/api/midi/learn/poll")
def api_midi_learn_poll():
    """La WebUI poll cet endpoint après avoir démarré l'apprentissage,
    jusqu'à recevoir une touche non-nulle."""
    key = midi_controller.poll_learn()
    return jsonify({"key": key})


@app.route("/api/midi/mappings", methods=["POST"])
def api_midi_save_mapping():
    """Ajoute ou met à jour un mapping touche MIDI -> scène / __auto__."""
    data = request.json
    key = data.get("key")
    action = data.get("action")
    if not key or not action:
        return jsonify({"ok": False, "error": "key et action requis"}), 400
    mappings = config.setdefault("midi", {}).setdefault("mappings", [])
    existing = next((m for m in mappings if m["key"] == key), None)
    if existing:
        existing["action"] = action
    else:
        mappings.append({"key": key, "action": action})
    save_config(config)
    return jsonify({"ok": True, "mappings": mappings})


@app.route("/api/midi/mappings/delete", methods=["POST"])
def api_midi_delete_mapping():
    key = request.json.get("key")
    mappings = config.get("midi", {}).get("mappings", [])
    config["midi"]["mappings"] = [m for m in mappings if m["key"] != key]
    save_config(config)
    return jsonify({"ok": True, "mappings": config["midi"]["mappings"]})


@app.route("/api/calibrate", methods=["POST"])
def api_calibrate():
    duration = float(request.json.get("duration_s", 4.0)) if request.is_json else 4.0
    director.start_calibration(duration)
    return jsonify({"ok": True})


@app.route("/api/calibrate/result")
def api_calibrate_result():
    return jsonify(director.get_calibration_result() or {})


@app.route("/api/calibrate/save", methods=["POST"])
def api_calibrate_save():
    """Persiste les seuils calculés par la calibration dans config.yaml."""
    result = director.get_calibration_result()
    if not result:
        return jsonify({"ok": False, "error": "Aucun résultat de calibration disponible"}), 400
    for m in config["mappings"]:
        r = result.get(m["mic_index"])
        if r:
            m["threshold"] = r["threshold"]
    save_config(config)
    return jsonify({"ok": True, "mappings": config["mappings"]})


@app.route("/api/devices")
def api_devices():
    import sounddevice as sd
    devices = sd.query_devices()
    result = [
        {"index": i, "name": d["name"], "channels": d["max_input_channels"]}
        for i, d in enumerate(devices)
        if d["max_input_channels"] > 0
    ]
    return jsonify(result)


if __name__ == "__main__":
    obs_controller.start()
    director.start()
    if config.get("midi", {}).get("enabled"):
        midi_controller.start()
    logger.info("WebUI disponible sur http://localhost:8765")
    socketio.run(app, host="0.0.0.0", port=8765, debug=False, allow_unsafe_werkzeug=True)
