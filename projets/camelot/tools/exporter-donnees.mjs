// Écrit jeu/assets/data/batiments.json et lois.json à partir des valeurs par défaut du code. Usage : node tools/exporter-donnees.mjs
import fs from 'node:fs'
const { BUILDINGS, BUILD_TIME, UPKEEP, LAWS } = await import(new URL('../jeu/js/game/camelot-rules.js', import.meta.url))
const lines = list => '[\n' + list.map(entry => JSON.stringify(entry)).join(',\n') + '\n]\n'
const buildings = BUILDINGS.map(({ id, name, subtitle, description, cost, output, input, influence }) =>
  ({ id, name, subtitle, description, cost, output, ...(input ? { input } : {}), influence, buildTime: BUILD_TIME[id], upkeep: UPKEEP[id] }))
fs.writeFileSync('jeu/assets/data/batiments.json', lines(buildings))
fs.writeFileSync('jeu/assets/data/lois.json', lines(LAWS))
console.log('batiments.json et lois.json écrits.')
