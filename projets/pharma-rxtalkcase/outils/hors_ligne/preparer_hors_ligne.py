"""Version hors ligne : génère index_hors_ligne.html à partir d'index.html (bibliothèques locales dans lib/, modèle d'IA
servi par llama-server sur le même PC). À relancer après chaque mise à jour d'index.html.
usage : python preparer_hors_ligne.py [dossier du site] [--modele gemma]
(La première fois, avec Internet ou depuis l'atelier : --lib <node_modules> --polices <dossier woff2> remplit lib/.)"""
import sys, os, re, shutil, argparse
a = argparse.ArgumentParser(); a.add_argument('site', nargs='?', default=os.path.join(os.path.dirname(__file__), '..', '..'))
a.add_argument('--modele', default='gemma'); a.add_argument('--lib'); a.add_argument('--polices'); o = a.parse_args()
S = os.path.abspath(o.site); L = os.path.join(S, 'lib')
if o.lib:                                                   # copie des bibliothèques (une fois)
    T = os.path.join(o.lib, 'three')
    os.makedirs(os.path.join(L, 'three', 'addons'), exist_ok=True)
    shutil.copy(os.path.join(T, 'build', 'three.module.js'), os.path.join(L, 'three'))
    for m in ['controls/OrbitControls.js', 'environments/RoomEnvironment.js', 'libs/meshopt_decoder.module.js', 'loaders/DRACOLoader.js', 'loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js']:
        d = os.path.join(L, 'three', 'addons', m); os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy(os.path.join(T, 'examples', 'jsm', m), d)
    shutil.copytree(os.path.join(T, 'examples', 'jsm', 'libs', 'draco'), os.path.join(L, 'three', 'addons', 'libs', 'draco'), dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('gltf', 'README.md'))
    shutil.copy(os.path.join(o.lib, 'xlsx', 'dist', 'xlsx.full.min.js'), L)
if o.polices:
    os.makedirs(os.path.join(L, 'polices'), exist_ok=True); css = []
    for w, st in ((400, 'normal'), (400, 'italic'), (700, 'normal'), (700, 'italic')):
        f = f'atkinson-hyperlegible-latin-{w}-{st}.woff2'; shutil.copy(os.path.join(o.polices, f), os.path.join(L, 'polices', f))
        css.append(f"@font-face{{font-family:'Atkinson Hyperlegible';font-style:{st};font-weight:{w};font-display:swap;src:url({f}) format('woff2')}}")
    open(os.path.join(L, 'polices', 'atkinson.css'), 'w').write('\n'.join(css) + '\n')

h = open(os.path.join(S, 'index.html'), encoding='utf-8').read()
R = [
    (r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>', ''),
    (r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">', '<link href="lib/polices/atkinson.css" rel="stylesheet">'),
    (r'https://cdn\.jsdelivr\.net/npm/three@0\.160\.0/build/three\.module\.js', './lib/three/three.module.js'),
    (r'https://cdn\.jsdelivr\.net/npm/three@0\.160\.0/examples/jsm/', './lib/three/addons/'),
    (r'https://cdnjs\.cloudflare\.com/ajax/libs/xlsx/0\.18\.5/xlsx\.full\.min\.js', 'lib/xlsx.full.min.js'),
]
for pat, rep in R:
    h, n = re.subn(pat, rep, h)
    if not n: print('attention : motif absent :', pat[:60])
cfg = ("<script>window.HORS_LIGNE = { api: '/v1/chat/completions', modele: '%s' };   // version hors ligne : modèle servi par llama-server\n"
       "window.AVATAR_DRACO = new URL('lib/three/addons/libs/draco/', location.href).href;</script>\n") % o.modele
h = h.replace('<head>', '<head>\n' + cfg, 1)                    # avant precharge.js et la carte des modules
h = h.replace('<title>', '<title>Hors ligne — ', 1)
open(os.path.join(S, 'index_hors_ligne.html'), 'w', encoding='utf-8').write(h)
reste = sorted(set(re.findall(r'https?://[^\s"\'<>)]+', h)))
print('index_hors_ligne.html écrit ; adresses externes restantes (sans effet hors ligne) :', *[' - ' + u[:90] for u in reste], sep='\n')
