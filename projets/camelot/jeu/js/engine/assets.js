import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export class Assets {
    manager = new THREE.LoadingManager();
    gltfLoader = new GLTFLoader(this.manager);
    textureLoader = new THREE.TextureLoader(this.manager);
    cache = new Map();
    listeners = new Set();
    constructor(){
        this.manager.onProgress = (_url, loaded, total)=>{
            const progress = total > 0 ? loaded / total : 1;
            for (const fn of this.listeners)fn(progress);
        };
    }
    onProgress(fn) {
        this.listeners.add(fn);
        return ()=>this.listeners.delete(fn);
    }
    gltf(url) {
        return this.memo(url, ()=>this.gltfLoader.loadAsync(url));
    }
    texture(url, { color = true, repeat } = {}) {
        return this.memo(`${url}#${color}#${repeat ?? 1}`, async ()=>{
            const tex = await this.textureLoader.loadAsync(url);
            if (color) tex.colorSpace = THREE.SRGBColorSpace;
            if (repeat) {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.repeat.set(repeat, repeat);
            }
            return tex;
        });
    }
    memo(key, load) {
        let pending = this.cache.get(key);
        if (!pending) {
            pending = load();
            this.cache.set(key, pending);
            pending.catch(()=>this.cache.delete(key));
        }
        return pending;
    }
}
