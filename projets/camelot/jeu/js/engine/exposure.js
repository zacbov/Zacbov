export const EXPOSURE_MIN = 0.6;
export const EXPOSURE_MAX = 2;
export const targetExposure = (luminance, key = 0.32)=>Math.max(EXPOSURE_MIN, Math.min(EXPOSURE_MAX, key / Math.max(luminance, 0.02)));
export function stepExposure(current, target, dt) {
    return current + (target - current) * (1 - Math.exp(-dt / 1.5));
}
export const centerWeight = (x, y)=>Math.exp(-(x * x + y * y) * 2);
