export function seededRandom(seed) {
    let state = seed >>> 0;
    return ()=>{
        state = state + 0x6d2b79f5 >>> 0;
        let t = Math.imul(state ^ state >>> 15, 1 | state);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
const empty = ()=>({
        positions: [],
        normals: [],
        uvs: [],
        colors: [],
        indices: []
    });
export function bevelBox(w, h, d, bevel = 0.02) {
    const half = [
        w / 2,
        h / 2,
        d / 2
    ];
    const b = Math.min(bevel, ...half);
    const mesh = empty();
    const polygon = (vertices, normal)=>{
        const length = Math.hypot(...normal);
        const n = normal.map((value)=>value / length);
        const first = vertices[0], second = vertices[1], third = vertices[2];
        const u = second.map((value, i)=>value - first[i]), v = third.map((value, i)=>value - first[i]);
        const cross = [
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0]
        ];
        const ordered = cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2] >= 0 ? vertices : [
            ...vertices
        ].reverse();
        const base = mesh.positions.length / 3;
        const axis = n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));
        for (const vertex of ordered){
            mesh.positions.push(...vertex);
            mesh.normals.push(...n);
            mesh.uvs.push(...axis === 0 ? [
                vertex[2],
                vertex[1]
            ] : axis === 1 ? [
                vertex[0],
                vertex[2]
            ] : [
                vertex[0],
                vertex[1]
            ]);
            mesh.colors.push(1, 1, 1);
        }
        for(let i = 1; i < ordered.length - 1; i += 1)mesh.indices.push(base, base + i, base + i + 1);
    };
    const signs = [
        -1,
        1
    ];
    const point = (values)=>values;
    for(let a = 0; a < 3; a += 1){
        for (const sa of signs){
            const o1 = (a + 1) % 3, o2 = (a + 2) % 3;
            const corners = [
                [
                    -1,
                    -1
                ],
                [
                    1,
                    -1
                ],
                [
                    1,
                    1
                ],
                [
                    -1,
                    1
                ]
            ].map(([s1, s2])=>{
                const p = [
                    0,
                    0,
                    0
                ];
                p[a] = sa * half[a];
                p[o1] = s1 * (half[o1] - b);
                p[o2] = s2 * (half[o2] - b);
                return point(p);
            });
            const normal = [
                0,
                0,
                0
            ];
            normal[a] = sa;
            polygon(corners, normal);
        }
    }
    for(let a = 0; a < 3; a += 1){
        for(let c = a + 1; c < 3; c += 1){
            const third = 3 - a - c;
            for (const sa of signs)for (const sc of signs)for (const st of signs){
                const p = [
                    0,
                    0,
                    0
                ], q = [
                    0,
                    0,
                    0
                ], r = [
                    0,
                    0,
                    0
                ], s = [
                    0,
                    0,
                    0
                ];
                p[a] = sa * half[a];
                p[c] = sc * (half[c] - b);
                p[third] = st * (half[third] - b);
                q[a] = sa * (half[a] - b);
                q[c] = sc * half[c];
                q[third] = st * (half[third] - b);
                r[a] = sa * (half[a] - b);
                r[c] = sc * half[c];
                r[third] = -st * (half[third] - b);
                s[a] = sa * half[a];
                s[c] = sc * (half[c] - b);
                s[third] = -st * (half[third] - b);
                if (st === -1) continue;
                const normal = [
                    0,
                    0,
                    0
                ];
                normal[a] = sa;
                normal[c] = sc;
                polygon([
                    p,
                    q,
                    r,
                    s
                ], normal);
            }
        }
    }
    for (const sx of signs)for (const sy of signs)for (const sz of signs){
        polygon([
            [
                sx * half[0],
                sy * (half[1] - b),
                sz * (half[2] - b)
            ],
            [
                sx * (half[0] - b),
                sy * half[1],
                sz * (half[2] - b)
            ],
            [
                sx * (half[0] - b),
                sy * (half[1] - b),
                sz * half[2]
            ]
        ], [
            sx,
            sy,
            sz
        ]);
    }
    return mesh;
}
export function placeMesh(mesh, x, y, z, ry = 0) {
    const cos = Math.cos(ry), sin = Math.sin(ry);
    const out = {
        ...mesh,
        positions: [
            ...mesh.positions
        ],
        normals: [
            ...mesh.normals
        ]
    };
    for(let i = 0; i < out.positions.length; i += 3){
        const px = out.positions[i], pz = out.positions[i + 2];
        out.positions[i] = px * cos + pz * sin + x;
        out.positions[i + 1] += y;
        out.positions[i + 2] = -px * sin + pz * cos + z;
        const nx = out.normals[i], nz = out.normals[i + 2];
        out.normals[i] = nx * cos + nz * sin;
        out.normals[i + 2] = -nx * sin + nz * cos;
    }
    return out;
}
export function tintMesh(mesh, rgb, variation, random) {
    const shade = 1 + (random() - 0.5) * 2 * variation;
    const colors = [];
    for(let i = 0; i < mesh.colors.length; i += 3)colors.push(rgb[0] * shade, rgb[1] * shade, rgb[2] * shade);
    return {
        ...mesh,
        colors
    };
}
export function mergeMeshes(list) {
    const merged = empty();
    for (const mesh of list){
        const offset = merged.positions.length / 3;
        merged.positions.push(...mesh.positions);
        merged.normals.push(...mesh.normals);
        merged.uvs.push(...mesh.uvs);
        merged.colors.push(...mesh.colors);
        merged.indices.push(...mesh.indices.map((index)=>index + offset));
    }
    return merged;
}
export function hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [
        (value >> 16 & 255) / 255,
        (value >> 8 & 255) / 255,
        (value & 255) / 255
    ];
}
