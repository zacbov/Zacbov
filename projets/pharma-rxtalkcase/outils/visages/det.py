import mediapipe as mp, numpy as np, sys, glob
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=mpt.BaseOptions(model_asset_path='/home/claude/mh/homme/mp/face_landmarker.task'), num_faces=1))
from PIL import Image
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); im.save('/tmp/claude-0/-home-claude/3cbefd70-72fd-56dd-9703-3dcec06b4f76/scratchpad/_d.png')
    r = det.detect(mp.Image.create_from_file('/tmp/claude-0/-home-claude/3cbefd70-72fd-56dd-9703-3dcec06b4f76/scratchpad/_d.png'))
    if not r.face_landmarks: print(f, 'AUCUN'); continue
    L = np.array([[p.x, p.y] for p in r.face_landmarks[0]]); np.save(f.rsplit('.',1)[0] + '_lm.npy', L); print(f, 'ok', L[[33,263,1,13]].round(3).tolist())
