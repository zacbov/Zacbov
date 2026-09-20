#!/usr/bin/env python3
"""
Liste tous les périphériques audio d'entrée disponibles avec leur index.
Utile pour remplir config.yaml (mic_index).

Usage: python3 list_devices.py
"""
import sounddevice as sd


def main():
    print("=" * 70)
    print("Périphériques audio d'entrée détectés")
    print("=" * 70)
    devices = sd.query_devices()
    found_input = False
    for idx, dev in enumerate(devices):
        if dev["max_input_channels"] > 0:
            found_input = True
            default_marker = ""
            print(f"  [{idx}] {dev['name']}")
            print(f"        canaux entrée: {dev['max_input_channels']}  "
                  f"| sample rate par défaut: {int(dev['default_samplerate'])} Hz")
    if not found_input:
        print("  Aucun périphérique d'entrée détecté. Vérifie le branchement USB.")
    print("=" * 70)
    print("Copie l'index [n] correspondant à chaque micro dans config.yaml (mic_index).")


if __name__ == "__main__":
    main()
