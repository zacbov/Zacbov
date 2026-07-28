"""
Calcul d'un sonagramme (spectrogramme) à partir d'un extrait audio, rendu
en image niveaux de gris (mode 'L') prête à être collée dans le cadre.

Convention : énergie forte = pixel SOMBRE (sur fond clair), ce qui est à la
fois joli et économe pour l'e-ink.
"""

import os

import numpy as np
from PIL import Image, ImageOps

try:
    import soundfile as sf          # lit wav ET flac (via libsndfile)
    _HAVE_SF = True
except Exception:                   # pragma: no cover
    _HAVE_SF = False

from scipy import signal
from scipy.io import wavfile as _wavfile


def _ffmpeg_to_wav(path):
    """Convertit n'importe quel format audio en wav temporaire via ffmpeg."""
    import shutil
    import subprocess
    import tempfile
    if not shutil.which("ffmpeg"):
        return None
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", path,
             "-ac", "1", "-ar", "48000", tmp.name],
            check=True,
        )
        return tmp.name
    except Exception:
        try:
            os.remove(tmp.name)
        except OSError:
            pass
        return None


def _load_audio(path, max_seconds):
    """Renvoie (samples float mono, sample_rate) ou (None, None)."""
    data = sr = None
    try:
        if _HAVE_SF:
            data, sr = sf.read(path, dtype="float32", always_2d=False)
        else:
            sr, data = _wavfile.read(path)
            data = data.astype(np.float32)
            if np.issubdtype(data.dtype, np.integer):
                data = data / 32768.0
    except Exception:
        data = sr = None

    # Repli ffmpeg (utile pour les mp3 de xeno-canto si libsndfile bloque).
    if data is None:
        wav = _ffmpeg_to_wav(path)
        if wav is None:
            return None, None
        try:
            if _HAVE_SF:
                data, sr = sf.read(wav, dtype="float32", always_2d=False)
            else:
                sr, data = _wavfile.read(wav)
                data = data.astype(np.float32) / 32768.0
        except Exception:
            return None, None
        finally:
            try:
                os.remove(wav)
            except OSError:
                pass

    if data is None or len(data) == 0:
        return None, None

    # Stéréo -> mono
    if data.ndim > 1:
        data = data.mean(axis=1)

    # On garde au plus max_seconds, centré sur le passage le plus fort
    # (souvent le chant lui-même).
    max_len = int(max_seconds * sr)
    if len(data) > max_len:
        # fenêtre glissante d'énergie pour trouver le segment le plus intense
        win = max(1, max_len)
        energy = np.convolve(data.astype(np.float64) ** 2, np.ones(win), mode="valid")
        start = int(np.argmax(energy))
        data = data[start:start + max_len]

    return data, sr


def spectrogram_image(path, width, height, max_seconds=5.0, freq_max_hz=12000):
    """
    Renvoie une image PIL en mode 'L' de taille (width, height), ou None si
    l'audio est illisible.
    """
    data, sr = _load_audio(path, max_seconds)
    if data is None:
        return None

    nperseg = 1024
    noverlap = int(nperseg * 0.75)
    f, t, Sxx = signal.spectrogram(
        data, fs=sr, nperseg=nperseg, noverlap=noverlap,
        window="hann", scaling="spectrum", mode="magnitude",
    )
    if Sxx.size == 0:
        return None

    # On limite la bande de fréquences affichée.
    keep = f <= freq_max_hz
    if keep.sum() >= 2:
        Sxx = Sxx[keep, :]

    # Échelle log (dB), avec plancher pour éviter log(0).
    Sxx_db = 20.0 * np.log10(Sxx + 1e-8)

    # Compression de la dynamique : on ne garde que les ~55 dB du haut.
    top = np.max(Sxx_db)
    floor = top - 55.0
    Sxx_db = np.clip(Sxx_db, floor, top)

    # Normalisation 0..1 puis inversion (énergie forte -> sombre).
    norm = (Sxx_db - floor) / max(1e-6, (top - floor))
    img_arr = (255.0 * (1.0 - norm)).astype(np.uint8)

    # Fréquences basses en bas de l'image.
    img_arr = np.flipud(img_arr)

    img = Image.fromarray(img_arr, mode="L")
    img = img.resize((width, height), Image.BILINEAR)

    # Un peu de contraste pour un tramage e-ink net.
    img = ImageOps.autocontrast(img, cutoff=1)
    return img
