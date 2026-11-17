// Assemble tout le jeu en UN SEUL fichier HTML (dist/camelot.html), déployable tel quel (Cloudflare Pages).
// Usage : npm install && npm run build   (esbuild et Three.js viennent de npm)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { assembleHtml, inlineFonts } from './assembler-html.mjs'

const root = 'jeu'
const result = await build({ entryPoints: ['src/main-citybuilder.ts'], bundle: true, minify: true, format: 'iife', target: 'es2022', write: false, legalComments: 'none', loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' } })
const js = result.outputFiles[0].text
const temp = path.join(os.tmpdir(), 'camelot-bundle.js')
fs.writeFileSync(temp, js)
execFileSync(process.execPath, ['--check', temp]) // erreur de syntaxe : le script s'arrête ici
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'assets/data', name), 'utf8'))
const html = assembleHtml({
  css: inlineFonts(fs.readFileSync('src/styles/camelot.css', 'utf8'), root),
  js,
  data: { evenements: read('evenements.json'), batiments: read('batiments.json'), lois: read('lois.json') },
  favicon: fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8'),
})
if (/(src|href)=["']https?:/i.test(html)) throw new Error('Le fichier final référence une ressource externe.')
fs.mkdirSync('dist', { recursive: true })
fs.writeFileSync('dist/camelot.html', html)
console.log(`dist/camelot.html : ${(html.length / 1024).toFixed(0)} Ko (script ${(js.length / 1024).toFixed(0)} Ko)`)
