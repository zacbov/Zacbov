# ============================================================
# core/sensors.py — Détection plug-and-play I²C + lectures
# Un capteur branché est détecté au boot par son adresse.
# ============================================================
from machine import Pin, I2C
import config

_i2c = None
_found = {}   # {"BME280": addr, "LSM6DS3": addr, ...}


def init():
    """Scanne le bus I²C et mémorise les capteurs reconnus."""
    global _i2c, _found
    _i2c = I2C(0, sda=Pin(config.PIN_I2C_SDA),
                  scl=Pin(config.PIN_I2C_SCL), freq=400_000)
    _found = {}
    for addr in _i2c.scan():
        name = config.I2C_KNOWN.get(addr)
        if name and name not in _found:
            _found[name] = addr
    return dict(_found)


def present(name):
    return name in _found


# ---------- BME280 (lecture minimale, sans dépendance) ----------
def read_bme280():
    """Retourne {press_hpa, temp_c, hum_pct} ou None.
    Implémentation compensée complète -> utiliser lib bme280_float
    en production ; ici lecture brute pour valider le câblage."""
    if not present("BME280"):
        return None
    try:
        import bme280_float as bme  # lib à copier sur l'appareil
        b = bme.BME280(i2c=_i2c, address=_found["BME280"])
        t, p, h = b.read_compensated_data()
        return {"temp_c": round(t, 1),
                "press_hpa": round(p / 100),
                "hum_pct": round(h)}
    except ImportError:
        return {"temp_c": None, "press_hpa": None, "hum_pct": None,
                "note": "lib bme280_float manquante"}
    except Exception:
        return None


# ---------- LSM6DS3 : podomètre matériel intégré ----------
_LSM_CTRL10_C = 0x19
_LSM_STEP_L = 0x4B

def pedometer_enable():
    """Active le compteur de pas matériel du LSM6DS3."""
    if not present("LSM6DS3"):
        return False
    a = _found["LSM6DS3"]
    try:
        # PEDO_EN=1 + FUNC_EN=1
        _i2c.writeto_mem(a, _LSM_CTRL10_C, b"\x3C")
        return True
    except Exception:
        return False


def pedometer_read():
    """Nombre de pas depuis la mise sous tension (16 bits)."""
    if not present("LSM6DS3"):
        return None
    a = _found["LSM6DS3"]
    try:
        lo, hi = _i2c.readfrom_mem(a, _LSM_STEP_L, 2)
        return hi << 8 | lo
    except Exception:
        return None


def summary():
    """Snapshot de tous les capteurs présents, pour le dashboard."""
    out = {"found": list(_found.keys())}
    if present("BME280"):
        out["bme"] = read_bme280()
    if present("LSM6DS3"):
        out["steps"] = pedometer_read()
    return out
