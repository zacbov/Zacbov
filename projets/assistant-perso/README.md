# Assistant e-ink — Firmware MicroPython (squelette v1)

## Arborescence

```
main.py               point d'entrée : cycle réveil/rendu/sommeil
config.py             TOUT ce qui est personnel (Wi-Fi, agenda, broches)
core/
  services.py         Wi-Fi, NTP, météo Open-Meteo, agenda Google (ICS)
  sensors.py          détection plug-and-play I²C, BME280, podomètre LSM6DS3
  display.py          écran 7.5" V2 + primitives de dessin (mode simulation inclus)
apps/
  home.py             dashboard d'accueil (fidèle à la maquette validée)
```

## Mise en route (5 étapes)

1. **Flasher MicroPython** sur l'ESP32-S3 :
   télécharger le .bin "ESP32_GENERIC_S3" sur micropython.org, puis
   `esptool --chip esp32s3 write_flash 0 firmware.bin`
2. **Éditer `config.py`** : Wi-Fi, URL ICS secrète de ton agenda Google,
   coordonnées météo. Laisser `DEEP_SLEEP = False` pour développer.
3. **Copier les fichiers** sur la carte avec Thonny (le plus simple) ou
   `mpremote cp -r . :`
4. **Tester sans écran** : `display.MODE_SIM = True` (défaut) écrit
   `screen.pbm` — récupère-le (`mpremote cp :screen.pbm .`) et ouvre-le
   avec GIMP/IrfanView pour voir le rendu exact 800×480.
5. **Brancher l'écran**, passer `MODE_SIM = False`, ajuster les broches.

## Dépendance optionnelle

Pour des mesures BME280 compensées : copier `bme280_float.py`
(lib micropython-bme280) à la racine. Sans elle, le firmware
fonctionne et indique simplement "lib manquante".

## Philosophie plug-and-play

Au boot, `sensors.init()` scanne le bus I²C. Chaque adresse reconnue
(table `I2C_KNOWN` dans config.py) active le widget correspondant.
Brancher un capteur Qwiic -> redémarrer -> il apparaît. Rien à flasher.

## Ajouter une app

Créer `apps/mon_app.py` avec une fonction `render(ctx)` qui dessine via
`core.display`, puis l'ajouter au dock dans `apps/home.py`. Même
philosophie que tes projets HTML : un fichier = une app.
