# ============================================================
# main.py — Point d'entrée de l'assistant e-ink
# Cycle : réveil -> Wi-Fi -> données -> rendu -> deep sleep
# ============================================================
import time, machine
import config
from core import services, sensors, display
from apps import home


def collect_context():
    """Rassemble tout ce que le dashboard doit afficher."""
    wifi_ok = services.wifi_connect()
    if wifi_ok:
        services.sync_time()

    sensors.init()
    sensors.pedometer_enable()

    return {
        "now": services.now_local(),
        "weather": services.fetch_weather() if wifi_ok else None,
        "events": services.fetch_today_events() if wifi_ok else None,
        "sensors": sensors.summary(),
        "batt_pct": read_battery_pct(),
        "wifi_ok": wifi_ok,
    }


def read_battery_pct():
    """Lecture ADC de la LiPo via pont diviseur (à câbler plus tard)."""
    try:
        from machine import ADC, Pin
        adc = ADC(Pin(14))          # à ajuster selon ton pont diviseur
        adc.atten(ADC.ATTN_11DB)
        v = adc.read_uv() / 1e6 * 2  # pont 1:2
        pct = int(max(0, min(100, (v - 3.3) / (4.2 - 3.3) * 100)))
        return pct
    except Exception:
        return "--"


def run_once():
    ctx = collect_context()
    home.render(ctx)
    print("[main] rendu OK a %02d:%02d" % (ctx["now"][3], ctx["now"][4]))


def sleep_until_next():
    ms = config.REFRESH_MINUTES * 60 * 1000
    if config.DEEP_SLEEP:
        print("[main] deep sleep %d min" % config.REFRESH_MINUTES)
        machine.deepsleep(ms)
    else:
        print("[main] mode dev : pause %d min (REPL dispo, Ctrl-C pour arreter)"
              % config.REFRESH_MINUTES)
        time.sleep(ms // 1000)


def main():
    while True:
        try:
            run_once()
        except Exception as e:
            print("[main] erreur:", e)
        sleep_until_next()   # ne revient jamais si deep sleep


main()
