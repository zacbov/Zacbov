# Textures générées : denim (sergé), jersey de coton, cartes de cheveux (couverture + teinte)
import numpy as np, cv2, sys
from PIL import Image
rng = np.random.default_rng(3); O = '/home/claude/mh/vet/tex/'
N = 1024; y, x = np.mgrid[0:N, 0:N].astype(np.float32)
def tile_noise(s):  # bruit périodique
    n = rng.normal(0, 1, (N, N)).astype(np.float32); f = np.fft.fft2(n); ky = np.fft.fftfreq(N)[:, None]; kx = np.fft.fftfreq(N)[None]
    return np.real(np.fft.ifft2(f * np.exp(-(kx**2 + ky**2) * (s * N / 6) ** 2)))
def norm(a): return (a - a.min()) / (np.ptp(a) + 1e-6)
# denim : sergé 3/1 en diagonale, fils de trame blancs, chiné
tw = 0.5 + 0.5 * np.sin(2 * np.pi * (x + y) / 6.0)
warp = norm(tile_noise(0.004)); slub = norm(tile_noise(0.02))
v = 0.55 + 0.30 * tw + 0.25 * (warp - 0.5) + 0.25 * (slub - 0.5)
base = np.array([38, 62, 98], np.float32); white = np.array([150, 165, 185], np.float32)
den = base * v[..., None] * 1.1 + white * (0.18 * (1 - tw) * warp)[..., None]
Image.fromarray(np.clip(den, 0, 255).astype(np.uint8)).save(O + 'denim.jpg', quality=88)
# jersey : mailles fines verticales, chiné léger (gris clair, teinté par la couleur du matériau)
k = 0.5 + 0.5 * np.sin(2 * np.pi * x / 4.0) * (0.6 + 0.4 * np.sin(2 * np.pi * y / 5.0))
j = 0.86 + 0.08 * k + 0.10 * (norm(tile_noise(0.003)) - 0.5)
Image.fromarray(np.clip(np.repeat(j[..., None], 3, 2) * 255, 0, 255).astype(np.uint8)).save(O + 'jersey.jpg', quality=88)
# cartes de cheveux du ponytail : couverture d'après la carte d'attributs, teinte racine -> pointe
a = np.array(Image.open('/home/claude/assets/pony/fiber_Attribue.png').convert('RGBA').resize((2048, 2048), Image.LANCZOS)).astype(np.float32)
cov = np.clip((np.maximum(a[..., 1], a[..., 2]) - 6) / 50, 0, 1)
idv = a[..., 0] / 158.0                                              # variation par mèche
col = np.array([int(c) for c in (sys.argv[1] if len(sys.argv) > 1 else '30,20,15').split(',')], np.float32)
shade = (0.75 + 0.5 * idv)[..., None] * (0.85 + 0.3 * norm(cv2.resize(tile_noise(0.01), (2048, 2048)))[..., None])
rgb = np.clip(col * shade * 1.15, 0, 255)
Image.fromarray(np.dstack([rgb, cov * 255]).astype(np.uint8)).save(O + 'pony_%s.png' % (sys.argv[2] if len(sys.argv) > 2 else 'brun'))
print('ok', cov.mean())
