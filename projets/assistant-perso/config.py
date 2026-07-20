# ============================================================
# config.py — Configuration centrale de l'assistant e-ink
# Tout ce qui est personnel ou matériel se règle ICI.
# ============================================================

# ---------- Wi-Fi ----------
WIFI_SSID = "TON_SSID"
WIFI_PASSWORD = "TON_MOT_DE_PASSE"

# ---------- Fuseau horaire ----------
TZ_OFFSET_H = 2          # Paris été = +2, hiver = +1
NTP_HOST = "pool.ntp.org"

# ---------- Météo (Open-Meteo, gratuit, sans clé API) ----------
WEATHER_LAT = 48.8443    # Paris 6e (faculté de pharmacie)
WEATHER_LON = 2.3332
WEATHER_CITY = "Paris"

# ---------- Google Calendar ----------
# Méthode simple : lien iCal "secret" de ton agenda
# (Google Agenda > Paramètres > ton agenda > Adresse secrète au format iCal)
GCAL_ICS_URL = "https://calendar.google.com/calendar/ical/XXXX/basic.ics"
GCAL_MAX_EVENTS = 5

# ---------- Rythme de rafraîchissement ----------
REFRESH_MINUTES = 15     # réveil complet (météo + agenda + capteurs)
DEEP_SLEEP = True        # False pendant le développement (garde le REPL)

# ---------- Broches ESP32-S3 (à ajuster selon ton câblage) ----------
# Écran Waveshare 7.5" V2 (SPI)
PIN_EPD_SCK  = 12
PIN_EPD_MOSI = 11
PIN_EPD_CS   = 10
PIN_EPD_DC   = 9
PIN_EPD_RST  = 8
PIN_EPD_BUSY = 7

# Bus I²C accessoires (connecteurs Qwiic)
PIN_I2C_SDA = 4
PIN_I2C_SCL = 5

# Carte SD (SPI partagé ou dédié)
PIN_SD_CS = 13

# Boutons (haut / bas / OK / retour) — INPUT_PULLUP, actifs à LOW
PIN_BTN_UP   = 1
PIN_BTN_DOWN = 2
PIN_BTN_OK   = 3
PIN_BTN_BACK = 6

# ---------- Adresses I²C connues (détection plug-and-play) ----------
I2C_KNOWN = {
    0x76: "BME280",      # baromètre/temp/humidité (parfois 0x77)
    0x77: "BME280",
    0x6A: "LSM6DS3",     # IMU / podomètre (parfois 0x6B)
    0x6B: "LSM6DS3",
    0x68: "DS3231",      # RTC (attention: MPU6050 partage 0x68)
}
