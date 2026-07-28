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
