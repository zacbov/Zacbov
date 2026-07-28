# Assistant e-ink personnel

Assistant de bureau à écran e-ink (façon liseuse Kindle), relié à Google
Agenda et à la météo, avec accessoires modulaires branchables à chaud
(baromètre, podomètre, stockage SD) détectés automatiquement au démarrage.

![status](https://img.shields.io/badge/status-firmware%20squelette%20%2B%20maquette-blue)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Sommaire

- [Objectif](#objectif)
- [Aperçu du dashboard](#aperçu-du-dashboard)
- [Architecture matérielle](#architecture-matérielle)
- [Liste de courses](#liste-de-courses)
- [Câblage](#câblage)
- [Architecture logicielle](#architecture-logicielle)
- [Mise en route](#mise-en-route)
- [Philosophie plug-and-play](#philosophie-plug-and-play)
- [Roadmap](#roadmap)

---

## Objectif

Un boîtier posé sur le bureau qui affiche en permanence, sans backlight
et sans rafraîchissement agressif pour les yeux :

- l'heure et la date
- la météo du jour
- les prochains événements de mon Google Agenda
- l'état des capteurs branchés (baromètre, podomètre…)

Le tout pensé comme une plateforme **modulaire** : un connecteur I²C
standard (Qwiic/STEMMA QT) permet d'ajouter un capteur sans re-flasher
le firmware — il est détecté au démarrage et son widget apparaît de
lui-même.

## Aperçu du dashboard

Maquette HTML à l'échelle exacte de l'écran (800×480, monochrome strict)
disponible dans [`maquette_dashboard_eink.html`](./maquette_dashboard_eink.html) — s'ouvre dans
n'importe quel navigateur, aucune dépendance.

```
┌─────────────────┬───────────────────────┬──────────────┐
│   14:37          │   VENDREDI            │   soleil 24°C│
│   (heure géante) │   17 juillet 2026     │   17° / 27°  │
├─────────────────┴───────────────────────┼──────────────┤
│  AUJOURD'HUI — 4 événements              │  BAROMÈTRE   │
│  09:00  Réunion labo         Salle Houël │  1013 hPa    │
│ [14:30  TP Chimie analytique   Labo 33 ] │──────────────│
│  16:00  Point projet e-ink       Visio   │  PODOMÈTRE   │
│  18:30  Course à pied        Luxembourg  │  6 842 pas   │
│                                           │──────────────│
│                                           │  SLOT LIBRE  │
├───────────────────────────────────────────┴──────────────┤
│ Accueil │ Agenda │ Météo │ Capteurs │ Apps │ 78% WiFi OK │
└────────────────────────────────────────────────────────────┘
```

L'événement en cours s'affiche en vidéo inversée (fond noir), lisible
même en e-ink à faible contraste.

## Architecture matérielle

```
                    ┌──────────────────────┐
                    │      ESP32-S3        │
                    │  (Wi-Fi + PSRAM)     │
                    └──────┬───────┬───────┘
                SPI        │       │        I²C (Qwiic)
        ┌──────────────────┘       └──────────────────┐
        │                                              │
┌───────▼────────┐                          ┌──────────▼─────────┐
│ Écran e-ink     │                          │  Bus capteurs      │
│ Waveshare 7.5"  │                          │  plug-and-play     │
│ V2, 800×480     │                          │                    │
└─────────────────┘                          │  • BME280 (météo   │
                                              │    intérieure)     │
┌─────────────────┐                          │  • LSM6DS3         │
│ Carte microSD    │                          │    (podomètre)     │
│ (stockage local) │                          │  • DS3231 (RTC)    │
└─────────────────┘                          │  • ... extensible  │
                                              └────────────────────┘
```

## Liste de courses

### Cœur du système

| # | Composant | Référence conseillée | Prix approx. | Rôle |
|---|---|---|---|---|
| 1 | Microcontrôleur | ESP32-S3 DevKitC-1, **N16R8** (16 Mo flash / 8 Mo PSRAM) | 12 € | Cerveau : Wi-Fi, rendu, sommeil profond |
| 2 | Écran | Waveshare **7.5" e-Paper V2**, 800×480 N&B + carte driver | 48 € | Affichage principal. Vérifier "V2" (refresh ~2 s, pas la V1 à 6 s) |
| 3 | Batterie | LiPo **3000 mAh**, 3,7 V, format ~606090, **avec protection** | 10 € | Autonomie de plusieurs semaines en deep sleep |
| 4 | Module de charge | **TP4056** avec protection décharge, port USB-C | 2 € | Charge sécurisée |
| 5 | Horloge temps réel | **DS3231** (module I²C) | 3 € | Garde l'heure exacte pendant le deep sleep |

### Accessoires modulaires (plug-and-play)

| # | Composant | Référence | Prix approx. | Bus |
|---|---|---|---|---|
| 6 | Baromètre/T°/humidité | **BME280** (pas BMP — le "E" ajoute l'humidité) | 4 € | I²C |
| 7 | IMU / podomètre | **LSM6DS3** (ou MPU6050) | 3 € | I²C |
| 8 | Stockage | Module **microSD SPI** + carte 8-16 Go | 5 € | SPI |
| 9 | Connecteurs modulaires | 4× **JST-SH 4 broches** (Qwiic/STEMMA QT) + câbles | 5 € | — |

### Interface et boîtier

| # | Élément | Détail | Prix approx. |
|---|---|---|---|
| 10 | Boutons | 4× tactiles 6×6 mm (haut / bas / OK / retour) | 2 € |
| 11 | Interrupteur | Glissière ON/OFF | 1 € |
| 12 | Boîtier | Impression 3D PLA (modèle à dessiner) ou boîtier du commerce adapté | 5-10 € |
| 13 | Prototypage | Breadboard + jumpers (M-M, M-F) | 5 € |

**Total estimé : ~105-110 €**

### Conseils d'achat

- **L'écran en premier** : c'est la pièce la plus chère et au délai de
  livraison le plus long. Bien vérifier le modèle **V2**.
- **Une deuxième carte ESP32-S3** (+12 €) évite de bloquer le projet
  sur une soudure ratée et permet de tester les capteurs en parallèle.
- **LiPo avec circuit de protection intégré** obligatoire (pas de
  cellule "nue") : le TP4056 protège en charge, la cellule protège en
  décharge profonde.

## Câblage

Toutes les broches sont centralisées dans [`config.py`](./config.py), à
ajuster selon ton câblage réel :

```python
# Écran (SPI)
PIN_EPD_SCK=12  PIN_EPD_MOSI=11  PIN_EPD_CS=10
PIN_EPD_DC=9    PIN_EPD_RST=8    PIN_EPD_BUSY=7

# Bus I²C accessoires (Qwiic)
PIN_I2C_SDA=4   PIN_I2C_SCL=5

# Carte SD
PIN_SD_CS=13

# Boutons (actifs à LOW, pull-up interne)
PIN_BTN_UP=1  PIN_BTN_DOWN=2  PIN_BTN_OK=3  PIN_BTN_BACK=6
```

## Architecture logicielle

Modèle **launcher + apps**, où chaque app est un fichier indépendant
avec une fonction `render(ctx)` :

```
main.py                 cycle : réveil → Wi-Fi → données → rendu → sommeil
config.py                toute la config perso (Wi-Fi, agenda, broches)
core/
  services.py           Wi-Fi, NTP, météo (Open-Meteo), agenda Google (ICS)
  sensors.py            scan I²C plug-and-play, lecture BME280 / LSM6DS3
  display.py            pilote écran + primitives de dessin, mode simulation
apps/
  home.py               dashboard principal (fidèle à la maquette)
maquette_dashboard_eink.html   maquette HTML 800×480 pour valider le layout
```

### Points techniques clés

- **Météo** : API Open-Meteo, gratuite, sans clé.
- **Agenda** : lecture directe du flux **iCal** (adresse secrète de
  Google Agenda), parsé **en streaming** pour ne pas saturer la RAM de
  l'ESP32 sur un agenda volumineux. Gère les lignes repliées RFC 5545
  et la conversion UTC → Europe/Paris.
- **Capteurs** : détection par scan d'adresses I²C au démarrage
  (`config.I2C_KNOWN`). Ajouter un capteur = ajouter une ligne dans
  cette table, aucune autre modification nécessaire.
- **Mode simulation** : `display.MODE_SIM = True` (par défaut) écrit
  le rendu dans `screen.pbm` au lieu de piloter l'écran — permet
  d'itérer sur la mise en page sans aucun matériel branché.

## Mise en route

1. **Flasher MicroPython** sur l'ESP32-S3 (firmware "ESP32_GENERIC_S3"
   depuis micropython.org) :
   ```bash
   esptool --chip esp32s3 write_flash 0 firmware.bin
   ```
2. **Éditer `config.py`** : Wi-Fi, URL iCal secrète de l'agenda,
   coordonnées météo. Garder `DEEP_SLEEP = False` pendant le
   développement (le REPL reste accessible).
3. **Copier les fichiers** sur la carte (Thonny, ou `mpremote cp -r . :`).
4. **Tester sans écran** : récupérer `screen.pbm`
   (`mpremote cp :screen.pbm .`) et l'ouvrir avec GIMP/IrfanView.
5. **Brancher l'écran**, passer `MODE_SIM = False`, ajuster les broches
   si besoin.

### Dépendance optionnelle

Pour des mesures BME280 compensées (température/pression/humidité
précises), copier `bme280_float.py` (lib `micropython-bme280`) à la
racine de la carte. Sans elle, le firmware fonctionne quand même et
affiche "lib manquante".

## Philosophie plug-and-play

Au démarrage, `sensors.init()` scanne le bus I²C et compare chaque
adresse trouvée à la table `config.I2C_KNOWN` :

```python
I2C_KNOWN = {
    0x76: "BME280", 0x77: "BME280",
    0x6A: "LSM6DS3", 0x6B: "LSM6DS3",
    0x68: "DS3231",
}
```

Brancher un capteur sur le connecteur Qwiic, redémarrer : son widget
apparaît automatiquement dans le dashboard. Aucun re-flash requis.

## Roadmap

- [x] Maquette du dashboard (HTML, échelle 1:1, monochrome strict)
- [x] Squelette firmware (core + app d'accueil)
- [ ] Validation sur matériel réel (init écran UC8179, lecture BME280)
- [ ] App Agenda détaillée (vue semaine)
- [ ] App Météo 7 jours
- [ ] Boîtier imprimable (modèle 3D avec logements écran/boutons/Qwiic)
- [ ] Gestion fine de la batterie (mesure ADC + alerte niveau bas)

---

*Projet personnel.*
