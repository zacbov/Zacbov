import mediapipe as mp, numpy as np, sys
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
opt = vision.FaceLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path='/home/claude/mh/homme/mp/face_landmarker.task'), num_faces=1)
det = vision.FaceLandmarker.create_from_options(opt)
for nom in ('Body', 'Scan'):
    im = mp.Image.create_from_file('/home/claude/mh/homme/mp/face_%s.png' % nom); r = det.detect(im)
    if not r.face_landmarks: print(nom, 'aucun visage'); continue
    L = np.array([[p.x, p.y] for p in r.face_landmarks[0]]); np.save('/home/claude/mh/homme/mp/lm_%s.npy' % nom, L); print(nom, L.shape)
