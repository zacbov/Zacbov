"""
Composition de l'image finale du cadre (800x480, 1 bit) et empaquetage en
buffer brut pour l'ESP32.

Mise en page :
  +--------------------------------------------------+
  |  Nom commun (gros)                     14:32     |
  |  Nom scientifique (italique)           conf 82%  |
  |                                                  |
  |  Sonagramme  ─────────────────────────────────  |
  |  [ ................ spectrogramme ............ ] |
  |                                                  |
  |  Inky Bird Frame · 18/07/2026                    |
  +--------------------------------------------------+
"""

import os
from datetime import datetime

from PIL import Image, ImageDraw, ImageFont, ImageOps

from spectrogram import spectrogram_image

try:
    from xenocanto import reference_sonagram
except Exception:                      # xeno-canto optionnel
    def reference_sonagram(*_a, **_k):
        return None, None

# Polices DejaVu (présentes sur Raspberry Pi OS). Repli sur la police PIL.
_FONT_DIR = "/usr/share/fonts/truetype/dejavu"
_FONTS = {
    "regular": os.path.join(_FONT_DIR, "DejaVuSans.ttf"),
    "bold":    os.path.join(_FONT_DIR, "DejaVuSans-Bold.ttf"),
    "italic":  os.path.join(_FONT_DIR, "DejaVuSans-Oblique.ttf"),
}

BLACK, WHITE = 0, 255
MARGIN = 22


def _font(style, size):
    path = _FONTS.get(style, _FONTS["regular"])
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def _text_w(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0]


def _fit_font(draw, text, style, max_size, min_size, max_width):
    """Réduit la taille jusqu'à ce que le texte tienne dans max_width."""
    size = max_size
    while size > min_size:
        f = _font(style, size)
        if _text_w(draw, text, f) <= max_width:
            return f
        size -= 2
    return _font(style, min_size)


def render_frame(det, cfg):
    """Renvoie une image PIL en mode '1' (800x480)."""
    W = int(cfg["display"]["width"])
    H = int(cfg["display"]["height"])
    invert = cfg["display"].getboolean("invert", fallback=False)
    rotate = int(cfg["display"].get("rotate", "0"))
    max_sec = float(cfg["display"].get("max_spectrogram_seconds", "5.0"))
    fmax = int(cfg["display"].get("freq_max_hz", "12000"))

    canvas = "L"
    img = Image.new(canvas, (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    inner_w = W - 2 * MARGIN

    if det is None:
        # Écran d'attente.
        f_big = _font("bold", 40)
        f_sm = _font("regular", 24)
        draw.text((MARGIN, H // 2 - 50), "En écoute…", font=f_big, fill=BLACK)
        draw.text((MARGIN, H // 2 + 6),
                  "Aucun oiseau détecté pour l'instant.", font=f_sm, fill=BLACK)
        _footer(draw, W, H)
        return _finish(img, invert, rotate)

    # --- En-tête : nom commun + nom scientifique ---
    common = det.get("common") or det.get("scientific") or "Oiseau"
    scientific = det.get("scientific") or ""
    # On réserve ~30% de largeur à droite pour l'heure/confiance.
    title_max_w = int(inner_w * 0.68)
    f_title = _fit_font(draw, common, "bold", 48, 26, title_max_w)
    draw.text((MARGIN, 16), common, font=f_title, fill=BLACK)

    if scientific:
        f_sci = _font("italic", 26)
        draw.text((MARGIN, 16 + f_title.size + 6), scientific, font=f_sci, fill=BLACK)

    # --- Coin haut-droit : heure + confiance ---
    f_meta = _font("regular", 24)
    hh = _extract_time(det.get("when", ""))
    if hh:
        w = _text_w(draw, hh, f_meta)
        draw.text((W - MARGIN - w, 20), hh, font=f_meta, fill=BLACK)
    conf = det.get("confidence")
    if conf is not None:
        ctxt = f"conf {round(conf * 100)}%"
        w = _text_w(draw, ctxt, f_meta)
        draw.text((W - MARGIN - w, 20 + 30), ctxt, font=f_meta, fill=BLACK)

    # --- Sonagramme ---
    label_y = 108
    spec_x, spec_y = MARGIN, label_y + 30
    spec_w, spec_h = inner_w, H - spec_y - 46

    spec, label, credit = _choose_sonagram(det, spec_w, spec_h, cfg, max_sec, fmax)

    f_label = _font("bold", 20)
    draw.text((MARGIN, label_y), label, font=f_label, fill=BLACK)

    draw.rectangle([spec_x, spec_y, spec_x + spec_w - 1, spec_y + spec_h - 1],
                   outline=BLACK)
    if spec is not None:
        img.paste(spec, (spec_x, spec_y))
        draw.rectangle([spec_x, spec_y, spec_x + spec_w - 1, spec_y + spec_h - 1],
                       outline=BLACK)
        if credit:
            _draw_credit(draw, credit, spec_x, spec_y, spec_w, spec_h)
    else:
        msg = "Sonagramme indisponible"
        f_msg = _font("regular", 22)
        tw = _text_w(draw, msg, f_msg)
        draw.text((spec_x + (spec_w - tw) // 2, spec_y + spec_h // 2 - 12),
                  msg, font=f_msg, fill=BLACK)

    _footer(draw, W, H)
    return _finish(img, invert, rotate)


def _choose_sonagram(det, spec_w, spec_h, cfg, max_sec, fmax):
    """
    Décide de la source du sonagramme.
    Renvoie (image_L|None, label, credit|None).
      - clip local présent -> sonagramme de TA détection (sauf mode 'always')
      - sinon -> chant de référence xeno-canto (si en cache)
    """
    use_ref = "fallback"
    if cfg.has_section("xenocanto"):
        use_ref = cfg["xenocanto"].get("use_reference", "fallback").strip().lower()

    scientific = det.get("scientific")
    clip = det.get("clip_path")
    have_clip = bool(clip and os.path.exists(clip))

    # 1) Mode 'always' : on privilégie la référence si disponible.
    if use_ref == "always" and scientific:
        ref, credit = reference_sonagram(scientific, spec_w, spec_h, cfg)
        if ref is not None:
            return ref, "Sonagramme (référence)", credit

    # 2) Ta propre détection.
    if have_clip:
        spec = spectrogram_image(clip, spec_w, spec_h, max_sec, fmax)
        if spec is not None:
            return spec, "Sonagramme", None

    # 3) Repli sur la référence.
    if use_ref in ("fallback", "always") and scientific:
        ref, credit = reference_sonagram(scientific, spec_w, spec_h, cfg)
        if ref is not None:
            return ref, "Sonagramme (référence)", credit

    return None, "Sonagramme", None


def _draw_credit(draw, credit, x, y, w, h):
    """Petit crédit en bas à droite du cadre du sonagramme, sur fond blanc."""
    f = _font("regular", 14)
    tw = _text_w(draw, credit, f)
    pad = 4
    bx1 = x + w - tw - 2 * pad - 2
    by1 = y + h - 22
    draw.rectangle([bx1, by1, x + w - 2, y + h - 2], fill=WHITE, outline=BLACK)
    draw.text((bx1 + pad, by1 + 3), credit, font=f, fill=BLACK)


def _footer(draw, W, H):
    f = _font("regular", 18)
    txt = "Inky Bird Frame · " + datetime.now().strftime("%d/%m/%Y %H:%M")
    draw.text((MARGIN, H - 26), txt, font=f, fill=BLACK)


def _extract_time(when):
    """Essaie d'extraire une heure lisible 'HH:MM' de l'horodatage brut."""
    if not when:
        return ""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(when[:len(fmt) + 2], fmt).strftime("%H:%M")
        except Exception:
            pass
    # Repli : on cherche un motif HH:MM dans la chaîne.
    import re
    m = re.search(r"(\d{1,2}:\d{2})", when)
    return m.group(1) if m else when[-8:]


def _finish(img, invert, rotate):
    if invert:
        img = ImageOps.invert(img)
    if rotate:
        img = img.rotate(rotate, expand=False)
    # Conversion 1 bit avec tramage Floyd–Steinberg (le texte pur reste net,
    # seuls les gris du sonagramme sont tramés).
    return img.convert("1")


def pack_frame(img_1bit):
    """
    Empaquette l'image '1' en buffer brut attendu par GxEPD2.drawImage() :
    100 octets/ligne × 480 lignes = 48000 octets, MSB d'abord, bit=1 -> blanc.
    C'est exactement le format de PIL Image.tobytes() en mode '1'.
    """
    assert img_1bit.mode == "1"
    return img_1bit.tobytes()
