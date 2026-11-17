#!/usr/bin/env python3
"""Mini serveur local de Camelot. Lancement : python serveur.py [port]
Au premier démarrage, télécharge three.js (une seule fois) dans jeu/vendor/, puis le jeu fonctionne hors ligne."""
import functools, http.server, os, re, sys, threading, urllib.request, webbrowser

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jeu")
SOURCE = "https://cdn.jsdelivr.net/npm/three@0.180.0/"
DEST = os.path.join(RACINE, "vendor", "three")
POINTS_ENTREE = [
    "build/three.module.js",
    "examples/jsm/postprocessing/EffectComposer.js",
    "examples/jsm/postprocessing/RenderPass.js",
    "examples/jsm/postprocessing/UnrealBloomPass.js",
    "examples/jsm/postprocessing/OutputPass.js",
    "examples/jsm/postprocessing/ShaderPass.js",
]

def telecharger(chemin, vus):
    if chemin in vus:
        return
    vus.add(chemin)
    cible = os.path.join(DEST, chemin)
    if not os.path.exists(cible):
        os.makedirs(os.path.dirname(cible), exist_ok=True)
        print("  téléchargement :", chemin)
        with urllib.request.urlopen(SOURCE + chemin, timeout=30) as reponse:
            contenu = reponse.read()
        with open(cible, "wb") as fichier:
            fichier.write(contenu)
    with open(cible, encoding="utf8") as fichier:
        texte = fichier.read()
    for m in re.finditer(r"(?:from|import)\s*['\"](\.[^'\"]+)['\"]", texte):
        suite = os.path.normpath(os.path.join(os.path.dirname(chemin), m.group(1)))
        telecharger(suite.replace(os.sep, "/"), vus)

class Gestionnaire(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    try:
        vus = set()
        for chemin in POINTS_ENTREE:
            telecharger(chemin, vus)
    except Exception as erreur:
        print("Impossible de récupérer three.js :", erreur, "\nVérifiez votre connexion puis relancez.")
        sys.exit(1)
    serveur = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Gestionnaire, directory=RACINE))
    adresse = f"http://localhost:{port}/"
    print("Camelot est prêt :", adresse, "(Ctrl+C pour arrêter)")
    threading.Timer(0.8, lambda: webbrowser.open(adresse)).start()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("\nÀ bientôt, sire.")
