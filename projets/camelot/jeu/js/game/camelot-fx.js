export const createSmoke = (count)=>Array.from({
        length: count
    }, ()=>({
            x: 0,
            y: 0,
            z: 0,
            age: 1,
            life: 0,
            drift: 0
        }));
export function stepSmoke(puffs, sources, dt, wind, random = Math.random) {
    for (const puff of puffs){
        if (puff.age < puff.life) {
            puff.age += dt;
            puff.y += 0.42 * dt;
            puff.x += (wind + puff.drift) * dt;
            puff.z += puff.drift * 0.5 * dt;
        } else if (sources.length && random() < Math.min(1, dt * 0.5)) {
            const source = sources[Math.floor(random() * sources.length) % sources.length];
            puff.x = source.x + (random() - 0.5) * 0.1;
            puff.y = source.y;
            puff.z = source.z + (random() - 0.5) * 0.1;
            puff.age = 0;
            puff.life = 2.5 + random() * 2;
            puff.drift = (random() - 0.5) * 0.12;
        }
    }
}
export const smokeAlpha = (puff)=>puff.age >= puff.life || puff.life <= 0 ? 0 : Math.sin(Math.PI * puff.age / puff.life) * 0.55;
export const smokeSize = (puff)=>0.14 + (puff.life > 0 ? 0.32 * (puff.age / puff.life) : 0);
