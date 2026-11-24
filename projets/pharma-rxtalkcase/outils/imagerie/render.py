"""Piles d'images de tumeurs pour le simulateur : DICOM (IDC) -> planche JPEG + contours JSON.
usage : python3 -I render.py selection.json dicom/ sortie/
"""
import sys, os, json, glob, math, re
import numpy as np, pydicom, highdicom as hd
from PIL import Image
from skimage import measure

SEL, DIC, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
TAILLE, COLS, MAXI = 384, 8, 40
TUM = re.compile(r'mass|nodule|neoplasm|lesion|tumor|necrosis|gtv_mass|pancreas - 1$|uterus - 1$|^ut-|lymph node', re.I)
OEDEME = re.compile(r'edema', re.I)
FEN = {'poumon': (-600, 1500), 'mediastin': (40, 400), 'abdomen': (50, 400), 'foie': (70, 300), 'os': (400, 1800)}


def lire_serie(uid):
    ds = [pydicom.dcmread(f) for f in glob.glob(os.path.join(DIC, uid, '*.dcm'))]
    ds = [d for d in ds if 'PixelData' in d]
    return ds


def normale(d):
    o = np.array(d.ImageOrientationPatient, float); return np.cross(o[:3], o[3:])


def masques_seg(seg_uid, imgs):
    """Masques placés par géométrie : chaque pixel du SEG est porté en coordonnées patient puis reprojeté sur la coupe
    la plus proche (orientation et références d'instance de certains SEG automatiques peu fiables)."""
    seg = pydicom.dcmread(glob.glob(os.path.join(DIC, seg_uid, '*.dcm'))[0])
    lab = {s.SegmentNumber: f"{getattr(s, 'SegmentLabel', '')} {s.SegmentedPropertyTypeCodeSequence[0].CodeMeaning}" for s in seg.SegmentSequence}
    px = seg.pixel_array
    if px.ndim == 2: px = px[None]
    sh = seg.SharedFunctionalGroupsSequence[0]
    ref = imgs[0]; oi = np.array(ref.ImageOrientationPatient, float); n = np.cross(oi[:3], oi[3:])
    pos = {}
    for d in imgs:
        if abs(abs(float(np.dot(normale(d), n))) - 1) < 1e-2: pos.setdefault(round(float(np.dot(n, np.array(d.ImagePositionPatient, float))), 1), []).append(d)
    cles = np.array(sorted(pos)); out = {}
    for i, fg in enumerate(seg.PerFrameFunctionalGroupsSequence):
        num = fg.SegmentIdentificationSequence[0].ReferencedSegmentNumber
        t = lab.get(num, ''); cls = 'tumeur' if TUM.search(t) else 'oedeme' if OEDEME.search(t) else None
        if not cls or not px[i].any(): continue
        g = lambda k: (fg[k] if k in fg else sh[k])[0]
        os_ = np.array(g('PlaneOrientationSequence').ImageOrientationPatient, float); pss = [float(x) for x in g('PixelMeasuresSequence').PixelSpacing]
        p = np.array(fg.PlanePositionSequence[0].ImagePositionPatient, float)
        rr, cc = np.nonzero(px[i])
        P = p + np.outer(cc * pss[1], os_[:3]) + np.outer(rr * pss[0], os_[3:])
        z = float(np.dot(n, P.mean(0))); k = cles[np.argmin(np.abs(cles - z))]
        if abs(k - z) > 2.5: continue
        for d in pos[k]:
            ip = np.array(d.ImagePositionPatient, float); ps = [float(x) for x in d.PixelSpacing]; o = np.array(d.ImageOrientationPatient, float)
            c2 = np.round((P - ip) @ o[:3] / ps[1]).astype(int); r2 = np.round((P - ip) @ o[3:] / ps[0]).astype(int)
            ok = (c2 >= 0) & (c2 < d.Columns) & (r2 >= 0) & (r2 < d.Rows)
            m = out.setdefault(d.SOPInstanceUID, {}).setdefault(cls, np.zeros((d.Rows, d.Columns), bool)); m[r2[ok], c2[ok]] = True
    from scipy.ndimage import binary_closing
    for u in out:
        for cls in out[u]: out[u][cls] = binary_closing(out[u][cls], iterations=1) | out[u][cls]
    return out, set(out)


def masques_rt(rt_uid, imgs, roi_re=None):
    rt = pydicom.dcmread(glob.glob(os.path.join(DIC, rt_uid, '*.dcm'))[0])
    noms = {r.ROINumber: r.ROIName for r in rt.StructureSetROISequence}
    par = {d.SOPInstanceUID: d for d in imgs}
    out, refs = {}, set()
    from skimage.draw import polygon
    par_roi = {}
    for rc in rt.ROIContourSequence:
        nom = noms.get(rc.ReferencedROINumber, '')
        if 'SEED' in nom.upper() or not (re.match(roi_re, nom) if roi_re else TUM.search(nom)): continue
        for c in getattr(rc, 'ContourSequence', []):
            if c.ContourGeometricType not in ('CLOSED_PLANAR',): continue
            p = np.array(c.ContourData, float).reshape(-1, 3)
            u = c.ContourImageSequence[0].ReferencedSOPInstanceUID if hasattr(c, 'ContourImageSequence') else None
            if u not in par:      # pas de référence : tranche la plus proche
                z = p[:, 2].mean(); u = min(par, key=lambda k: abs(float(par[k].ImagePositionPatient[2]) - z))
            d = par[u]; o = np.array(d.ImageOrientationPatient, float); ip = np.array(d.ImagePositionPatient, float); ps = [float(x) for x in d.PixelSpacing]
            v = p - ip; col = v @ o[:3] / ps[1]; row = v @ o[3:] / ps[0]
            rr, cc = polygon(row, col, (d.Rows, d.Columns))
            m = par_roi.setdefault((nom, u), np.zeros((d.Rows, d.Columns), bool)); m[rr, cc] ^= True   # trous (XOR) dans une même structure
            refs.add(u)
    for (nom, u), m in par_roi.items():     # union des structures
        o = out.setdefault(u, {}).setdefault('tumeur', np.zeros_like(m)); o |= m
    return out, refs


def fenetre(a, d, fen):
    a = a.astype(np.float32) * float(getattr(d, 'RescaleSlope', 1)) + float(getattr(d, 'RescaleIntercept', 0))
    if fen in FEN:
        c, w = FEN[fen]; lo, hi = c - w / 2, c + w / 2
    else:
        lo, hi = fen
    return np.clip((a - lo) / (hi - lo) * 255, 0, 255).astype(np.uint8)


def contours(m, sx, sy, ox, oy):
    L = []
    for c in measure.find_contours(np.pad(m.astype(np.uint8), 1), 0.5):
        c = measure.approximate_polygon(c - 1, 0.6)
        if len(c) < 3: continue
        L.append([[round(ox + (x + 0.5) * sx, 1), round(oy + (y + 0.5) * sy, 1)] for y, x in c])
    return L


def feret(m, ps):
    from scipy.ndimage import label
    lb, k = label(m)
    if k > 1: m = lb == (np.argmax(np.bincount(lb.ravel())[1:]) + 1)     # plus grande lésion de la coupe
    ys, xs = np.nonzero(m)
    if len(xs) < 2: return 0
    pts = np.c_[xs * ps[1], ys * ps[0]]
    if len(pts) > 1500: pts = pts[np.linspace(0, len(pts) - 1, 1500).astype(int)]
    from scipy.spatial import ConvexHull
    try: h = pts[ConvexHull(pts).vertices]
    except Exception: h = pts
    return float(np.max(np.linalg.norm(h[:, None] - h[None], axis=-1)))


cat = []
for k, p in enumerate(json.load(open(SEL))):
    sid = f"{p['cat']}-{sum(1 for x in cat if x['cat'] == p['cat']) + 1}"
    try:
        imgs = lire_serie(p['img'])
        M, refs = masques_seg(p['seg'], imgs) if p['kind'] == 'SEG' else masques_rt(p['seg'], imgs, p.get('roi_re'))
        if not M: print(sid, 'AUCUN MASQUE'); continue
        # phase : instances de même temps que celles qui portent le masque (IRM dynamique multiphase)
        ref0 = next(d for d in imgs if d.SOPInstanceUID in M)
        def cle_t(d): return (getattr(d, 'TemporalPositionIdentifier', None), getattr(d, 'AcquisitionNumber', None) if getattr(d, 'TemporalPositionIdentifier', None) is None else None)
        n = normale(ref0)
        V = [d for d in imgs if cle_t(d) == cle_t(ref0) and np.allclose(normale(d), n, atol=1e-3) and (d.Rows, d.Columns) == (ref0.Rows, ref0.Columns)]
        V.sort(key=lambda d: float(np.dot(n, np.array(d.ImagePositionPatient, float))))
        def bval(d):
            try: return float(d.get((0x0018, 0x9087)).value if (0x0018, 0x9087) in d else d.get((0x0043, 0x1039)).value[0] if (0x0043, 0x1039) in d else 0)
            except Exception: return 0
        dedup = {}
        for d in V:                                   # plusieurs images au même niveau (IRM de diffusion) : la plus forte valeur b
            k = round(float(np.dot(n, np.array(d.ImagePositionPatient, float))), 2)
            if k not in dedup or bval(d) > bval(dedup[k]) or (M.get(d.SOPInstanceUID) and not M.get(dedup[k].SOPInstanceUID)): dedup[k] = d
        V = list(dedup.values())
        aires = [M.get(d.SOPInstanceUID, {}).get('tumeur', np.zeros(1)).sum() for d in V]
        idx = [i for i, a in enumerate(aires) if a > 0]
        if not idx: print(sid, 'masque hors volume'); continue
        a, b = idx[0], idx[-1]; marge = 6 if b > a else 12
        a, b = max(0, a - marge), min(len(V) - 1, b + marge)
        sel = list(range(a, b + 1))
        imax = int(np.argmax(aires))
        if len(sel) > MAXI:
            sel = sorted(set(np.linspace(a, b, MAXI).round().astype(int).tolist()) | {imax})
        ps = [float(x) for x in ref0.PixelSpacing]; Hmm, Wmm = ref0.Rows * ps[0], ref0.Columns * ps[1]
        e = TAILLE / max(Hmm, Wmm); w, h = round(Wmm * e), round(Hmm * e); ox, oy = (TAILLE - w) / 2, (TAILLE - h) / 2
        sx, sy = w / ref0.Columns, h / ref0.Rows
        if p['fen'] not in FEN:     # IRM : percentiles du volume retenu
            arr = np.stack([V[i].pixel_array for i in sel]).astype(np.float32); fen = tuple(np.percentile(arr[arr > 0], [0.5, 99.5]))
        else: fen = p['fen']
        rows = math.ceil(len(sel) / COLS); planche = Image.new('L', (COLS * TAILLE, rows * TAILLE))
        tranches = []
        for j, i in enumerate(sel):
            d = V[i]; im = Image.fromarray(fenetre(d.pixel_array, d, fen)).resize((w, h), Image.LANCZOS)
            planche.paste(im, ((j % COLS) * TAILLE + round(ox), (j // COLS) * TAILLE + round(oy)))
            mm = M.get(d.SOPInstanceUID, {})
            t = {'z': round(float(np.dot(n, np.array(d.ImagePositionPatient, float))), 1)}
            for cls in ('tumeur', 'oedeme'):
                if cls in mm: t[cls] = contours(mm[cls], sx, sy, ox, oy)
            tranches.append(t)
        jmax = sel.index(imax)
        diam = feret(M[V[imax].SOPInstanceUID]['tumeur'], ps)
        planche.save(os.path.join(OUT, sid + '.jpg'), quality=82, optimize=True, progressive=True)
        cat.append({'id': sid, 'cat': p['cat'], 'titre': p['lib'], 'mod': p['m'], 'desc': p['desc'], 'sexe': p['sx'], 'age': p['age'],
                    'coll': p['coll'], 'lic': p['lic'], 'patient': p['pid'], 'taille': TAILLE, 'cols': COLS, 'n': len(sel), 'max': jmax,
                    'mm_px': round(1 / e, 3), 'diam_mm': round(diam), 'tranches': tranches,
                    'epaisseur': round(abs(float(getattr(ref0, 'SpacingBetweenSlices', 0) or getattr(ref0, 'SliceThickness', 0) or 0)), 1),
                    'img': p['img'], 'seg': p['seg']})
        print(f"{sid:16} {p['m']} {len(V):4} tranches, {len(sel):2} gardées, tumeur sur {len(idx)} ; max {jmax} ; {diam:.0f} mm ; {os.path.getsize(os.path.join(OUT, sid + '.jpg')) // 1024} Ko")
    except Exception as ex:
        import traceback; traceback.print_exc(); print(sid, 'ERREUR', ex)
json.dump(cat, open(os.path.join(OUT, 'series.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(cat), 'séries')
