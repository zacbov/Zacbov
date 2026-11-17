import { reportOnce } from './guard'

type Listener = (...args: any[]) => void

/**
 * Bus d'événements entre les domaines (monde, interface, effets). Le jeu émet (`toast`, `change`,
 * `event`, `hover`, `win`, `defeat`, `ending`) ; l'interface et les effets écoutent sans que la logique les appelle.
 */
export class EventBus {
  private readonly listeners = new Map<string, Set<Listener>>()

  on(name: string, listener: Listener): () => void {
    const set = this.listeners.get(name) ?? new Set<Listener>()
    set.add(listener)
    this.listeners.set(name, set)
    return () => this.off(name, listener)
  }

  off(name: string, listener: Listener): void {
    this.listeners.get(name)?.delete(listener)
  }

  emit(name: string, ...args: unknown[]): void {
    const set = this.listeners.get(name)
    if (!set) return
    for (const listener of [...set]) {
      try { listener(...args) } catch (error) { reportOnce(`événement ${name}`, error) }
    }
  }
}
