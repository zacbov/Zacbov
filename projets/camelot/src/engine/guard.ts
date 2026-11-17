/** Erreurs journalisées une seule fois par sous-système : une erreur dans un effet ne doit pas figer le jeu. */
const reported = new Set<string>()
let sink: ((name: string, error: unknown) => void) | null = null

export const setErrorSink = (callback: ((name: string, error: unknown) => void) | null): void => { sink = callback }
export const resetGuard = (): void => reported.clear()
export function reportOnce(name: string, error: unknown): void {
  if (reported.has(name)) return
  reported.add(name)
  console.error(`[${name}]`, error)
  sink?.(name, error)
}
export function guard(name: string, run: () => void): void {
  try { run() } catch (error) { reportOnce(name, error) }
}
