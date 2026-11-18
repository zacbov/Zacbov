import numpy as np, pickle, sys
sys.path.insert(0, '/home/claude/interieur')
A = np.load('skinM_atlas.npy'); J = pickle.load(open('joints_atlas.pkl', 'rb')); B = pickle.load(open('bones_h.pkl', 'rb'))
Bo, Sh, Pa = np.load('pt_Body.npy'), np.vstack([np.load('pt_Shirt.npy'), np.load('pt_Sweatshirt.npy')]), np.load('pt_Pants.npy')
# nuage « peau » du patient pour le tronc : tête et cou (corps), torse (T-shirt), bassin (pantalon) ; marges appliquées plus bas
Sh = Sh[~((Sh[:, 1] > 0.12) & (Sh[:, 2] > 1.38))]                         # capuche
P = np.vstack([Bo[(Bo[:, 2] >= 1.49) & (np.abs(Bo[:, 0]) < 0.21)], Sh[(Sh[:, 2] < 1.49) & (Sh[:, 2] >= 0.95)], Pa[Pa[:, 2] < 0.95]])
def clusters(xs, gap=0.018):
    xs = np.sort(xs); cut = np.where(np.diff(xs) > gap)[0]; st = np.r_[0, cut + 1]; en = np.r_[cut, len(xs) - 1]
    return [(xs[a], xs[b]) for a, b in zip(st, en)]
def profil(S, z0, z1, step=0.005, cap=0.21, groupes=True):
    zs = np.arange(z0, z1, step); T = []
    for z in zs:
        sl = S[np.abs(S[:, 2] - z) < step * 0.8]
        if len(sl) < 6: T.append(None); continue
        cs = clusters(sl[:, 0]) if groupes else [(sl[:, 0].min(), sl[:, 0].max())]; c = [k for k in cs if k[0] <= 0.01 and k[1] >= -0.01]
        if c: a, b = max(c[0][0], -cap), min(c[0][1], cap); m = sl[(sl[:, 0] >= a) & (sl[:, 0] <= b)]; T.append((a, b, m[:, 1].min(), m[:, 1].max()))
        else: T.append(None)
    return zs, T
def tab(zs, T, k=15):
    M = np.array([a if a else (np.nan,) * 4 for a in T], float)
    for j in range(4):
        col = M[:, j]; ok = ~np.isnan(col)
        if ok.sum() > 2: col[~ok] = np.interp(zs[~ok], zs[ok], col[ok])
        M[:, j] = np.convolve(np.pad(col, (k // 2, k // 2), mode='edge'), np.ones(k) / k, mode='valid')
    return M
hipA = (J['hipL'][2] + J['hipR'][2]) / 2; hipP = B['LeftUpLeg'][2]
crA = -0.11; crP = hipP - (hipA - crA) * (B['LeftUpLeg'][2] - B['LeftLeg'][2]) / (hipA - (J['kneeL'][2] + J['kneeR'][2]) / 2)
za = np.array([A[:, 2].min(), (J['ankleL'][2] + J['ankleR'][2]) / 2, (J['kneeL'][2] + J['kneeR'][2]) / 2, hipA, (J['shoulderL'][2] + J['shoulderR'][2]) / 2, J['eyes'][2], A[:, 2].max()])
zp = np.array([0.0, B['LeftFoot'][2], B['LeftLeg'][2], hipP, B['LeftArm'][2], B['LeftEye'][2], 1.79])
print('za', za.round(3)); print('zp', zp.round(3)); print('entrejambe', round(crA, 3), round(crP, 3))
ZA, TA0 = profil(A, crA - 0.02, A[:, 2].max() - 0.01); TA = tab(ZA, TA0)
ZP, TP0 = profil(P, crP - 0.02, 1.785, groupes=False); TP = tab(ZP, TP0)
def epaules(Z, T, z0, zs, xs):                   # entre l'aisselle et l'épaule, la largeur du tronc est interpolée (le bras s'y confond avec le tronc)
    i0 = np.argmin(abs(Z - z0)); m = (Z > z0) & (Z <= zs); f = (Z[m] - z0) / (zs - z0)
    T[m, 0] = T[i0, 0] + f * (-xs - T[i0, 0]); T[m, 1] = T[i0, 1] + f * (xs - T[i0, 1])
    k = (Z > zs) & (Z < zs + 0.04); T[k, 0] = np.maximum(T[k, 0], -xs); T[k, 1] = np.minimum(T[k, 1], xs)
epaules(ZA, TA, 0.25, za[4], (abs(J['shoulderL'][0]) + abs(J['shoulderR'][0])) / 2 + 0.05)
epaules(ZP, TP, 1.30, zp[4], abs(B['LeftArm'][0] - B['Hips'][0]) + 0.05 + 0.014)
mg = np.where(ZP < 0.95, 0.012, np.where(ZP < 1.49, 0.014, 0.0))           # pantalon ample, T-shirt près du corps, peau
TP[:, 0] += mg; TP[:, 1] -= mg; TP[:, 2] += mg; TP[:, 3] -= mg
for z in (-0.08, 0.0, 0.2, 0.36, 0.45, 0.5, 0.55, 0.6, 0.65, 0.75):
    i = np.argmin(abs(ZA - z)); zn = np.interp(z, za, zp); j = np.argmin(abs(ZP - zn))
    print(f'atlas z={z:.2f} larg={TA[i,1]-TA[i,0]:.3f} prof={TA[i,3]-TA[i,2]:.3f}  -> patient z={zn:.3f} larg={TP[j,1]-TP[j,0]:.3f} prof={TP[j,3]-TP[j,2]:.3f}')
pickle.dump(dict(za=za, zp=zp, ZA=ZA, TA=TA, ZP=ZP, TP=TP, crA=crA, crP=crP), open('warp_h.pkl', 'wb'))
if '-v' in sys.argv:
    for z in np.arange(1.40, 1.54, 0.01): j = np.argmin(abs(ZP - z)); print('P', round(z, 2), TP0[j] and np.round(TP0[j], 3), TP[j].round(3))
    for z in np.arange(0.50, 0.64, 0.01): j = np.argmin(abs(ZA - z)); print('A', round(z, 2), TA0[j] and np.round(TA0[j], 3), TA[j].round(3))
