export const SAVE_KEY = 'game3d.save';
export const LEADERBOARD_SIZE = 10;
export function defaultSave() {
    return {
        version: 1,
        locale: '',
        musicVolume: 0.7,
        sfxVolume: 0.8,
        muted: false,
        sensitivity: 1,
        invertY: false,
        quality: 'high',
        reducedMotion: false,
        tutorialDone: false,
        playerName: 'PLAYER',
        leaderboard: []
    };
}
const clamp01 = (v, fallback)=>typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
export function parseSave(raw) {
    const base = defaultSave();
    if (!raw) return base;
    let data;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base;
        data = parsed;
    } catch  {
        return base;
    }
    if (data.version !== 1) return base;
    const board = Array.isArray(data.leaderboard) ? data.leaderboard : [];
    return {
        version: 1,
        locale: data.locale === 'en' || data.locale === 'zh-CN' ? data.locale : '',
        musicVolume: clamp01(data.musicVolume, base.musicVolume),
        sfxVolume: clamp01(data.sfxVolume, base.sfxVolume),
        muted: data.muted === true,
        sensitivity: typeof data.sensitivity === 'number' && data.sensitivity >= 0.2 && data.sensitivity <= 3 ? data.sensitivity : base.sensitivity,
        invertY: data.invertY === true,
        quality: data.quality === 'low' || data.quality === 'medium' || data.quality === 'high' || data.quality === 'ultra' ? data.quality : base.quality,
        reducedMotion: data.reducedMotion === true,
        tutorialDone: data.tutorialDone === true,
        playerName: typeof data.playerName === 'string' && data.playerName.trim() ? data.playerName.trim().slice(0, 16) : base.playerName,
        leaderboard: board.filter((e)=>!!e && typeof e === 'object' && typeof e.name === 'string' && Number.isFinite(e.score)).map((e)=>({
                name: e.name.slice(0, 16),
                score: Math.max(0, Math.floor(e.score)),
                seconds: Number.isFinite(e.seconds) ? e.seconds : 0,
                at: Number.isFinite(e.at) ? e.at : 0
            })).slice(0, LEADERBOARD_SIZE)
    };
}
export function insertScore(board, entry) {
    const next = [
        ...board,
        entry
    ].sort((a, b)=>b.score - a.score || a.seconds - b.seconds || a.at - b.at).slice(0, LEADERBOARD_SIZE);
    return {
        board: next,
        rank: next.indexOf(entry)
    };
}
export class SaveStore {
    storage;
    data;
    constructor(storage = globalThis.localStorage){
        this.storage = storage;
        let raw = null;
        try {
            raw = this.storage?.getItem(SAVE_KEY) ?? null;
        } catch  {
            raw = null;
        }
        this.data = parseSave(raw);
    }
    update(patch) {
        this.data = {
            ...this.data,
            ...patch
        };
        try {
            this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data));
        } catch  {}
    }
}
