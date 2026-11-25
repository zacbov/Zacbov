set -e
python3 corps.py /home/claude/mh/homme/patient_homme_v30.glb fredi.blend corps.blend 2>&1 | grep "OK\|Error"
python3 tex_corps.py corps.blend fredi_Image_0.png corps_peau.jpg 2>&1 | grep "OK\|Err"
python3 mat.py corps.blend /home/claude/mh/homme/corps_peau.jpg >/dev/null 2>&1
python3 fin.py corps.blend homme_corps.blend 2>&1 | grep "Corps\|OK"
python3 /home/claude/femme/export.py homme_corps.blend homme_full.glb >/dev/null 2>&1
/home/claude/work/node_modules/.bin/gltf-transform draco homme_full.glb patient_homme.glb 2>&1 | tail -1
cp patient_homme.glb /home/claude/v13/chat/avatar/
