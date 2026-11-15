// Objet « fantôme » : accepte tout accès, tout appel et toute affectation, pour exécuter le code 3D sans WebGL.
export function ghost() {
  const props = new Map()
  const self = new Proxy(function () {}, {
    get(_target, prop) {
      if (props.has(prop)) return props.get(prop)
      if (prop === Symbol.toPrimitive) return () => 0
      if (typeof prop === 'symbol' || prop === 'then') return undefined
      if (prop === 'isMesh') return true
      if (prop === 'children') { const list = []; props.set(prop, list); return list }
      if (prop === 'userData') { const data = {}; props.set(prop, data); return data }
      if (prop === 'add') return (...items) => { self.children.push(...items); return self }
      if (prop === 'remove') return (...items) => { const list = self.children; for (const item of items) { const at = list.indexOf(item); if (at >= 0) list.splice(at, 1) } return self }
      if (prop === 'traverse') return callback => { callback(self); for (const child of self.children) child.traverse?.(callback) }
      if (prop === 'clone') return () => ghost()
      const child = ghost()
      props.set(prop, child)
      return child
    },
    set(_target, prop, value) { props.set(prop, value); return true },
    apply() { return self },
    construct() { return ghost() },
    has(_target, prop) { return props.has(prop) },
  })
  return self
}
