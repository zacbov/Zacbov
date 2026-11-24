"""Crée un paquet SCORM 1.2 (à déposer dans Moodle : Ajouter une activité > Paquetage SCORM).
usage : python3 creer_scorm.py [--n 3] [--pop officine] [--theme infectiologie] [--seuil 10] [--titre "…"] [--app URL] [--sortie seance.zip]
Le paquet ne contient que le pont (quelques Ko) : l'outil reste en ligne et s'affiche dans un cadre."""
import argparse, os, re, zipfile
D = os.path.dirname(os.path.abspath(__file__))
a = argparse.ArgumentParser()
a.add_argument('--n', type=int, default=3); a.add_argument('--pop', default=''); a.add_argument('--theme', default='')
a.add_argument('--seuil', type=float, default=10); a.add_argument('--titre', default='Cas cliniques — pharmacie')
a.add_argument('--app', default='https://zacbov.github.io/Zacbov/projets/pharma-rxtalkcase/index.html'); a.add_argument('--sortie', default='')
o = a.parse_args()
cfg = open(os.path.join(D, 'config.js'), encoding='utf-8').read()
for k, v in (('titre', repr(o.titre)), ('app', repr(o.app)), ('n', str(o.n)), ('pop', repr(o.pop)), ('theme', repr(o.theme)), ('seuil', str(o.seuil))):
    cfg = re.sub(rf"^(\s*{k}:\s*)[^,]+,", lambda m: m.group(1) + v.replace("'", "'") + ',', cfg, count=1, flags=re.M)
man = open(os.path.join(D, 'imsmanifest.xml'), encoding='utf-8').read().replace('__TITRE__', o.titre.replace('&', '&amp;').replace('<', '&lt;')).replace('__MASTERY__', str(round(o.seuil * 5)))
sortie = o.sortie or f"seance_{o.pop or 'tous'}{'_' + o.theme if o.theme else ''}_{o.n}cas.zip"
with zipfile.ZipFile(sortie, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('imsmanifest.xml', man); z.writestr('config.js', cfg)
    for f in ('index.html', 'seance.js'): z.write(os.path.join(D, f), f)
print('paquet SCORM :', sortie)
