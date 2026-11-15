const KEY_BINDINGS = {
    jump: [
        'Space'
    ],
    sprint: [
        'ShiftLeft',
        'ShiftRight'
    ],
    dash: [
        'KeyF',
        'KeyJ'
    ],
    pause: [
        'Escape',
        'KeyP'
    ],
    confirm: [
        'Enter',
        'NumpadEnter'
    ],
    back: [],
    interact: [
        'KeyE'
    ]
};
const MOVE_KEYS = {
    up: [
        'KeyW',
        'ArrowUp'
    ],
    down: [
        'KeyS',
        'ArrowDown'
    ],
    left: [
        'KeyA',
        'ArrowLeft'
    ],
    right: [
        'KeyD',
        'ArrowRight'
    ]
};
const PAD_BINDINGS = {
    jump: [
        0
    ],
    sprint: [
        4,
        10
    ],
    dash: [
        2,
        5,
        7
    ],
    pause: [
        9
    ],
    confirm: [
        0
    ],
    back: [
        1
    ],
    interact: [
        3
    ]
};
export class Input {
    canvas;
    move = {
        x: 0,
        y: 0
    };
    look = {
        x: 0,
        y: 0
    };
    method = 'keyboard';
    sensitivity = 1;
    invertY = false;
    keys = new Set();
    held_ = new Set();
    pressed_ = new Set();
    touchMove = {
        x: 0,
        y: 0
    };
    touchButtons = new Set();
    padPrev = [];
    padIndex = -1;
    padId = '';
    listeners = [];
    constructor(canvas){
        this.canvas = canvas;
        const on = (target, type, fn, opts)=>{
            target.addEventListener(type, fn, opts);
            this.listeners.push(()=>target.removeEventListener(type, fn, opts));
        };
        on(window, 'keydown', (e)=>{
            if (e.repeat) return;
            this.keys.add(e.code);
            this.method = 'keyboard';
            for (const [action, codes] of Object.entries(KEY_BINDINGS)){
                if (codes.includes(e.code)) this.pressed_.add(action);
            }
            const typing = e.target?.matches?.('input, textarea');
            if (!typing && (e.code === 'Space' || e.code.startsWith('Arrow'))) e.preventDefault();
        });
        on(window, 'keyup', (e)=>this.keys.delete(e.code));
        on(window, 'blur', ()=>this.keys.clear());
        on(window, 'gamepaddisconnected', (e)=>{
            if (e.gamepad.index === this.padIndex) this.resetPad();
        });
        on(window, 'mousedown', (e)=>{
            if (document.pointerLockElement === canvas && e.button === 0) this.pressed_.add('dash');
        });
        on(window, 'mousemove', (e)=>{
            if (document.pointerLockElement !== canvas) return;
            this.look.x += e.movementX * 0.0022;
            this.look.y += e.movementY * 0.0022;
        });
    }
    lockPointer() {
        if (this.method !== 'touch' && document.pointerLockElement !== this.canvas) {
            this.canvas.requestPointerLock?.()?.catch?.(()=>undefined);
        }
    }
    unlockPointer() {
        if (document.pointerLockElement) document.exitPointerLock();
    }
    setTouchMove(x, y) {
        this.method = 'touch';
        this.touchMove.x = x;
        this.touchMove.y = y;
    }
    addTouchLook(dx, dy) {
        this.method = 'touch';
        this.look.x += dx * 0.006;
        this.look.y += dy * 0.006;
    }
    setTouchButton(action, down) {
        this.method = 'touch';
        if (down && !this.touchButtons.has(action)) this.pressed_.add(action);
        if (down) this.touchButtons.add(action);
        else this.touchButtons.delete(action);
    }
    resetPad() {
        this.padPrev = [];
        this.padIndex = -1;
        this.padId = '';
    }
    update(frameSeconds = 1 / 60) {
        const k = (codes)=>codes.some((code)=>this.keys.has(code));
        let x = (k(MOVE_KEYS.right) ? 1 : 0) - (k(MOVE_KEYS.left) ? 1 : 0);
        let y = (k(MOVE_KEYS.up) ? 1 : 0) - (k(MOVE_KEYS.down) ? 1 : 0);
        this.held_.clear();
        for (const [action, codes] of Object.entries(KEY_BINDINGS)){
            if (k(codes)) this.held_.add(action);
        }
        for (const action of this.touchButtons)this.held_.add(action);
        if (this.touchMove.x !== 0 || this.touchMove.y !== 0) {
            x = this.touchMove.x;
            y = this.touchMove.y;
        }
        const pad = navigator.getGamepads?.().find((p)=>p && p.connected);
        if (pad) {
            if (pad.index !== this.padIndex || pad.id !== this.padId) this.padPrev = [];
            this.padIndex = pad.index;
            this.padId = pad.id;
            const dead = (v)=>Math.abs(v) < 0.18 ? 0 : v;
            const lx = dead(pad.axes[0] ?? 0);
            const ly = dead(pad.axes[1] ?? 0);
            const rx = dead(pad.axes[2] ?? 0);
            const ry = dead(pad.axes[3] ?? 0);
            const padActive = lx !== 0 || ly !== 0 || rx !== 0 || ry !== 0 || pad.buttons.some((b)=>b.pressed);
            if (padActive) this.method = 'gamepad';
            const dx = (pad.buttons[15]?.pressed ? 1 : 0) - (pad.buttons[14]?.pressed ? 1 : 0);
            const dy = (pad.buttons[12]?.pressed ? 1 : 0) - (pad.buttons[13]?.pressed ? 1 : 0);
            if (lx !== 0 || ly !== 0 || dx !== 0 || dy !== 0) {
                x = dx || lx;
                y = dy || -ly;
            }
            this.look.x += rx * 2.7 * frameSeconds;
            this.look.y += ry * 2.7 * frameSeconds;
            for (const [action, buttons] of Object.entries(PAD_BINDINGS)){
                if (buttons.some((i)=>pad.buttons[i]?.pressed)) this.held_.add(action);
                if (buttons.some((i)=>pad.buttons[i]?.pressed && !this.padPrev[i])) this.pressed_.add(action);
            }
            this.padPrev = pad.buttons.map((b)=>b.pressed);
        } else this.resetPad();
        const len = Math.hypot(x, y);
        this.move.x = len > 1 ? x / len : x;
        this.move.y = len > 1 ? y / len : y;
    }
    held(action) {
        return this.held_.has(action);
    }
    pressed(action) {
        return this.pressed_.has(action);
    }
    consume(action) {
        return this.pressed_.delete(action);
    }
    takeLook() {
        const out = {
            x: this.look.x * this.sensitivity,
            y: this.look.y * this.sensitivity * (this.invertY ? -1 : 1)
        };
        this.look.x = 0;
        this.look.y = 0;
        return out;
    }
    endFrame() {
        this.pressed_.clear();
    }
    dispose() {
        for (const off of this.listeners)off();
        this.listeners = [];
    }
}
