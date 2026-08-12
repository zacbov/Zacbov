#!/usr/bin/env python3
"""
HistoConvert — Convertisseur de lames histologiques
=====================================================
Transforme les lames WSI volumineuses (SVS, NDPI, MRXS, TIFF…)
en tuiles DZI (JPEG ou WebP) pour déploiement serveur léger.

Formats de sortie :
  • DZI/JPEG  — Standard OpenSeadragon, compatibilité maximale
  • DZI/WebP  — 30–50 % plus léger que JPEG, navigateurs modernes
  • WebP flat  — Image WebP unique (aperçu + archive)

Prérequis :
    pip install openslide-python Pillow tifffile imagecodecs

Usage :
    python convert.py scan                           # scanner un dossier
    python convert.py convert lame.svs               # DZI/WebP par défaut
    python convert.py convert lame.svs --fmt jpeg    # DZI/JPEG
    python convert.py convert lame.svs --quality 85 --tile 512
    python convert.py batch /dossier/lames           # convertir tout un dossier
    python convert.py server                         # lancer l'interface web
"""

import sys, os, io, math, json, re, time, shutil, argparse, threading
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, Callable

# ── Imports WSI ───────────────────────────────────────────────────────────────
try:
    import openslide
    from openslide import OpenSlide
    from openslide.deepzoom import DeepZoomGenerator
    HAS_OPENSLIDE = True
except ImportError:
    HAS_OPENSLIDE = False

try:
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    HAS_PIL = True
except ImportError:
    print("[ERREUR] Pillow manquant : pip install Pillow")
    sys.exit(1)

try:
    import tifffile
    try:
        import imagecodecs  # noqa
        HAS_IMAGECODECS = True
    except ImportError:
        HAS_IMAGECODECS = False
    HAS_TIFFFILE = True
except ImportError:
    HAS_TIFFFILE = False
    HAS_IMAGECODECS = False

SUPPORTED_EXT = {".svs", ".ndpi", ".mrxs", ".scn", ".vms", ".vmu", ".bif",
                 ".tif", ".tiff", ".btf", ".tf8", ".dcm", ".jpg", ".jpeg", ".png"}

# ══════════════════════════════════════════════════════════════════════════════
#  Ouverture de lame (cascade OpenSlide → tifffile → PIL)
# ══════════════════════════════════════════════════════════════════════════════

def open_slide(path: Path):
    ext = path.suffix.lower()
    if HAS_OPENSLIDE and ext not in {".jpg", ".jpeg", ".png"}:
        try:
            s = OpenSlide(str(path))
            _ = s.dimensions
            return s
        except Exception as e:
            print(f"  [WARN] OpenSlide: {e}")

    if HAS_TIFFFILE and ext in {".svs", ".ndpi", ".tif", ".tiff", ".btf"}:
        try:
            return _TifffileSlide(path)
        except Exception as e:
            print(f"  [WARN] tifffile: {e}")

    if HAS_PIL:
        try:
            img = Image.open(str(path)).convert("RGB")
            return _PilWrap(img)
        except Exception as e:
            print(f"  [WARN] PIL: {e}")

    raise RuntimeError(f"Impossible d'ouvrir {path.name}")


class _TifffileSlide:
    def __init__(self, path: Path):
        self._tf  = tifffile.TiffFile(str(path))
        s = self._tf.series[0]
        lvls = s.levels if hasattr(s, "levels") else [s]
        self._pages         = [lvl.pages[0] for lvl in lvls]
        p0                  = self._pages[0]
        self.dimensions     = (p0.shape[1], p0.shape[0])
        self.level_count    = len(self._pages)
        self.level_dimensions = [(p.shape[1], p.shape[0]) for p in self._pages]
        self.properties     = {}

    def read_region(self, location, level, size):
        import numpy as np
        x, y    = location
        w, h    = size
        tw, th  = self.level_dimensions[level]
        arr     = self._pages[level].asarray()
        if arr.ndim == 2:  arr = np.stack([arr]*3, axis=-1)
        if arr.shape[2]==4: arr = arr[:,:,:3]
        region  = arr[y:y+h, x:x+w]
        return Image.fromarray(region.astype("uint8"))

    def get_thumbnail(self, size):
        import numpy as np
        arr = self._pages[-1].asarray()
        if arr.ndim == 2:  arr = np.stack([arr]*3, axis=-1)
        if arr.shape[2]==4: arr = arr[:,:,:3]
        img = Image.fromarray(arr.astype("uint8"))
        img.thumbnail(size, Image.LANCZOS)
        return img

    def close(self): self._tf.close()


class _PilWrap:
    def __init__(self, img: Image.Image):
        self._img           = img
        self.dimensions     = img.size
        self.level_count    = 1
        self.level_dimensions = [img.size]
        self.properties     = {}

    def read_region(self, location, level, size):
        x, y = location; w, h = size
        return self._img.crop((x, y, x+w, y+h)).convert("RGBA")

    def get_thumbnail(self, size):
        t = self._img.copy(); t.thumbnail(size, Image.LANCZOS); return t

    def close(self): pass


# ══════════════════════════════════════════════════════════════════════════════
#  DeepZoom helpers
# ══════════════════════════════════════════════════════════════════════════════

def _make_dz(slide, tile_size=256, overlap=1):
    if isinstance(slide, (_TifffileSlide, _PilWrap)):
        return _ManualDZ(slide, tile_size, overlap)
    return DeepZoomGenerator(slide, tile_size=tile_size, overlap=overlap, limit_bounds=True)


class _ManualDZ:
    def __init__(self, slide, tile_size, overlap):
        self._slide    = slide
        self.tile_size = tile_size
        self.overlap   = overlap
        w, h = slide.dimensions
        self.level_count       = max(1, math.ceil(math.log2(max(w, h))) + 1)
        self.level_dimensions  = []
        self.level_tiles       = []
        for lvl in range(self.level_count):
            scale = 2 ** (self.level_count - 1 - lvl)
            lw, lh = max(1, w//scale), max(1, h//scale)
            self.level_dimensions.append((lw, lh))
            self.level_tiles.append((math.ceil(lw/tile_size), math.ceil(lh/tile_size)))

    def _best(self, dz_lvl):
        # plus petite source dont la largeur >= cible : downscale minimal (evite les
        # lectures gigantesques quand la source manque de niveaux de pyramide).
        lw = self.level_dimensions[dz_lvl][0]
        cands = [i for i in range(self._slide.level_count)
                 if self._slide.level_dimensions[i][0] >= lw]
        if cands:
            return min(cands, key=lambda i: self._slide.level_dimensions[i][0])
        return max(range(self._slide.level_count),
                   key=lambda i: self._slide.level_dimensions[i][0])

    def get_tile(self, level, address):
        col, row = address
        lw, lh   = self.level_dimensions[level]
        ts, ov   = self.tile_size, self.overlap
        x = max(0, col*ts - (ov if col>0 else 0))
        y = max(0, row*ts - (ov if row>0 else 0))
        w = min(ts+2*ov, lw-x)
        h = min(ts+2*ov, lh-y)
        src_lvl  = self._best(level)
        sw, sh   = self._slide.level_dimensions[src_lvl]
        scale    = sw / lw
        sx, sy   = int(x*scale), int(y*scale)
        region   = self._slide.read_region((sx, sy), src_lvl, (int(w*scale), int(h*scale)))
        tile     = region.convert("RGB")
        if tile.size != (w, h):
            tile = tile.resize((w, h), Image.LANCZOS)
        return tile

    def get_dzi(self, fmt="jpeg"):
        lw, lh = self.level_dimensions[-1]
        return (f'<?xml version="1.0" encoding="UTF-8"?>'
                f'<Image xmlns="http://schemas.microsoft.com/deepzoom/2008" '
                f'Format="{fmt}" Overlap="{self.overlap}" TileSize="{self.tile_size}">'
                f'<Size Height="{lh}" Width="{lw}"/></Image>')


# ══════════════════════════════════════════════════════════════════════════════
#  Conversion DZI
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class ConvertOptions:
    fmt:        str   = "webp"       # "webp" ou "jpeg"
    quality:    int   = 82           # qualité JPEG/WebP (0–100)
    tile_size:  int   = 256          # taille des tuiles px
    overlap:    int   = 1            # chevauchement px
    workers:    int   = 4            # threads parallèles
    skip_exist: bool  = True         # ignorer si déjà converti
    flat_webp:  bool  = False        # aussi générer une WebP plate (aperçu)

@dataclass
class ConvertResult:
    name:       str
    src_size:   int   = 0   # octets source
    dst_size:   int   = 0   # octets destination
    n_tiles:    int   = 0
    levels:     int   = 0
    duration:   float = 0.0
    error:      str   = ""
    stem:       str   = ""       # nom de fichier sans extension
    mpp:        float = None     # µm par pixel (métadonnées de la lame)
    objective:  int   = None     # grossissement de numérisation (ex. 20, 40)

    @property
    def ratio(self) -> float:
        return (1 - self.dst_size / self.src_size) * 100 if self.src_size else 0

    @property
    def src_mb(self) -> str: return f"{self.src_size/1e6:.1f}"
    @property
    def dst_mb(self) -> str: return f"{self.dst_size/1e6:.1f}"


def _dzsave_vips(src, out_dir, stem, opts, progress_cb=None):
    """Genere la pyramide DZI via libvips (dzsave) : lecture en flux, memoire bornee,
    bien plus rapide que le generateur Python. Lit SVS/NDPI/MRXS si la libvips
    installee inclut openslide, sinon TIFF/BigTIFF/PNG/JPEG.
    Retourne True si reussi, False sinon (-> repli sur le generateur de secours)."""
    try:
        import pyvips
    except Exception:
        return False
    try:
        if progress_cb: progress_cb(0.03, "libvips : lecture en flux...")
        img = pyvips.Image.new_from_file(str(src), access="sequential")
        if img.hasalpha():
            img = img.flatten(background=255)
        ext = opts.fmt.lower()
        suffix = ".webp[Q=%d]" % opts.quality if ext == "webp" else ".jpg[Q=%d]" % opts.quality
        img.dzsave(str(out_dir / stem), suffix=suffix,
                   tile_size=opts.tile_size, overlap=opts.overlap, layout="dz")
        vp = out_dir / (stem + "_files") / "vips-properties.xml"
        if vp.exists():
            try: vp.unlink()
            except Exception: pass
        if progress_cb: progress_cb(1.0, "Termine (libvips)")
        return True
    except Exception as e:
        print("  [VIPS] %s : non pris en charge par libvips (%s) -> generateur de secours" % (src.name, e))
        return False


def _read_slide_meta(src):
    """Retourne (mpp, objective) depuis les métadonnées de la lame, ou (None, None).
    mpp = micrometres par pixel a pleine resolution ; objective = grossissement de scan.
    N'echoue jamais : renvoie (None, None) si l'info est absente."""
    src = str(src)
    # 1) OpenSlide (le plus fiable : SVS/NDPI/MRXS)
    try:
        import openslide
        sl = openslide.OpenSlide(src)
        try:
            p = sl.properties
            mpp = p.get(getattr(openslide, "PROPERTY_NAME_MPP_X", "openslide.mpp-x"))
            obj = p.get(getattr(openslide, "PROPERTY_NAME_OBJECTIVE_POWER", "openslide.objective-power"))
            mpp = float(mpp) if mpp else None
            obj = int(round(float(obj))) if obj else None
            if mpp or obj:
                return (round(mpp, 4) if mpp else None, obj)
        finally:
            sl.close()
    except Exception:
        pass
    # 2) pyvips (loader openslide interne, sinon resolution TIFF)
    try:
        import pyvips
        img = pyvips.Image.new_from_file(src)
        fields = set(img.get_fields())
        def gf(k):
            try: return img.get(k) if k in fields else None
            except Exception: return None
        mpp = gf("openslide.mpp-x")
        obj = gf("openslide.objective-power")
        mpp = float(mpp) if mpp else None
        obj = int(round(float(obj))) if obj else None
        if not mpp:
            xres = gf("xres")               # pixels par mm chez libvips
            if xres and float(xres) > 0:
                cand = 1000.0 / float(xres)  # -> µm par pixel
                if 0.05 <= cand <= 5:        # garde-fou : plage WSI plausible
                    mpp = cand
        if mpp or obj:
            return (round(mpp, 4) if mpp else None, obj)
    except Exception:
        pass
    return (None, None)


def _slug(name):
    import unicodedata, re
    s = unicodedata.normalize("NFD", str(name)).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return s or "lame"


def write_viewer_manifest(out_dir, results):
    """Ecrit/complete un manifest.json pret pour le viewer dans le dossier PARENT
    de out_dir (a cote de index.html), avec chemins relatifs 'out_name/stem.dzi'.
    Conserve les champs pedagogiques deja saisis (nom, coloration, tissu,
    annotations) pour les lames existantes ; met a jour mpp/objective/chemin."""
    manifest_path = out_dir.parent / "manifest.json"
    data = {"titre": "PharmAtlas — Lames numériques", "slides": []}
    existing = {}
    if manifest_path.exists():
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
            for s in data.get("slides", []):
                existing[s.get("id")] = s
        except Exception:
            data = {"titre": "PharmAtlas — Lames numériques", "slides": []}
            existing = {}
    order = list(existing.keys())
    for res in results:
        if getattr(res, "error", ""):
            continue
        stem = getattr(res, "stem", "") or ""
        if not stem or not (out_dir / f"{stem}.dzi").exists():
            continue
        sid = _slug(stem)
        entry = existing.get(sid) or {
            "id": sid,
            "nom": stem.replace("_", " "),
            "coloration": "",
            "tissu": "",
        }
        entry["dzi"] = f"{out_dir.name}/{stem}.dzi"          # chemin relatif au viewer
        mpp = getattr(res, "mpp", None)
        obj = getattr(res, "objective", None)
        if mpp: entry["mpp"] = mpp
        if obj:
            entry["objective"] = obj
            entry.setdefault("scan", obj)
        existing[sid] = entry
        if sid not in order:
            order.append(sid)
    data["slides"] = [existing[k] for k in order if k in existing]
    manifest_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest_path


def convert_slide(
    src: Path,
    out_dir: Path,
    opts: ConvertOptions,
    progress_cb: Optional[Callable[[float, str], None]] = None,
) -> ConvertResult:
    """
    Convertit une lame WSI en DZI dans out_dir/<stem>_files/ + <stem>.dzi

    progress_cb(fraction, message) appelé à chaque niveau converti.
    """
    t0  = time.time()
    res = ConvertResult(name=src.name, src_size=src.stat().st_size)
    stem = src.stem
    res.stem = stem
    res.mpp, res.objective = _read_slide_meta(src)

    dzi_path  = out_dir / f"{stem}.dzi"
    tiles_dir = out_dir / f"{stem}_files"

    if opts.skip_exist and dzi_path.exists():
        if progress_cb: progress_cb(1.0, "Déjà converti — ignoré")
        res.dst_size = sum(f.stat().st_size for f in tiles_dir.rglob("*") if f.is_file())
        return res

    # ── Voie rapide libvips (recommandée) : streaming, mémoire bornée ─────────
    if _dzsave_vips(src, out_dir, stem, opts, progress_cb):
        res.dst_size = sum(f.stat().st_size for f in tiles_dir.rglob("*") if f.is_file())
        res.n_tiles  = sum(1 for f in tiles_dir.rglob("*")
                           if f.suffix.lower() in (".webp", ".jpg", ".jpeg"))
        res.levels   = sum(1 for d in tiles_dir.iterdir()
                           if d.is_dir() and d.name.isdigit()) if tiles_dir.exists() else 0
        res.duration = time.time() - t0
        return res

    try:
        slide = open_slide(src)
    except Exception as e:
        res.error = str(e)
        return res

    dz    = _make_dz(slide, tile_size=opts.tile_size, overlap=opts.overlap)
    if isinstance(slide, _TifffileSlide) and max(slide.dimensions) > 8000:
        print("  [ATTENTION] %s : converti sans libvips ni OpenSlide -> lecture memoire lourde. "
              "Installez libvips (avec openslide) pour une conversion fiable des grandes lames." % src.name)
    ext   = opts.fmt.lower()   # "webp" ou "jpeg"
    pil_fmt = "WEBP" if ext == "webp" else "JPEG"

    # Écrire le descripteur DZI
    tiles_dir.mkdir(parents=True, exist_ok=True)
    dzi_xml = dz.get_dzi(ext)
    dzi_path.write_text(dzi_xml, encoding="utf-8")

    # Compter les tuiles totales pour la barre de progression
    total_tiles = sum(
        math.ceil(lw / opts.tile_size) * math.ceil(lh / opts.tile_size)
        for lw, lh in dz.level_dimensions
    )
    done_tiles = 0
    save_kwargs = {"quality": opts.quality, "method": 4} if ext == "webp" else {"quality": opts.quality, "optimize": True}

    import concurrent.futures
    lock = threading.Lock()

    def _write_tile(args):
        nonlocal done_tiles
        level, col, row = args
        lvl_dir = tiles_dir / str(level)
        lvl_dir.mkdir(parents=True, exist_ok=True)
        tile_path = lvl_dir / f"{col}_{row}.{ext}"
        if tile_path.exists() and opts.skip_exist:
            return
        try:
            tile = dz.get_tile(level, (col, row))
            buf  = io.BytesIO()
            tile.convert("RGB").save(buf, format=pil_fmt, **save_kwargs)
            tile_path.write_bytes(buf.getvalue())
        except Exception as e:
            print(f"  [TILE ERR] L{level} {col}×{row}: {e}")
        with lock:
            done_tiles += 1

    all_tasks = [
        (level, col, row)
        for level in range(dz.level_count)
        for col in range(math.ceil(dz.level_dimensions[level][0] / opts.tile_size))
        for row in range(math.ceil(dz.level_dimensions[level][1] / opts.tile_size))
    ]

    with concurrent.futures.ThreadPoolExecutor(max_workers=opts.workers) as ex:
        futures = {ex.submit(_write_tile, t): t for t in all_tasks}
        last_pct = -1
        for fut in concurrent.futures.as_completed(futures):
            pct = done_tiles / max(total_tiles, 1)
            if progress_cb and int(pct*100) != last_pct:
                last_pct = int(pct*100)
                level = futures[fut][0]
                progress_cb(pct, f"Niveau {level} — {done_tiles}/{total_tiles} tuiles")

    # WebP plate (aperçu)
    if opts.flat_webp:
        try:
            thumb = slide.get_thumbnail((4096, 4096))
            flat_path = out_dir / f"{stem}_preview.webp"
            thumb.save(str(flat_path), "WEBP", quality=opts.quality)
        except Exception as e:
            print(f"  [WARN] WebP flat: {e}")

    slide.close()
    if progress_cb: progress_cb(1.0, "Terminé")

    res.dst_size = sum(f.stat().st_size for f in tiles_dir.rglob("*") if f.is_file())
    res.n_tiles  = done_tiles
    res.levels   = dz.level_count
    res.duration = time.time() - t0
    return res


def dir_size(path: Path) -> int:
    return sum(f.stat().st_size for f in path.rglob("*") if f.is_file()) if path.exists() else 0


# ══════════════════════════════════════════════════════════════════════════════
#  CLI
# ══════════════════════════════════════════════════════════════════════════════

def fmt_size(n: int) -> str:
    if n >= 1e9: return f"{n/1e9:.2f} Go"
    if n >= 1e6: return f"{n/1e6:.1f} Mo"
    if n >= 1e3: return f"{n/1e3:.0f} Ko"
    return f"{n} o"

def progress_cli(fraction: float, msg: str):
    bar_w = 30
    filled = int(bar_w * fraction)
    bar = "█" * filled + "░" * (bar_w - filled)
    pct = int(fraction * 100)
    print(f"\r  [{bar}] {pct:3d}%  {msg:<40}", end="", flush=True)
    if fraction >= 1.0: print()

def cmd_scan(args):
    path = Path(args.path)
    if not path.is_dir(): path = path.parent
    print(f"\n📁 Dossier : {path.resolve()}\n")
    slides = sorted(f for f in path.iterdir() if f.suffix.lower() in SUPPORTED_EXT)
    if not slides:
        print("  Aucune lame trouvée.")
        return
    total = 0
    print(f"  {'Nom':<40} {'Taille':>10}  {'État'}")
    print("  " + "─"*65)
    for f in slides:
        sz = f.stat().st_size
        total += sz
        dzi = (path / (f.stem + ".dzi")).exists()
        state = "✓ converti" if dzi else "· brut"
        print(f"  {f.name:<40} {fmt_size(sz):>10}  {state}")
    print("  " + "─"*65)
    print(f"  {'Total':<40} {fmt_size(total):>10}")
    print()

def cmd_convert(args):
    src = Path(args.slide)
    if not src.exists():
        print(f"[ERREUR] Fichier introuvable : {src}"); return
    out = Path(args.output) if args.output else src.parent / "converted"
    out.mkdir(parents=True, exist_ok=True)
    opts = ConvertOptions(
        fmt       = args.fmt,
        quality   = args.quality,
        tile_size = args.tile,
        workers   = args.workers,
        flat_webp = args.flat,
        skip_exist= not args.force,
    )
    print(f"\n🔬 Conversion : {src.name}")
    print(f"   Format  : DZI/{opts.fmt.upper()} Q={opts.quality}")
    print(f"   Tuiles  : {opts.tile_size}px  Sortie : {out}\n")
    t0  = time.time()
    res = convert_slide(src, out, opts, progress_cb=progress_cli)
    if res.error:
        print(f"\n[ERREUR] {res.error}"); return
    print(f"\n  Taille source    : {fmt_size(res.src_size)}")
    print(f"  Taille convertie : {fmt_size(res.dst_size)}")
    print(f"  Réduction        : {res.ratio:.1f}%")
    print(f"  Tuiles générées  : {res.n_tiles}  ({res.levels} niveaux)")
    print(f"  Durée            : {res.duration:.1f}s\n")
    # Écrire un manifest JSON
    manifest = {
        "source": src.name, "format": opts.fmt, "quality": opts.quality,
        "tile_size": opts.tile_size, "levels": res.levels, "n_tiles": res.n_tiles,
        "src_bytes": res.src_size, "dst_bytes": res.dst_size,
        "ratio_pct": round(res.ratio, 1), "duration_s": round(res.duration, 1),
        "converted_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    manifest_path = out / f"{src.stem}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"  Manifest : {manifest_path}")
    mp = write_viewer_manifest(out, [res])
    meta = []
    if res.mpp: meta.append(f"mpp={res.mpp}")
    if res.objective: meta.append(f"objectif={res.objective}x")
    print(f"  Manifest viewer : {mp}" + (f"  ({', '.join(meta)})" if meta else "  (mpp/objectif non trouvés dans la lame)"))

def cmd_batch(args):
    path  = Path(args.path)
    out   = Path(args.output) if args.output else path / "converted"
    out.mkdir(parents=True, exist_ok=True)
    slides = sorted(f for f in path.iterdir() if f.suffix.lower() in SUPPORTED_EXT)
    if not slides:
        print(f"Aucune lame dans {path}"); return
    opts = ConvertOptions(
        fmt=args.fmt, quality=args.quality,
        tile_size=args.tile, workers=args.workers,
        flat_webp=args.flat, skip_exist=not args.force,
    )
    results = []
    print(f"\n📦 Batch : {len(slides)} lame(s) → {out}\n")
    for i, src in enumerate(slides, 1):
        print(f"  [{i}/{len(slides)}] {src.name}")
        res = convert_slide(src, out, opts, progress_cb=progress_cli)
        results.append(res)
        if res.error:
            print(f"    ✗ {res.error}")
        else:
            print(f"    ✓ {fmt_size(res.src_size)} → {fmt_size(res.dst_size)} ({res.ratio:.0f}% réduction) — {res.duration:.0f}s")
        print()
    # Rapport final
    ok = [r for r in results if not r.error]
    print("─"*55)
    print(f"  Convertis : {len(ok)}/{len(results)}")
    if ok:
        src_total = sum(r.src_size for r in ok)
        dst_total = sum(r.dst_size for r in ok)
        ratio = (1 - dst_total/src_total)*100
        print(f"  Total source    : {fmt_size(src_total)}")
        print(f"  Total converti  : {fmt_size(dst_total)}")
        print(f"  Réduction totale: {ratio:.1f}%")
    # CSV récapitulatif
    csv_path = out / "rapport_conversion.csv"
    with csv_path.open("w", encoding="utf-8") as f:
        f.write("nom,src_mo,dst_mo,reduction_pct,tuiles,niveaux,duree_s,erreur\n")
        for r in results:
            f.write(f"{r.name},{r.src_size/1e6:.1f},{r.dst_size/1e6:.1f},"
                    f"{r.ratio:.1f},{r.n_tiles},{r.levels},{r.duration:.1f},{r.error}\n")
    print(f"\n  Rapport CSV : {csv_path}\n")
    mp = write_viewer_manifest(out, results)
    n_meta = sum(1 for r in results if not r.error and (r.mpp or r.objective))
    print(f"  Manifest viewer : {mp}  ({n_meta}/{len(ok)} lames avec métadonnées mpp/objectif)\n")

CONVERTER_HTML = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HistoConvert</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #0b0d11;
  --surface: #111418;
  --card:    #161a21;
  --border:  rgba(255,255,255,.07);
  --border2: rgba(255,255,255,.12);
  --accent:  #00e5b0;
  --accent2: #00a87f;
  --blue:    #3d8bff;
  --yellow:  #f5c518;
  --red:     #ff4d6a;
  --text:    #dde1ea;
  --muted:   rgba(221,225,234,.4);
  --mono:    'Space Mono', monospace;
  --sans:    'DM Sans', sans-serif;
}

body { font-family: var(--sans); background: var(--bg); color: var(--text); min-height: 100vh; }

/* ── HEADER ──────────────────────────────────────────────────────────────── */
header {
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 20;
}
.logo {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: var(--accent);
}
.logo-sep { width: 1px; height: 20px; background: var(--border2); }
.logo-sub { font-size: 11px; color: var(--muted); font-weight: 400; }
.hd-caps {
  display: flex;
  gap: 6px;
  margin-left: auto;
  font-family: var(--mono);
  font-size: 9px;
}
.cap { padding: 3px 8px; border-radius: 4px; border: 1px solid; font-weight: 700; letter-spacing: .5px; }
.cap.ok  { border-color: rgba(0,229,176,.35); color: rgba(0,229,176,.75); background: rgba(0,229,176,.06); }
.cap.err { border-color: rgba(255,77,106,.35); color: rgba(255,77,106,.7); background: rgba(255,77,106,.06); }

/* ── LAYOUT ──────────────────────────────────────────────────────────────── */
main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; display: grid; gap: 24px; }

/* ── CARDS ───────────────────────────────────────────────────────────────── */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
.card-head .icon { font-size: 14px; }
.card-body { padding: 20px; }

/* ── DIR PICKER ──────────────────────────────────────────────────────────── */
.dir-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.dir-input {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text);
  font-family: var(--mono);
  font-size: 11px;
  outline: none;
  transition: border-color .15s;
}
.dir-input:focus { border-color: var(--accent); }
.btn {
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 600;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-primary { background: var(--accent); color: #000; }
.btn-primary:hover { background: var(--accent2); }
.btn-ghost { background: transparent; color: var(--accent); border: 1px solid rgba(0,229,176,.35); }
.btn-ghost:hover { background: rgba(0,229,176,.08); }
.btn-sm { padding: 6px 12px; font-size: 11px; }
.btn:disabled { opacity: .4; cursor: default; }

/* ── SLIDE TABLE ─────────────────────────────────────────────────────────── */
.slide-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.slide-table th {
  text-align: left;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  font-weight: 400;
}
.slide-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.slide-table tr:last-child td { border-bottom: none; }
.slide-table tr:hover td { background: rgba(255,255,255,.02); }
.slide-name { font-weight: 500; }
.slide-size { font-family: var(--mono); font-size: 10px; color: var(--muted); }
.badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .5px;
}
.badge-ext  { background: rgba(61,139,255,.12); color: rgba(61,139,255,.85); border: 1px solid rgba(61,139,255,.25); }
.badge-done { background: rgba(0,229,176,.1);  color: rgba(0,229,176,.8);   border: 1px solid rgba(0,229,176,.2); }
.badge-todo { background: rgba(255,255,255,.04); color: var(--muted); border: 1px solid var(--border); }
.cb-cell { text-align: center; }
.row-check { accent-color: var(--accent); width: 15px; height: 15px; cursor: pointer; }

.select-all-row { padding: 8px 12px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); }

/* ── OPTIONS GRID ────────────────────────────────────────────────────────── */
.opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.opt-group { display: flex; flex-direction: column; gap: 6px; }
.opt-label { font-family: var(--mono); font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); }
.opt-control {
  background: var(--surface);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 9px 12px;
  color: var(--text);
  font-family: var(--sans);
  font-size: 12px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  transition: border-color .15s;
}
.opt-control:focus { border-color: var(--accent); }
select.opt-control { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
.opt-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; }
.opt-row label { font-size: 12px; font-weight: 500; cursor: pointer; flex: 1; }

/* ── RANGE SLIDER ────────────────────────────────────────────────────────── */
.range-wrap { display: flex; align-items: center; gap: 10px; }
input[type=range] {
  flex: 1;
  appearance: none;
  height: 4px;
  background: var(--border2);
  border-radius: 2px;
  outline: none;
}
input[type=range]::-webkit-slider-thumb {
  appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg);
}
.range-val { font-family: var(--mono); font-size: 11px; color: var(--accent); min-width: 32px; text-align: right; }
input[type=checkbox] { accent-color: var(--accent); }

/* ── ACTION BAR ──────────────────────────────────────────────────────────── */
.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(0,229,176,.04);
  border-top: 1px solid rgba(0,229,176,.1);
}
.action-bar .sel-count { font-size: 11px; color: var(--muted); flex: 1; }

/* ── JOBS ────────────────────────────────────────────────────────────────── */
.job-list { display: flex; flex-direction: column; gap: 8px; }
.job-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.job-head { display: flex; align-items: center; gap: 8px; }
.job-name { font-weight: 500; font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.job-status { font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: .5px; }
.job-status.running { color: var(--yellow); }
.job-status.done    { color: var(--accent); }
.job-status.error   { color: var(--red); }
.job-msg { font-size: 10px; color: var(--muted); font-family: var(--mono); }
.job-bar-track { height: 3px; background: var(--border2); border-radius: 2px; overflow: hidden; }
.job-bar-fill  { height: 100%; background: var(--accent); border-radius: 2px; transition: width .3s; }
.job-stats {
  display: flex;
  gap: 16px;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  flex-wrap: wrap;
}
.job-stats span strong { color: var(--accent); }
.job-stats.error-txt { color: var(--red); }

/* ── EMPTY ───────────────────────────────────────────────────────────────── */
.empty { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 12px; line-height: 2; }
.empty-icon { font-size: 36px; opacity: .2; margin-bottom: 8px; }

/* ── TOAST ───────────────────────────────────────────────────────────────── */
#toast {
  position: fixed; bottom: 24px; left: 50%;
  transform: translateX(-50%) translateY(60px);
  background: #1e2128; border: 1px solid var(--border2);
  border-radius: 8px; padding: 10px 18px;
  font-size: 12px; color: var(--text); z-index: 100;
  transition: transform .3s cubic-bezier(.34,1.56,.64,1);
  pointer-events: none; white-space: nowrap;
}
#toast.show { transform: translateX(-50%) translateY(0); }

@media (max-width: 640px) { .opt-grid { grid-template-columns: 1fr; } main { padding: 16px; } }
</style>
</head>
<body>

<header>
  <div class="logo">HistoConvert</div>
  <div class="logo-sep"></div>
  <div class="logo-sub">Convertisseur de lames WSI</div>
  <div class="hd-caps" id="caps"></div>
</header>

<main>

  <!-- Sélection dossier -->
  <div class="card">
    <div class="card-head"><span class="icon">📁</span> Dossier de lames</div>
    <div class="card-body">
      <div class="dir-row">
        <input class="dir-input" id="dir-input" type="text" placeholder="/home/pi/lames" value=".">
        <button class="btn btn-primary" onclick="scanDir()">Analyser →</button>
      </div>
    </div>
  </div>

  <!-- Tableau des lames -->
  <div class="card" id="slides-card" style="display:none">
    <div class="card-head"><span class="icon">🔬</span> Lames disponibles <span id="slides-count" style="margin-left:auto;font-weight:700;color:var(--text)"></span></div>
    <div class="select-all-row">
      <input type="checkbox" class="row-check" id="check-all" onchange="toggleAll(this.checked)">
      <label for="check-all" style="font-size:11px;color:var(--muted);cursor:pointer;">Tout sélectionner</label>
    </div>
    <table class="slide-table" id="slides-table">
      <thead><tr>
        <th style="width:28px"></th>
        <th>Nom</th>
        <th>Format</th>
        <th>Taille</th>
        <th>État</th>
      </tr></thead>
      <tbody id="slides-tbody"></tbody>
    </table>
  </div>

  <!-- Options de conversion -->
  <div class="card">
    <div class="card-head"><span class="icon">⚙️</span> Paramètres de conversion</div>
    <div class="card-body" style="display:flex;flex-direction:column;gap:16px;">
      <div class="opt-grid">
        <div class="opt-group">
          <div class="opt-label">Format de tuiles</div>
          <select class="opt-control" id="opt-fmt">
            <option value="webp">WebP — meilleure compression</option>
            <option value="jpeg">JPEG — compatibilité maximale</option>
          </select>
        </div>
        <div class="opt-group">
          <div class="opt-label">Taille des tuiles (px)</div>
          <select class="opt-control" id="opt-tile">
            <option value="256">256px — standard OSD</option>
            <option value="512">512px — moins de requêtes réseau</option>
            <option value="1024">1024px — gros fichiers</option>
          </select>
        </div>
        <div class="opt-group">
          <div class="opt-label">Qualité <span id="q-val" style="color:var(--accent)">82</span></div>
          <div class="range-wrap">
            <input type="range" id="opt-quality" min="50" max="95" value="82"
              oninput="document.getElementById('q-val').textContent=this.value">
            <span class="range-val" id="q-disp">82</span>
          </div>
        </div>
        <div class="opt-group">
          <div class="opt-label">Threads parallèles</div>
          <select class="opt-control" id="opt-workers">
            <option value="2">2 threads — Pi 3</option>
            <option value="4" selected>4 threads — Pi 4/5</option>
            <option value="8">8 threads — PC/NAS</option>
          </select>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:20px;">
        <div class="opt-row">
          <input type="checkbox" id="opt-flat" style="accent-color:var(--accent)">
          <label for="opt-flat" style="font-size:12px;font-weight:500;cursor:pointer;">Générer aussi un aperçu WebP plat (par lame)</label>
        </div>
        <div class="opt-row">
          <input type="checkbox" id="opt-force" style="accent-color:var(--accent)">
          <label for="opt-force" style="font-size:12px;font-weight:500;cursor:pointer;">Forcer la reconversion (ignorer les existants)</label>
        </div>
      </div>
    </div>
    <div class="action-bar">
      <div class="sel-count" id="sel-count">Aucune lame sélectionnée</div>
      <button class="btn btn-ghost btn-sm" onclick="estimateSize()">Estimer la taille →</button>
      <button class="btn btn-primary" id="btn-convert" onclick="startConvert()" disabled>Convertir →</button>
    </div>
  </div>

  <!-- Jobs en cours -->
  <div class="card" id="jobs-card">
    <div class="card-head"><span class="icon">⚡</span> Conversions</div>
    <div class="card-body">
      <div class="job-list" id="job-list">
        <div class="empty"><div class="empty-icon">⚡</div>Aucune conversion en cours.<br>Sélectionnez des lames et lancez la conversion.</div>
      </div>
    </div>
  </div>

</main>

<div id="toast"></div>

<script>
const API = 'http://localhost:8181';
let currentDir = '.';
let slides     = [];
let jobs       = {};

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    const data = await api('/api/scan?dir=.');
    renderCaps(data);
    if (data.slides && data.slides.length > 0) {
      currentDir = data.dir;
      slides = data.slides;
      document.getElementById('dir-input').value = data.dir;
      renderSlides();
    }
  } catch(e) { /* serveur non encore prêt */ }
}

function renderCaps(data) {
  document.getElementById('caps').innerHTML = [
    ['OpenSlide', data.has_openslide],
    ['tifffile',  data.has_tifffile],
    ['imagecodecs', data.has_imagecodecs],
  ].map(([n,v]) => `<div class="cap ${v?'ok':'err'}">${v?'✓':'✗'} ${n}</div>`).join('');
}

// ── SCAN DIR ─────────────────────────────────────────────────────────────────
async function scanDir() {
  const dir = document.getElementById('dir-input').value.trim();
  try {
    const data = await api(`/api/scan?dir=${encodeURIComponent(dir)}`);
    currentDir = data.dir;
    slides     = data.slides || [];
    renderCaps(data);
    document.getElementById('slides-card').style.display = slides.length ? '' : 'none';
    renderSlides();
    if (!slides.length) toast('Aucune lame trouvée dans ce dossier');
  } catch(e) {
    toast(`Erreur : ${e.message}`);
  }
}

function renderSlides() {
  const tb    = document.getElementById('slides-tbody');
  const count = document.getElementById('slides-count');
  count.textContent = `${slides.length} lame${slides.length>1?'s':''}`;
  tb.innerHTML = slides.map(s => `
    <tr>
      <td class="cb-cell"><input type="checkbox" class="row-check slide-cb" data-name="${s.name}" onchange="updateSel()"></td>
      <td class="slide-name">${s.name}</td>
      <td><span class="badge badge-ext">${s.ext}</span></td>
      <td class="slide-size">${fmtSize(s.size)}</td>
      <td>${s.converted
        ? '<span class="badge badge-done">✓ converti</span>'
        : '<span class="badge badge-todo">brut</span>'}</td>
    </tr>`).join('');
  updateSel();
}

function toggleAll(v) {
  document.querySelectorAll('.slide-cb').forEach(cb => cb.checked = v);
  updateSel();
}

function updateSel() {
  const sel = document.querySelectorAll('.slide-cb:checked').length;
  document.getElementById('sel-count').textContent = sel
    ? `${sel} lame${sel>1?'s':''} sélectionnée${sel>1?'s':''}`
    : 'Aucune lame sélectionnée';
  document.getElementById('btn-convert').disabled = sel === 0;
  document.getElementById('check-all').indeterminate = sel > 0 && sel < slides.length;
  document.getElementById('check-all').checked = sel === slides.length;
}

// ── ESTIMATION ────────────────────────────────────────────────────────────────
function estimateSize() {
  const sel  = getSelected();
  if (!sel.length) { toast('Sélectionnez des lames d\'abord'); return; }
  const fmt  = document.getElementById('opt-fmt').value;
  const q    = parseInt(document.getElementById('opt-quality').value);
  // Facteurs empiriques de compression
  const ratio = fmt === 'webp' ? (0.08 + (100-q)*0.001) : (0.12 + (100-q)*0.002);
  const total = sel.reduce((a, s) => a + s.size, 0);
  const est   = total * ratio;
  toast(`Estimation : ${fmtSize(total)} → ±${fmtSize(est)} (${Math.round(ratio*100)}% du brut)`);
}

function getSelected() {
  return Array.from(document.querySelectorAll('.slide-cb:checked'))
    .map(cb => slides.find(s => s.name === cb.dataset.name))
    .filter(Boolean);
}

// ── CONVERT ───────────────────────────────────────────────────────────────────
async function startConvert() {
  const sel = getSelected();
  if (!sel.length) return;
  const opts = {
    fmt:      document.getElementById('opt-fmt').value,
    quality:  parseInt(document.getElementById('opt-quality').value),
    tile_size:parseInt(document.getElementById('opt-tile').value),
    workers:  parseInt(document.getElementById('opt-workers').value),
    flat_webp:document.getElementById('opt-flat').checked,
    force:    document.getElementById('opt-force').checked,
    output:   currentDir + '/converted',
  };

  // Lancer les jobs en parallèle (max 1 à la fois pour le Pi)
  for (const slide of sel) {
    const payload = { src: currentDir + '/' + slide.name, ...opts };
    try {
      const { job_id } = await api('/api/convert', payload);
      addJob(job_id, slide.name);
      pollJob(job_id);
    } catch(e) {
      toast(`Erreur lancement ${slide.name}: ${e.message}`);
    }
  }
}

function addJob(id, name) {
  const list = document.getElementById('job-list');
  if (list.querySelector('.empty')) list.innerHTML = '';
  jobs[id] = { name, status: 'running', progress: 0 };
  const el = document.createElement('div');
  el.className = 'job-card';
  el.id = `job-${id}`;
  el.innerHTML = `
    <div class="job-head">
      <div class="job-name">${name}</div>
      <div class="job-status running" id="js-${id}">EN COURS</div>
    </div>
    <div class="job-bar-track"><div class="job-bar-fill" id="jb-${id}" style="width:0%"></div></div>
    <div class="job-msg" id="jm-${id}">Démarrage…</div>
    <div class="job-stats" id="jst-${id}"></div>`;
  list.prepend(el);
}

async function pollJob(id) {
  const tick = async () => {
    try {
      const j = await api(`/api/job/${id}`);
      document.getElementById(`jb-${id}`).style.width = `${Math.round(j.progress*100)}%`;
      document.getElementById(`jm-${id}`).textContent = j.message || '';

      if (j.status === 'done') {
        const s = document.getElementById(`js-${id}`);
        s.textContent = 'TERMINÉ'; s.className = 'job-status done';
        const r = j.result;
        document.getElementById(`jst-${id}`).innerHTML =
          `<span><strong>${fmtSize(r.src_size)}</strong> source</span>` +
          `<span>→ <strong>${fmtSize(r.dst_size)}</strong> converti</span>` +
          `<span><strong>${r.ratio}%</strong> réduction</span>` +
          `<span><strong>${r.n_tiles}</strong> tuiles</span>` +
          `<span><strong>${r.levels}</strong> niveaux</span>` +
          `<span><strong>${r.duration}s</strong></span>`;
        scanDir(); // rafraîchir l'état des lames
        return;
      }
      if (j.status === 'error') {
        const s = document.getElementById(`js-${id}`);
        s.textContent = 'ERREUR'; s.className = 'job-status error';
        document.getElementById(`jst-${id}`).className = 'job-stats error-txt';
        document.getElementById(`jst-${id}`).textContent = j.result?.error || 'Erreur inconnue';
        return;
      }
      setTimeout(tick, 800);
    } catch(e) { setTimeout(tick, 2000); }
  };
  tick();
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
async function api(url, body) {
  const opts = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : {};
  const r = await fetch(`${API}${url}`, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function fmtSize(b) {
  if (b >= 1e9) return (b/1e9).toFixed(2) + ' Go';
  if (b >= 1e6) return (b/1e6).toFixed(0)  + ' Mo';
  if (b >= 1e3) return (b/1e3).toFixed(0)  + ' Ko';
  return b + ' o';
}

let _toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}

// Sync quality display
document.getElementById('opt-quality').addEventListener('input', function() {
  document.getElementById('q-val').textContent = this.value;
  document.getElementById('q-disp').textContent = this.value;
});

init();
</script>
</body>
</html>
"""


def cmd_server(args):
    """Lance l'interface web de conversion."""
    port = args.port if hasattr(args, 'port') else 8181
    try:
        from flask import Flask, request, jsonify, Response, send_from_directory
    except ImportError:
        print("[ERREUR] Flask manquant : pip install flask"); sys.exit(1)

    web_dir = Path(__file__).parent
    app = Flask(__name__)
    jobs: dict[str, dict] = {}  # job_id → {status, progress, result}
    lock = threading.Lock()

    @app.after_request
    def cors(r):
        r.headers["Access-Control-Allow-Origin"] = "*"
        return r

    @app.route("/")
    def index():
        return Response(CONVERTER_HTML, mimetype="text/html")

    @app.route("/api/scan")
    def scan():
        d = Path(request.args.get("dir", "."))
        if not d.is_dir(): return jsonify({"error": "Dossier introuvable"}), 400
        slides = []
        for f in sorted(d.iterdir()):
            if f.is_file() and f.suffix.lower() in SUPPORTED_EXT:
                dzi = (d / (f.stem + ".dzi")).exists()
                dst = (d / "converted" / (f.stem + "_files"))
                slides.append({
                    "name": f.name, "size": f.stat().st_size,
                    "converted": dzi or dst.exists(),
                    "ext": f.suffix.lstrip(".").upper(),
                })
        return jsonify({"dir": str(d.resolve()), "slides": slides,
                        "has_openslide": HAS_OPENSLIDE,
                        "has_tifffile": HAS_TIFFFILE,
                        "has_imagecodecs": HAS_IMAGECODECS})

    @app.route("/api/convert", methods=["POST"])
    def start_convert():
        data  = request.json or {}
        src   = Path(data.get("src", ""))
        outd  = Path(data.get("output", src.parent / "converted"))
        opts  = ConvertOptions(
            fmt       = data.get("fmt", "webp"),
            quality   = int(data.get("quality", 82)),
            tile_size = int(data.get("tile_size", 256)),
            workers   = int(data.get("workers", 4)),
            flat_webp = bool(data.get("flat_webp", False)),
            skip_exist= not bool(data.get("force", False)),
        )
        if not src.exists():
            return jsonify({"error": "Fichier introuvable"}), 400
        job_id = f"job_{int(time.time()*1000)}"
        with lock:
            jobs[job_id] = {"status": "running", "progress": 0.0, "message": "Démarrage…", "result": None}

        def run():
            def cb(frac, msg):
                with lock:
                    jobs[job_id]["progress"] = frac
                    jobs[job_id]["message"]  = msg
            res = convert_slide(src, outd, opts, progress_cb=cb)
            with lock:
                jobs[job_id]["status"]   = "done" if not res.error else "error"
                jobs[job_id]["result"]   = {
                    "src_size": res.src_size, "dst_size": res.dst_size,
                    "ratio": round(res.ratio, 1), "n_tiles": res.n_tiles,
                    "levels": res.levels, "duration": round(res.duration, 1),
                    "error": res.error,
                }

        threading.Thread(target=run, daemon=True).start()
        return jsonify({"job_id": job_id})

    @app.route("/api/job/<job_id>")
    def job_status(job_id):
        with lock:
            job = jobs.get(job_id)
        if not job: return jsonify({"error": "Job inconnu"}), 404
        return jsonify(job)

    print(f"\n  HistoConvert Web  →  http://localhost:{port}/")
    print(f"  Ctrl+C pour arrêter\n")
    import webbrowser
    threading.Timer(1.2, lambda: webbrowser.open(f"http://localhost:{port}/")).start()
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)


# ══════════════════════════════════════════════════════════════════════════════
#  Point d'entrée
# ══════════════════════════════════════════════════════════════════════════════

def main():
    p = argparse.ArgumentParser(
        prog="convert.py",
        description="HistoConvert — Convertisseur de lames WSI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    sub = p.add_subparsers(dest="cmd", required=False)

    # scan
    ps = sub.add_parser("scan", help="Lister les lames d'un dossier")
    ps.add_argument("path", nargs="?", default=".", help="Dossier à scanner")

    # convert
    def _add_opts(pp):
        pp.add_argument("--fmt",     default="webp", choices=["webp","jpeg"], help="Format tuiles (défaut: webp)")
        pp.add_argument("--quality", type=int, default=82,  help="Qualité 0–100 (défaut: 82)")
        pp.add_argument("--tile",    type=int, default=256, help="Taille tuile px (défaut: 256)")
        pp.add_argument("--workers", type=int, default=4,   help="Threads parallèles (défaut: 4)")
        pp.add_argument("--flat",    action="store_true",   help="Générer aussi une WebP plate (aperçu)")
        pp.add_argument("--force",   action="store_true",   help="Reconvertir même si déjà existant")
        pp.add_argument("--output",  help="Dossier de sortie")

    pc = sub.add_parser("convert", help="Convertir une lame")
    pc.add_argument("slide", help="Fichier lame (SVS, NDPI, MRXS…)")
    _add_opts(pc)

    pb = sub.add_parser("batch", help="Convertir tout un dossier")
    pb.add_argument("path", help="Dossier contenant les lames")
    _add_opts(pb)

    pw = sub.add_parser("server", help="Interface web de conversion")
    pw.add_argument("--port", type=int, default=8181)

    args = p.parse_args()
    # Aucune sous-commande → lancer directement l'interface web (usage PC simple)
    if not getattr(args, "cmd", None):
        args.cmd = "server"
        if not hasattr(args, "port"):
            args.port = 8181
    {"scan": cmd_scan, "convert": cmd_convert, "batch": cmd_batch, "server": cmd_server}[args.cmd](args)


if __name__ == "__main__":
    main()
