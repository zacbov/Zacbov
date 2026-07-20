# ============================================================
# core/display.py — Écran Waveshare 7.5" V2 (800×480, 1 bit)
# Abstraction : le reste du code ne parle qu'à ce module.
#
# MODE_SIM=True  -> pas d'écran branché : dump PBM sur le
#                   système de fichiers, pratique pour tester
#                   la mise en page sans matériel.
# ============================================================
import framebuf
import config

MODE_SIM = True          # passe à False quand l'écran est branché
W, H = 800, 480

_buf = bytearray(W * H // 8)
fb = framebuf.FrameBuffer(_buf, W, H, framebuf.MONO_HLSB)

BLACK, WHITE = 0, 1


def clear():
    fb.fill(WHITE)


def show():
    """Envoie le framebuffer à l'écran (ou dump si simulation)."""
    if MODE_SIM:
        with open("screen.pbm", "wb") as f:
            f.write(b"P4\n%d %d\n" % (W, H))
            f.write(_buf)
        print("[display] screen.pbm ecrit (simulation)")
    else:
        _epd_show()


# ---------- Primitives de mise en page (reprennent la maquette) ----------

def text(x, y, s, scale=1, color=BLACK):
    """Texte 8x8 upscalé par blocs (police bitmap simple)."""
    if scale == 1:
        fb.text(s, x, y, color)
        return
    tmp_w = len(s) * 8
    tmp = framebuf.FrameBuffer(bytearray(tmp_w), tmp_w, 8, framebuf.MONO_HLSB)
    tmp.fill(1)
    tmp.text(s, 0, 0, 0)
    for cy in range(8):
        for cx in range(tmp_w):
            if tmp.pixel(cx, cy) == 0:
                fb.fill_rect(x + cx * scale, y + cy * scale, scale, scale, color)


def hline(y, x0=0, x1=W, th=1):
    fb.fill_rect(x0, y, x1 - x0, th, BLACK)


def vline(x, y0=0, y1=H, th=1):
    fb.fill_rect(x, y0, th, y1 - y0, BLACK)


def inverted_row(x, y, w, h):
    fb.fill_rect(x, y, w, h, BLACK)


# ---------- Pilote réel Waveshare 7.5 V2 (utilisé si MODE_SIM=False) ----
def _epd_show():
    from machine import Pin, SPI
    import time
    spi = SPI(1, baudrate=4_000_000, polarity=0, phase=0,
              sck=Pin(config.PIN_EPD_SCK), mosi=Pin(config.PIN_EPD_MOSI))
    cs = Pin(config.PIN_EPD_CS, Pin.OUT, value=1)
    dc = Pin(config.PIN_EPD_DC, Pin.OUT, value=0)
    rst = Pin(config.PIN_EPD_RST, Pin.OUT, value=1)
    busy = Pin(config.PIN_EPD_BUSY, Pin.IN)

    def cmd(c, data=None):
        cs.value(0); dc.value(0); spi.write(bytes([c]))
        if data:
            dc.value(1); spi.write(data)
        cs.value(1)

    def wait():
        while busy.value() == 0:
            time.sleep_ms(20)

    # Reset + init (séquence UC8179 condensée)
    rst.value(0); time.sleep_ms(20); rst.value(1); time.sleep_ms(20)
    cmd(0x01, b"\x07\x07\x3f\x3f")      # power setting
    cmd(0x04); wait()                    # power on
    cmd(0x00, b"\x1f")                   # panel: KW, LUT from OTP
    cmd(0x61, b"\x03\x20\x01\xe0")      # resolution 800x480
    cmd(0x15, b"\x00")
    cmd(0x50, b"\x10\x07")
    cmd(0x60, b"\x22")
    # Le buffer MONO_HLSB : 1=blanc, 0=noir -> registre "new data"
    cmd(0x13, _buf)
    cmd(0x12); time.sleep_ms(100); wait()  # refresh
    cmd(0x02); wait()                       # power off
    cmd(0x07, b"\xa5")                      # deep sleep écran
