"""
Moteur de détection de voix (VAD), avec deux implémentations interchangeables :

- "rms"    : niveau audio brut (rapide, zéro dépendance, moins précis sur bruit non-vocal)
- "silero" : réseau de neurones léger (Silero VAD), tourne sur GPU NVIDIA (CUDA) si
             disponible, sinon CPU. Beaucoup plus fiable pour ignorer les bruits
             non-vocaux (chaise, papier, clic) car il reconnaît la parole plutôt
             qu'un simple niveau sonore.

Le choix se fait dans config.yaml (detection.vad_engine: "rms" | "silero").
Le système démarre toujours, même sans GPU ni torch installé : si "silero" est
demandé mais indisponible, on bascule automatiquement sur "rms" avec un log
explicite, plutôt que de planter.
"""
import logging

import numpy as np

logger = logging.getLogger("auto_director.vad")


class RmsVad:
    """Détection par simple niveau RMS. Rapide, robuste, tourne sur CPU sans dépendance lourde."""

    name = "rms"

    def __init__(self, threshold: float):
        self.threshold = threshold

    def score(self, audio_block: np.ndarray) -> float:
        """Retourne un score 0.0-1.0+ (ici juste le RMS, comparé au seuil ensuite)."""
        return float(np.sqrt(np.mean(np.square(audio_block))))

    def is_speech(self, score: float) -> bool:
        return score > self.threshold


class SileroVad:
    """
    VAD neuronal Silero. Charge le modèle une seule fois, réutilisé pour tous les micros.
    Tourne sur GPU (CUDA) automatiquement si torch.cuda.is_available(), sinon CPU.
    """

    name = "silero"

    def __init__(self, threshold: float = 0.5, sample_rate: int = 16000):
        import torch

        self.threshold = threshold
        self.sample_rate = sample_rate
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Chargement de Silero VAD sur %s", self.device.upper())

        self.model, _ = torch.hub.load(
            repo_or_dir="snakers4/silero-vad", model="silero_vad", trust_repo=True
        )
        self.model.to(self.device)
        self.torch = torch

    def score(self, audio_block: np.ndarray) -> float:
        with self.torch.no_grad():
            tensor = self.torch.from_numpy(audio_block).float().to(self.device)
            if tensor.dim() > 1:
                tensor = tensor.squeeze()
            prob = self.model(tensor, self.sample_rate).item()
        return prob

    def is_speech(self, score: float) -> bool:
        return score > self.threshold


def create_vad_engine(cfg: dict):
    """
    Fabrique le moteur VAD demandé dans la config, avec repli automatique sur RMS
    si "silero" est demandé mais que torch/CUDA/le modèle ne sont pas disponibles.
    """
    engine_name = cfg.get("vad_engine", "rms")

    if engine_name == "silero":
        try:
            return SileroVad(
                threshold=cfg.get("silero_threshold", 0.5),
                sample_rate=cfg.get("sample_rate", 16000),
            )
        except Exception as e:
            logger.warning(
                "Silero VAD indisponible (%s) — repli automatique sur détection RMS", e
            )

    return RmsVad(threshold=cfg.get("rms_threshold", 0.02))
