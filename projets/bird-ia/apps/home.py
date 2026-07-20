# ============================================================
# apps/home.py — Dashboard d'accueil (reprend la maquette HTML)
# Zones : topbar 120px | corps 308px | dock 48px
# ============================================================
from core import display as d

JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet",
        "aout", "septembre", "octobre", "novembre", "decembre"]


def render(ctx):
    """ctx = {now, weather, events, sensors, batt_pct, wifi_ok}"""
    d.clear()
    _topbar(ctx)
    _agenda(ctx)
    _widgets(ctx)
    _dock(ctx)
    d.show()


# ---------- Bandeau supérieur ----------
def _topbar(ctx):
    y, mo, day, hh, mm, *_ , wd, _yd = ctx["now"] + (0,) * (9 - len(ctx["now"]))
    wd = ctx["now"][6]

    # Heure géante (scale 9 -> ~72px de haut)
    d.text(30, 26, "%02d:%02d" % (hh, mm), scale=9)
    d.vline(300, 0, 120, 4)

    # Date
    d.text(324, 34, JOURS[wd].upper(), scale=3)
    d.text(324, 70, "%d %s %d" % (day, MOIS[mo - 1], y), scale=2)
    d.vline(566, 0, 120, 4)

    # Météo
    w = ctx.get("weather")
    if w:
        d.text(590, 30, "%d C" % w["temp"], scale=5)
        d.text(590, 80, "%s  %d/%d" % (w["label"], w["tmin"], w["tmax"]), scale=1)
    else:
        d.text(600, 52, "meteo --", scale=2)

    d.hline(120, 0, d.W, 4)


# ---------- Agenda ----------
def _agenda(ctx):
    d.text(20, 136, "AUJOURD'HUI", scale=2)
    d.hline(160, 20, 550, 2)

    events = ctx.get("events") or []
    now_min = ctx["now"][3] * 60 + ctx["now"][4]
    y = 174
    if not events:
        d.text(180, 260, "Aucun evenement", scale=2)
    for (hh, mm, title) in events:
        is_now = 0 <= now_min - (hh * 60 + mm) < 60
        if is_now:
            d.inverted_row(12, y - 4, 546, 26)
            color = d.WHITE
        else:
            color = d.BLACK
        d.text(24, y, "%02d:%02d" % (hh, mm), scale=2, color=color)
        d.text(120, y, title[:26], scale=2, color=color)
        y += 32

    d.vline(566, 120, 428, 4)


# ---------- Colonne widgets capteurs ----------
def _widgets(ctx):
    s = ctx.get("sensors") or {"found": []}
    x = 582

    # Baromètre
    d.text(x, 140, "BAROMETRE", scale=1)
    bme = s.get("bme")
    if bme and bme.get("press_hpa"):
        d.text(x, 158, "%d hPa" % bme["press_hpa"], scale=3)
        d.text(x, 192, "%s C  %d%%" % (bme["temp_c"], bme["hum_pct"]), scale=1)
    else:
        d.text(x, 162, "non branche", scale=1)
    d.hline(220, 566, d.W, 2)

    # Podomètre
    d.text(x, 236, "PODOMETRE", scale=1)
    steps = s.get("steps")
    if steps is not None:
        d.text(x, 254, "{:,}".format(steps).replace(",", " "), scale=3)
        d.text(x, 288, "pas / obj 10 000", scale=1)
    else:
        d.text(x, 258, "non branche", scale=1)
    d.hline(316, 566, d.W, 2)

    # Slot libre
    d.text(x, 332, "SLOT I2C LIBRE", scale=1)
    others = [n for n in s["found"] if n not in ("BME280", "LSM6DS3", "DS3231")]
    d.text(x, 354, others[0] if others else "aucun capteur", scale=1)


# ---------- Dock ----------
def _dock(ctx):
    d.hline(428, 0, d.W, 4)
    labels = ["ACCUEIL", "AGENDA", "METEO", "CAPTEURS", "APPS"]
    xw = 130
    for i, lab in enumerate(labels):
        x0 = i * xw
        if i == 0:  # app active
            d.inverted_row(x0, 432, xw, 48)
            d.text(x0 + 18, 452, lab, scale=1, color=d.WHITE)
        else:
            d.text(x0 + 18, 452, lab, scale=1)
        d.vline(x0 + xw, 432, 480, 2)

    batt = ctx.get("batt_pct", "--")
    wifi = "WiFi OK" if ctx.get("wifi_ok") else "WiFi --"
    d.text(660, 452, "%s%% %s" % (batt, wifi), scale=1)
