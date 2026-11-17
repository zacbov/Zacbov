export const AVAILABLE_BUILDINGS = new Set([
    'road',
    'cottage',
    'farm',
    'sawmill',
    'quarry',
    'warehouse',
    'fishery',
    'pasture',
    'lodge',
    'bakery',
    'carpentry',
    'ramparts',
    'keep',
    'cathedral',
    'tavern',
    'market',
    'hall'
]);
const icon = (paths)=>`<svg viewBox="0 0 32 32">${paths}</svg>`;
export const BUILDING_ICONS = {
    road: icon('<path d="M12 28 14 4M20 28 18 4M16 26v-3M16 19v-4M16 11V8"/>'),
    cottage: icon('<path d="M4 15 16 5l12 10v13H4Z"/><path d="M12 28V18h8v10M7 14l9-7 9 7"/>'),
    farm: icon('<path d="M4 26h24M6 26V14h20v12M4 14l12-8 12 8M10 20h12"/>'),
    warehouse: icon('<path d="M4 14 16 6l12 8v14H4ZM9 28V18h14v10M9 22h14"/>'),
    fishery: icon('<path d="M4 20c4-6 10-8 16-4l8-4v12l-8-4c-6 4-12 2-16-4Z"/><path d="M9 17h.01"/>'),
    pasture: icon('<path d="M5 24h22M8 24V14l4-3 4 3v10M18 24v-8h8v8"/>'),
    lodge: icon('<path d="M4 26 16 6l12 20ZM13 26v-8h6v8"/>'),
    bakery: icon('<path d="M5 22c0-6 5-10 11-10s11 4 11 10ZM5 22h22v4H5ZM12 9c0-2 2-2 2-4M18 9c0-2 2-2 2-4"/>'),
    carpentry: icon('<path d="M5 24h22M8 24V10h16v14M12 14h8M12 18h8M4 10h24"/>'),
    sawmill: icon('<path d="M4 26h24M7 23V10h18v13M5 10h22l-3-5H8Z"/><path d="M11 15h10M11 19h10"/>'),
    quarry: icon('<path d="m4 26 7-14 5 7 5-12 7 19Z"/><path d="M9 26h16M13 22h10"/>'),
    ramparts: icon('<path d="M6 28V8h4v3h4V8h4v3h4V8h4v20ZM13 28v-7h6v7"/>'),
    keep: icon('<path d="M5 28V9h7V5h8v4h7v19ZM9 9V5h4v4m6 0V5h4v4M13 28V17h6v11"/><path d="M8 14h2m5 0h2m5 0h2"/>'),
    cathedral: icon('<path d="M16 3v6M13 6h6M8 28V16l8-7 8 7v12ZM13 28v-7h6v7"/>'),
    tavern: icon('<path d="M8 11h14v10a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5ZM22 13h3a3 3 0 0 1 0 6h-3M12 6v2M16 6v2"/>'),
    market: icon('<path d="M5 12h22l-2-6H7ZM7 12v14M25 12v14M5 26h22M11 18h10"/>'),
    hall: icon('<path d="M4 12 16 5l12 7ZM7 14v11M13 14v11M19 14v11M25 14v11M4 27h24"/>')
};
