import { setErrorSink } from './guard'

/** Bandeau d'erreur visible à l'écran (sur téléphone, il n'y a pas de console). Une seule erreur affichée. */
export function installFatalPanel(): void {
  let shown = false
  const show = (name: string, error: unknown): void => {
    if (shown) return
    shown = true
    const panel = document.createElement('div')
    panel.className = 'fatal-banner'
    panel.setAttribute('role', 'alert')
    const detail = String((error as Error)?.message ?? error).replace(/[<>&]/g, '')
    panel.innerHTML = `<b>Une erreur est survenue (${name.replace(/[<>&]/g, '')}).</b> ${detail} <button type="button">Recharger</button>`
    panel.querySelector('button')!.addEventListener('click', () => location.reload())
    document.body.appendChild(panel)
  }
  setErrorSink(show)
  window.addEventListener('error', event => show('script', event.error ?? event.message))
  window.addEventListener('unhandledrejection', event => show('promesse', event.reason))
}
