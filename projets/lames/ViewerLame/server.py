#!/usr/bin/env python3
"""
HistoViewer — Serveur de tuiles WSI
====================================
Sert des tuiles DZI depuis un dossier de lames histologiques.
Formats supportés : SVS, NDPI, MRXS, TIFF, SCN, VMS, VMU, BIF, DICOM

Prérequis :
    pip install flask openslide-python Pillow
    # macOS : brew install openslide
    # Linux : apt install openslide-tools

Usage :
    python server.py                          # dossier courant, port 8080
    python server.py /chemin/vers/lames       # dossier spécifique
    python server.py /chemin/vers/lames 8181  # dossier + port
"""

import os, sys, io, json, math, re
from pathlib import Path
from flask import Flask, Response, jsonify, abort, request, send_from_directory

# ── Tentative d'import OpenSlide ──────────────────────────────────────────────
try:
    import openslide
    from openslide import OpenSlide, OpenSlideError
    from openslide.deepzoom import DeepZoomGenerator
    HAS_OPENSLIDE = True
except ImportError:
    HAS_OPENSLIDE = False

# ── Tentative d'import Pillow ──────────────────────────────────────────────────
try:
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None  # désactiver la limite anti-décompression bomb WSI
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import tifffile
    try:
        import imagecodecs  # nécessaire pour JPEG/JPEG2000 dans tifffile
    except ImportError:
        imagecodecs = None
    import numpy as np
    HAS_TIFFFILE = True
except ImportError:
    HAS_TIFFFILE = False
    np = None

# ── Configuration ─────────────────────────────────────────────────────────────
SLIDE_DIR   = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
PORT        = int(sys.argv[2])  if len(sys.argv) > 2 else 8080
TILE_SIZE   = 256
OVERLAP     = 1
JPEG_QUALITY= 85

SUPPORTED_EXT = {
    ".svs", ".ndpi", ".mrxs", ".scn", ".vms", ".vmu", ".bif",
    ".tif", ".tiff", ".btf", ".tf8",
    ".dcm",                  # DICOM (si openslide >= 4.0)
    ".jpg", ".jpeg", ".png", # images classiques (fallback PIL)
}

app = Flask(__name__, static_folder=str(Path(__file__).parent))
_slide_cache: dict[str, "OpenSlide | None"] = {}

# ── CORS (pour accès depuis le viewer HTML en file://) ────────────────────────
@app.after_request
def add_cors(r):
    r.headers["Access-Control-Allow-Origin"]  = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type"
    r.headers["Cache-Control"] = "public, max-age=3600"
    return r

# ── Helpers ───────────────────────────────────────────────────────────────────
def _safe_name(name: str) -> str:
    """Encode le nom de fichier pour l'URL (sans changer l'extension)."""
    return re.sub(r"[^A-Za-z0-9._\-]", "_", name)

def _list_slides() -> list[dict]:
    slides = []
    for f in sorted(SLIDE_DIR.iterdir()):
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXT:
            stat = f.stat()
            slides.append({
                "name":  f.name,
                "size":  stat.st_size,
                "mtime": stat.st_mtime,
            })
    return slides

import threading
_cache_lock = threading.Lock()

def _open_slide(name: str):
    """Ouvre (et met en cache) un slide — cascade OpenSlide → tifffile → PIL."""
    with _cache_lock:
        if name in _slide_cache:
            return _slide_cache[name]

    path = SLIDE_DIR / name
    if not path.exists() or not path.is_file():
        print(f"[ERR] Fichier introuvable: {path}")
        return None

    ext = path.suffix.lower()
    if ext not in SUPPORTED_EXT:
        print(f"[ERR] Extension non supportée: {ext}")
        return None

    slide = None

    # ── Tentative 1 : OpenSlide ─────────────────────────────────────────────
    if HAS_OPENSLIDE and ext not in {".jpg", ".jpeg", ".png"}:
        if ext == ".mrxs" and not (path.parent / path.stem).is_dir():
            print(f"[WARN] MRXS: dossier '{path.stem}/' manquant")
        try:
            s = OpenSlide(str(path))
            _ = s.dimensions  # test immédiat
            slide = s
            print(f"[OK] OpenSlide: {name} {s.dimensions}")
        except Exception as e:
            print(f"[WARN] OpenSlide: {name}: {type(e).__name__}: {e}")

    # ── Tentative 2 : tifffile + imagecodecs ────────────────────────────────
    if slide is None and HAS_TIFFFILE and ext in {".svs",".ndpi",".tif",".tiff",".btf",".tf8"}:
        try:
            s = _TifffileSlide(str(path))
            slide = s
            print(f"[OK] tifffile: {name} {s.dimensions}")
        except Exception as e:
            print(f"[WARN] tifffile: {name}: {e}")

    # ── Tentative 3 : PIL ────────────────────────────────────────────────────
    if slide is None and HAS_PIL and ext in {".tif",".tiff",".jpg",".jpeg",".png"}:
        try:
            s = _PilSlide(str(path))
            slide = s
            print(f"[OK] PIL: {name} {s.dimensions}")
        except Exception as e:
            print(f"[ERR] PIL: {name}: {e}")

    if slide is None:
        print(f"[ERR] Impossible d'ouvrir '{name}' (tous les décodeurs ont échoué)")
        return None

    with _cache_lock:
        _slide_cache[name] = slide
    return slide

def _get_dz(name: str):
    """Retourne un DeepZoomGenerator pour un slide."""
    slide = _open_slide(name)
    if slide is None:
        return None
    if isinstance(slide, (_PilSlide,)):
        return slide.get_dz(TILE_SIZE, OVERLAP)
    if HAS_TIFFFILE and isinstance(slide, _TifffileSlide):
        return slide.get_dz(TILE_SIZE, OVERLAP)
    return DeepZoomGenerator(slide, tile_size=TILE_SIZE, overlap=OVERLAP, limit_bounds=True)


# ── Slide tifffile (fallback SVS/NDPI quand OpenSlide échoue) ─────────────────
class _TifffileSlide:
    """Lit les pyramides TIFF/SVS/NDPI via tifffile + imagecodecs."""
    def __init__(self, path: str):
        self._tf = tifffile.TiffFile(path)
        series = self._tf.series
        if not series:
            raise ValueError("Aucune série dans le fichier TIFF")
        main = series[0]
        self._levels = main.levels if hasattr(main, 'levels') else [main]
        self._pages  = [lvl.pages[0] for lvl in self._levels]
        p0 = self._pages[0]
        self.dimensions        = (p0.shape[1], p0.shape[0])
        self.level_count       = len(self._levels)
        self.level_dimensions  = [(p.shape[1], p.shape[0]) for p in self._pages]
        self.properties        = {}

    def get_thumbnail(self, size: tuple) -> "Image.Image":
        page = self._pages[-1]
        arr  = page.asarray()
        if arr.ndim == 2: arr = np.stack([arr]*3, axis=-1)
        if arr.shape[2] == 4: arr = arr[:,:,:3]
        img = Image.fromarray(arr.astype(np.uint8))
        img.thumbnail(size, Image.LANCZOS)
        return img

    def get_dz(self, tile_size: int, overlap: int) -> "_TifDZG":
        return _TifDZG(self, tile_size, overlap)

class _TifDZG:
    def __init__(self, slide: "_TifffileSlide", tile_size: int, overlap: int):
        self._slide   = slide
        self.tile_size = tile_size
        self.overlap   = overlap
        w, h = slide.dimensions
        self.level_count = max(1, math.ceil(math.log2(max(w, h))) + 1)
        self.level_tiles = []
        self.level_dimensions = []
        for lvl in range(self.level_count):
            scale = 2 ** (self.level_count - 1 - lvl)
            lw, lh = max(1, w // scale), max(1, h // scale)
            self.level_dimensions.append((lw, lh))
            self.level_tiles.append((math.ceil(lw/tile_size), math.ceil(lh/tile_size)))

    def _best_level(self, dz_level: int) -> int:
        lw = self.level_dimensions[dz_level][0]
        return min(range(len(self._slide.level_dimensions)),
                   key=lambda i: abs(self._slide.level_dimensions[i][0] - lw))

    def get_tile(self, level: int, address: tuple) -> "Image.Image":
        col, row = address
        lw, lh   = self.level_dimensions[level]
        ts, ov   = self.tile_size, self.overlap
        x = max(0, col*ts - (ov if col>0 else 0))
        y = max(0, row*ts - (ov if row>0 else 0))
        w = min(ts+2*ov, lw-x)
        h = min(ts+2*ov, lh-y)
        ti = self._best_level(level)
        tw, th = self._slide.level_dimensions[ti]
        scale  = tw / lw
        sx, sy = int(x*scale), int(y*scale)
        sw = min(int(w*scale), tw-sx)
        sh = min(int(h*scale), th-sy)
        arr = self._slide._pages[ti].asarray()[sy:sy+sh, sx:sx+sw]
        if arr.ndim == 2:  arr = np.stack([arr]*3, axis=-1)
        if arr.shape[2]==4: arr = arr[:,:,:3]
        tile = Image.fromarray(arr.astype(np.uint8))
        if tile.size != (w, h):
            tile = tile.resize((w, h), Image.LANCZOS)
        return tile

    def get_dzi(self, fmt: str = "jpeg") -> str:
        lw, lh = self.level_dimensions[-1]
        return ('<?xml version="1.0" encoding="UTF-8"?>'
                f'<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" '
                f'Format="{fmt}" Overlap="{self.overlap}" TileSize="{self.tile_size}">'
                f'<Size Height="{lh}" Width="{lw}"/></Image>')

# ── Slide PIL (fallback sans OpenSlide) ───────────────────────────────────────
class _PilSlide:
    """Wrapper PIL minimal pour images standard (JPEG, PNG, TIFF non-pyramidal)."""
    def __init__(self, path: str):
        self._img = Image.open(path).convert("RGB")
        self.dimensions = self._img.size      # (W, H)
        self.properties = {}
        self.level_count = 1
        self.level_dimensions = [self._img.size]

    def get_dz(self, tile_size: int, overlap: int) -> "DeepZoomGenerator":
        """Crée un DeepZoomGenerator PIL."""
        return _PilDZG(self._img, tile_size, overlap)

class _PilDZG:
    """DeepZoom minimal pour PIL (images non-pyramidales)."""
    def __init__(self, img: "Image.Image", tile_size: int, overlap: int):
        self._img    = img
        self.tile_size = tile_size
        self.overlap = overlap
        w, h = img.size
        # Nombre de niveaux
        self.level_count = max(1, math.ceil(math.log2(max(w, h))) + 1)
        self.level_tiles = []
        self.level_dimensions = []
        for lvl in range(self.level_count):
            scale = 2 ** (self.level_count - 1 - lvl)
            lw, lh = max(1, w // scale), max(1, h // scale)
            self.level_dimensions.append((lw, lh))
            tx = math.ceil(lw / tile_size)
            ty = math.ceil(lh / tile_size)
            self.level_tiles.append((tx, ty))

    @property
    def tile_count(self) -> int:
        return sum(tx * ty for tx, ty in self.level_tiles)

    def get_tile(self, level: int, address: tuple) -> "Image.Image":
        col, row = address
        lw, lh = self.level_dimensions[level]
        ts = self.tile_size
        ov = self.overlap
        x = max(0, col * ts - (ov if col > 0 else 0))
        y = max(0, row * ts - (ov if row > 0 else 0))
        w = min(ts + 2 * ov, lw - x)
        h = min(ts + 2 * ov, lh - y)
        scale = self._img.width / lw
        src_x, src_y = int(x * scale), int(y * scale)
        src_w, src_h = int(w * scale), int(h * scale)
        crop = self._img.crop((src_x, src_y, src_x + src_w, src_y + src_h))
        return crop.resize((w, h), Image.LANCZOS)

    def get_dzi(self, fmt: str = "jpeg") -> str:
        lw, lh = self.level_dimensions[-1]
        return (
            '<?xml version="1.0" encoding="UTF-8"?>'
            f'<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" '
            f'Format="{fmt}" Overlap="{self.overlap}" TileSize="{self.tile_size}">'
            f'<Size Height="{lh}" Width="{lw}"/>'
            f'</Image>'
        )

# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Sert le viewer HTML."""
    return send_from_directory(str(Path(__file__).parent), "viewer.html")

@app.route("/api/slides")
def list_slides():
    """Liste les lames disponibles dans le dossier."""
    return jsonify({
        "dir":    str(SLIDE_DIR.resolve()),
        "slides": _list_slides(),
        "has_openslide": HAS_OPENSLIDE,
    })

@app.route("/api/info/<path:name>")
def slide_info(name: str):
    """Métadonnées d'une lame."""
    slide = _open_slide(name)
    if slide is None:
        hints = {".svs":"Vérifiez openslide-bin ou installez imagecodecs (pip install imagecodecs)",
                 ".ndpi":"OSError -9 → pip install openslide-bin ou imagecodecs",
                 ".mrxs":"Dossier de données manquant (même nom que le fichier)"}
        ext = Path(name).suffix.lower()
        return jsonify({"error": f"Impossible d'ouvrir {name}",
                        "hint": hints.get(ext,"Format non supporté sur cette plateforme")}), 422

    dz = _get_dz(name)
    if isinstance(slide, _PilSlide):
        dims = list(slide.level_dimensions)
        props = {}
        level_count = slide.level_count
    else:
        dims = list(slide.level_dimensions)
        props = dict(slide.properties)
        level_count = slide.level_count

    return jsonify({
        "name":         name,
        "level_count":  level_count,
        "dimensions":   dims,
        "properties":   {k: v for k, v in props.items() if not k.startswith("openslide.")},
        "dz_levels":    dz.level_count if dz else 0,
        "tile_size":    TILE_SIZE,
    })

@app.route("/api/dzi/<path:name>.dzi")
def dzi_descriptor(name: str):
    """Fichier DZI (descripteur XML pour OpenSeadragon)."""
    dz = _get_dz(name)
    if dz is None:
        abort(404)
    if isinstance(dz, _PilDZG):
        xml = dz.get_dzi("jpeg")
    else:
        xml = dz.get_dzi("jpeg")
    return Response(xml, mimetype="application/xml")

@app.route("/api/tiles/<path:name>/<int:level>/<int:col>_<int:row>.<fmt>")
def get_tile(name: str, level: int, col: int, row: int, fmt: str):
    """Sert une tuile individuelle."""
    dz = _get_dz(name)
    if dz is None:
        abort(404)
    try:
        tile = dz.get_tile(level, (col, row))
    except Exception:
        abort(404)

    # Sauvegarder en JPEG
    buf = io.BytesIO()
    rgb = tile.convert("RGB")
    rgb.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    buf.seek(0)
    return Response(buf, mimetype="image/jpeg")


@app.route("/api/dzi/<path:tile_path>")
def get_dzi_catch_all(tile_path: str):
    """Route catch-all pour les tuiles DZI générées par OpenSeadragon.
    Pattern attendu : <slide_name>_files/<level>/<col>_<row>.<ext>
    Plus robuste que la version avec route Flask complexe (gère les noms avec '.' et accents).
    """
    # Ex: "anophèles.svs_files/13/0_0.jpeg"
    m = re.match(r'^(.+?)_files/([0-9]+)/([0-9]+)_([0-9]+)\.([a-zA-Z]+)$', tile_path)
    if not m:
        abort(400)
    name  = m.group(1)  # "anophèles.svs"
    level = int(m.group(2))
    col   = int(m.group(3))
    row   = int(m.group(4))
    # fmt = m.group(5)  # "jpeg" — ignoré, on sert toujours du JPEG

    dz = _get_dz(name)
    if dz is None:
        # Retourner une tuile grise plutôt qu'un 404 pour ne pas casser OSD
        img = Image.new("RGB", (TILE_SIZE, TILE_SIZE), (28, 28, 32))
        buf = io.BytesIO(); img.save(buf, "JPEG", quality=60); buf.seek(0)
        return Response(buf, mimetype="image/jpeg")
    try:
        tile = dz.get_tile(level, (col, row))
    except Exception as e:
        print(f"[TILE ERR] {name} z={level} x={col} y={row}: {e}")
        img = Image.new("RGB", (TILE_SIZE, TILE_SIZE), (28, 28, 32))
        buf = io.BytesIO(); img.save(buf, "JPEG", quality=60); buf.seek(0)
        return Response(buf, mimetype="image/jpeg")

    buf = io.BytesIO()
    tile.convert("RGB").save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    buf.seek(0)
    return Response(buf, mimetype="image/jpeg")

@app.route("/api/thumbnail/<path:name>")
def thumbnail(name: str):
    """Miniature pour la liste de lames."""
    slide = _open_slide(name)
    if slide is None:
        abort(404)
    size = int(request.args.get("size", 256))
    try:
        if isinstance(slide, _PilSlide):
            thumb = slide._img.copy()
            thumb.thumbnail((size, size))
        elif HAS_TIFFFILE and isinstance(slide, _TifffileSlide):
            thumb = slide.get_thumbnail((size, size))
        else:
            thumb = slide.get_thumbnail((size, size))
    except Exception as e:
        print(f"[WARN] thumbnail {name}: {e}")
        thumb = Image.new("RGB", (size, size), (40, 40, 44))
    buf = io.BytesIO()
    thumb.convert("RGB").save(buf, format="JPEG", quality=80)
    buf.seek(0)
    return Response(buf, mimetype="image/jpeg")

# ── Démarrage ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  HistoViewer — Serveur de lames histologiques")
    print("=" * 60)
    print(f"  Dossier : {SLIDE_DIR.resolve()}")
    print(f"  Port    : {PORT}")
    tiff_ok = "✓" if HAS_TIFFFILE else "✗"
    ic_ok = "✓" if HAS_TIFFFILE and 'imagecodecs' in sys.modules else "✗"
    print(f"  OpenSlide  : {'✓ disponible' if HAS_OPENSLIDE else '✗ non installé'}")
    print(f"  tifffile   : {tiff_ok}  imagecodecs: {ic_ok}")
    slides = _list_slides()
    print(f"  Lames trouvées : {len(slides)}")
    for s in slides:
        mb = s['size'] / 1_048_576
        print(f"    • {s['name']}  ({mb:.1f} Mo)")
    print()
    print(f"  → Ouvrir : http://localhost:{PORT}/")
    print("  (Ctrl+C pour arrêter)")
    print("=" * 60)
    app.run(host="0.0.0.0", port=PORT, debug=False, threaded=True)
