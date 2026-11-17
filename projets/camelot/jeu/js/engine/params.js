const LEVELS = [
    'low',
    'medium',
    'high',
    'ultra'
];
function number(raw, min, max, integer = false) {
    if (raw === null || raw === '') return null;
    const value = Number(raw);
    if (!Number.isFinite(value)) return null;
    const bounded = Math.max(min, Math.min(max, value));
    return integer ? Math.floor(bounded) : bounded;
}
export function parseParams(search) {
    const query = new URLSearchParams(search);
    const quality = query.get('q');
    const seed = Number(query.get('seed'));
    return {
        quality: quality && LEVELS.includes(quality) ? quality : null,
        dynamicResolution: query.get('dyn') !== '0',
        bloom: query.get('bloom') !== '0',
        fps: query.get('fps') === '1',
        seed: query.get('seed') !== null && Number.isFinite(seed) ? Math.floor(seed) : null,
        light: query.get('light') !== '0',
        ao: query.get('ao') !== '0',
        tex: query.get('tex') !== '0',
        grade: query.get('grade') !== '0',
        exposure: query.get('exposure') !== '0',
        soft: query.get('soft') !== '0',
        vue: query.get('vue'),
        heure: number(query.get('heure'), 0, 1),
        saison: number(query.get('saison'), 0, 3, true),
        key: number(query.get('key'), 0.05, 1) ?? 0.32
    };
}
