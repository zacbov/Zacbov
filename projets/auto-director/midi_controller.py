"""
Support clavier/contrôleur MIDI générique pour prise de main manuelle.

Principe volontairement simple : chaque touche/pad MIDI (note_on) est mappée
à une action (override sur une scène précise, ou retour en mode auto).
Fonctionne avec n'importe quel clavier/pad MIDI générique (classe USB-MIDI
standard) — aucun driver spécifique requis.

Le mapping se fait en "apprentissage" : dans la WebUI, l'opérateur clique
"Apprendre" puis appuie sur la touche voulue -> elle est capturée et associée.
"""
import logging
import threading
import time

import mido

logger = logging.getLogger("auto_director.midi")


class MidiController:
    def __init__(self, on_note_press, on_devices_changed=None):
        """
        on_note_press(note_key: str) -> appelé à chaque note_on (vélocité > 0)
            note_key est une string du type "note:60" ou "cc:20" pour identifier
            l'événement de façon unique, indépendamment du port.
        """
        self.on_note_press = on_note_press
        self.on_devices_changed = on_devices_changed
        self._stop = False
        self._threads: list[threading.Thread] = []
        self._open_ports: dict[str, mido.ports.BaseInput] = {}
        self._lock = threading.Lock()
        self._watch_thread = threading.Thread(target=self._watch_devices, daemon=True)
        self._learn_mode = False
        self._learn_result: str | None = None

    def start(self):
        self._watch_thread.start()
        logger.info("Surveillance des périphériques MIDI démarrée")

    def stop(self):
        self._stop = True
        with self._lock:
            for port in self._open_ports.values():
                try:
                    port.close()
                except Exception:
                    pass

    def list_ports(self) -> list[str]:
        try:
            return mido.get_input_names()
        except Exception as e:
            logger.error("Impossible de lister les ports MIDI: %s", e)
            return []

    def start_learn(self):
        """Active le mode apprentissage : la prochaine note pressée sera capturée."""
        self._learn_result = None
        self._learn_mode = True

    def poll_learn(self) -> str | None:
        """Retourne la note apprise si disponible (et coupe le mode apprentissage)."""
        if self._learn_result:
            result = self._learn_result
            self._learn_mode = False
            self._learn_result = None
            return result
        return None

    def _watch_devices(self):
        """Détecte les nouveaux périphériques MIDI branchés/débranchés toutes les 3s
        et ouvre/ferme les ports en conséquence — permet le hot-plug sans redémarrer."""
        while not self._stop:
            try:
                current = set(self.list_ports())
                with self._lock:
                    open_names = set(self._open_ports.keys())

                    # nouveaux ports à ouvrir
                    for name in current - open_names:
                        self._open_port(name)

                    # ports débranchés à nettoyer
                    for name in open_names - current:
                        logger.warning("Périphérique MIDI déconnecté: %s", name)
                        try:
                            self._open_ports[name].close()
                        except Exception:
                            pass
                        del self._open_ports[name]

                if self.on_devices_changed:
                    self.on_devices_changed(sorted(current))
            except Exception as e:
                logger.error("Erreur surveillance MIDI: %s", e)
            time.sleep(3)

    def _open_port(self, name: str):
        try:
            port = mido.open_input(name)
            self._open_ports[name] = port
            t = threading.Thread(target=self._listen, args=(name, port), daemon=True)
            t.start()
            self._threads.append(t)
            logger.info("Périphérique MIDI connecté: %s", name)
        except Exception as e:
            logger.error("Impossible d'ouvrir le port MIDI '%s': %s", name, e)

    def _listen(self, name: str, port: mido.ports.BaseInput):
        try:
            for msg in port:
                if self._stop:
                    break
                key = None
                if msg.type == "note_on" and msg.velocity > 0:
                    key = f"note:{msg.note}"
                elif msg.type == "control_change" and msg.value > 0:
                    key = f"cc:{msg.control}"
                if key is None:
                    continue

                logger.debug("MIDI reçu de %s: %s", name, key)

                if self._learn_mode:
                    self._learn_result = key
                    continue

                try:
                    self.on_note_press(key)
                except Exception as e:
                    logger.error("Erreur traitement note MIDI '%s': %s", key, e)
        except Exception as e:
            logger.warning("Flux MIDI '%s' interrompu: %s", name, e)
