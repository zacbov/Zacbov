// Transpile src/*.ts vers jeu/js/*.js (Node >= 22.13, aucune dépendance). Usage : node tools/construire.mjs
import fs from 'node:fs'
import path from 'node:path'
import { stripTypeScriptTypes } from 'node:module'

const sortie = 'jeu/js'
fs.rmSync(sortie, { recursive: true, force: true })
const lister = dossier => fs.readdirSync(dossier, { withFileTypes: true })
  .flatMap(entree => entree.isDirectory() ? lister(path.join(dossier, entree.name)) : [path.join(dossier, entree.name)])

for (const fichier of lister('src').filter(f => f.endsWith('.ts'))) {
  const js = stripTypeScriptTypes(fs.readFileSync(fichier, 'utf8'), { mode: 'transform' })
    .replace(/(from\s+|import\s+)'(\.[^']+)'/g, (m, mot, chemin) => /\.(js|json|css)$/.test(chemin) ? m : `${mot}'${chemin}.js'`)
    .replace(/^import '\.\/styles\/[^']+';?\r?\n/m, '')
  const cible = path.join(sortie, path.relative('src', fichier).replace(/\.ts$/, '.js'))
  fs.mkdirSync(path.dirname(cible), { recursive: true })
  fs.writeFileSync(cible, js)
}
fs.copyFileSync('src/styles/camelot.css', 'jeu/styles/camelot.css')
console.log('jeu/js mis à jour.')
