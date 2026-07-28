# Installation sur le Raspberry Pi 3B+ — pas à pas

À suivre quand tu auras le Pi sous la main. Deux grandes parties :
**(A)** faire écouter les oiseaux avec BirdNET-Go, **(B)** installer le module
de rendu qui fabrique l'image pour l'ESP32.

Durée : ~45 min, la plupart en téléchargements.

---

## A. BirdNET-Go (l'oreille)

### A.1 — Flasher la carte SD

Avec **Raspberry Pi Imager** :

- OS : **Raspberry Pi OS Lite (64-bit)** — *Bookworm*. Le 64-bit est requis ; le
  3B+ le gère (Cortex-A53).
- Roue crantée (réglages avancés) :
  - nom d'hôte : `birdpi`
  - **activer SSH** (mot de passe ou clé)
  - définir user + mot de passe
  - **WiFi** : SSID + mot de passe + pays (le 3B+ a le WiFi intégré, pas de dongle).

Insère la carte, démarre le Pi.

### A.2 — Première connexion et mise à jour

```bash
ssh <ton_user>@birdpi.local
sudo apt update && sudo apt full-upgrade -y
```

### A.3 — Brancher et vérifier le micro USB

Branche le micro USB, puis :

```bash
arecord -l
```

Tu dois voir ta carte micro listée. Note son numéro de `card` (utile dans
l'assistant). Évite les cartes son externes (ronflette de masse) ; un micro USB
plug-and-play est parfait.

### A.4 — Installer BirdNET-Go

```bash
curl -fsSL https://github.com/tphakala/birdnet-go/raw/main/install.sh -o install.sh
bash ./install.sh
```

Le script installe Docker si besoin, télécharge l'image, crée un service qui
tourne au démarrage, et fait un petit benchmark pour régler la « Deep Detection »
selon ton matériel. Laisse-le finir.

### A.5 — Configurer via l'interface web

Ouvre **http://birdpi.local:8080** dans un navigateur. L'assistant d'accueil :

- **Source audio** = ta carte micro USB.
- **Localisation** (lat/lon) : filtre les espèces plausibles autour de chez toi →
  essentiel contre les faux positifs exotiques.
- **Langue = français** (noms communs en français).
- **Seuil de confiance** : commence à **0,6**, tu ajusteras.

### A.6 — Vérifier que ça écoute

Laisse tourner et regarde l'onglet des détections. Chaque détection stocke un
**extrait audio** et son **sonagramme** sous `~/birdnet-go-app/data/`.

Si tu vois des avertissements `processing time exceeded buffer length`, le 3B+
peine : on baissera l'`overlap` (deep detection). En détection simple il devrait
tenir.

> **Note ces deux chemins**, tu en auras besoin en B.2 :
> - la base : `find ~/birdnet-go-app -name '*.db'`
> - les clips : `find ~/birdnet-go-app -type d -name clips`

---

## B. Module de rendu e-ink (l'image pour l'ESP32)

### B.1 — Copier le projet et installer les dépendances

Copie le dossier `inky-bird-frame/` dans le home du Pi (`/home/pi/inky-bird-frame`
si ton user est `pi` ; sinon adapte les chemins du service et de la config).

```bash
cd ~/inky-bird-frame
sudo apt install -y python3-venv libsndfile1 fonts-dejavu-core
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

`libsndfile1` permet de lire les clips (wav **et** flac). `fonts-dejavu-core`
fournit les polices utilisées par le rendu.

### B.2 — Renseigner `config.ini`

Ouvre `config.ini` et corrige au moins :

- `[birdnet] db_path` = le chemin trouvé par `find … -name '*.db'`
- `[birdnet] clips_dir` = le dossier `clips` trouvé

Laisse le reste tel quel pour l'instant (l'auto-détection du schéma s'occupe des
noms de colonnes).

### B.3 — Vérifier la lecture de la base

```bash
./venv/bin/python inspect_db.py
```

Tu dois voir la table détectée, le mapping des colonnes, et la **dernière
détection**. Si une colonne est mal devinée, reporte le bon nom dans la section
`[birdnet]` de `config.ini` (par ex. `col_common = common_name`).

### B.4 — Lancer le serveur et prévisualiser

```bash
./venv/bin/python server.py
```

Puis, depuis n'importe quel navigateur du réseau :

- **http://birdpi.local:8090/** → prévisualisation exacte de ce qui s'affichera
- `…:8090/frame.png` → l'image seule
- `…:8090/frame.bin` → le buffer brut (48000 octets) que l'ESP32 va chercher
- `…:8090/latest.json` → la dernière détection lue

> Le port est **8090** exprès : **8080** est déjà pris par BirdNET-Go.

### B.4 bis — (Optionnel) Activer le chant de référence xeno-canto

Pour afficher un sonagramme propre quand la capture de jardin manque ou est
bruitée :

1. Dans `config.ini`, section `[xenocanto]`, colle ta clé API v3 dans `api_key`.
2. Laisse `use_reference = fallback` (référence seulement si pas de clip local).
3. Teste hors serveur :
   ```bash
   ./venv/bin/python xenocanto.py "Erithacus rubecula"
   ```
   Ça doit télécharger un enregistrement, écrire un aperçu dans `refs/…/apercu.png`
   et afficher le crédit du contributeur.

Ensuite, le serveur précharge automatiquement la référence de chaque nouvelle
espèce détectée, **en tâche de fond** (aucune latence pour l'écran).

### B.5 — Démarrage automatique (systemd)

Pour que le serveur tourne tout seul au boot :

```bash
sudo cp frame.service /etc/systemd/system/frame.service
# (édite le fichier si ton user n'est pas "pi" ou si le chemin diffère)
sudo systemctl daemon-reload
sudo systemctl enable --now frame.service
systemctl status frame.service        # doit être "active (running)"
```

---

## C. Brancher l'ESP32

Une fois `…:8090/frame.png` correct dans le navigateur, passe au dossier
`esp32/` et suis `README_ESP32.md` : câblage, WiFi, `FRAME_URL` = l'IP du Pi,
flash. L'ESP32 ira chercher `/frame.bin` à chaque réveil.

---

## Dépannage express

| Symptôme | Piste |
|---|---|
| `inspect_db.py` : "Fichier introuvable" | corrige `db_path` (`find ~/birdnet-go-app -name '*.db'`) |
| Colonnes mal devinées | remplis `col_*` dans `[birdnet]` |
| "Sonagramme indisponible" | pas de clip audio → active l'export des clips dans BirdNET-Go, ou vérifie `clips_dir` |
| Image en négatif sur l'écran | `[display] invert = true` (Pi) ou `INVERT true` (ESP32) |
| Cadre à l'envers | `[display] rotate = 180` |
| Le 3B+ sature (warnings buffer) | baisse l'`overlap` dans BirdNET-Go (`overlap: 0.0`) |
