# 🐦 Inky Bird Frame — édition « écoute & sonagramme »

> Un cadre e-ink qui écoute les oiseaux autour de chez soi, les identifie, et
> affiche le **dernier oiseau entendu** avec le **sonagramme** de son chant.

Détection audio locale par **BirdNET-Go**, affichage sur un e-paper Waveshare
7,5″, le tout piloté par un Raspberry Pi — avec un **ESP32** en simple afficheur
déporté sans fil.

![Aperçu — détection](exemples/apercu_detection.png)

---

## Sommaire
- [Le concept](#le-concept)
- [En quoi c'est différent de l'Inky Bird Frame d'origine](#en-quoi-cest-différent-de-linky-bird-frame-dorigine)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Matériel](#matériel)
- [Installation](#installation)
- [Configuration](#configuration)
- [Chant de référence (xeno-canto)](#chant-de-référence-xeno-canto)
- [Structure du dépôt](#structure-du-dépôt)
- [Feuille de route](#feuille-de-route)
- [Crédits & licences](#crédits--licences)

---

## Le concept

On branche un micro sur un Raspberry Pi. **BirdNET-Go** écoute en continu et
identifie les espèces d'oiseaux à leur chant. À chaque détection, un petit
service Python fabrique une image 800×480 en noir & blanc — nom de l'espèce
(en français), heure, indice de confiance, et surtout le **sonagramme**
(spectrogramme) du chant, qui est la signature visuelle la plus caractéristique
d'un oiseau. Cette image est envoyée à un écran e-paper.

L'affichage peut se faire de deux façons : directement depuis le Pi, ou via un
**ESP32 déporté** qui récupère l'image en WiFi et la dessine sur l'écran — un
cadre autonome et sobre, posable n'importe où.

## En quoi c'est différent de l'Inky Bird Frame d'origine

L'[Inky Bird Frame](https://github.com/veteranbv/inky-bird-frame) d'origine
**ne fait pas de détection audio** : il lit des observations **publiques**
(iNaturalist, eBird, BirdWeather) autour d'une position et en génère de jolies
planches. Ici, au contraire, c'est un **vrai capteur** : un micro, une écoute
réelle, une identification à la volée. La partie « affichage e-ink » est reprise
dans le même esprit, mais la source de vérité, ce sont **les oiseaux réellement
entendus chez toi**.

## Fonctionnalités

- 🎙️ **Détection audio locale** des oiseaux (BirdNET-Go), noms communs en français.
- 📈 **Sonagramme** du chant calculé maison (SciPy), tramé proprement pour l'e-ink.
- 🖼️ **Rendu 800×480 1-bit** prêt à coller sur l'écran, composé côté Pi (Pillow).
- 📡 **ESP32 en afficheur déporté** : récupère l'image en WiFi, l'affiche, puis
  deep sleep (l'e-ink garde l'image sans courant → très basse conso).
- 🐦 **Chant de référence xeno-canto** en repli quand la capture locale manque ou
  est trop bruitée, avec crédit du contributeur.
- 🧠 **Lecture de base résiliente** : le schéma SQLite de BirdNET-Go est
  auto-détecté (pas de noms de colonnes codés en dur).
- 🔌 **Zéro secret dans le code** : chemins et clés d'API vivent dans un
  `config.ini` non versionné.

## Architecture

```
   micro USB
      │
      ▼
┌───────────────────────── Raspberry Pi 3B+ ─────────────────────────┐
│  BirdNET-Go  ──►  base SQLite + clips audio                        │
│        │                                                          │
│        ▼                                                          │
│  server.py  ── lit la dernière détection      (birdnet_db.py)     │
│        │     ── calcule le sonagramme du clip  (spectrogram.py)   │
│        │     ── ou chant de référence          (xenocanto.py)     │
│        │     ── compose l'image 800×480 1-bit  (render.py)        │
│        ▼                                                          │
│  HTTP :8090/frame.bin   (48000 octets prêts à afficher)          │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ WiFi
                                 ▼
                         ESP32 (afficheur)
                                 │ SPI
                                 ▼
                Waveshare 7.5" e-Paper V2 (UC8179)
```

**Principe clé :** tout le cerveau est sur le Pi. L'ESP32 ne fait que télécharger
une image déjà prête et la coller. Résultat : firmware minuscule, et on peut
changer tout le design sans jamais reflasher l'ESP32.

## Matériel

- Raspberry Pi 3B+ (ou mieux) + microSD + alim.
- Micro USB (n'importe quel modèle plug-and-play ; éviter les cartes son externes).
- Écran **Waveshare 7,5″ e-Paper V2 800×480 N&B** (contrôleur **UC8179**).
- Selon le scénario d'affichage :
  - **ESP32 autonome** : panneau raw 7,5″ + *Universal e-Paper Driver Board (ESP32)*.
  - **Tout sur le Pi** : la version *HAT* (connecteur 40 broches) branchée sur le Pi.

👉 Détail complet et budget dans **[LISTE_COURSES.md](LISTE_COURSES.md)**.

## Installation

Procédure complète pas à pas dans **[SETUP_PI.md](SETUP_PI.md)**. En résumé :

```bash
# 1) BirdNET-Go (l'écoute)
curl -fsSL https://github.com/tphakala/birdnet-go/raw/main/install.sh -o install.sh
bash ./install.sh        # puis config via http://<pi>:8080

# 2) Module de rendu (l'image)
cd inky-bird-frame
sudo apt install -y python3-venv libsndfile1 fonts-dejavu-core
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
# renseigner config.ini (chemins de la base et des clips)
./venv/bin/python inspect_db.py     # vérifie la lecture de la base
./venv/bin/python server.py         # http://<pi>:8090/  pour prévisualiser
```

Puis flasher l'ESP32 : voir **[esp32/README_ESP32.md](esp32/README_ESP32.md)**.

## Configuration

Tout est dans `config.ini` (non versionné). Sections principales :

- `[birdnet]` — chemins de la base SQLite et des clips (+ surcharges de schéma
  optionnelles).
- `[display]` — dimensions, `invert`, `rotate`, bande de fréquences du sonagramme.
- `[server]` — hôte/port (8090 par défaut ; **8080 est pris par BirdNET-Go**).
- `[xenocanto]` — clé API et comportement de la référence.

## Chant de référence (xeno-canto)

Quand la capture de jardin manque ou est trop bruitée, le cadre affiche le
sonagramme d'un enregistrement de **référence** de l'espèce.

![Aperçu — référence](exemples/apercu_reference_xenocanto.png)

- Clé API v3 requise (gratuite, depuis un compte xeno-canto) → `[xenocanto] api_key`.
- `use_reference` : `fallback` (défaut) · `always` · `never`.
- Le **téléchargement se fait en tâche de fond** ; le chemin qui sert l'ESP32 ne
  lit que le cache → aucune latence sur l'écran.
- Le crédit du contributeur (ID XC · auteur · licence CC) est affiché sur le
  sonagramme de référence.
- Test : `python xenocanto.py "Erithacus rubecula"`.

## Structure du dépôt

| Fichier | Rôle |
|---|---|
| `SETUP_PI.md` | tutoriel d'installation pas à pas |
| `LISTE_COURSES.md` | matériel + budget |
| `config.ini` | chemins + clés (non versionné) |
| `birdnet_db.py` | lecture de la dernière détection (schéma auto-détecté) |
| `inspect_db.py` | diagnostic du schéma de la base |
| `spectrogram.py` | audio → sonagramme (repli ffmpeg pour le mp3) |
| `xenocanto.py` | chant de référence par espèce (API v3, cache) |
| `render.py` | composition du cadre 800×480 + empaquetage 1-bit |
| `server.py` | sert `/frame.bin` à l'ESP32 (+ `/frame.png`, `/latest.json`) |
| `frame.service` | démarrage auto (systemd) |
| `esp32/` | firmware Arduino + guide câblage/flash |
| `exemples/` | aperçus de rendu |

## Feuille de route

- [x] Écoute + identification (BirdNET-Go)
- [x] Sonagramme des détections locales
- [x] Rendu 1-bit + serveur HTTP
- [x] Firmware ESP32 (WiFi + GxEPD2 + deep sleep)
- [x] Chant de référence xeno-canto (repli + crédit)
- [ ] Vignette illustrée (planche naturaliste du domaine public via Wikimedia)
- [ ] Historique des dernières espèces du jour
- [ ] « Notes de musique » stylisées (contour de hauteur → portée)

## Crédits & licences

- **[BirdNET-Go](https://github.com/tphakala/birdnet-go)** (Tomi Häkkinen) — moteur
  de détection. BirdNET est développé par le K. Lisa Yang Center for Conservation
  Bioacoustics (Cornell) et la Chemnitz University of Technology.
- **[xeno-canto](https://xeno-canto.org)** — enregistrements de référence, sous
  licences Creative Commons (crédit affiché par espèce).
- **[GxEPD2](https://github.com/ZinggJM/GxEPD2)** (Jean-Marc Zingg) — pilote e-paper
  Arduino.
- Écran & cartes **Waveshare**.

Ce dépôt (code du cadre) : licence au choix — **MIT** conseillée. Attention à
respecter les licences des enregistrements xeno-canto si tu partages des captures.

---

*Projet personnel, non commercial. Inspiré de l'Inky Bird Frame de veteranbv,
réorienté vers de la détection audio réelle.*


# Liste de courses — Inky Bird Frame (version écoute + sonagramme)

Prix **indicatifs** en € (Waveshare direct, Amazon, AliExpress, ou en France
Kubii / GoTronic). À ajuster selon le vendeur.

## ✅ Déjà en stock (rappel)

| Élément | Note |
|---|---|
| Raspberry Pi **3B+** | déjà de côté — c'est le cerveau (écoute + BirdNET) |
| Micros **USB** | tu en as plusieurs pour tester |
| *(éventuel)* FireBeetle 2 **ESP32-E** | de ton projet d'affichage de salles — réutilisable comme afficheur |
| *(éventuel)* Écran **7,5" V2 800×480** | idem — si tu en as un dispo, sinon voir plus bas |

## 🛒 À acheter — cœur du projet

### Pour le Raspberry Pi
| Élément | Prix ~ | Pourquoi |
|---|---|---|
| Carte **microSD 16–32 Go** classe A1 | 8 € | système + base de détections |
| Alim **5 V / 2,5 A microUSB** (si pas déjà) | 8 € | le 3B+ est capricieux sur l'alim |

### L'écran + son pilotage — **choisis UN scénario**

**➤ Scénario B — ESP32 autonome (celui qu'on a codé, recommandé)**
L'ESP32 pilote l'écran et va chercher l'image sur le Pi en WiFi.

| Élément | Prix ~ | Note |
|---|---|---|
| Panneau **7,5" e-Paper V2 (raw, 800×480, N&B)** *sans PCB* | 45–50 € | contrôleur UC8179 |
| **Universal e-Paper Driver Board (ESP32 embarqué)** Waveshare | 18–20 € | ESP32 + driver e-paper en une carte ; correspond au brochage du firmware |

*Alternative si tu réutilises ta FireBeetle ESP32-E : panneau raw 7,5" + un
HAT/adaptateur e-paper, câblé selon le tableau du `README_ESP32.md`.*

**➤ Scénario A — tout sur le Pi (le plus simple, sans ESP32)**
Le Pi pilote directement l'écran ; on n'utilise alors pas le firmware ESP32.

| Élément | Prix ~ | Note |
|---|---|---|
| **7,5" e-Paper HAT (V2)** (panneau + HAT 40 broches Pi) | 55–65 € | s'enfiche sur le GPIO du 3B+ |

> ⚠️ Ne mélange pas : le **HAT** (connecteur 40 broches) est fait pour le **Pi**.
> Le **Universal Driver Board ESP32** est fait pour un montage **ESP32**. Prends
> l'un OU l'autre selon le scénario.

## 🧩 Optionnel / confort

| Élément | Prix ~ | Pourquoi |
|---|---|---|
| Cadre profond (caisse américaine) ou boîtier imprimé 3D | 10–25 € | présentation façon "cadre" |
| Batterie **LiPo + module TP4056** | 10 € | afficheur ESP32 sur batterie (l'e-ink garde l'image éteint) |
| Jeu de **jumpers / nappe** | 5 € | seulement si câblage manuel |
| Bonnette anti-vent / mini-trépied micro | 5–10 € | si micro près d'une fenêtre / extérieur |

## Budget indicatif

- **Scénario B (ESP32 autonome)** : ~ **65–75 €** (hors Pi/micro déjà possédés)
- **Scénario A (tout Pi)** : ~ **70 €** (hors Pi/micro)

Dans les deux cas, on reste **très loin** des ~275 $ de l'écran 13,3" de l'Inky
Bird Frame d'origine.

## Récap du rôle de chaque pièce

```
Micro USB ──► Raspberry Pi 3B+ (BirdNET-Go : écoute + identification)
                         │
                         ├─ Scénario A : pilote directement l'écran (HAT sur le Pi)
                         │
                         └─ Scénario B : sert l'image en WiFi ──► ESP32 ──► écran 7,5"
```

