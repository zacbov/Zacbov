import * as THREE from 'three';
import { CONFIG } from './camelot-config.js';
import { EventBus } from '../engine/events.js';
import { guard, reportOnce } from '../engine/guard.js';
import { stepExposure, targetExposure } from '../engine/exposure.js';
import { flags } from '../render/flags.js';
import { skyColors } from '../render/palette.js';
import { SkyRig } from '../render/sky.js';
import { applySurface } from '../render/surface.js';
import { readData } from '../engine/data.js';
import { proceduralModel } from '../render/procedural.js';
import { createSmoke, smokeAlpha, smokeSize, stepSmoke } from './camelot-fx.js';
import { AVAILABLE_BUILDINGS } from './camelot-assets.js';
import { CHAPTERS, advanceChapter, STORY_SAVE_KEY, STORY_TICK_SECONDS, applyChoice, canChoose as storyCanChoose, initialStory, pickEvent, restoreStory } from './camelot-story.js';
import { BUILDINGS, CITY_SAVE_KEY, ECONOMY_TICK_SECONDS, GRID_HEIGHT, GRID_WIDTH, canAfford, checkPlacement, definition, initialCityState, isUnlocked, placeBuilding, population, produceResources, restoreCityState, LAWS, SEASONS, SPELLS, adoptLaw, applyCityEffects, castSpell as castSpellRule, seasonOf, BUILD_TIME, CENTER, DEPOSITS, fortifyWalls, mendWalls, recruitSoldier, setStance, DESTINATIONS, sendExpedition as sendRule, caravanOpen, checkMove, repairBuilding, repairCost, trade as tradeRule, wearOf, depositAt, efficiency, moveBuilding, moveCost, roadDistances, MAX_LEVEL, accessCell, advanceConstruction, demolishBuilding, isComplete, levelOf, roadPath, upgradeBuilding, upgradeCost, KNIGHTS, RADIUS, ringOf, ringUnlocked, sectorOf, terrainAt } from './camelot-rules.js';
const CELL = 1.15;
const clamp = (value, min, max)=>Math.max(min, Math.min(max, value));
const TERRAIN_NAMES = {
    forest: 'une forêt à défricher',
    rock: 'un rocher',
    water: 'de l’eau',
    plain: 'une plaine'
};
const NEAR_NAMES = {
    forest: 'Il faut une forêt à proximité.',
    water: 'Il faut un point d’eau à proximité.',
    rock: 'Il faut un rocher à proximité.'
};
const costText = (cost)=>[
        cost.wood && `${cost.wood} bois`,
        cost.stone && `${cost.stone} pierre`,
        cost.food && `${cost.food} vivres`
    ].filter(Boolean).join(', ');
const SEASON_NOTES = [
    'les champs reverdissent.',
    'les moissons approchent.',
    'récolte : les fermes donnent leur maximum.',
    'le bois de chauffe s’épuise et les champs dorment.'
];
const SEASON_LOOKS = [
    {
        tint: '#ffffff',
        sky: '#b9c7a4'
    },
    {
        tint: '#f6f0c8',
        sky: '#c4cf9b'
    },
    {
        tint: '#eab27c',
        sky: '#c9b08a'
    },
    {
        tint: '#dce8f5',
        sky: '#cdd9e6'
    }
];
const DAY_TICKS = 8;
const NOON = new THREE.Color('#fff2d2');
const SECTOR_COLORS = [
    '#d9a441',
    '#c1504a',
    '#e6e2d3',
    '#4f86b8',
    '#6fa860',
    '#8c6bb1'
];
const VILLAGER_COLORS = {
    builder: '#c8913f',
    worker: '#5f8a56'
};
const materialsOf = (material)=>Array.isArray(material) ? material : [
        material
    ];
export function describe(check) {
    if (check.ok) return '';
    const detail = check.detail ?? '';
    switch(check.reason){
        case 'won':
            return 'Camelot n’a qu’un seul donjon.';
        case 'outside':
            return 'Cette parcelle se trouve hors de la cité.';
        case 'plaza':
            return 'La Table Ronde occupe le cœur de la cité.';
        case 'wall':
            return 'Les remparts occupent cette zone.';
        case 'ring':
            return `Cet anneau s’ouvrira avec ${detail} bâtiments.`;
        case 'terrain':
            return detail === 'plain' ? 'Ce bâtiment demande un rocher.' : `Impossible de bâtir ici : c’est ${TERRAIN_NAMES[detail]}.`;
        case 'near':
            return NEAR_NAMES[detail];
        case 'sector':
            return `Cette structure revient à ${detail} : posez-la dans la zone colorée à son nom (surlignée sur la carte).`;
        case 'occupied':
            return 'Cette parcelle est déjà occupée.';
        case 'requirements':
            return `Il faut d’abord : ${detail}.`;
        case 'road':
            return 'Il faut une route reliée à la Table Ronde.';
        case 'immovable':
            return 'Seul un bâtiment achevé (ni route, ni donjon) peut être déplacé.';
        default:
            return 'Les réserves sont insuffisantes pour bâtir ici.';
    }
}
export class CamelotCity {
    canvas;
    renderer;
    input;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    state;
    selectedBuilding = 'sawmill';
    ghost = null;
    ghostKind = null;
    influence = null;
    lockRings = [];
    ghostCheck = {
        ok: true
    };
    tool = 'view';
    speed = 1;
    smoke = createSmoke(48);
    smokeSprites = [];
    smokeSources = [];
    waterMaterial = null;
    clock = 0;
    caravan = null;
    focusSector = null;
    depositMeshes = new Map();
    ghostInfo = null;
    moveSource = null;
    overlay = 'none';
    overlayGroup = new THREE.Group();
    hemi = null;
    sun = null;
    tiles = null;
    tilesFull = null;
    sectorLabels = [];
    wallMaterial = null;
    defeated = false;
    angry = false;
    season = -1;
    lastReport = null;
    toolHint = null;
    villagers = [];
    story = restoreStory(safeRead(STORY_SAVE_KEY));
    events = [];
    pendingEvent = null;
    storyClock = 0;
    bus = new EventBus();
    seed = 1;
    fixedTime = null;
    debugSeason = null;
    exposureKey = 0.32;
    exposure = 1;
    exposureTarget = 1;
    exposureClock = 0;
    exposureBroken = false;
    sky = null;
    environmentClock = 0;
    bakedLight = -1;
    blobGeometry = null;
    blobMaterial = null;
    scratch = new THREE.Vector3();
    prototypes = new Map();
    placedMeshes = new Map();
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(-2, -2);
    groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    hoverMarker;
    target = new THREE.Vector3(0, 0, 0);
    hoverCell = null;
    zoom = 1.45;
    economyClock = 0;
    ready = false;
    saveTimer = 0;
    constructor(canvas, renderer, input){
        this.canvas = canvas;
        this.renderer = renderer;
        this.input = input;
        this.state = restoreCityState(safeRead(CITY_SAVE_KEY));
        this.setupScene();
        this.hoverMarker = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.1, CELL - 0.1), new THREE.MeshBasicMaterial({
            color: '#83a96b',
            transparent: true,
            opacity: 0.38,
            depthWrite: false,
            side: THREE.DoubleSide
        }));
        this.hoverMarker.rotation.x = -Math.PI / 2;
        this.hoverMarker.position.y = 0.05;
        this.hoverMarker.visible = false;
        this.scene.add(this.hoverMarker);
        this.bindPointer();
        this.updateCamera();
    }
    async load(onProgress) {
        const tasks = [];
        for (const definition of BUILDINGS){
            tasks.push({
                label: `Préparation : ${definition.name.toLowerCase()}`,
                run: async ()=>{
                    const model = proceduralModel(definition.id, this.seed);
                    model.traverse((object)=>{
                        if (object.isMesh) {
                            const mesh = object;
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            mesh.frustumCulled = true;
                        }
                    });
                    this.prototypes.set(definition.id, model);
                }
            });
        }
        let finished = 0;
        onProgress(0.04, 'Le conseil prépare les plans…');
        await Promise.all(tasks.map(async (task)=>{
            await task.run();
            finished += 1;
            onProgress(finished / tasks.length, task.label);
        }));
        try {
            this.events = await readData('evenements', 'assets/data/evenements.json');
        } catch  {
            this.events = [];
        }
        this.ready = true;
        this.syncMeshes();
        guard('ciel', ()=>{
            this.updateLight(0);
            this.sky?.bake(this.scene);
        });
        guard('compilation', ()=>this.renderer.gl?.compile(this.scene, this.camera));
        this.updateHover();
        onProgress(1, 'Les portes de la cité sont ouvertes.');
        this.bus.emit('change');
    }
    get buildingCount() {
        return this.state.buildings.filter((building)=>building.kind !== 'road').length;
    }
    get residents() {
        return population(this.state);
    }
    cellScreenPosition(x, z) {
        const size = definition(this.selectedBuilding).footprint;
        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld(true);
        const point = new THREE.Vector3((x + size / 2 - GRID_WIDTH / 2) * CELL, 0.1, (z + size / 2 - GRID_HEIGHT / 2) * CELL).project(this.camera);
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: rect.left + (point.x + 1) / 2 * rect.width,
            y: rect.top + (1 - point.y) / 2 * rect.height
        };
    }
    isAvailable(kind) {
        return AVAILABLE_BUILDINGS.has(kind);
    }
    resolveEvent(index) {
        const event = this.pendingEvent, choice = event?.choices[index];
        if (!event || !choice || !storyCanChoose(choice, this.state.resources)) return;
        const next = applyChoice(event, choice, this.state.resources, this.story);
        this.state.resources = next.resources;
        this.story = next.story;
        applyCityEffects(this.state, choice.effects);
        while(this.checkChapter()){}
        this.pendingEvent = null;
        this.save();
        this.bus.emit('toast', choice.result, 'good');
        if (choice.effects.ending && next.story.ending) this.bus.emit('ending', next.story.ending);
        this.bus.emit('change');
    }
    canChoose(kind) {
        return isUnlocked(this.state, kind) && canAfford(this.state, kind);
    }
    selectBuilding(kind) {
        this.selectedBuilding = kind;
        this.tool = 'build';
        this.moveSource = null;
        const owner = definition(kind).knight;
        this.focusSector = owner ? KNIGHTS.findIndex((knight)=>knight.id === owner) : null;
        if (owner) this.overlay = 'sectors';
        else if (this.overlay === 'sectors') this.overlay = 'none';
        this.refreshOverlay();
        this.updateHover();
        this.bus.emit('change');
    }
    setSpeed(speed) {
        this.speed = Math.max(0, Math.min(3, Math.round(speed)));
        this.bus.emit('change');
    }
    setOverlay(mode) {
        this.overlay = mode;
        this.refreshOverlay();
        this.bus.emit('change');
    }
    refreshOverlay() {
        for (const child of [
            ...this.overlayGroup.children
        ]){
            this.overlayGroup.remove(child);
            const mesh = child;
            mesh.geometry.dispose();
            mesh.material.dispose();
        }
        const gridOn = this.overlay !== 'none';
        if (this.tiles) this.tiles.visible = gridOn;
        if (this.tilesFull) this.tilesFull.visible = !gridOn;
        for (const label of this.sectorLabels)label.visible = this.overlay === 'sectors';
        const paint = (color, opacity)=>new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                depthWrite: false,
                side: THREE.DoubleSide
            });
        if (this.overlay === 'logistics') {
            const dist = roadDistances(this.state);
            for (const building of this.state.buildings){
                const def = definition(building.kind);
                if (building.kind === 'road' || !isComplete(building) || !Object.keys(def.output).length && !def.input) continue;
                const rate = efficiency(this.state, building, dist);
                const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55 * def.footprint * CELL, 24), paint(rate >= 0.9 ? '#6fbf73' : rate >= 0.75 ? '#e6c84f' : '#d9604f', 0.65));
                disc.rotation.x = Math.PI / 2;
                disc.position.copy(this.cellCenter(building.x, building.z, def.footprint)).setY(0.09);
                this.overlayGroup.add(disc);
            }
        } else if (this.overlay === 'resources') {
            for (const [cellKey, deposit] of this.depositMeshes){
                const [x, z] = cellKey.split(',').map(Number), ratio = (this.state.deposits[cellKey] ?? deposit.max) / deposit.max;
                const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42 * CELL, 16), paint(ratio >= 0.6 ? '#6fbf73' : ratio >= 0.3 ? '#e6c84f' : '#d9604f', 0.6));
                disc.rotation.x = Math.PI / 2;
                disc.position.copy(this.cellCenter(x, z, 1)).setY(0.085);
                this.overlayGroup.add(disc);
            }
        } else if (this.overlay === 'wear') {
            for (const building of this.state.buildings){
                if (building.kind === 'road' || !isComplete(building)) continue;
                const wear = wearOf(building), size = definition(building.kind).footprint;
                const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55 * size * CELL, 24), paint(wear < 30 ? '#6fbf73' : wear < 60 ? '#e6c84f' : '#d9604f', 0.65));
                disc.rotation.x = Math.PI / 2;
                disc.position.copy(this.cellCenter(building.x, building.z, size)).setY(0.09);
                this.overlayGroup.add(disc);
            }
        } else if (this.overlay === 'sectors') {
            KNIGHTS.forEach((_, index)=>{
                const wedge = new THREE.Mesh(new THREE.CircleGeometry(9.5 * CELL, 24, (index * 60 - 30) * Math.PI / 180, Math.PI / 3), paint(SECTOR_COLORS[index], this.focusSector === null ? 0.28 : index === this.focusSector ? 0.42 : 0.06));
                wedge.rotation.x = Math.PI / 2;
                wedge.position.y = 0.075;
                this.overlayGroup.add(wedge);
            });
        }
    }
    seasonIndex() {
        return this.debugSeason ?? seasonOf(this.state);
    }
    updateLight(dt) {
        if (!this.sun || !this.hemi) return;
        const t = this.fixedTime ?? (((this.state.tick ?? 0) + this.economyClock / ECONOMY_TICK_SECONDS) % DAY_TICKS / DAY_TICKS + 0.1) % 1;
        const u = t / 0.6;
        const day = u <= 1 ? Math.sin(Math.PI * u) : 0;
        const light = Math.min(1, day * 1.6);
        if (u <= 1) {
            this.sun.position.set(-20 * Math.cos(Math.PI * u), 6 + 16 * Math.sin(Math.PI * u), 13);
            this.sun.color.set('#ffb36b').lerp(NOON, Math.min(1, day * 2));
        } else {
            this.sun.position.set(0, 14, 10);
            this.sun.color.set('#7f95d6');
        }
        const season = this.seasonIndex();
        const sky = this.sky;
        if (!sky) {
            this.sun.intensity = 0.25 + 2.85 * light;
            this.hemi.intensity = 0.55 + 1.6 * light;
            const tint = SEASON_LOOKS[season].sky;
            this.scene.background.set(tint).multiplyScalar(0.18 + 0.82 * light);
            this.scene.fog?.color.set(tint).multiplyScalar(0.18 + 0.82 * light);
            return;
        }
        this.sun.intensity = 0.15 + 2.7 * light;
        this.hemi.intensity = 0.25 + 0.45 * light;
        const palette = skyColors(u <= 1 ? Math.sin(Math.PI * u) * 0.95 - 0.04 : -0.35, season);
        const direction = this.scratch.copy(this.sun.position).normalize();
        if (u > 1) direction.set(0, -0.4, 0.3).normalize();
        sky.update(direction, palette, this.clock);
        this.scene.fog?.color.setRGB(...palette.horizon);
        this.scene.environmentIntensity = 0.2 + 0.7 * light;
        this.environmentClock += dt;
        if (this.environmentClock > 1.5 && Math.abs(light - this.bakedLight) > 0.06) {
            this.environmentClock = 0;
            this.bakedLight = light;
            sky.bake(this.scene);
        }
    }
    updateExposure(dt) {
        const renderer = this.renderer;
        if (!flags.exposure || this.exposureBroken || !renderer.postProcessing) return;
        this.exposureClock += dt;
        if (this.exposureClock >= 0.5) {
            this.exposureClock = 0;
            try {
                this.exposureTarget = targetExposure(renderer.measureLuminance(this.scene, this.camera), this.exposureKey);
            } catch (error) {
                this.exposureBroken = true;
                reportOnce('exposition', error);
            }
        }
        this.exposure = stepExposure(this.exposure, this.exposureTarget, dt);
        renderer.setExposure(this.exposure);
    }
    debugView(name) {
        const views = {
            plan: [
                0,
                0,
                1.45
            ],
            table: [
                0,
                0,
                0.62
            ],
            foret: [
                6.5,
                4,
                0.62
            ],
            lac: [
                -8,
                1.2,
                0.62
            ],
            remparts: [
                11,
                0,
                0.7
            ],
            batiments: [
                0,
                7,
                0.95
            ]
        };
        const view = views[name];
        if (!view) return;
        this.target.set(view[0], 0, view[1]);
        this.zoom = view[2];
        this.updateCamera();
        if (name === 'batiments') this.showcase();
    }
    showcase() {
        BUILDINGS.forEach((entry, index)=>{
            const root = this.makeRoot(entry.id);
            if (!root) return;
            root.position.set((index - (BUILDINGS.length - 1) / 2) * 1.5, 0.05, 7);
            this.scene.add(root);
        });
    }
    setTool(tool) {
        this.tool = tool;
        this.moveSource = null;
        if (tool === 'view' && this.focusSector !== null) {
            this.focusSector = null;
            this.overlay = 'none';
            this.refreshOverlay();
        }
        this.updateHover();
        this.bus.emit('change');
    }
    checkChapter() {
        const next = advanceChapter(this.story, this.state);
        if (next.era === this.story.era) return false;
        this.story = next;
        const chapter = CHAPTERS[next.era - 1];
        this.bus.emit('toast', `Chapitre ${next.era} : ${chapter.volume}. ${chapter.goal}`, 'good');
        return true;
    }
    castSpell(id) {
        if (this.story.era < 2) {
            this.bus.emit('toast', 'Merlin n’est pas encore venu à Camelot.', 'warn');
            return;
        }
        const result = castSpellRule(this.state, id);
        if (!result.ok) {
            this.bus.emit('toast', result.reason === 'gone' ? 'Merlin n’est plus là.' : 'Il faut 15 deniers pour payer l’enchanteur.', 'warn');
            return;
        }
        Object.assign(this.state, {
            resources: result.state.resources,
            walls: result.state.walls,
            mood: result.state.mood,
            merlin: result.state.merlin
        });
        this.bus.emit('toast', `${SPELLS[id].name} !`, 'good');
        if (this.state.merlin === 0) this.bus.emit('toast', 'Viviane referme son cercle d’air : Merlin ne reviendra pas.', 'warn');
        this.save();
        this.bus.emit('change');
    }
    adoptLaw(id) {
        const result = adoptLaw(this.state, id);
        if (!result.ok) {
            this.bus.emit('toast', result.reason === 'hall' ? 'Le Codex se rédige à l’Hôtel de Ville.' : 'Une loi de ce groupe est déjà adoptée.', 'warn');
            return;
        }
        this.state.laws = result.state.laws;
        this.bus.emit('toast', `Loi adoptée : ${LAWS.find((law)=>law.id === id).name}.`, 'good');
        this.save();
        this.bus.emit('change');
    }
    step(dt) {
        guard('simulation', ()=>this.stepUnsafe(dt));
    }
    stepUnsafe(dt) {
        if (!this.ready) return;
        if (this.state.lost) {
            if (!this.defeated) {
                this.defeated = true;
                this.pendingEvent = null;
                this.save();
                this.bus.emit('defeat', this.state.lost);
            }
            return;
        }
        if (this.pendingEvent) return;
        const scaled = dt * this.speed;
        this.storyClock += scaled;
        if (this.storyClock >= STORY_TICK_SECONDS && !this.pendingEvent) {
            this.storyClock = 0;
            this.pendingEvent = pickEvent(this.events, this.story, this.state);
            if (this.pendingEvent) this.bus.emit('event', this.pendingEvent);
        }
        this.economyClock += scaled;
        if (this.economyClock >= ECONOMY_TICK_SECONDS) {
            this.economyClock %= ECONOMY_TICK_SECONDS;
            const finished = advanceConstruction(this.state);
            const produced = produceResources(this.state, CONFIG.economy.productionMultiplier);
            for (const building of finished){
                if (building.kind === 'keep') {
                    this.story.era = Math.max(this.story.era, 2);
                    this.bus.emit('toast', 'Le donjon est dressé. Camelot peut grandir.', 'good');
                    this.bus.emit('win');
                } else {
                    this.bus.emit('toast', `${definition(building.kind).name} achevé.`, 'good');
                }
            }
            const report = this.state.report;
            if (report && this.lastReport) {
                if (report.season !== this.lastReport.season) this.bus.emit('toast', `${SEASONS[report.season]} : ${SEASON_NOTES[report.season]}`, 'good');
                if (report.starving && !this.lastReport.starving) this.bus.emit('toast', 'Famine : les villageois ont faim, la production ralentit.', 'warn');
                if (report.cold && !this.lastReport.cold) this.bus.emit('toast', 'Le bois de chauffe manque : le froid ralentit le travail.', 'warn');
                if (report.unpaid && !this.lastReport.unpaid) this.bus.emit('toast', 'La caisse est vide : l’entretien n’est plus payé.', 'warn');
                for (const kind of report.exhausted ?? [])if (!this.lastReport.exhausted?.includes(kind)) this.bus.emit('toast', kind === 'sawmill' ? 'La forêt voisine est épuisée : la scierie chôme.' : 'Le rocher est épuisé : la carrière chôme.', 'warn');
            }
            if (report?.crisis) {
                const { kind, repelled } = report.crisis;
                if (kind === 'raid') this.bus.emit('toast', repelled ? 'Assaut saxon repoussé par vos remparts.' : 'Les remparts cèdent : l’assaut saxon pille la cité !', repelled ? 'good' : 'warn');
                else this.bus.emit('toast', kind === 'storm' ? 'Grande tempête : une partie des stocks est perdue.' : 'La fièvre noire frappe le peuple.', 'warn');
            }
            for (const trip of report?.expeditions ?? []){
                const name = KNIGHTS.find((entry)=>entry.id === trip.knight).name, place = DESTINATIONS[trip.dest].name.toLowerCase();
                this.bus.emit('toast', trip.outcome === 'success' ? `${name} revient de l’expédition (${place}) avec du butin.` : trip.outcome === 'wounded' ? `${name} revient blessé de l’expédition (${place}), les mains vides.` : `${name} ne reviendra pas de l’expédition (${place}).`, trip.outcome === 'success' ? 'good' : 'warn');
            }
            const angry = this.state.mood.discontent >= 70;
            if (angry && !this.angry) this.bus.emit('toast', 'Le peuple gronde : la production baisse.', 'warn');
            this.angry = angry;
            const open = caravanOpen(this.state);
            if (this.caravan !== null && open !== this.caravan) this.bus.emit('toast', open ? 'Une caravane de marchands s’installe près du marché : le commerce est ouvert.' : 'La caravane repart.', 'good');
            this.caravan = open;
            while(this.checkChapter()){}
            this.lastReport = report ?? null;
            this.syncMeshes();
            if (finished.length || produced.wood || produced.stone || produced.food) {
                this.save();
                this.updateHover();
                this.bus.emit('change');
            }
        }
        this.saveTimer += dt;
        if (this.saveTimer >= 30) {
            this.saveTimer = 0;
            this.save();
        }
    }
    render(_alpha, frameSeconds) {
        if (this.input.move.x || this.input.move.y) {
            const speed = CONFIG.camera.panSpeed * frameSeconds;
            this.target.x += this.input.move.x * speed;
            this.target.z -= this.input.move.y * speed;
            this.updateCamera();
        }
        guard('villageois', ()=>this.moveVillagers(frameSeconds * this.speed));
        guard('lumière', ()=>this.updateLight(frameSeconds));
        guard('ambiance', ()=>this.updateAtmosphere(frameSeconds));
        guard('exposition', ()=>this.updateExposure(frameSeconds));
        this.sky?.follow(this.camera.position);
        this.renderer.render(this.scene, this.camera, frameSeconds);
    }
    reset() {
        this.state.resources = initialCityState().resources;
        this.state.buildings = initialCityState().buildings;
        Object.assign(this.state, initialCityState());
        delete this.state.lost;
        delete this.state.report;
        this.lastReport = null;
        this.defeated = false;
        this.angry = false;
        this.caravan = null;
        this.season = -1;
        this.state.won = false;
        this.story = initialStory();
        this.pendingEvent = null;
        this.selectedBuilding = 'sawmill';
        this.economyClock = 0;
        for (const mesh of this.placedMeshes.values())this.scene.remove(mesh);
        this.placedMeshes.clear();
        for (const villager of this.villagers)this.scene.remove(villager.mesh);
        this.villagers = [];
        this.syncMeshes();
        this.save();
        this.updateHover();
        this.bus.emit('change');
        this.bus.emit('toast', 'Un nouveau plan de ville vous attend.', 'good');
    }
    dispose() {
        this.sky?.dispose();
        this.canvas.removeEventListener('pointermove', this.handlePointerMove);
        this.canvas.removeEventListener('pointermove', this.handleDragMove);
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
        this.canvas.removeEventListener('pointerup', this.handlePointerUp);
        this.canvas.removeEventListener('contextmenu', this.preventContextMenu);
        this.input.dispose();
    }
    setupScene() {
        this.scene.background = new THREE.Color('#b9c7a4');
        this.scene.fog = new THREE.Fog('#b9c7a4', 62, 118);
        if (flags.light) {
            this.sky = new SkyRig(this.renderer.gl);
            this.scene.add(this.sky.mesh);
        }
        if (flags.ao) {
            this.blobGeometry = new THREE.PlaneGeometry(1, 1);
            this.blobMaterial = new THREE.MeshBasicMaterial({
                map: makeBlobTexture(),
                transparent: true,
                depthWrite: false,
                opacity: 0.55,
                polygonOffset: true,
                polygonOffsetFactor: -2
            });
        }
        this.hemi = new THREE.HemisphereLight('#f9eed2', '#52674a', 2.15);
        this.scene.add(this.hemi, this.overlayGroup);
        const sun = new THREE.DirectionalLight('#fff2d2', 3.1);
        this.sun = sun;
        sun.position.set(-11, 22, 13);
        sun.castShadow = true;
        sun.shadow.mapSize.set(this.renderer.shadowMapSize, this.renderer.shadowMapSize);
        sun.shadow.camera.left = -14;
        sun.shadow.camera.right = 14;
        sun.shadow.camera.top = 14;
        sun.shadow.camera.bottom = -14;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 70;
        sun.shadow.camera.updateProjectionMatrix();
        sun.shadow.bias = -0.00012;
        sun.shadow.normalBias = 0.02;
        sun.shadow.radius = 4;
        sun.shadow.blurSamples = 16;
        this.scene.add(sun);
        const boardWidth = GRID_WIDTH * CELL;
        const boardHeight = GRID_HEIGHT * CELL;
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(boardWidth + 24, boardHeight + 24), applySurface(new THREE.MeshStandardMaterial({
            color: '#718d60',
            roughness: 1
        }), 'ground'));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.08;
        ground.receiveShadow = true;
        this.scene.add(ground);
        const tileGeometry = new THREE.BoxGeometry(CELL - 0.035, 0.075, CELL - 0.035);
        const tiles = new THREE.InstancedMesh(tileGeometry, applySurface(new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 1
        }), 'ground'), GRID_WIDTH * GRID_HEIGHT);
        const full = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 0.075, CELL), applySurface(new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 1
        }), 'ground'), GRID_WIDTH * GRID_HEIGHT);
        const matrix = new THREE.Matrix4(), color = new THREE.Color();
        const base = {
            plain: '#8da477',
            forest: '#557a4a',
            rock: '#8d8b84',
            water: '#5d8fa8'
        };
        let instance = 0;
        for(let z = 0; z < GRID_HEIGHT; z += 1){
            for(let x = 0; x < GRID_WIDTH; x += 1){
                const ring = ringOf(x, z);
                if (ring < 0 || ring === 4 && Math.hypot(x - CENTER, z - CENTER) > 10.45) continue;
                const terrain = terrainAt(x, z);
                matrix.makeTranslation((x + 0.5 - GRID_WIDTH / 2) * CELL, terrain === 'water' ? -0.09 : -0.035, (z + 0.5 - GRID_HEIGHT / 2) * CELL);
                tiles.setMatrixAt(instance, matrix);
                full.setMatrixAt(instance, matrix);
                color.set(ring === 0 ? '#cdbf9a' : ring === 4 ? '#6f8159' : base[terrain]).offsetHSL((sectorOf(x, z) - 2.5) * 0.004, 0, 0);
                full.setColorAt(instance, color);
                color.offsetHSL(0, 0, (x + z) % 2 ? 0.012 : -0.012);
                tiles.setColorAt(instance, color);
                instance += 1;
            }
        }
        tiles.count = instance;
        tiles.instanceMatrix.needsUpdate = true;
        if (tiles.instanceColor) tiles.instanceColor.needsUpdate = true;
        tiles.receiveShadow = true;
        full.count = instance;
        full.instanceMatrix.needsUpdate = true;
        if (full.instanceColor) full.instanceColor.needsUpdate = true;
        full.receiveShadow = true;
        tiles.visible = false;
        this.tiles = tiles;
        this.tilesFull = full;
        this.scene.add(tiles, full);
        this.buildCircle();
        this.plantBorderTrees();
        this.buildAtmosphere();
    }
    plantBorderTrees() {
        const trunkMaterial = applySurface(new THREE.MeshStandardMaterial({
            color: '#73563c',
            roughness: 1
        }), 'foliage');
        const leafMaterials = [
            '#375940',
            '#486b48',
            '#587a4e'
        ].map((color)=>applySurface(new THREE.MeshStandardMaterial({
                color,
                roughness: 1
            }), 'foliage'));
        let seed = 9147;
        const random = ()=>{
            seed = seed * 16807 % 2147483647;
            return (seed - 1) / 2147483646;
        };
        const placeTree = (x, z, size)=>{
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.7, 7), trunkMaterial);
            trunk.position.y = 0.35;
            trunk.castShadow = true;
            tree.add(trunk);
            for(let tier = 0; tier < 3; tier += 1){
                const crown = new THREE.Mesh(new THREE.ConeGeometry(0.54 - tier * 0.09, 0.78, 7), leafMaterials[(seed + tier) % leafMaterials.length]);
                crown.position.y = 0.65 + tier * 0.42;
                crown.castShadow = true;
                crown.receiveShadow = true;
                tree.add(crown);
            }
            tree.position.set(x, 0, z);
            tree.scale.setScalar(size);
            if (this.blobMaterial && this.blobGeometry) {
                const blob = new THREE.Mesh(this.blobGeometry, this.blobMaterial);
                blob.rotation.x = -Math.PI / 2;
                blob.scale.setScalar(1.3);
                blob.position.y = 0.03;
                tree.add(blob);
            }
            this.scene.add(tree);
            return tree;
        };
        const rockMaterial = applySurface(new THREE.MeshStandardMaterial({
            color: '#8b8a84',
            roughness: 1,
            flatShading: true
        }), 'stone');
        for(let z = 0; z < GRID_HEIGHT; z += 1){
            for(let x = 0; x < GRID_WIDTH; x += 1){
                if (ringOf(x, z) < 0) continue;
                const terrain = terrainAt(x, z);
                const px = (x + 0.5 - GRID_WIDTH / 2) * CELL, pz = (z + 0.5 - GRID_HEIGHT / 2) * CELL;
                if (terrain === 'forest') {
                    const size = 0.75 + random() * 0.5;
                    this.depositMeshes.set(`${x},${z}`, {
                        object: placeTree(px + (random() - 0.5) * 0.4, pz + (random() - 0.5) * 0.4, size),
                        base: size,
                        max: DEPOSITS.forest.max
                    });
                } else if (terrain === 'rock') {
                    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34 + random() * 0.2), rockMaterial);
                    rock.position.set(px, 0.2, pz);
                    rock.rotation.set(random() * 3, random() * 3, 0);
                    rock.castShadow = true;
                    this.scene.add(rock);
                    this.depositMeshes.set(`${x},${z}`, {
                        object: rock,
                        base: 1,
                        max: DEPOSITS.rock.max
                    });
                }
            }
        }
        for(let i = 0; i < 40; i += 1){
            const phi = i / 40 * Math.PI * 2 + random() * 0.1;
            const reach = (12.4 + random() * 2.2) * CELL;
            placeTree(Math.cos(phi) * reach, Math.sin(phi) * reach, 0.8 + random() * 0.7);
        }
    }
    buildAtmosphere() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 30);
        gradient.addColorStop(0, 'rgba(235, 232, 225, 0.9)');
        gradient.addColorStop(1, 'rgba(235, 232, 225, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        const texture = new THREE.CanvasTexture(canvas);
        for(let i = 0; i < this.smoke.length; i += 1){
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthWrite: false,
                opacity: 0
            }));
            sprite.visible = false;
            this.scene.add(sprite);
            this.smokeSprites.push(sprite);
        }
        this.waterMaterial = new THREE.MeshBasicMaterial({
            color: '#6aa3bd',
            transparent: true,
            opacity: 0.72
        });
        const surface = new THREE.BoxGeometry(CELL, 0.02, CELL);
        for(let z = 0; z < GRID_HEIGHT; z += 1){
            for(let x = 0; x < GRID_WIDTH; x += 1){
                if (ringOf(x, z) < 0 || terrainAt(x, z) !== 'water') continue;
                const water = new THREE.Mesh(surface, this.waterMaterial);
                water.position.set((x + 0.5 - GRID_WIDTH / 2) * CELL, -0.045, (z + 0.5 - GRID_HEIGHT / 2) * CELL);
                this.scene.add(water);
            }
        }
        const hillMaterial = applySurface(new THREE.MeshStandardMaterial({
            color: '#71906a',
            roughness: 1,
            flatShading: true
        }), 'foliage');
        for(let i = 0; i < 20; i += 1){
            const angle = i / 20 * Math.PI * 2 + i % 3 * 0.11, reach = (19.5 + i % 4 * 2.2) * CELL, size = 1.5 + i % 5 * 0.45;
            const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), hillMaterial);
            hill.scale.set(size * 1.7, size * 0.55, size * 1.4);
            hill.position.set(Math.cos(angle) * reach, -size * 0.18, Math.sin(angle) * reach);
            hill.rotation.y = i;
            hill.receiveShadow = true;
            this.scene.add(hill);
        }
    }
    updateAtmosphere(dt) {
        this.clock += dt;
        this.waterMaterial?.color.setHSL(0.55, 0.38, 0.52 + 0.04 * Math.sin(this.clock * 1.4));
        stepSmoke(this.smoke, this.smokeSources, dt, 0.22 + 0.08 * Math.sin(this.clock * 0.3));
        this.smoke.forEach((puff, index)=>{
            const sprite = this.smokeSprites[index], alpha = smokeAlpha(puff);
            sprite.visible = alpha > 0.01;
            if (!sprite.visible) return;
            sprite.position.set(puff.x, puff.y, puff.z);
            sprite.scale.setScalar(smokeSize(puff));
            sprite.material.opacity = alpha;
        });
        for (const mesh of this.placedMeshes.values()){
            const frame = mesh.userData.frame;
            if (frame?.visible) frame.scale.setScalar(1 + 0.02 * Math.sin(this.clock * 6 + mesh.position.x));
        }
    }
    buildCircle() {
        const wallMaterial = applySurface(new THREE.MeshStandardMaterial({
            color: '#a9a499',
            roughness: 1
        }), 'wall');
        this.wallMaterial = wallMaterial;
        const towerMaterial = applySurface(new THREE.MeshStandardMaterial({
            color: '#8f8a7f',
            roughness: 1
        }), 'wall');
        const capMaterial = applySurface(new THREE.MeshStandardMaterial({
            color: '#7b3f3a',
            roughness: 1
        }), 'wall');
        const reach = 10.3 * CELL, segments = 56;
        const segment = new THREE.BoxGeometry(2 * Math.PI * reach / segments * 1.03, 0.9, 0.34);
        for(let i = 0; i < segments; i += 1){
            const phi = i / segments * Math.PI * 2;
            const wall = new THREE.Mesh(segment, wallMaterial);
            wall.position.set(Math.cos(phi) * reach, 0.45, Math.sin(phi) * reach);
            wall.rotation.y = -phi - Math.PI / 2;
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
        }
        for(let i = 0; i < 6; i += 1){
            const phi = i * 60 * Math.PI / 180, edge = (i * 60 + 30) * Math.PI / 180;
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.7, 10), towerMaterial);
            tower.position.set(Math.cos(phi) * reach, 0.85, Math.sin(phi) * reach);
            tower.castShadow = true;
            const cap = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.6, 10), capMaterial);
            cap.position.set(tower.position.x, 2, tower.position.z);
            const line = new THREE.Mesh(new THREE.BoxGeometry(8.2 * CELL, 0.012, 0.045), new THREE.MeshBasicMaterial({
                color: '#f1e3b5',
                transparent: true,
                opacity: 0.4
            }));
            line.position.set(Math.cos(edge) * 5.6 * CELL, 0.03, Math.sin(edge) * 5.6 * CELL);
            line.rotation.y = -edge;
            this.scene.add(tower, cap, line);
            const label = makeLabel(`${KNIGHTS[i].name} · ${KNIGHTS[i].role}`, SECTOR_COLORS[i]);
            label.position.set(Math.cos(phi) * 8.5 * CELL, 1.4, Math.sin(phi) * 8.5 * CELL);
            label.visible = false;
            this.sectorLabels.push(label);
            this.scene.add(label);
        }
        const table = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * CELL, 1.4 * CELL, 0.12, 40), new THREE.MeshStandardMaterial({
            color: '#7a5a3b',
            roughness: 0.9
        }));
        table.position.y = 0.06;
        table.castShadow = true;
        table.receiveShadow = true;
        this.scene.add(table);
        this.lockRings = [
            [
                4.5,
                7.5
            ],
            [
                7.5,
                9.5
            ]
        ].map(([inner, outer])=>{
            const veil = new THREE.Mesh(new THREE.RingGeometry(inner * CELL, outer * CELL, 72), new THREE.MeshBasicMaterial({
                color: '#1d2a22',
                transparent: true,
                opacity: 0.38,
                depthWrite: false,
                side: THREE.DoubleSide
            }));
            veil.rotation.x = -Math.PI / 2;
            veil.position.y = 0.07;
            this.scene.add(veil);
            return veil;
        });
    }
    makeRoot(kind) {
        const prototype = this.prototypes.get(kind);
        if (!prototype) return null;
        const size = definition(kind).footprint;
        const root = new THREE.Group();
        const model = prototype.clone(true);
        const dimensions = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        model.scale.multiplyScalar(size * CELL * (kind === 'road' ? 0.99 : 0.76) / Math.max(dimensions.x, dimensions.z, 0.01));
        model.updateMatrixWorld(true);
        model.position.y -= new THREE.Box3().setFromObject(model).min.y;
        root.add(model);
        root.traverse((object)=>{
            const mesh = object;
            if (mesh.isMesh) {
                mesh.castShadow = kind !== 'road';
                mesh.receiveShadow = true;
            }
        });
        return root;
    }
    buildingAt(x, z) {
        return this.state.buildings.find((building)=>{
            const size = definition(building.kind).footprint;
            return x >= building.x && x < building.x + size && z >= building.z && z < building.z + size;
        });
    }
    buildingKind(id) {
        return this.state.buildings.find((building)=>building.id === id)?.kind ?? this.selectedBuilding;
    }
    useMove(cell) {
        if (this.moveSource === null) {
            const target = this.buildingAt(cell.x, cell.z);
            if (!target || target.kind === 'keep' || target.kind === 'road' || !isComplete(target)) {
                this.bus.emit('toast', 'Choisissez un bâtiment achevé (ni route, ni donjon).', 'warn');
                return;
            }
            this.moveSource = target.id;
            this.bus.emit('toast', `${definition(target.kind).name} : choisissez la nouvelle parcelle (${costText(moveCost(target))}).`, 'good');
            this.updateHover();
            return;
        }
        const result = moveBuilding(this.state, this.moveSource, cell.x, cell.z);
        if (!result.result.ok) {
            this.bus.emit('toast', describe(result.result), 'warn');
            return;
        }
        const old = this.placedMeshes.get(this.moveSource);
        if (old) {
            this.scene.remove(old);
            this.placedMeshes.delete(this.moveSource);
        }
        this.state.resources = result.state.resources;
        this.state.buildings = result.state.buildings;
        this.moveSource = null;
        this.bus.emit('toast', 'Le chantier de déménagement commence.', 'good');
        this.syncMeshes();
        this.save();
        this.updateHover();
        this.bus.emit('change');
    }
    sendExpedition(knight, dest) {
        const result = sendRule(this.state, knight, dest);
        if (!result.ok) {
            this.bus.emit('toast', result.reason === 'dead' ? 'Ce chevalier n’est plus.' : result.reason === 'loyalty' ? 'Sa loyauté est trop faible pour qu’il accepte.' : 'Il est déjà parti.', 'warn');
            return;
        }
        this.state.expeditions = result.state.expeditions;
        this.bus.emit('toast', `${KNIGHTS.find((entry)=>entry.id === knight).name} part : ${DESTINATIONS[dest].name.toLowerCase()}.`, 'good');
        this.save();
        this.bus.emit('change');
    }
    defend(action) {
        const result = action === 'recruit' ? recruitSoldier(this.state) : action === 'fortify' ? fortifyWalls(this.state) : action === 'mend' ? mendWalls(this.state) : {
            state: setStance(this.state, action),
            ok: true,
            reason: undefined
        };
        if (!result.ok) {
            const reasons = {
                none: 'Il faut une tour des remparts ou un donjon pour loger des soldats.',
                cap: 'La garnison est au complet.',
                resources: 'Les réserves sont insuffisantes.',
                max: 'Les murs ont atteint leur niveau maximal.',
                fine: 'Les murs sont intacts.'
            };
            this.bus.emit('toast', reasons[result.reason ?? 'resources'], 'warn');
            return;
        }
        Object.assign(this.state, {
            resources: result.state.resources,
            walls: result.state.walls,
            garrison: result.state.garrison,
            stance: result.state.stance
        });
        this.syncMeshes();
        this.save();
        this.bus.emit('change');
    }
    cyclePriority(category) {
        this.state.priorities[category] = (this.state.priorities[category] + 1) % 3;
        this.save();
        this.bus.emit('change');
    }
    trade(action, resource) {
        const result = tradeRule(this.state, action, resource);
        if (!result.ok) {
            const reasons = {
                closed: 'Pas de caravane : bâtissez un marché et attendez les marchands.',
                gold: 'Pas assez de deniers.',
                stock: 'Pas assez de stock à vendre.',
                cap: 'Vos entrepôts sont pleins.'
            };
            this.bus.emit('toast', reasons[result.reason ?? 'closed'], 'warn');
            return;
        }
        this.state.resources = result.state.resources;
        this.save();
        this.bus.emit('change');
    }
    setBuilderShare(share) {
        this.state.builderShare = Math.max(0.25, Math.min(0.75, share));
        this.save();
        this.bus.emit('change');
    }
    useTool(cell) {
        if (this.tool === 'move') {
            this.useMove(cell);
            return;
        }
        const target = this.buildingAt(cell.x, cell.z);
        if (!target) {
            this.bus.emit('toast', 'Aucun bâtiment sur cette parcelle.', 'warn');
            return;
        }
        const name = definition(target.kind).name;
        if (this.tool === 'repair') {
            const result = repairBuilding(this.state, target.id);
            if (!result.ok) {
                this.bus.emit('toast', result.reason === 'site' ? 'Le chantier n’est pas terminé.' : result.reason === 'fine' ? 'Ce bâtiment est en bon état.' : 'Les réserves sont insuffisantes.', 'warn');
                return;
            }
            this.state.resources = result.state.resources;
            this.state.buildings = result.state.buildings;
            this.bus.emit('toast', `${name} réparé.`, 'good');
        } else if (this.tool === 'demolish') {
            const result = demolishBuilding(this.state, target.id);
            if (!result.ok) {
                this.bus.emit('toast', 'Ce bâtiment ne peut pas être démoli.', 'warn');
                return;
            }
            this.state.resources = result.state.resources;
            this.state.buildings = result.state.buildings;
            this.bus.emit('toast', `${name} démoli : la moitié des matériaux est récupérée.`, 'good');
        } else {
            const result = upgradeBuilding(this.state, target.id);
            if (!result.ok) {
                const reasons = {
                    max: 'Niveau maximal atteint.',
                    site: 'Le chantier n’est pas terminé.',
                    kind: 'Une route ne s’améliore pas.',
                    resources: 'Les réserves sont insuffisantes.'
                };
                this.bus.emit('toast', reasons[result.reason ?? 'resources'], 'warn');
                return;
            }
            this.state.resources = result.state.resources;
            this.state.buildings = result.state.buildings;
            this.state.walls = result.state.walls;
            this.bus.emit('toast', `${name} améliorée : niveau ${levelOf(this.buildingAt(cell.x, cell.z))}.`, 'good');
        }
        this.syncMeshes();
        this.save();
        this.updateHover();
        this.bus.emit('change');
    }
    syncMeshes() {
        const ids = new Set(this.state.buildings.map((building)=>building.id));
        for (const [id, mesh] of this.placedMeshes)if (!ids.has(id)) {
            this.scene.remove(mesh);
            this.placedMeshes.delete(id);
        }
        for (const building of this.state.buildings){
            this.addBuildingMesh(building);
            const mesh = this.placedMeshes.get(building.id);
            if (!mesh) continue;
            const done = isComplete(building);
            const rise = done ? 1 : 0.2 + 0.8 * ((building.progress ?? 0) / BUILD_TIME[building.kind]);
            const grow = 1 + 0.06 * (levelOf(building) - 1), base = mesh.userData.base;
            mesh.children[0].scale.set(base.x * grow, base.y * rise * grow, base.z * grow);
            mesh.userData.frame.visible = !done;
        }
        for (const [cellKey, deposit] of this.depositMeshes){
            const ratio = (this.state.deposits[cellKey] ?? deposit.max) / deposit.max;
            deposit.object.visible = ratio > 0.02;
            deposit.object.scale.setScalar(deposit.base * (0.35 + 0.65 * ratio));
        }
        const cold = this.seasonIndex() >= 2;
        this.smokeSources = this.state.buildings.filter((building)=>isComplete(building) && (building.kind === 'bakery' || building.kind === 'lodge' || cold && (building.kind === 'cottage' || building.kind === 'tavern'))).map((building)=>{
            const center = this.cellCenter(building.x, building.z, definition(building.kind).footprint);
            return {
                x: center.x + 0.18,
                y: 1,
                z: center.z + 0.1
            };
        });
        this.syncVillagers();
        this.wallMaterial?.color.set(this.state.walls.hp > 60 ? '#a9a499' : this.state.walls.hp > 30 ? '#b39a86' : '#b8806a');
        this.applySeason();
        this.refreshOverlay();
    }
    applySeason() {
        const season = this.seasonIndex();
        if (season === this.season || !this.tiles) return;
        this.season = season;
        const look = SEASON_LOOKS[season];
        this.tiles.material.color.set(look.tint);
        this.tilesFull?.material?.color.set(look.tint);
        this.scene.background.set(look.sky);
        this.scene.fog?.color.set(look.sky);
    }
    syncVillagers() {
        const wanted = Math.min(24, population(this.state));
        const hub = this.cellCenter(CENTER + 2, CENTER, 1);
        while(this.villagers.length < wanted){
            const mesh = makeVillager();
            mesh.position.set(hub.x, 0.05, hub.z);
            this.scene.add(mesh);
            this.villagers.push({
                mesh,
                path: [],
                wait: Math.random() * 3,
                phase: 'back',
                role: 'worker',
                cell: [
                    CENTER + 2,
                    CENTER
                ],
                dest: [
                    CENTER + 2,
                    CENTER
                ]
            });
        }
        while(this.villagers.length > wanted)this.scene.remove(this.villagers.pop().mesh);
    }
    assignVillager(villager) {
        const hub = [
            CENTER + 2,
            CENTER
        ];
        const { body, load } = villager.mesh.userData;
        let dest = hub;
        if (villager.phase === 'back') {
            const index = this.villagers.indexOf(villager);
            const sites = this.state.buildings.filter((building)=>!isComplete(building));
            const works = this.state.buildings.filter((building)=>isComplete(building) && [
                    'sawmill',
                    'quarry',
                    'farm',
                    'market'
                ].includes(building.kind));
            const builder = sites.length > 0 && (index % 2 === 0 || works.length === 0);
            const target = builder ? sites[index % sites.length] : works[index % Math.max(1, works.length)];
            const access = target ? accessCell(this.state, target) : null;
            if (!access) {
                villager.wait = 2;
                return;
            }
            villager.role = builder ? 'builder' : 'worker';
            dest = access;
        }
        const cells = roadPath(this.state, villager.cell, dest);
        if (!cells) {
            villager.cell = hub;
            villager.phase = 'back';
            const spot = this.cellCenter(hub[0], hub[1], 1);
            villager.mesh.position.set(spot.x, 0.05, spot.z);
            villager.wait = 2;
            return;
        }
        villager.path = cells.slice(1).map(([x, z])=>this.cellCenter(x, z, 1).setY(0.05));
        villager.dest = dest;
        villager.phase = villager.phase === 'back' ? 'out' : 'back';
        body.material.color.set(VILLAGER_COLORS[villager.role]);
        load.visible = villager.phase === 'back' && villager.role === 'worker';
        if (!villager.path.length) villager.wait = 1.5;
    }
    moveVillagers(dt) {
        for (const villager of this.villagers){
            if (villager.wait > 0) {
                villager.wait -= dt;
                villager.mesh.position.y = 0.05 + (villager.phase === 'out' && villager.role === 'builder' ? Math.abs(Math.sin(performance.now() / 130)) * 0.07 : 0);
                continue;
            }
            const next = villager.path[0];
            if (!next) {
                this.assignVillager(villager);
                continue;
            }
            const delta = this.scratch.copy(next).sub(villager.mesh.position);
            delta.y = 0;
            const step = 1.1 * dt;
            if (delta.length() <= step) {
                villager.mesh.position.set(next.x, 0.05, next.z);
                villager.path.shift();
                if (!villager.path.length) {
                    villager.cell = villager.dest;
                    villager.wait = villager.phase === 'out' ? 3 + Math.random() * 3 : 0.5;
                }
            } else {
                delta.normalize().multiplyScalar(step);
                villager.mesh.position.add(delta);
                villager.mesh.rotation.y = Math.atan2(delta.x, delta.z);
            }
        }
    }
    cellCenter(x, z, size) {
        return new THREE.Vector3((x + size / 2 - GRID_WIDTH / 2) * CELL, 0, (z + size / 2 - GRID_HEIGHT / 2) * CELL);
    }
    addBuildingMesh(building) {
        if (this.placedMeshes.has(building.id)) return;
        const root = this.makeRoot(building.kind);
        if (!root) return;
        const size = definition(building.kind).footprint;
        root.position.copy(this.cellCenter(building.x, building.z, size)).setY(0.015);
        if (building.kind !== 'road') root.rotation.y = (Math.imul(building.id, 2654435761) >>> 0) % 4 * (Math.PI / 2);
        root.userData.base = root.children[0].scale.clone();
        const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size * CELL * 0.9, 1.9, size * CELL * 0.9)), new THREE.LineBasicMaterial({
            color: '#d9a441'
        }));
        frame.position.y = 0.95;
        root.userData.frame = frame;
        root.add(frame);
        if (this.blobMaterial && this.blobGeometry && building.kind !== 'road') {
            const blob = new THREE.Mesh(this.blobGeometry, this.blobMaterial);
            blob.rotation.x = -Math.PI / 2;
            blob.scale.setScalar(size * CELL * 1.5);
            blob.position.y = 0.01;
            root.add(blob);
        }
        this.scene.add(root);
        this.placedMeshes.set(building.id, root);
    }
    handlePointerMove = (event)=>{
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const point = this.raycaster.ray.intersectPlane(this.groundPlane, new THREE.Vector3());
        if (!point) {
            this.hoverCell = null;
        } else {
            const x = Math.floor((point.x + GRID_WIDTH * CELL / 2) / CELL);
            const z = Math.floor((point.z + GRID_HEIGHT * CELL / 2) / CELL);
            this.hoverCell = x >= 0 && z >= 0 && x < GRID_WIDTH && z < GRID_HEIGHT ? {
                x,
                z
            } : null;
        }
        this.updateHover();
        this.bus.emit('hover', this.tool !== 'build' && !(this.tool === 'move' && this.moveSource !== null) ? this.toolHint : this.ghostCheck.ok ? this.ghostInfo : describe(this.ghostCheck), event.clientX, event.clientY);
    };
    handleCanvasClick = (event)=>{
        if (!this.ready || event.button !== 0 || !this.hoverCell || this.state.lost || this.tool === 'view') return;
        const cell = this.hoverCell;
        if (this.tool !== 'build') {
            this.useTool(cell);
            return;
        }
        const result = placeBuilding(this.state, this.selectedBuilding, cell.x, cell.z);
        if (!result.result.ok) {
            this.bus.emit('toast', describe(result.result), 'warn');
            return;
        }
        const built = result.state.buildings[result.state.buildings.length - 1];
        this.state.resources = result.state.resources;
        this.state.buildings = result.state.buildings;
        this.state.won = result.state.won;
        this.syncMeshes();
        this.bus.emit('toast', built.kind === 'road' ? 'Route tracée.' : `${definition(built.kind).name} : le chantier commence.`, 'good');
        this.save();
        this.updateHover();
        this.bus.emit('change');
    };
    handleWheel = (event)=>{
        event.preventDefault();
        this.zoom = clamp(this.zoom * Math.exp(event.deltaY * 0.0012 * CONFIG.camera.zoomSpeed), 0.68, 1.62);
        this.updateCamera();
    };
    dragging = false;
    dragStart = {
        x: 0,
        y: 0
    };
    handlePointerDown = (event)=>{
        if (event.button === 2 || event.button === 1) {
            this.dragging = true;
            this.dragStart = {
                x: event.clientX,
                y: event.clientY
            };
            this.canvas.setPointerCapture?.(event.pointerId);
            this.canvas.classList.add('is-panning');
        }
    };
    handlePointerUp = ()=>{
        this.dragging = false;
        this.canvas.classList.remove('is-panning');
    };
    handleDragMove = (event)=>{
        if (!this.dragging) return;
        const dx = event.clientX - this.dragStart.x;
        const dy = event.clientY - this.dragStart.y;
        this.dragStart = {
            x: event.clientX,
            y: event.clientY
        };
        const scale = 0.014 * this.zoom;
        this.target.x -= dx * scale;
        this.target.z -= dy * scale;
        this.updateCamera();
    };
    preventContextMenu = (event)=>event.preventDefault();
    bindPointer() {
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('click', this.handleCanvasClick);
        this.canvas.addEventListener('wheel', this.handleWheel, {
            passive: false
        });
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.canvas.addEventListener('contextmenu', this.preventContextMenu);
        this.canvas.addEventListener('pointermove', this.handleDragMove);
    }
    updateHover() {
        this.lockRings.forEach((veil, index)=>{
            veil.visible = this.tool !== 'view' && !ringUnlocked(this.state, index + 2);
        });
        if (this.tool === 'view') {
            this.hoverMarker.visible = false;
            if (this.ghost) this.ghost.visible = false;
            if (this.influence) this.influence.visible = false;
            this.ghostCheck = {
                ok: true
            };
            this.ghostInfo = null;
            this.toolHint = null;
            return;
        }
        if (!this.ready || !this.hoverCell) {
            this.hoverMarker.visible = false;
            if (this.ghost) this.ghost.visible = false;
            if (this.influence) this.influence.visible = false;
            this.ghostCheck = {
                ok: true
            };
            this.ghostInfo = null;
            return;
        }
        if (this.tool !== 'build' && !(this.tool === 'move' && this.moveSource !== null)) {
            const target = this.buildingAt(this.hoverCell.x, this.hoverCell.z);
            const spot = this.cellCenter(this.hoverCell.x, this.hoverCell.z, 1);
            if (this.ghost) this.ghost.visible = false;
            if (this.influence) this.influence.visible = false;
            if (Math.abs(this.hoverMarker.geometry.parameters.width - (CELL - 0.1)) > 0.001) {
                this.hoverMarker.geometry.dispose();
                this.hoverMarker.geometry = new THREE.PlaneGeometry(CELL - 0.1, CELL - 0.1);
            }
            this.hoverMarker.position.set(spot.x, 0.055, spot.z);
            this.hoverMarker.material.color.set(!target ? '#8a8a8a' : this.tool === 'demolish' ? '#d9663f' : this.tool === 'repair' ? '#6fb3e0' : '#7fc18a');
            this.hoverMarker.visible = true;
            this.toolHint = !target ? null : this.tool === 'demolish' ? `Démolir : ${definition(target.kind).name} (la moitié des matériaux est récupérée)` : this.tool === 'repair' ? `Réparer : ${definition(target.kind).name}, usure ${Math.round(wearOf(target))} % (${costText(repairCost(target)) || 'gratuit'})` : this.tool === 'move' ? `Déplacer : ${definition(target.kind).name} (${costText(moveCost(target))}, puis nouveau chantier)` : levelOf(target) >= MAX_LEVEL ? 'Niveau maximal atteint' : `Améliorer : ${definition(target.kind).name}, niveau ${levelOf(target) + 1} (${costText(upgradeCost(target))})`;
            this.ghostCheck = {
                ok: true
            };
            this.ghostInfo = null;
            return;
        }
        const moving = this.tool === 'move' && this.moveSource !== null;
        const kind = moving ? this.buildingKind(this.moveSource) : this.selectedBuilding;
        const def = definition(kind), size = def.footprint;
        const check = moving ? checkMove(this.state, this.moveSource, this.hoverCell.x, this.hoverCell.z) : checkPlacement(this.state, kind, this.hoverCell.x, this.hoverCell.z);
        this.ghostCheck = check;
        const reserve = check.ok ? depositAt(this.state, kind, this.hoverCell.x, this.hoverCell.z) : null;
        this.ghostInfo = reserve ? `Réserve à portée : ${reserve.stock} ${reserve.resource === 'wood' ? 'bois' : 'pierre'}` : null;
        const markerSize = Math.max(0.25, size * CELL - 0.1);
        if (Math.abs(this.hoverMarker.geometry.parameters.width - markerSize) > 0.001) {
            this.hoverMarker.geometry.dispose();
            this.hoverMarker.geometry = new THREE.PlaneGeometry(markerSize, markerSize);
        }
        const center = this.cellCenter(this.hoverCell.x, this.hoverCell.z, size);
        this.hoverMarker.position.set(center.x, 0.055, center.z);
        this.hoverMarker.material.color.set(check.ok ? '#e6c879' : '#bc6e55');
        this.hoverMarker.material.opacity = check.ok ? 0.42 : 0.34;
        this.hoverMarker.visible = true;
        if (this.ghostKind !== kind) {
            if (this.ghost) this.scene.remove(this.ghost);
            this.ghost = this.makeRoot(kind);
            this.ghostKind = kind;
            this.ghost?.traverse((object)=>{
                const mesh = object;
                if (!mesh.isMesh) return;
                mesh.castShadow = false;
                mesh.material = Array.isArray(mesh.material) ? mesh.material.map((material)=>material.clone()) : mesh.material.clone();
                for (const material of materialsOf(mesh.material))Object.assign(material, {
                    transparent: true,
                    opacity: 0.6,
                    depthWrite: false
                });
            });
            if (this.ghost) this.scene.add(this.ghost);
        }
        if (this.ghost) {
            this.ghost.position.copy(center).setY(0.06);
            this.ghost.visible = true;
            this.ghost.traverse((object)=>{
                const mesh = object;
                if (!mesh.isMesh) return;
                for (const material of materialsOf(mesh.material)){
                    if (material.emissive) {
                        material.emissive.set(check.ok ? '#3d7a3a' : '#a8392c');
                        material.emissiveIntensity = 0.55;
                    }
                }
            });
        }
        const radius = def.influence ? (def.influence + size / 2) * CELL : 0;
        if (radius && (!this.influence || this.influence.userData.radius !== radius)) {
            if (this.influence) {
                this.scene.remove(this.influence);
                this.influence.geometry.dispose();
            }
            this.influence = new THREE.Mesh(new THREE.RingGeometry(radius - 0.05, radius, 64), new THREE.MeshBasicMaterial({
                color: '#f1d98a',
                transparent: true,
                opacity: 0.7,
                depthWrite: false,
                side: THREE.DoubleSide
            }));
            this.influence.rotation.x = -Math.PI / 2;
            this.influence.userData.radius = radius;
            this.scene.add(this.influence);
        }
        if (this.influence) {
            this.influence.visible = radius > 0;
            this.influence.position.set(center.x, 0.08, center.z);
        }
    }
    updateCamera() {
        const distance = 1.0 * this.zoom;
        this.camera.position.set(this.target.x + 15.5 * distance, this.target.y + 23.5 * distance, this.target.z + 17.5 * distance);
        this.camera.lookAt(this.target);
    }
    save() {
        try {
            localStorage.setItem(CITY_SAVE_KEY, JSON.stringify(this.state));
            localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(this.story));
        } catch  {}
    }
}
function safeRead(key) {
    try {
        return localStorage.getItem(key);
    } catch  {
        return null;
    }
}
function makeVillager() {
    const paint = (color)=>new THREE.MeshStandardMaterial({
            color,
            roughness: 1
        });
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 8), paint('#5f8a56'));
    body.position.y = 0.17;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), paint('#e0b98f'));
    head.position.y = 0.4;
    const load = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), paint('#8a5a2b'));
    load.position.set(0, 0.3, -0.12);
    load.visible = false;
    body.castShadow = true;
    group.add(body, head, load);
    group.userData = {
        body,
        load
    };
    return group;
}
function makeLabel(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    context.font = '600 42px Georgia, serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 8;
    context.strokeStyle = 'rgba(20, 20, 30, 0.75)';
    context.strokeText(text, 192, 48);
    context.fillStyle = color;
    context.fillText(text, 192, 48);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        opacity: 0.95
    }));
    sprite.scale.set(4.4, 1.1, 1);
    sprite.renderOrder = 10;
    return sprite;
}
function makeBlobTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}
