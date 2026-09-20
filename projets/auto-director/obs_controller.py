"""
Wrapper robuste autour d'obs-websocket (protocole v5, OBS 28+).
Gère la reconnexion automatique si OBS redémarre ou si le réseau coupe.
"""
import logging
import threading
import time

import obsws_python as obs

logger = logging.getLogger("auto_director.obs")


class ObsController:
    def __init__(self, host: str, port: int, password: str = ""):
        self.host = host
        self.port = port
        self.password = password
        self._client = None
        self._lock = threading.Lock()
        self._connected = False
        self._current_scene = None
        self._stop = False
        self._reconnect_thread = threading.Thread(target=self._connection_loop, daemon=True)

    def start(self):
        self._reconnect_thread.start()

    def stop(self):
        self._stop = True
        with self._lock:
            if self._client:
                try:
                    self._client.disconnect()
                except Exception:
                    pass

    @property
    def connected(self) -> bool:
        return self._connected

    def _connection_loop(self):
        """Boucle qui maintient la connexion OBS active, reconnecte si besoin."""
        while not self._stop:
            if not self._connected:
                try:
                    with self._lock:
                        self._client = obs.ReqClient(
                            host=self.host, port=self.port, password=self.password, timeout=3
                        )
                    self._connected = True
                    logger.info("Connecté à OBS (%s:%s)", self.host, self.port)
                except Exception as e:
                    logger.warning("Connexion OBS échouée (%s) — nouvelle tentative dans 3s", e)
                    self._connected = False
                    time.sleep(3)
                    continue
            time.sleep(1)
            # ping léger pour détecter une déconnexion
            try:
                with self._lock:
                    if self._client:
                        self._client.get_version()
            except Exception:
                logger.warning("Connexion OBS perdue — tentative de reconnexion")
                self._connected = False
                self._client = None

    def switch_to_scene(self, scene_name: str) -> bool:
        """Change la scène courante. Retourne True si succès."""
        if not self._connected or not self._client:
            logger.warning("Switch ignoré ('%s') : OBS non connecté", scene_name)
            return False
        if scene_name == self._current_scene:
            return True  # déjà sur cette scène, rien à faire
        try:
            with self._lock:
                self._client.set_current_program_scene(scene_name)
            self._current_scene = scene_name
            logger.info("Scène OBS -> %s", scene_name)
            return True
        except Exception as e:
            logger.error("Échec du switch vers '%s': %s", scene_name, e)
            self._connected = False  # forcera une reconnexion
            return False

    def list_scenes(self):
        """Retourne la liste des scènes disponibles dans OBS (pour la WebUI)."""
        if not self._connected or not self._client:
            return []
        try:
            with self._lock:
                resp = self._client.get_scene_list()
            return [s["sceneName"] for s in resp.scenes]
        except Exception as e:
            logger.error("Impossible de lister les scènes: %s", e)
            return []
