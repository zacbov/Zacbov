"""
Coeur du Auto-Director :
- Un thread d'écoute par micro, calcule un score de "parole" en continu via le
  moteur VAD choisi (RMS simple ou Silero VAD accéléré GPU — voir vad_engine.py).
- Une machine à états centrale décide quand switcher, avec hystérésis
  (min_speak_ms, hangover_ms, switch_cooldown_ms) pour éviter le "ping-pong".
- Seuil de détection réglable par micro (calibration auto ou manuelle).
- Passage automatique sur une scène "split-screen" si plusieurs personnes
  parlent en même temps de façon prolongée.

Conçu pour tourner indéfiniment sans intervention : toute erreur sur un flux
audio est loguée et le flux redémarre automatiquement, sans faire planter
le reste du système.
"""
import logging
import statistics
import threading
import time
from dataclasses import dataclass, field

import sounddevice as sd

from vad_engine import create_vad_engine

logger = logging.getLogger("auto_director.core")


@dataclass
class MicState:
    mic_index: int
    mic_name: str
    scene_name: str
    threshold: float | None = None   # override par micro ; None = utilise le seuil global
    level: float = 0.0               # score VAD lissé courant (pour affichage WebUI)
    speaking: bool = False
    speak_start: float = 0.0
    last_active: float = 0.0
    calibration_samples: list = field(default_factory=list)


class AudioMonitor:
    """Surveille un seul périphérique audio en continu dans un thread dédié."""

    def __init__(self, mic_index: int, sample_rate: int, block_size: int, vad_engine, score_callback):
        self.mic_index = mic_index
        self.sample_rate = sample_rate
        self.block_size = block_size
        self.vad_engine = vad_engine
        self.score_callback = score_callback
        self._stop = False
        self._thread = threading.Thread(target=self._run, daemon=True)

    def start(self):
        self._thread.start()

    def stop(self):
        self._stop = True

    def _run(self):
        while not self._stop:
            try:
                with sd.InputStream(
                    device=self.mic_index,
                    channels=1,
                    samplerate=self.sample_rate,
                    blocksize=self.block_size,
                    dtype="float32",
                ) as stream:
                    logger.info("Micro %s: flux audio ouvert", self.mic_index)
                    while not self._stop:
                        data, overflowed = stream.read(self.block_size)
                        if overflowed:
                            logger.debug("Micro %s: overflow (bloc perdu)", self.mic_index)
                        score = self.vad_engine.score(data.reshape(-1))
                        self.score_callback(self.mic_index, score)
            except Exception as e:
                logger.error(
                    "Micro %s: erreur flux audio (%s) — nouvelle tentative dans 2s",
                    self.mic_index, e,
                )
                time.sleep(2)  # ne bloque pas les autres micros, retente simplement


class Director:
    """
    Machine à états qui décide quelle scène OBS doit être active,
    à partir des scores VAD de tous les micros.
    """

    def __init__(self, config: dict, obs_controller, on_level_update=None):
        self.cfg = config["detection"]
        self.mappings = config["mappings"]
        self.default_scene = config["obs"]["default_scene"]
        self.split_scene = config["obs"].get("split_scene")  # optionnelle
        self.split_hold_ms = self.cfg.get("split_hold_ms", 1500)
        self.obs = obs_controller
        self.on_level_update = on_level_update

        self.vad = create_vad_engine(self.cfg)
        logger.info("Moteur de détection de voix actif : %s", self.vad.name.upper())

        self.mics: dict[int, MicState] = {
            m["mic_index"]: MicState(
                mic_index=m["mic_index"],
                mic_name=m["mic_name"],
                scene_name=m["scene_name"],
                threshold=m.get("threshold"),
            )
            for m in self.mappings
        }
        self._lock = threading.Lock()
        self._monitors: list[AudioMonitor] = []
        self._last_switch_time = 0.0
        self._current_active_mic = None
        self._current_split = False
        self._split_start = 0.0
        self._manual_override: str | None = None
        self._stop = False
        self._decision_thread = threading.Thread(target=self._decision_loop, daemon=True)

        # état de calibration
        self._calibrating = False
        self._calibration_result: dict | None = None

    # ---- Contrôle externe (WebUI) ----
    def set_manual_override(self, scene_name: str | None):
        with self._lock:
            self._manual_override = scene_name
        if scene_name:
            self.obs.switch_to_scene(scene_name)
            logger.info("Override manuel activé -> %s", scene_name)
        else:
            logger.info("Override manuel désactivé — retour au mode automatique")

    def get_status(self) -> dict:
        with self._lock:
            return {
                "obs_connected": self.obs.connected,
                "manual_override": self._manual_override,
                "current_active_mic": self._current_active_mic,
                "current_split": self._current_split,
                "vad_engine": self.vad.name,
                "calibrating": self._calibrating,
                "mics": [
                    {
                        "mic_index": m.mic_index,
                        "mic_name": m.mic_name,
                        "scene_name": m.scene_name,
                        "level": round(m.level, 4),
                        "speaking": m.speaking,
                        "threshold": m.threshold if m.threshold is not None else self._default_threshold(),
                    }
                    for m in self.mics.values()
                ],
            }

    def _default_threshold(self) -> float:
        if self.vad.name == "silero":
            return self.cfg.get("silero_threshold", 0.5)
        return self.cfg.get("rms_threshold", 0.02)

    # ---- Calibration automatique ----
    def start_calibration(self, duration_s: float = 4.0):
        """
        Lance une calibration en tâche de fond : mesure le score VAD "au repos"
        (silence ambiant) pendant `duration_s` secondes pour chaque micro, puis
        calcule un seuil individuel = moyenne + marge de sécurité.
        Pendant la calibration, le switch automatique est mis en pause.
        """
        if self._calibrating:
            return
        t = threading.Thread(target=self._run_calibration, args=(duration_s,), daemon=True)
        t.start()

    def _run_calibration(self, duration_s: float):
        logger.info("Calibration démarrée (%.1fs) — merci de garder le silence", duration_s)
        with self._lock:
            self._calibrating = True
            for m in self.mics.values():
                m.calibration_samples = []
        time.sleep(duration_s)
        with self._lock:
            result = {}
            for m in self.mics.values():
                samples = m.calibration_samples or [0.0]
                mean = statistics.mean(samples)
                stdev = statistics.pstdev(samples) if len(samples) > 1 else 0.0
                margin = max(stdev * 4, mean * 0.5, 0.003 if self.vad.name == "rms" else 0.05)
                threshold = round(mean + margin, 4)
                m.threshold = threshold
                result[m.mic_index] = {"mic_name": m.mic_name, "ambient": round(mean, 4), "threshold": threshold}
            self._calibration_result = result
            self._calibrating = False
        logger.info("Calibration terminée : %s", result)

    def get_calibration_result(self) -> dict | None:
        with self._lock:
            return self._calibration_result

    # ---- Boucle principale ----
    def start(self):
        for mic_index, mic in self.mics.items():
            monitor = AudioMonitor(
                mic_index=mic_index,
                sample_rate=self.cfg["sample_rate"],
                block_size=self.cfg["block_size"],
                vad_engine=self.vad,
                score_callback=self._on_audio_score,
            )
            monitor.start()
            self._monitors.append(monitor)
        self._decision_thread.start()
        logger.info("Auto-Director démarré (%d micros surveillés)", len(self.mics))

    def stop(self):
        self._stop = True
        for m in self._monitors:
            m.stop()

    def _on_audio_score(self, mic_index: int, score: float):
        now = time.time()
        with self._lock:
            mic = self.mics.get(mic_index)
            if mic is None:
                return

            if self._calibrating:
                mic.calibration_samples.append(score)
                mic.level = 0.7 * mic.level + 0.3 * score
                return

            mic.level = 0.7 * mic.level + 0.3 * score
            threshold = mic.threshold if mic.threshold is not None else self._default_threshold()

            above_threshold = mic.level > threshold
            if above_threshold:
                if mic.speak_start == 0.0:
                    mic.speak_start = now
                mic.last_active = now
                if (now - mic.speak_start) * 1000 >= self.cfg["min_speak_ms"]:
                    mic.speaking = True
            else:
                mic.speak_start = 0.0
                if mic.speaking and (now - mic.last_active) * 1000 >= self.cfg["hangover_ms"]:
                    mic.speaking = False

        if self.on_level_update:
            self.on_level_update(mic_index, mic.level, mic.speaking)

    def _decision_loop(self):
        """Toutes les 100ms, décide si un switch de scène est nécessaire."""
        while not self._stop:
            time.sleep(0.1)
            with self._lock:
                if self._manual_override or self._calibrating:
                    continue

                now = time.time()
                cooldown_ok = (now - self._last_switch_time) * 1000 >= self.cfg["switch_cooldown_ms"]
                speaking_mics = [m for m in self.mics.values() if m.speaking]

                # Cas 1 : plusieurs personnes parlent en même temps de façon prolongée -> split-screen
                if self.split_scene and len(speaking_mics) >= 2:
                    if self._split_start == 0.0:
                        self._split_start = now
                    if (now - self._split_start) * 1000 >= self.split_hold_ms:
                        if cooldown_ok and not self._current_split:
                            if self.obs.switch_to_scene(self.split_scene):
                                self._current_split = True
                                self._current_active_mic = None
                                self._last_switch_time = now
                        continue
                else:
                    self._split_start = 0.0

                target_scene = None
                target_mic = None

                if speaking_mics:
                    active = min(speaking_mics, key=lambda m: m.speak_start or now)
                    target_scene = active.scene_name
                    target_mic = active.mic_index
                else:
                    most_recent = max((m.last_active for m in self.mics.values()), default=0.0)
                    if (now - most_recent) * 1000 >= self.cfg["silence_to_wide_ms"]:
                        target_scene = self.default_scene
                        target_mic = None

                if target_scene and cooldown_ok and (target_mic != self._current_active_mic or self._current_split):
                    success = self.obs.switch_to_scene(target_scene)
                    if success:
                        self._current_active_mic = target_mic
                        self._current_split = False
                        self._last_switch_time = now
