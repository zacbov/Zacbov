let embedded: Record<string, unknown> | null | undefined

/** Lit une donnée du jeu : d'abord celles intégrées au fichier HTML unique (`#camelot-data`), sinon le fichier servi. */
export async function readData(name: string, url: string): Promise<unknown> {
  if (embedded === undefined) {
    try {
      const node = document.getElementById('camelot-data')
      embedded = node ? (JSON.parse(node.textContent ?? 'null') as Record<string, unknown>) : null
    } catch {
      embedded = null
    }
  }
  if (embedded && name in embedded) return embedded[name]
  return (await fetch(url)).json()
}
