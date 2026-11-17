// Assemble le fichier HTML unique : CSS (polices en base64), données, script, favicon. Aucune ressource externe.
import fs from 'node:fs'
import path from 'node:path'

const safe = text => text.replace(/<\/(script|style)/gi, '<\\/$1')

/** Remplace `url('/fonts/X.ttf')` par la police en base64. */
export function inlineFonts(css, root) {
  return css.replace(/url\((['"]?)\/fonts\/([^'")]+)\1\)/g, (match, quote, file) => {
    const bytes = fs.readFileSync(path.join(root, 'fonts', file))
    return `url(data:font/ttf;base64,${bytes.toString('base64')})`
  })
}

export function assembleHtml({ css, js, data, favicon }) {
  const icon = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="description" content="Camelot : La Première Pierre, un citybuilder arthurien en Three.js." />
<meta name="theme-color" content="#1b1838" />
<title>Camelot : La Première Pierre</title>
<link rel="icon" type="image/svg+xml" href="${icon}" />
<style>${safe(css)}</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="ui"></div>
<script type="application/json" id="camelot-data">${safe(JSON.stringify(data))}</script>
<script>${safe(js)}</script>
</body>
</html>
`
}
