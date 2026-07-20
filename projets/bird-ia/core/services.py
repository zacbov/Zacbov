# ============================================================
# core/services.py — Wi-Fi, NTP, météo Open-Meteo, agenda ICS
# ============================================================
import network, ntptime, time
import urequests as requests
import config


def wifi_connect(timeout_s=15):
    """Connecte le Wi-Fi. Retourne True si OK."""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        return True
    wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)
    t0 = time.time()
    while not wlan.isconnected():
        if time.time() - t0 > timeout_s:
            return False
        time.sleep(0.3)
    return True


def sync_time():
    """Synchronise l'horloge via NTP (à faire une fois par réveil Wi-Fi)."""
    try:
        ntptime.host = config.NTP_HOST
        ntptime.settime()          # règle en UTC
        return True
    except Exception:
        return False


def now_local():
    """Heure locale (tuple time.localtime) avec offset du fuseau."""
    return time.localtime(time.time() + config.TZ_OFFSET_H * 3600)


# ---------- Météo (Open-Meteo : gratuit, JSON, sans clé) ----------
WMO_ICONS = {
    0: "SOLEIL", 1: "SOLEIL", 2: "NUAGES+", 3: "NUAGES",
    45: "BROUIL", 48: "BROUIL",
    51: "BRUINE", 53: "BRUINE", 55: "BRUINE",
    61: "PLUIE", 63: "PLUIE", 65: "PLUIE+",
    71: "NEIGE", 73: "NEIGE", 75: "NEIGE+",
    80: "AVERSE", 81: "AVERSE", 82: "ORAGE",
    95: "ORAGE", 96: "ORAGE", 99: "ORAGE",
}

def fetch_weather():
    """Retourne dict {temp, tmin, tmax, code, label} ou None."""
    url = ("https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}"
           "&current=temperature_2m,weather_code"
           "&daily=temperature_2m_min,temperature_2m_max"
           "&timezone=auto&forecast_days=1").format(
               config.WEATHER_LAT, config.WEATHER_LON)
    try:
        r = requests.get(url, timeout=10)
        d = r.json()
        r.close()
        code = int(d["current"]["weather_code"])
        return {
            "temp": round(d["current"]["temperature_2m"]),
            "tmin": round(d["daily"]["temperature_2m_min"][0]),
            "tmax": round(d["daily"]["temperature_2m_max"][0]),
            "code": code,
            "label": WMO_ICONS.get(code, "?"),
        }
    except Exception:
        return None


# ---------- Agenda Google via ICS ----------
def _ics_dt_to_local(v):
    """'20260717T143000Z' ou '20260717T143000' -> (Y,M,D,h,m) local."""
    try:
        y, mo, d = int(v[0:4]), int(v[4:6]), int(v[6:8])
        h = mi = 0
        if "T" in v:
            h, mi = int(v[9:11]), int(v[11:13])
            if v.endswith("Z"):
                # UTC -> local
                t = time.mktime((y, mo, d, h, mi, 0, 0, 0))
                y, mo, d, h, mi = time.localtime(t + config.TZ_OFFSET_H * 3600)[:5]
        return (y, mo, d, h, mi)
    except Exception:
        return None


def fetch_today_events():
    """
    Parse le flux ICS en streaming (fichier potentiellement gros)
    et retourne les événements du jour: [(hh, mm, "titre"), ...] triés.
    """
    today = now_local()[:3]
    events = []
    try:
        r = requests.get(config.GCAL_ICS_URL, timeout=15)
        cur = {}
        buf = b""
        while True:
            chunk = r.raw.read(1024)
            if not chunk:
                break
            buf += chunk
            while b"\n" in buf:
                line, buf = buf.split(b"\n", 1)
                line = line.strip().decode("utf-8", "ignore")
                if line == "BEGIN:VEVENT":
                    cur = {}
                elif line.startswith("DTSTART"):
                    cur["dt"] = _ics_dt_to_local(line.split(":", 1)[1])
                elif line.startswith("SUMMARY"):
                    cur["s"] = line.split(":", 1)[1][:40]
                elif line == "END:VEVENT":
                    dt = cur.get("dt")
                    if dt and dt[:3] == today:
                        events.append((dt[3], dt[4], cur.get("s", "(sans titre)")))
        r.close()
    except Exception:
        return None
    events.sort()
    return events[:config.GCAL_MAX_EVENTS]
