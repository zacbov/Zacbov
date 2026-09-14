import ctypes
import io
import json
import os
import re
import tempfile
import threading
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import numpy as np
from PIL import Image

# Formats vidéo pris en charge en entrée (en plus de .webp), décodés via
# imageio + le binaire ffmpeg fourni par imageio-ffmpeg (aucune install
# système requise). WebM (VP8/VP9, avec ou sans alpha) est le cas principal.
VIDEO_EXTS = (".webm", ".mp4", ".mkv", ".mov")


# ============================================================
# CONFIGURATION
# ============================================================

ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / "runtime"

HOST = "127.0.0.1"
PORT = 8765

MAX_BYTES = 1024 * 1024 * 1024  # 1 GiB


jobs = {}
jobs_lock = threading.Lock()


# ============================================================
# DLSS 5 STRUCTURE
# ============================================================

class DLSS5Settings(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint32),
        ("version", ctypes.c_uint32),
        ("preset", ctypes.c_uint32),
        ("style", ctypes.c_uint32),

        ("intensity", ctypes.c_float),
        ("globalTone", ctypes.c_float),
        ("localTone", ctypes.c_float),
        ("structure", ctypes.c_float),
        ("skin", ctypes.c_float),

        ("autoMask", ctypes.c_uint32),
        ("uiCorrection", ctypes.c_uint32),

        ("passes", ctypes.c_uint32),

        ("blend", ctypes.c_float),
        ("colorStrength", ctypes.c_float),
        ("motionScale", ctypes.c_float),
        ("cutThreshold", ctypes.c_float),

        ("linearInput", ctypes.c_uint32),
        ("motionPreview", ctypes.c_uint32),

        ("denoiseEnabled", ctypes.c_uint32),
        ("denoiseStrength", ctypes.c_float),
        ("denoiseAmount", ctypes.c_float),
        ("denoiseQuality", ctypes.c_uint32),
    ]


# ============================================================
# DLL FUNCTION TYPES
# ============================================================

ABORTFUNC = ctypes.CFUNCTYPE(
    ctypes.c_int,
    ctypes.c_void_p
)


PROCESSFUNC = ctypes.CFUNCTYPE(
    ctypes.c_int,

    ctypes.POINTER(ctypes.c_float),
    ctypes.POINTER(ctypes.c_float),
    ctypes.POINTER(ctypes.c_float),

    ctypes.c_uint32,
    ctypes.c_uint32,

    ctypes.POINTER(DLSS5Settings),

    ABORTFUNC,
    ctypes.c_void_p,

    ctypes.POINTER(ctypes.c_char),
    ctypes.c_uint32,
)


_engine = None
_engine_lock = threading.Lock()


# ============================================================
# CHARGEMENT DU MOTEUR DLSS 5
# ============================================================

def load_engine():

    global _engine

    with _engine_lock:

        if _engine is not None:
            return _engine

        if os.name != "nt":
            raise RuntimeError(
                "Ce moteur DLSS 5 est Windows/D3D12 uniquement."
            )

        if not RUNTIME.exists():
            raise RuntimeError(
                f"Dossier runtime introuvable : {RUNTIME}"
            )

        try:
            os.add_dll_directory(str(RUNTIME))
        except Exception:
            pass

        # Charger les DLL présentes dans runtime
        for dll_path in RUNTIME.glob("*.dll"):

            try:
                ctypes.WinDLL(str(dll_path))
            except Exception:
                pass

        dll = RUNTIME / "nvngx.dll_dlss5ae.dll"

        if not dll.exists():
            raise RuntimeError(
                "runtime/nvngx.dll_dlss5ae.dll est introuvable."
            )

        try:
            lib = ctypes.WinDLL(str(dll))
        except Exception as e:
            raise RuntimeError(
                f"Impossible de charger le moteur DLSS 5 : {e}"
            )

        try:
            process = PROCESSFUNC(
                ("DLSS5Process", lib)
            )
        except Exception as e:
            raise RuntimeError(
                f"Fonction DLSS5Process introuvable : {e}"
            )

        try:
            shutdown = getattr(
                lib,
                "DLSS5Shutdown"
            )
            shutdown.restype = None
        except Exception as e:
            raise RuntimeError(
                f"Fonction DLSS5Shutdown introuvable : {e}"
            )

        _engine = (
            lib,
            process,
            shutdown
        )

        return _engine


# ============================================================
# PARAMETRES DLSS 5
# ============================================================

def make_settings(opts):

    s = DLSS5Settings()

    s.size = ctypes.sizeof(
        DLSS5Settings
    )

    s.version = 2

    s.preset = int(
        opts.get("preset", 0)
    )

    s.style = int(
        opts.get("style", 0)
    )

    s.intensity = float(
        opts.get("intensity", 1.0)
    )

    s.globalTone = float(
        opts.get("globalTone", 1.0)
    )

    s.localTone = float(
        opts.get("localTone", 1.0)
    )

    s.structure = float(
        opts.get("structure", 1.0)
    )

    s.skin = float(
        opts.get("skin", -1.0)
    )

    s.autoMask = (
        1 if opts.get("autoMask", True)
        else 0
    )

    s.uiCorrection = (
        1 if opts.get("uiCorrection", False)
        else 0
    )

    s.passes = int(
        opts.get("passes", 1)
    )

    s.blend = float(
        opts.get("blend", 1.0)
    )

    s.colorStrength = float(
        opts.get("colorStrength", 1.0)
    )

    s.motionScale = float(
        opts.get("motionScale", 1.0)
    )

    s.cutThreshold = float(
        opts.get("cutThreshold", 0.35)
    )

    s.linearInput = (
        1 if opts.get("linearInput", False)
        else 0
    )

    s.motionPreview = (
        1 if opts.get("motionPreview", False)
        else 0
    )

    s.denoiseEnabled = (
        1 if opts.get("denoiseEnabled", True)
        else 0
    )

    s.denoiseStrength = float(
        opts.get("denoiseStrength", 1.0)
    )

    s.denoiseAmount = float(
        opts.get("denoiseAmount", 1.0)
    )

    s.denoiseQuality = int(
        opts.get("denoiseQuality", 1)
    )

    return s


# ============================================================
# JOBS
# ============================================================

def set_job(job_id, **updates):

    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(updates)


# ============================================================
# ANNULATION
# ============================================================

def abort_cb(context):

    try:

        jid = ctypes.cast(
            context,
            ctypes.c_char_p
        ).value.decode("ascii")

        with jobs_lock:

            return (
                1
                if jobs.get(
                    jid,
                    {}
                ).get("cancel")
                else 0
            )

    except Exception:

        return 0


_abort = ABORTFUNC(abort_cb)


# ============================================================
# DÉCODAGE ENTRÉE (WebP animé ou vidéo WebM/MP4/MKV/MOV)
# ============================================================

def decode_frames(source, ext, limit=None):
    """source: chemin (str/Path) ou bytes. ext: '.webp', '.webm', etc.

    Retourne (frames, loop, fps) où frames est une liste de tuples
    (tableau uint8 HxWx4 RGBA, durée en ms). `limit` restreint le nombre
    d'images décodées (utilisé par l'aperçu en direct).
    """

    ext = ext.lower()

    if ext == ".webp":

        fp = source if isinstance(source, (str, Path)) else io.BytesIO(source)

        im = Image.open(fp)

        n = getattr(im, "n_frames", 1)

        if limit:
            n = min(n, limit)

        loop = im.info.get("loop", 0)

        frames = []

        for idx in range(n):

            im.seek(idx)

            frame = im.convert("RGBA")

            duration = im.info.get("duration", 100) or 100

            frames.append(
                (np.asarray(frame, dtype=np.uint8), int(duration))
            )

        total = sum(d for _, d in frames) or 100

        fps = (1000.0 * len(frames) / total) if frames else 25.0

        return frames, loop, fps

    if ext not in VIDEO_EXTS:

        raise ValueError(
            f"Format d'entrée non pris en charge : {ext}"
        )

    import imageio.v3 as iio

    tmp_path = None

    path = source

    if isinstance(source, (bytes, bytearray)):

        tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)

        tmp.write(source)

        tmp.close()

        tmp_path = tmp.name

        path = tmp_path

    try:

        meta = iio.immeta(path, plugin="pyav")

        fps = float(meta.get("fps") or 25.0) or 25.0

        duration_ms = int(round(1000.0 / fps))

        frames = []

        for idx, frame in enumerate(iio.imiter(path, plugin="pyav")):

            if limit and idx >= limit:
                break

            arr = np.asarray(frame)

            if arr.shape[-1] == 3:

                alpha = np.full(
                    arr.shape[:2] + (1,), 255, dtype=np.uint8
                )

                arr = np.concatenate([arr, alpha], axis=-1)

            frames.append((arr.astype(np.uint8), duration_ms))

        return frames, 0, fps

    finally:

        if tmp_path:

            try:
                os.unlink(tmp_path)
            except Exception:
                pass


def encode_output(output_frames, durations, loop, fps, job_id, source_ext, opts):
    """Encode les images traitées en WebP animé (par défaut pour une entrée
    WebP) ou en WebM VP9 (par défaut pour une entrée vidéo). L'option
    `outputFormat` ('webp' | 'webm') permet de forcer le format de sortie."""

    out_format = (opts.get("outputFormat") or "").lower()

    if out_format not in ("webp", "webm"):
        out_format = "webp" if source_ext == ".webp" else "webm"

    jobs_dir = ROOT / "jobs"

    jobs_dir.mkdir(exist_ok=True)

    quality = int(opts.get("quality", 95))

    if out_format == "webm":

        # On utilise PyAV directement plutôt que le wrapper imwrite()
        # d'imageio : la surface de mots-clés de PyAVPlugin.write() varie
        # trop selon les versions pour passer les options du codec (crf,
        # bitrate) de façon fiable.
        import av

        output_path = jobs_dir / f"{job_id}_DLSS5.webm"

        # quality (0-100) -> CRF VP9 (0-63, plus bas = meilleure qualité)
        crf = max(0, min(63, int(round(63 - (quality / 100.0) * 63))))

        frames_rgb = [np.asarray(f.convert("RGB")) for f in output_frames]

        h, w = frames_rgb[0].shape[:2]

        container = av.open(str(output_path), mode="w")

        try:

            stream = container.add_stream(
                "libvpx-vp9", rate=max(1, int(round(fps)))
            )

            stream.width = w

            stream.height = h

            stream.pix_fmt = "yuv420p"

            stream.options = {"crf": str(crf), "b": "0"}

            for frame_rgb in frames_rgb:

                frame = av.VideoFrame.from_ndarray(
                    np.ascontiguousarray(frame_rgb), format="rgb24"
                )

                for packet in stream.encode(frame):
                    container.mux(packet)

            for packet in stream.encode():
                container.mux(packet)

        finally:

            container.close()

        return output_path

    output_path = jobs_dir / f"{job_id}_DLSS5.webp"

    first = output_frames[0]

    rest = output_frames[1:]

    first.save(
        output_path,
        format="WEBP",
        save_all=True,
        append_images=rest,
        duration=durations,
        loop=loop,
        lossless=True,
        method=6,
        quality=quality,
    )

    return output_path


def parse_multipart_request(handler):
    """Lit un corps multipart/form-data depuis un BaseHTTPRequestHandler.
    Retourne (file_data, filename, raw_options) ou lève ValueError(message)."""

    length = int(handler.headers.get("Content-Length", "0"))

    if length <= 0:
        raise ValueError("Aucun fichier reçu.")

    if length > MAX_BYTES:
        raise ValueError("Fichier trop volumineux.")

    body = handler.rfile.read(length)

    content_type = handler.headers.get("Content-Type", "")

    if "multipart/form-data" not in content_type.lower():
        raise ValueError("La requête doit être multipart/form-data.")

    match = re.search(
        r'boundary=(?:"([^"]+)"|([^;]+))', content_type, re.IGNORECASE
    )

    if not match:
        raise ValueError("Boundary multipart introuvable.")

    boundary = (match.group(1) or match.group(2)).encode("latin-1")

    delimiter = b"--" + boundary

    file_data = None
    filename = None
    raw_options = "{}"

    for part in body.split(delimiter):

        part = part.strip(b"\r\n-")

        if not part:
            continue

        header_end = part.find(b"\r\n\r\n")

        if header_end == -1:
            continue

        header_bytes = part[:header_end]
        payload = part[header_end + 4:]

        headers = header_bytes.decode("latin-1", errors="replace")

        name_match = re.search(r'name="([^"]+)"', headers, re.IGNORECASE)

        if not name_match:
            continue

        field_name = name_match.group(1)

        if field_name == "file":

            filename_match = re.search(
                r'filename="([^"]*)"', headers, re.IGNORECASE
            )

            filename = (
                Path(filename_match.group(1)).name
                if filename_match else "input.webp"
            )

            file_data = payload

        elif field_name == "options":

            raw_options = payload.decode(
                "utf-8", errors="replace"
            ).strip()

    if file_data is None:
        raise ValueError(
            "Champ file manquant. Le navigateur a envoyé la requête "
            "mais le serveur n'a pas trouvé le champ multipart 'file'."
        )

    return file_data, (filename or "input.webp"), raw_options


def render_preview_frame(file_data, ext, opts):
    """Traite uniquement la première image du fichier reçu et retourne un
    PNG (bytes) — utilisé pour l'aperçu en direct pendant le réglage des
    curseurs, sans lancer un job complet."""

    frames, _loop, _fps = decode_frames(file_data, ext, limit=1)

    if not frames:
        raise RuntimeError("Aucune image trouvée dans le fichier.")

    arr_u8, _duration = frames[0]

    lib, process, _shutdown = load_engine()

    settings = make_settings(opts)

    error = ctypes.create_string_buffer(2048)

    arr = np.ascontiguousarray(arr_u8.astype(np.float32) / 255.0)

    h, w, c = arr.shape

    cur = arr.reshape(-1)
    out = np.empty_like(cur)

    cur_ptr = cur.ctypes.data_as(ctypes.POINTER(ctypes.c_float))
    out_ptr = out.ctypes.data_as(ctypes.POINTER(ctypes.c_float))

    rc = process(
        cur_ptr,
        None,
        out_ptr,
        w,
        h,
        ctypes.byref(settings),
        _abort,
        None,
        error,
        len(error),
    )

    if rc:

        msg = (
            error.value.decode("utf-8", "replace")
            or f"DLSS5Process a retourné {rc}."
        )

        raise RuntimeError(msg)

    out = np.clip(out.reshape(h, w, 4), 0.0, 1.0)

    out8 = np.rint(out * 255.0).astype(np.uint8)

    img = Image.fromarray(out8, "RGBA")

    buf = io.BytesIO()

    img.save(buf, format="PNG")

    return buf.getvalue()


# ============================================================
# TRAITEMENT DLSS 5
# ============================================================

def process_job(
    job_id,
    input_path,
    opts
):

    try:

        # --------------------------------------------------------
        # Charger DLSS
        # --------------------------------------------------------

        lib, process, _shutdown = load_engine()

        source_ext = Path(input_path).suffix.lower()

        set_job(
            job_id,
            state="decoding",
            progress=2,
            message="Lecture du fichier source…"
        )

        # --------------------------------------------------------
        # Ouvrir le fichier source (WebP animé ou vidéo)
        # --------------------------------------------------------

        input_frames, loop, fps = decode_frames(
            input_path,
            source_ext
        )

        frames = len(input_frames)

        if frames == 0:
            raise RuntimeError("Aucune image trouvée dans le fichier.")

        durations = []

        output_frames = []

        previous = None

        settings = make_settings(
            opts
        )

        error = ctypes.create_string_buffer(
            2048
        )

        context_buf = ctypes.create_string_buffer(
            job_id.encode("ascii")
        )

        context = ctypes.cast(
            context_buf,
            ctypes.c_void_p
        )

        # --------------------------------------------------------
        # Frames
        # --------------------------------------------------------

        for idx in range(frames):

            with jobs_lock:

                if jobs[job_id].get(
                    "cancel"
                ):
                    raise RuntimeError(
                        "Traitement annulé."
                    )

            frame_u8, frame_duration = input_frames[idx]

            arr = np.ascontiguousarray(
                frame_u8.astype(np.float32) / 255.0
            )

            h, w, c = arr.shape

            cur = arr.reshape(
                -1
            )

            out = np.empty_like(
                cur
            )

            # Frame précédente
            if previous is not None:

                prev_ptr = previous.ctypes.data_as(
                    ctypes.POINTER(
                        ctypes.c_float
                    )
                )

            else:

                prev_ptr = None

            cur_ptr = cur.ctypes.data_as(
                ctypes.POINTER(
                    ctypes.c_float
                )
            )

            out_ptr = out.ctypes.data_as(
                ctypes.POINTER(
                    ctypes.c_float
                )
            )

            # ----------------------------------------------------
            # DLSS 5
            # ----------------------------------------------------

            rc = process(
                cur_ptr,
                prev_ptr,
                out_ptr,

                w,
                h,

                ctypes.byref(
                    settings
                ),

                _abort,
                context,

                error,
                len(error)
            )

            if rc:

                msg = (
                    error.value.decode(
                        "utf-8",
                        "replace"
                    )
                    or
                    f"DLSS5Process a retourné {rc}."
                )

                raise RuntimeError(
                    msg
                )

            # ----------------------------------------------------
            # Conversion sortie
            # ----------------------------------------------------

            out = np.clip(
                out.reshape(
                    h,
                    w,
                    4
                ),
                0.0,
                1.0
            )

            out8 = np.rint(
                out * 255.0
            ).astype(
                np.uint8
            )

            output_frames.append(
                Image.fromarray(
                    out8,
                    "RGBA"
                )
            )

            # Frame actuelle devient précédente
            previous = cur.copy()

            durations.append(
                int(frame_duration if frame_duration is not None else 100)
            )

            progress = (
                5
                +
                int(
                    (idx + 1)
                    /
                    frames
                    *
                    90
                )
            )

            set_job(
                job_id,

                state="processing",

                progress=progress,

                frame=idx + 1,

                frames=frames,

                message=(
                    f"DLSS 5 — image "
                    f"{idx + 1}/{frames}"
                )
            )

        # --------------------------------------------------------
        # Encodage WebP
        # --------------------------------------------------------

        set_job(
            job_id,
            state="encoding",
            progress=97,
            message="Encodage du résultat…"
        )

        output_path = encode_output(
            output_frames,
            durations,
            loop,
            fps,
            job_id,
            source_ext,
            opts
        )

        set_job(
            job_id,

            state="done",

            progress=100,

            message="Terminé.",

            output=str(
                output_path
            ),

            output_name=(
                Path(input_path).stem
                + "_DLSS5"
                + output_path.suffix
            )
        )

    except Exception as e:

        set_job(
            job_id,

            state="error",

            progress=0,

            message=str(e),

            error=traceback.format_exc()
        )

    finally:

        try:

            Path(
                input_path
            ).unlink(
                missing_ok=True
            )

        except Exception:

            pass


# ============================================================
# HTML
# ============================================================

HTML = (
    ROOT
    /
    "index.html"
).read_text(
    encoding="utf-8"
)


# ============================================================
# HTTP SERVER
# ============================================================

class Handler(
    BaseHTTPRequestHandler
):

    # --------------------------------------------------------
    # JSON
    # --------------------------------------------------------

    def send_json(
        self,
        obj,
        code=200
    ):

        data = json.dumps(
            obj,
            ensure_ascii=False
        ).encode(
            "utf-8"
        )

        self.send_response(
            code
        )

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Content-Length",
            str(len(data))
        )

        self.end_headers()

        self.wfile.write(
            data
        )

    # --------------------------------------------------------
    # GET
    # --------------------------------------------------------

    def do_GET(self):

        u = urlparse(
            self.path
        )

        # ----------------------------------------------------
        # Interface
        # ----------------------------------------------------

        if u.path == "/":

            data = HTML.encode(
                "utf-8"
            )

            self.send_response(
                200
            )

            self.send_header(
                "Content-Type",
                "text/html; charset=utf-8"
            )

            self.send_header(
                "Content-Length",
                str(len(data))
            )

            self.end_headers()

            self.wfile.write(
                data
            )

            return

        # ----------------------------------------------------
        # Status
        # ----------------------------------------------------

        if u.path == "/api/status":

            jid = parse_qs(
                u.query
            ).get(
                "id",
                [""]
            )[0]

            with jobs_lock:

                job = dict(
                    jobs.get(
                        jid,
                        {}
                    )
                )

            if not job:

                return self.send_json(
                    {
                        "error":
                        "Job inconnu"
                    },
                    404
                )

            return self.send_json(
                job
            )

        # ----------------------------------------------------
        # Download
        # ----------------------------------------------------

        if u.path == "/api/download":

            jid = parse_qs(
                u.query
            ).get(
                "id",
                [""]
            )[0]

            with jobs_lock:

                job = dict(
                    jobs.get(
                        jid,
                        {}
                    )
                )

            if (
                not job
                or
                job.get(
                    "state"
                ) != "done"
            ):

                return self.send_json(
                    {
                        "error":
                        "Fichier indisponible"
                    },
                    404
                )

            p = Path(
                job["output"]
            )

            if not p.exists():

                return self.send_json(
                    {
                        "error":
                        "Fichier absent"
                    },
                    404
                )

            data = p.read_bytes()

            mime = (
                "video/webm"
                if p.suffix.lower() == ".webm"
                else "image/webp"
            )

            self.send_response(
                200
            )

            self.send_header(
                "Content-Type",
                mime
            )

            self.send_header(
                "Content-Disposition",
                f'attachment; filename="{job["output_name"]}"'
            )

            self.send_header(
                "Content-Length",
                str(len(data))
            )

            self.end_headers()

            self.wfile.write(
                data
            )

            return

        self.send_error(
            404
        )

    # --------------------------------------------------------
    # POST
    # --------------------------------------------------------

    def do_POST(self):

        u = urlparse(
            self.path
        )

        # ====================================================
        # PROCESS
        # ====================================================

        if u.path == "/api/process":

            try:

                file_data, filename, raw_options = parse_multipart_request(
                    self
                )

            except ValueError as e:

                return self.send_json(
                    {"error": str(e)},
                    400
                )

            # ------------------------------------------------
            # Vérification extension
            # ------------------------------------------------

            ext = Path(filename).suffix.lower()

            if ext != ".webp" and ext not in VIDEO_EXTS:

                return self.send_json(
                    {
                        "error":
                        (
                            "Formats acceptés : .webp animé, "
                            + ", ".join(VIDEO_EXTS)
                            + "."
                        )
                    },
                    400
                )

            # ------------------------------------------------
            # JSON options
            # ------------------------------------------------

            try:

                opts = json.loads(
                    raw_options
                )

                if not isinstance(
                    opts,
                    dict
                ):

                    opts = {}

            except Exception:

                opts = {}

            # ------------------------------------------------
            # Création job
            # ------------------------------------------------

            jid = uuid.uuid4().hex

            jobs_dir = (
                ROOT
                /
                "jobs"
            )

            jobs_dir.mkdir(
                exist_ok=True
            )

            input_path = (
                jobs_dir
                /
                f"{jid}_{filename}"
            )

            input_path.write_bytes(
                file_data
            )

            # ------------------------------------------------
            # Enregistrer job
            # ------------------------------------------------

            with jobs_lock:

                jobs[jid] = {
                    "state":
                    "queued",

                    "progress":
                    0,

                    "message":
                    "En attente…",

                    "frame":
                    0,

                    "frames":
                    0,

                    "cancel":
                    False
                }

            # ------------------------------------------------
            # Lancer traitement
            # ------------------------------------------------

            threading.Thread(
                target=process_job,

                args=(
                    jid,
                    str(input_path),
                    opts
                ),

                daemon=True
            ).start()

            return self.send_json(
                {
                    "id":
                    jid
                }
            )

        # ====================================================
        # PREVIEW (aperçu en direct, une seule image)
        # ====================================================

        if u.path == "/api/preview":

            try:

                file_data, filename, raw_options = parse_multipart_request(
                    self
                )

            except ValueError as e:

                return self.send_json(
                    {"error": str(e)},
                    400
                )

            ext = Path(filename).suffix.lower()

            if ext != ".webp" and ext not in VIDEO_EXTS:

                return self.send_json(
                    {
                        "error":
                        "Format non pris en charge pour l'aperçu."
                    },
                    400
                )

            try:

                opts = json.loads(raw_options)

                if not isinstance(opts, dict):
                    opts = {}

            except Exception:

                opts = {}

            try:

                png_bytes = render_preview_frame(file_data, ext, opts)

            except Exception as e:

                return self.send_json(
                    {"error": str(e)},
                    500
                )

            self.send_response(200)

            self.send_header("Content-Type", "image/png")

            self.send_header("Content-Length", str(len(png_bytes)))

            self.end_headers()

            self.wfile.write(png_bytes)

            return

        # ====================================================
        # CANCEL
        # ====================================================

        if u.path == "/api/cancel":

            length = int(
                self.headers.get(
                    "Content-Length",
                    "0"
                )
            )

            body = self.rfile.read(
                length
            )

            try:

                jid = json.loads(
                    body
                ).get(
                    "id",
                    ""
                )

            except Exception:

                jid = ""

            with jobs_lock:

                if jid in jobs:

                    jobs[jid][
                        "cancel"
                    ] = True

            return self.send_json(
                {
                    "ok":
                    True
                }
            )

        self.send_error(
            404
        )

    # --------------------------------------------------------
    # LOG
    # --------------------------------------------------------

    def log_message(
        self,
        fmt,
        *args
    ):

        print(
            "[HTTP]",
            fmt % args
        )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    (
        ROOT
        /
        "jobs"
    ).mkdir(
        exist_ok=True
    )

    print(
        f"DLSS 5 WebP Tool — "
        f"http://{HOST}:{PORT}"
    )

    print(
        "Fermez cette fenêtre "
        "pour arrêter le serveur."
    )

    ThreadingHTTPServer(
        (
            HOST,
            PORT
        ),
        Handler
    ).serve_forever()