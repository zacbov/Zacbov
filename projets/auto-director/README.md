# Auto-Director

Studio de montage autonome : switch automatique de caméra en fonction de qui parle,
basé sur des micros USB et piloté via OBS. Conçu pour tourner en continu sur une
station de travail dédiée, sans supervision.

## Principe

- Chaque micro USB est surveillé en continu (niveau audio RMS).
- Quand le niveau dépasse un seuil pendant une durée minimale → ce micro est "actif".
- La scène OBS associée à ce micro est activée.
- Anti-rebond intégré : temporisation avant de considérer qu'une personne a fini de
  parler (hangover), délai minimum entre deux switches (cooldown), et retour
  automatique au plan large après un silence prolongé.
- Aucune IA/ML : uniquement de l'analyse de niveau audio, pour un système simple,
  prévisible et facile à déboguer sur le terrain.

## Prérequis matériel

- Carte de capture vidéo Magewell (branchée en USB/PCIe, apparaît comme source
  vidéo standard dans OBS — aucune config spécifique côté Auto-Director)
- Une caméra par intervenant (branchée sur la Magewell ou via NDI/autre capture)
- Un micro USB par intervenant (peuvent être sur le même hub USB)
- OBS Studio 28+ avec le plugin **obs-websocket** (intégré nativement depuis OBS 28)

## Installation

```bash
python3 -m venv venv
source venv/bin/activate        # ou venv\Scripts\activate sous Windows
pip install -r requirements.txt
```

## Configuration OBS

1. Dans OBS : **Outils → obs-websocket → Paramètres serveur WebSocket**
2. Active le serveur, note le port (par défaut 4455) et le mot de passe (ou désactive
   l'authentification en réseau local fermé)
3. Crée une scène par intervenant (ex. "Cam Intervenant 1") avec la source vidéo
   correspondante branchée sur la Magewell
4. Crée une scène "Plan large" par défaut

## Configuration Auto-Director

1. Identifie l'index de chaque micro USB :
   ```bash
   python3 list_devices.py
   ```
2. Édite `config.yaml` :
   - `obs.host` / `obs.port` / `obs.password` → renseigne les infos obs-websocket
   - `mappings` → associe chaque `mic_index` à `scene_name` (le nom exact de la
     scène dans OBS)
   - `detection.rms_threshold` → à calibrer selon le bruit ambiant (voir plus bas)

## Lancement

```bash
python3 app.py
```

La WebUI est disponible sur **http://localhost:8765** — elle affiche les niveaux
audio en direct, l'état de connexion OBS, permet un override manuel (reprendre la
main sur le switch), et de modifier les mappings/seuils sans éditer le YAML à la main.

## Calibration du seuil (rms_threshold)

C'est le seul réglage vraiment sensible. Procédure recommandée :

1. Lance `app.py`, ouvre la WebUI, observe les barres de niveau en silence total
   (bruit de fond de la salle) : le seuil doit être nettement au-dessus de ce niveau
2. Fais parler chaque intervenant normalement : le niveau doit dépasser le seuil
   sans effort
3. Ajuste `rms_threshold` dans la WebUI (valeurs typiques : 0.01 à 0.05 selon le
   gain des micros) et sauvegarde, puis redémarre le service

## Robustesse — ce qui est géré automatiquement

- **Perte de connexion OBS** : reconnexion automatique en tâche de fond, aucune
  intervention nécessaire si OBS redémarre
- **Erreur sur un flux micro** (débranchement, conflit driver) : le thread concerné
  relance sa capture toutes les 2s sans affecter les autres micros
- **Double prise de parole simultanée** : le système garde le micro actif depuis
  le plus longtemps (évite le zapping nerveux)
- **Silence prolongé** : retour automatique au plan large après le délai configuré
- **Override manuel** : un opérateur peut à tout moment reprendre la main depuis la
  WebUI (bouton par caméra + "Mode auto" pour rendre la main)

## Détection de voix : RMS vs Silero (GPU)

Deux moteurs de détection interchangeables (`detection.vad_engine` dans `config.yaml`) :

- **`rms`** : niveau audio brut, zéro dépendance lourde, tourne sur CPU. Simple et
  robuste, mais peut confondre un bruit fort non-vocal (chaise, objet posé) avec
  de la parole si le seuil est mal réglé.
- **`silero`** *(recommandé, activé par défaut)* : réseau de neurones léger
  (Silero VAD) qui reconnaît vraiment de la voix humaine plutôt qu'un simple
  niveau sonore — bien plus fiable pour ignorer les bruits parasites. Utilise
  automatiquement le **GPU NVIDIA (CUDA)** de la station si disponible, ce qui
  rend le coût de calcul négligeable même avec plusieurs micros ; sinon tourne
  sur CPU (encore léger pour quelques flux mono).

Si `silero` est demandé mais que `torch` n'est pas installé (ou pas de GPU
compatible), le système bascule **automatiquement** sur `rms` au démarrage,
avec un message dans les logs — jamais de plantage pour cette raison.

Pour activer l'accélération GPU : installe la version CUDA de PyTorch adaptée à
la carte NVIDIA de la station (voir https://pytorch.org/get-started/locally/),
puis `vad_engine: "silero"` dans `config.yaml`. Le modèle est téléchargé une
seule fois automatiquement au premier lancement (connexion internet requise
ce jour-là uniquement).

## Calibration automatique des seuils

Plutôt que de régler le seuil à la main, le bouton **🎚️ Calibrer les seuils**
dans la WebUI mesure le bruit ambiant de chaque micro pendant 4 secondes
(demande le silence dans la salle), puis calcule un seuil individuel adapté au
gain de chaque micro — utile si les micros ou les distances aux intervenants
sont différents. Les seuils calculés sont enregistrés immédiatement dans
`config.yaml` (`mappings[].threshold`), sans redémarrage nécessaire.

Un seuil calculé automatiquement reste modifiable à la main ensuite si besoin
(directement dans `config.yaml`, champ `threshold` de chaque micro).

## Split-screen automatique (double prise de parole)

Si deux intervenants (ou plus) parlent en même temps pendant plus de
`detection.split_hold_ms` (1.5s par défaut), le système bascule automatiquement
sur la scène définie dans `obs.split_scene` (à créer dans OBS, ex. avec un
layout côte-à-côte). Désactivable en laissant `split_scene: ""` dans la config.

## Override manuel via clavier MIDI

N'importe quel clavier/pad MIDI générique en classe USB-MIDI standard fonctionne
(aucun driver spécifique requis, branchement plug-and-play).

1. Branche le clavier MIDI avant ou après le lancement de `app.py` (le hot-plug
   est géré automatiquement, détection toutes les 3s)
2. Dans la WebUI, section **🎹 Clavier MIDI** : le nom du périphérique détecté
   s'affiche si le branchement est OK
3. Choisis l'action à associer dans le menu déroulant (une scène caméra, ou
   "Retour mode auto")
4. Clique **Apprendre une touche**, puis presse la touche/pad voulue sur le
   clavier dans les 15 secondes → le mapping est enregistré immédiatement,
   aucun redémarrage nécessaire

Chaque pression sur une touche mappée déclenche instantanément l'override
correspondant, exactement comme les boutons de la WebUI — utile pour un
opérateur qui veut garder les mains sur un contrôleur physique pendant le direct.
Pour rendre la main à l'automatique, mappe une touche sur "Retour mode auto"
(ou utilise le bouton "🔄 Mode auto" dans la WebUI).

Pour désactiver complètement le support MIDI (ex. si aucun clavier n'est
disponible sur une machine), passe `midi.enabled: false` dans `config.yaml`.

## Lancement au démarrage (optionnel, Linux/systemd)

Crée `/etc/systemd/system/auto-director.service` :

```ini
[Unit]
Description=Auto-Director
After=network.target sound.target

[Service]
WorkingDirectory=/chemin/vers/auto-director
ExecStart=/chemin/vers/auto-director/venv/bin/python3 app.py
Restart=always
RestartSec=5
User=ton-utilisateur

[Install]
WantedBy=multi-user.target
```

Puis :
```bash
sudo systemctl enable --now auto-director
```

## Limites connues (v1 simple)

- Les changements de `mappings` (ajout/suppression de micro) nécessitent un
  redémarrage du service (pas de hot-reload des threads audio dans cette
  version) — en revanche, les seuils (calibration) et les overrides MIDI/WebUI
  sont bien appliqués à chaud.
- Le split-screen ne gère que 2 scènes fixes (normal / split) — pas de
  composition dynamique à N intervenants.
