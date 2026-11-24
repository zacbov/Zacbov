# Lit head.dna / body.dna (OpenRigLogic), évalue les expressions avec RigLogic et calcule, pour chaque maillage de la tête,
# la forme (sommets déformés par les articulations du visage + formes correctives), dans le repère DNA (cm, Y haut, Z avant).
# usage : python3 bake.py <dossier DCC export> <lod tête> <lod corps> <sortie.npz>
import sys, json, numpy as np
from scipy.spatial.transform import Rotation as Rot
from env import load
import riglogic as rl

SRC, LODH, LODB, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
SRC = SRC.rstrip('/') + '/'
H = load(SRC + 'head.dna'); B = load(SRC + 'body.dna')

# expressions de l'avatar (noms de patient_femme.glb) -> commandes MetaHuman (CTRL_expressions.*)
def S(base, v=1.0, **kw): return lambda s: {base + s: v, **{k + s: w for k, w in kw.items()}}
LR = {
    'Smile': S('mouthCornerPull'), 'Frown': S('mouthCornerDepress'), 'MouthNarrow': S('mouthCornerNarrow'),
    'MouthWhistle_NarrowAdjust': lambda s: {'mouthFunnelU' + s: 1, 'mouthFunnelD' + s: 1, 'mouthLipsPurseU' + s: .5, 'mouthLipsPurseD' + s: .5},
    'Blink': S('eyeBlink'), 'EyesWide': S('eyeWiden'), 'Squint': S('eyeSquintInner', 1, eyeCheekRaise=.5),
    'BrowsUp': S('browRaiseIn', 1, browRaiseOuter=1), 'BrowsDown': S('browDown'), 'BrowsIn': S('browLateral'),
    'CheekPuff': S('mouthCheekBlow'), 'UpperLipUp': S('mouthUpperLipRaise'), 'NoseScrunch': S('noseWrinkle', 1, noseWrinkleUpper=.5),
}
EXPR = {}
for k, f in LR.items():
    for side, s in (('Left', 'L'), ('Right', 'R')): EXPR[k + '_' + side] = f(s)
EXPR.update({
    'Jaw_Down': {'jawOpen': .45},
    'MouthOpen': {'mouthUpperLipRaiseL': .25, 'mouthUpperLipRaiseR': .25, 'mouthLowerLipDepressL': .3, 'mouthLowerLipDepressR': .3},
    'BoucheOuverte': {'jawOpen': .95, 'mouthStretchL': .2, 'mouthStretchR': .2},
    'MouthDown': {'mouthDown': 1}, 'Midmouth_Left': {'mouthLeft': 1}, 'Midmouth_Right': {'mouthRight': 1},
    'LowerLipOut': {'mouthLowerLipRollOutL': 1, 'mouthLowerLipRollOutR': 1},
    'UpperLipIn': {'mouthUpperLipRollInL': 1, 'mouthUpperLipRollInR': 1}, 'LowerLipIn': {'mouthLowerLipRollInL': 1, 'mouthLowerLipRollInR': 1},
    'TongueUp': {'tongueUp': 1, 'jawOpen': .1},
})

cfg = rl.Configuration(); cfg.rotationType = rl.RotationType_Quaternions
R = rl.RigLogic.create(H, cfg); I = rl.RigInstance.create(R); I.setLOD(0)
RAW = {H.getRawControlName(i).replace('CTRL_expressions.', ''): i for i in range(H.getRawControlCount())}
NJ = H.getJointCount(); NEU = np.array(R.getNeutralJointValues(), dtype=np.float64).reshape(NJ, 10)
PAR = [H.getJointParentIndex(j) for j in range(NJ)]
NAMES = [H.getJointName(j) for j in range(NJ)]

def world(vals):                                   # vals : NJ x 10 (t, q xyzw, s) locaux -> matrices monde 4x4
    W = np.zeros((NJ, 4, 4)); done = np.zeros(NJ, bool)
    L = np.zeros((NJ, 4, 4)); L[:, 3, 3] = 1
    L[:, :3, :3] = Rot.from_quat(vals[:, 3:7]).as_matrix() * vals[:, None, 7:10]
    L[:, :3, 3] = vals[:, :3]
    order = sorted(range(NJ), key=lambda j: 0)    # parents d'abord : la DNA range les parents avant les enfants
    for j in range(NJ):
        p = PAR[j]
        W[j] = L[j] if p == j or p < 0 else W[p] @ L[j]
    return W

def evaluate(ctrls):
    for i in range(H.getRawControlCount()): I.setRawControl(i, 0.0)
    for k in ('neck_01', 'neck_02', 'head'):
        if k + '.qw' in {H.getRawControlName(i) for i in range(H.getRawControlCount())}:
            I.setRawControl([i for i in range(H.getRawControlCount()) if H.getRawControlName(i) == k + '.qw'][0], 1.0)
    for k, v in ctrls.items(): I.setRawControl(RAW[k], float(v))
    R.calculate(I)
    d = np.array(I.getJointOutputs(), dtype=np.float64).reshape(NJ, 10)
    vals = NEU.copy(); vals[:, :3] += d[:, :3]; vals[:, 7:] += d[:, 7:]
    vals[:, 3:7] = (Rot.from_quat(NEU[:, 3:7]) * Rot.from_quat(d[:, 3:7])).as_quat()
    return world(vals), np.array(I.getBlendShapeOutputs(), dtype=np.float64)

W0, BS0 = evaluate({})
INV0 = np.linalg.inv(W0)

def mesh_data(r, m):
    P = np.stack([r.getVertexPositionXs(m), r.getVertexPositionYs(m), r.getVertexPositionZs(m)], 1).astype(np.float64)
    U = np.stack([r.getVertexTextureCoordinateUs(m), r.getVertexTextureCoordinateVs(m)], 1)
    LP = np.array(r.getVertexLayoutPositionIndices(m)); LT = np.array(r.getVertexLayoutTextureCoordinateIndices(m))
    F = [np.array(r.getFaceVertexLayoutIndices(m, f)) for f in range(r.getFaceCount(m))]
    nv = len(P); wj, ww = [], []
    for v in range(nv):
        wj.append(np.array(r.getSkinWeightsJointIndices(m, v), dtype=np.int32)); ww.append(np.array(r.getSkinWeightsValues(m, v), dtype=np.float64))
    return P, U, LP, LT, F, wj, ww

def skin(P, wj, ww, S_):                           # S_ : NJ x 4 x 4 matrices de skinning
    out = np.zeros_like(P); Ph = np.c_[P, np.ones(len(P))]
    for v in range(len(P)):
        M = np.einsum('k,kij->ij', ww[v], S_[wj[v]]); out[v] = (M @ Ph[v])[:3]
    return out

res = {'joint_names': NAMES, 'joint_parent': PAR, 'joint_world0': W0, 'expr_names': list(EXPR)}
meshes = {}
for m in H.getMeshIndicesForLOD(LODH):
    name = H.getMeshName(m).split('_lod')[0]
    if name not in ('head', 'teeth', 'eyeLeft', 'eyeRight', 'eyelashes', 'eyeshell', 'eyeEdge', 'saliva', 'cartilage'): continue
    P, U, LP, LT, F, wj, ww = mesh_data(H, m)
    nt = H.getBlendShapeTargetCount(m)
    targets = []
    for t in range(nt):
        ch = H.getBlendShapeChannelIndex(m, t)
        vi = np.array(H.getBlendShapeTargetVertexIndices(m, t), dtype=np.int64)
        dd = np.stack([H.getBlendShapeTargetDeltaXs(m, t), H.getBlendShapeTargetDeltaYs(m, t), H.getBlendShapeTargetDeltaZs(m, t)], 1)
        targets.append((ch, vi, dd))
    base = skin(P, wj, ww, np.einsum('jab,jbc->jac', W0, INV0))
    shapes = {}
    for en, ctrls in EXPR.items():
        Wp, BSp = evaluate(ctrls)
        Q = P.copy()
        for ch, vi, dd in targets:
            w = BSp[ch] if ch < len(BSp) else 0
            if w: Q[vi] += w * dd
        sk = skin(Q, wj, ww, np.einsum('jab,jbc->jac', Wp, INV0))
        dlt = sk - base
        if np.abs(dlt).max() > 1e-4: shapes[en] = dlt.astype(np.float32)
    meshes[name] = dict(P=P.astype(np.float32), U=U.astype(np.float32), LP=LP, LT=LT, F=F, wj=wj, ww=ww, shapes=shapes)
    print(name, len(P), 'formes', len(shapes), {k: round(float(np.abs(v).max()), 2) for k, v in list(shapes.items())[:6]})
for m in B.getMeshIndicesForLOD(LODB):
    name = B.getMeshName(m).split('_lod')[0]
    P, U, LP, LT, F, wj, ww = mesh_data(B, m)
    meshes[name] = dict(P=P.astype(np.float32), U=U.astype(np.float32), LP=LP, LT=LT, F=F, wj=wj, ww=ww, shapes={})
    print(name, len(P))
BJ = B.getJointCount()
res['body_joint_names'] = [B.getJointName(j) for j in range(BJ)]; res['body_joint_parent'] = [B.getJointParentIndex(j) for j in range(BJ)]
cfgB = rl.Configuration(); cfgB.rotationType = rl.RotationType_Quaternions
RB = rl.RigLogic.create(B, cfgB); NB = np.array(RB.getNeutralJointValues(), dtype=np.float64).reshape(BJ, 10)
NJ, PAR = BJ, res['body_joint_parent']; res['body_world0'] = world(NB)
res['meshes'] = meshes
import pickle; pickle.dump(res, open(OUT, 'wb'))
print('OK', OUT)
