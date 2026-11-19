"""Preserve a browser screenshot and its place in the making-of sequence."""
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent / 'exports' / 'making-of'
root.mkdir(parents=True, exist_ok=True)
manifest = root / 'steps.json'
steps = json.loads(manifest.read_text()) if manifest.exists() else []
source, label = sys.argv[1:3]
number = len(steps) + 1
target = root / f'{number:03d}.png'
shutil.copy2(source, target)
snapshot = root / 'source' / f'{number:03d}'
snapshot.mkdir(parents=True, exist_ok=True)
project = root.parent.parent
for pattern in ('*.js', '*.html', '*.css'):
    for path in project.glob(pattern):
        shutil.copy2(path, snapshot / path.name)
if (project / 'licenses').exists():
    shutil.copytree(project / 'licenses', snapshot / 'licenses', dirs_exist_ok=True)
shutil.copytree(project / 'scripts', snapshot / 'scripts',
                ignore=shutil.ignore_patterns('__pycache__'), dirs_exist_ok=True)
steps.append({'step': number, 'file': target.name, 'note': label,
              'capturedAt': datetime.now(timezone.utc).isoformat()})
manifest.write_text(json.dumps(steps, indent=2) + '\n')
print(target)
