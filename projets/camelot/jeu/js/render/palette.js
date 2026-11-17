const clamp01 = (value)=>Math.max(0, Math.min(1, value));
const smooth = (from, to, x)=>{
    const t = clamp01((x - from) / (to - from));
    return t * t * (3 - 2 * t);
};
const mix = (a, b, t)=>[
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
    ];
const NIGHT = {
    zenith: [
        0.01,
        0.015,
        0.05
    ],
    horizon: [
        0.04,
        0.06,
        0.13
    ]
};
const DUSK = {
    zenith: [
        0.12,
        0.16,
        0.36
    ],
    horizon: [
        0.95,
        0.5,
        0.28
    ]
};
const DAY = {
    zenith: [
        0.1,
        0.28,
        0.62
    ],
    horizon: [
        0.62,
        0.76,
        0.88
    ]
};
const SEASON_TINT = [
    [
        1,
        1,
        1
    ],
    [
        1.02,
        1.02,
        0.98
    ],
    [
        1.08,
        0.98,
        0.88
    ],
    [
        0.92,
        0.98,
        1.08
    ]
];
export function skyColors(elevation, season) {
    const day = smooth(-0.02, 0.4, elevation);
    const twilight = smooth(-0.25, 0, elevation) * (1 - smooth(0, 0.3, elevation));
    const tint = SEASON_TINT[Math.max(0, Math.min(3, Math.floor(season)))];
    const tinted = (color)=>[
            color[0] * tint[0],
            color[1] * tint[1],
            color[2] * tint[2]
        ];
    const zenith = tinted(mix(mix(NIGHT.zenith, DAY.zenith, day), DUSK.zenith, twilight * 0.8));
    const horizon = tinted(mix(mix(NIGHT.horizon, DAY.horizon, day), DUSK.horizon, twilight));
    const sunVisible = elevation > -0.05 ? 1 : 0;
    const sun = mix([
        1,
        0.45,
        0.2
    ], [
        1,
        0.93,
        0.8
    ], smooth(0, 0.45, elevation)).map((value)=>value * sunVisible);
    return {
        zenith,
        horizon,
        ground: [
            horizon[0] * 0.5,
            horizon[1] * 0.5,
            horizon[2] * 0.5
        ],
        sun,
        clouds: season === 3 ? 0.85 : season === 2 ? 0.7 : 0.55
    };
}
