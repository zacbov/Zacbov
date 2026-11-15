import { ghost } from './ghost.mjs'
export class GLTFLoader { constructor() {} async loadAsync() { return { scene: ghost() } } load(url, done) { done({ scene: ghost() }) } }
