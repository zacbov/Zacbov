import { countBuildings } from './camelot-rules.js';
export const STORY_SAVE_KEY = 'camelot.story.v1';
export const STORY_TICK_SECONDS = 24;
const RESOURCES = [
    'wood',
    'stone',
    'food',
    'gold'
];
const GAUGES = [
    'honneur',
    'piete',
    'concorde'
];
const clamp = (value, min, max)=>Math.max(min, Math.min(max, value));
export const ENDINGS = [
    'avalon',
    'apaise',
    'salesbieres'
];
export const CHAPTERS = [
    {
        volume: 'Estoire del Saint Graal',
        title: 'Les premières pierres',
        goal: 'Achever une scierie et une carrière.'
    },
    {
        volume: 'Estoire de Merlin',
        title: 'Le donjon d’Arthur',
        goal: 'Achever le donjon (Lancelot).'
    },
    {
        volume: 'Lancelot en prose',
        title: 'La Table Ronde',
        goal: 'Achever la cathédrale (Galaad).'
    },
    {
        volume: 'Queste del Saint Graal',
        title: 'La Queste',
        goal: 'Mener la Queste du Graal à son terme.'
    },
    {
        volume: 'Mort le Roi Artu',
        title: 'Le crépuscule',
        goal: 'Traverser la chute du royaume jusqu’à Salesbières.'
    }
];
export function advanceChapter(story, city) {
    const done = story.era === 1 ? countBuildings(city, 'sawmill') > 0 && countBuildings(city, 'quarry') > 0 : story.era === 2 ? city.won : story.era === 3 ? countBuildings(city, 'cathedral') > 0 : story.era === 4 ? story.flags.includes('queste-achevee') : false;
    return done ? {
        ...story,
        era: story.era + 1
    } : story;
}
export function endingFor(story) {
    if (story.flags.includes('graal-trouve') && story.flags.includes('verite-dite') && story.gauges.piete >= 60) return 'avalon';
    if (story.gauges.concorde >= 65 && !story.flags.includes('rumeur-etouffee')) return 'apaise';
    return 'salesbieres';
}
export const initialStory = ()=>({
        era: 1,
        gauges: {
            honneur: 50,
            piete: 50,
            concorde: 50
        },
        flags: [],
        seen: []
    });
export function isEligible(event, story, city) {
    if (story.seen.includes(event.id) || event.era > story.era) return false;
    const need = event.requires ?? {};
    return Object.entries(need.buildings ?? {}).every(([kind, count])=>countBuildings(city, kind) >= (count ?? 0)) && (need.flags ?? []).every((flag)=>story.flags.includes(flag)) && (need.seen ?? []).every((id)=>story.seen.includes(id)) && !(need.notFlags ?? []).some((flag)=>story.flags.includes(flag));
}
export function pickEvent(events, story, city, random = Math.random) {
    for (const era of [
        story.era,
        story.era + 1
    ]){
        const pool = events.filter((event)=>isEligible(event, {
                ...story,
                era
            }, city));
        if (pool.length) return pool[Math.floor(random() * pool.length)];
    }
    return null;
}
export function canChoose(choice, resources) {
    return RESOURCES.every((resource)=>resources[resource] + (choice.effects[resource] ?? 0) >= 0);
}
export function applyChoice(event, choice, resources, story) {
    const nextResources = {
        ...resources
    };
    for (const resource of RESOURCES)nextResources[resource] = clamp(resources[resource] + (choice.effects[resource] ?? 0), 0, 999);
    const gauges = {
        ...story.gauges
    };
    for (const gauge of GAUGES)gauges[gauge] = clamp(gauges[gauge] + (choice.effects[gauge] ?? 0), 0, 100);
    const flags = [
        ...new Set([
            ...story.flags,
            ...(choice.effects.flag ?? '').split(',').filter(Boolean)
        ])
    ];
    const next = {
        era: Math.max(story.era, choice.effects.era ?? 0),
        gauges,
        flags,
        seen: [
            ...story.seen,
            event.id
        ]
    };
    if (choice.effects.ending) next.ending = endingFor(next);
    else if (story.ending) next.ending = story.ending;
    return {
        resources: nextResources,
        story: next
    };
}
export function restoreStory(raw) {
    const fallback = initialStory();
    try {
        const data = JSON.parse(raw ?? 'null');
        if (!data || typeof data !== 'object') return fallback;
        const gauges = {
            ...fallback.gauges
        };
        for (const gauge of GAUGES){
            const value = data.gauges?.[gauge];
            if (typeof value === 'number' && Number.isFinite(value)) gauges[gauge] = clamp(Math.round(value), 0, 100);
        }
        const strings = (list)=>Array.isArray(list) ? list.filter((item)=>typeof item === 'string') : [];
        return {
            era: clamp(Number.isInteger(data.era) ? data.era : 1, 1, 5),
            gauges,
            flags: strings(data.flags),
            seen: strings(data.seen),
            ...typeof data.ending === 'string' && ENDINGS.includes(data.ending) ? {
                ending: data.ending
            } : {}
        };
    } catch  {
        return fallback;
    }
}
