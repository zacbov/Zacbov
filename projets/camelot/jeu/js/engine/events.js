import { reportOnce } from './guard.js';
export class EventBus {
    listeners = new Map();
    on(name, listener) {
        const set = this.listeners.get(name) ?? new Set();
        set.add(listener);
        this.listeners.set(name, set);
        return ()=>this.off(name, listener);
    }
    off(name, listener) {
        this.listeners.get(name)?.delete(listener);
    }
    emit(name, ...args) {
        const set = this.listeners.get(name);
        if (!set) return;
        for (const listener of [
            ...set
        ]){
            try {
                listener(...args);
            } catch (error) {
                reportOnce(`événement ${name}`, error);
            }
        }
    }
}
