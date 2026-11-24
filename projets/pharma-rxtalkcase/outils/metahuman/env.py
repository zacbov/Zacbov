import sys
sys.path.insert(0,'/home/claude/mh/ext/openriglogic/build/python/dna'); sys.path.insert(0,'/home/claude/mh/ext/openriglogic/build/python/riglogic')
import dna
D='/home/claude/mh/zip/AmandaBlack/'
def load(p, layer=None):
    s=dna.FileStream(p, dna.FileStream.AccessMode_Read, dna.FileStream.OpenMode_Binary)
    r=dna.BinaryStreamReader(s, layer if layer is not None else dna.DataLayer_All); r.read()
    if not dna.Status.isOk(): raise SystemExit(dna.Status.get().message)
    return r
