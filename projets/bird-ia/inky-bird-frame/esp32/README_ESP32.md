# Afficheur ESP32 — montage & flash

L'ESP32 est un simple afficheur : il télécharge une image déjà prête sur le Pi
et la colle sur l'écran, puis dort. Rien à comprendre côté oiseaux ici.

## Matériel

- Un ESP32 (WROOM/DevKit, ou XIAO ESP32 — le classique suffit, pas besoin du S3).
- L'écran **Waveshare 7.5" e-Paper V2 800×480** (contrôleur **UC8179**).
- La carte/HAT de driver e-Paper Waveshare.

## Câblage

Si tu as la **carte driver e-Paper Waveshare pour ESP32** (la dalle s'y enfiche
directement), le câblage est déjà celui-ci — c'est le mapping standard :

| e-Paper | ESP32 |
|--------|-------|
| BUSY   | GPIO25 |
| RST    | GPIO26 |
| DC     | GPIO27 |
| CS     | GPIO15 |
| CLK    | GPIO13 |
| DIN (MOSI) | GPIO14 |
| VCC    | 3V3 |
| GND    | GND |

Sur un autre montage (ESP32 nu + HAT générique), reproduis ces liaisons ou
adapte les `#define PIN_*` en haut du `.ino`.

## Bibliothèques Arduino

Dans l'IDE Arduino :

1. **Gestionnaire de cartes** → installe le core **esp32** (Espressif).
2. **Gestionnaire de bibliothèques** → installe **GxEPD2** (par Jean-Marc Zingg).
   Il propose d'installer aussi **Adafruit GFX** : accepte.

Carte à sélectionner : *ESP32 Dev Module* (ou ta variante).

## Configurer puis flasher

Ouvre `inky_bird_frame_esp32.ino` et renseigne, tout en haut :

- `WIFI_SSID` / `WIFI_PASS`
- `FRAME_URL` : idéalement l'**IP fixe** du Pi, ex. `http://192.168.1.42:8090/frame.bin`.
  (`http://birdpi.local:8090/frame.bin` marche aussi via mDNS, mais l'IP est plus sûre.)
- `SLEEP_MINUTES` : fréquence de rafraîchissement (15 par défaut).
- `INVERT` : laisse `false`, passe à `true` seulement si l'image sort en négatif.

Puis **Téléverser**. Ouvre le **moniteur série à 115200 bauds** : tu dois voir
la connexion WiFi, « Reçu 48000 / 48000 octets », puis « Écran mis à jour ».

## Notes

- L'e-ink **conserve son image sans alimentation** : entre deux réveils, l'ESP32
  est en deep sleep (~quelques µA à quelques mA selon la carte), idéal sur batterie.
- Le rafraîchissement complet d'un 7,5" prend ~2–3 s (normal, pas de partiel fiable
  sur cette dalle).
- Si le Pi est éteint ou injoignable, l'ESP32 laisse simplement l'image précédente
  et se rendort — pas d'écran blanc.
- Test rapide sans ESP32 : ouvre `http://<IP_du_Pi>:8090/` dans un navigateur,
  tu vois exactement ce qui sera affiché.
