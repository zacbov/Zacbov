export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return { url: new URL('./three-stub.mjs', import.meta.url).href, shortCircuit: true }
  if (specifier.startsWith('three/examples/jsm/')) return { url: new URL('./gltf-stub.mjs', import.meta.url).href, shortCircuit: true }
  return nextResolve(specifier, context)
}
