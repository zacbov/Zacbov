export const QUALITY_ORDER = [
    'low',
    'medium',
    'high',
    'ultra'
];
export const lowerQuality = (quality)=>QUALITY_ORDER[Math.max(0, QUALITY_ORDER.indexOf(quality) - 1)];
export function chooseQuality(env) {
    if (env.coarsePointer) return 'low';
    const gpu = env.gpu.toLowerCase();
    if (/mali|adreno|powervr|swiftshader|llvmpipe|software|basic render/.test(gpu)) return 'medium';
    if (gpu.includes('intel') && !gpu.includes('arc')) return 'medium';
    return 'high';
}
const round1 = (value)=>Math.round(value * 10) / 10;
export class DynamicResolution {
    startSeconds;
    scale = 1;
    frames = 0;
    sum = 0;
    lastDrop = -Infinity;
    lastRaise = -Infinity;
    wait = 5;
    floorHits = 0;
    constructor(startSeconds = 0){
        this.startSeconds = startSeconds;
    }
    push(ms, seconds) {
        if (seconds - this.startSeconds < 3.5) return {
            scale: this.scale,
            downgrade: false
        };
        this.sum += ms;
        this.frames += 1;
        if (this.frames < 45) return {
            scale: this.scale,
            downgrade: false
        };
        const average = this.sum / this.frames;
        this.sum = 0;
        this.frames = 0;
        let downgrade = false;
        if (average > 21.5) {
            if (this.scale <= 0.6 + 1e-9) {
                if (average > 26) this.floorHits += 1;
                if (this.floorHits >= 2) {
                    downgrade = true;
                    this.floorHits = 0;
                    this.scale = 1;
                    this.wait = 5;
                    this.lastDrop = seconds;
                }
            } else {
                this.scale = Math.max(0.6, round1(this.scale - (average > 30 ? 0.2 : 0.1)));
                this.lastDrop = seconds;
                this.wait = Math.min(60, this.wait * 2);
            }
        } else if (average < 17.4 && this.scale < 1 && seconds - this.lastDrop >= this.wait && seconds - this.lastRaise >= 1) {
            this.scale = Math.min(1, round1(this.scale + 0.1));
            this.lastRaise = seconds;
        }
        return {
            scale: this.scale,
            downgrade
        };
    }
}
