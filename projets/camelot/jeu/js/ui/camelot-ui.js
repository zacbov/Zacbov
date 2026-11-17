import { BUILDINGS, countBuildings, definition, isUnlocked, population, storageCap, SEASONS, seasonOf, CRISES, LAWS, nextThreat, warningLead, KNIGHTS, KNIGHT_POWERS, SPELLS, seated, forecast, workforceInfo, SEATS, caravanIn, caravanOpen, marketPrice, tradeQuote, wearOf, DESTINATIONS, expeditionRisk, isAway, MAX_WALL_LEVEL, RECRUIT_COST, canGarrison, defense, garrisonCap, wallRepairCost, wallUpgradeCost } from '../game/camelot-rules.js';
import { BUILDING_ICONS } from '../game/camelot-assets.js';
import { CHAPTERS, canChoose as storyCanChoose } from '../game/camelot-story.js';
const RESOURCE_LABELS = {
    wood: 'Bois',
    stone: 'Pierre',
    food: 'Vivres',
    gold: 'Deniers'
};
const RESOURCE_MARKS = {
    wood: 'B',
    stone: 'P',
    food: 'V',
    gold: 'D'
};
const SECTOR_HEX = [
    '#d9a441',
    '#c1504a',
    '#e6e2d3',
    '#4f86b8',
    '#6fa860',
    '#8c6bb1'
];
const knightNote = (id)=>{
    const owner = definition(id).knight, knight = KNIGHTS.find((entry)=>entry.id === owner);
    return knight ? ` Se bâtit uniquement dans le secteur de ${knight.name} (zone colorée à son nom sur la carte). Bonus du siège une fois achevée : ${KNIGHT_POWERS[knight.id]}` : '';
};
export class CamelotUI {
    root;
    city;
    toastTimer = 0;
    constructor(root, city){
        this.root = root;
        this.city = city;
        this.root.innerHTML = this.template();
        this.root.addEventListener('click', this.handleClick);
        this.city.bus.on('change', ()=>this.update());
        this.city.bus.on('toast', (message, tone = 'good')=>this.toast(message, tone));
        this.city.bus.on('win', ()=>this.update());
        this.city.bus.on('event', (event)=>this.showEvent(event));
        this.city.bus.on('hover', (text, x, y)=>this.hint(text, x, y));
        this.city.bus.on('defeat', (reason)=>this.showDefeat(reason));
        this.city.bus.on('ending', (ending)=>this.showEnding(ending));
        window.addEventListener('keydown', (event)=>{
            if (event.code === 'Space') {
                event.preventDefault();
                this.city.setSpeed(this.city.speed === 0 ? 1 : 0);
                this.update();
            } else if (event.code === 'Escape') {
                this.city.setTool('view');
                this.update();
            } else if ([
                'Digit1',
                'Digit2',
                'Digit3'
            ].includes(event.code)) {
                this.city.setSpeed(Number(event.code.slice(5)));
                this.update();
            }
        });
        this.root.addEventListener('pointerover', (event)=>{
            if (event.target.closest('.parchment-panel, .topbar')) this.hint(null, 0, 0);
        });
        this.update();
    }
    setLoading(fraction, label) {
        const loader = this.root.querySelector('.loading-card');
        if (!loader) return;
        loader.classList.remove('is-hidden');
        const bar = loader.querySelector('.loading-progress i');
        const copy = loader.querySelector('.loading-copy');
        if (bar) bar.style.transform = `scaleX(${Math.max(0.04, Math.min(1, fraction))})`;
        if (copy) copy.textContent = label;
    }
    ready() {
        this.root.querySelector('.loading-screen')?.classList.add('is-hidden');
        this.root.querySelector('.game-shell')?.classList.add('is-ready');
        this.update();
    }
    failure(message) {
        const loader = this.root.querySelector('.loading-card');
        if (!loader) return;
        loader.classList.remove('is-hidden');
        const copy = loader.querySelector('.loading-copy');
        if (copy) copy.textContent = message;
        const button = loader.querySelector('.loading-retry');
        if (button) button.hidden = false;
    }
    dispose() {
        this.root.removeEventListener('click', this.handleClick);
        window.clearTimeout(this.toastTimer);
    }
    update() {
        const state = this.city.state;
        for (const resource of [
            'wood',
            'stone',
            'food',
            'gold'
        ]){
            const amount = this.root.querySelector(`[data-resource="${resource}"] .resource-amount`);
            if (amount) amount.textContent = String(state.resources[resource]);
        }
        for (const mood of [
            'hope',
            'discontent'
        ]){
            const node = this.root.querySelector(`[data-mood="${mood}"]`);
            if (node) node.textContent = String(this.city.state.mood[mood]);
        }
        const chapter = CHAPTERS[this.city.story.era - 1], chapterNode = this.root.querySelector('[data-chapter]');
        if (chapterNode && chapter) {
            chapterNode.textContent = `${this.city.story.era} · ${chapter.volume}`;
            chapterNode.parentElement.title = chapter.goal;
        }
        const threatNode = this.root.querySelector('[data-threat]');
        if (threatNode) {
            const threat = nextThreat(this.city.state);
            threatNode.textContent = threat ? `${CRISES[threat.kind]} dans ${threat.inTicks}` : warningLead(this.city.state) ? 'Calme' : 'Sans guet';
        }
        const net = forecast(state), cap = storageCap(state);
        for (const resource of [
            'wood',
            'stone',
            'food',
            'gold'
        ]){
            const trend = this.root.querySelector(`[data-resource="${resource}"] [data-trend]`);
            if (trend) {
                trend.textContent = `${net[resource] > 0 ? '+' : ''}${net[resource]}`;
                trend.className = `trend ${net[resource] < 0 ? 'neg' : net[resource] > 0 ? 'pos' : ''}`;
            }
        }
        this.root.querySelectorAll('[data-speed]').forEach((button)=>button.classList.toggle('is-active', Number(button.dataset.speed) === this.city.speed));
        this.root.querySelectorAll('[data-overlay]').forEach((button)=>button.classList.toggle('is-active', button.dataset.overlay === this.city.overlay));
        const runway = (stock, delta)=>delta < 0 ? Math.floor(stock / -delta) : Infinity;
        const alerts = [];
        if (runway(state.resources.food, net.food) <= 6) alerts.push([
            'data-build="farm"',
            `Vivres : famine dans ${runway(state.resources.food, net.food)} cycles`
        ]);
        if (runway(state.resources.gold, net.gold) <= 6) alerts.push([
            'data-build="market"',
            `Deniers : caisse vide dans ${runway(state.resources.gold, net.gold)} cycles`
        ]);
        if (runway(state.resources.wood, net.wood) <= 6) alerts.push([
            'data-build="sawmill"',
            `Bois : épuisé dans ${runway(state.resources.wood, net.wood)} cycles`
        ]);
        if ([
            'wood',
            'stone',
            'food',
            'gold'
        ].some((resource)=>state.resources[resource] >= cap * 0.95)) alerts.push([
            'data-build="warehouse"',
            'Entrepôts presque pleins'
        ]);
        if (state.mood.discontent >= 60) alerts.push([
            'data-action="codex"',
            'Colère du peuple : voir le Codex'
        ]);
        if (state.buildings.some((building)=>wearOf(building) >= 70)) alerts.push([
            'data-tool="repair"',
            'Bâtiments très usés : réparez-les'
        ]);
        const incoming = nextThreat(state);
        if (incoming) alerts.push([
            'data-build="ramparts"',
            `${CRISES[incoming.kind]} dans ${incoming.inTicks} cycles`
        ]);
        const bar = this.root.querySelector('.alert-bar'), signature = alerts.map((alert)=>alert.join('|')).join(';');
        if (bar && bar.dataset.signature !== signature) {
            bar.dataset.signature = signature;
            bar.innerHTML = alerts.map(([attribute, text])=>`<button class="alert-pill" type="button" ${attribute} data-nav>${text}</button>`).join('');
        }
        const work = workforceInfo(state), workNode = this.root.querySelector('[data-work]');
        if (workNode) {
            workNode.textContent = `${work.workers}/${work.jobs}`;
            workNode.style.color = work.staffing < 1 ? '#f0a58f' : '';
        }
        this.root.querySelectorAll('[data-share]').forEach((button)=>button.classList.toggle('is-active', Number(button.dataset.share) === state.builderShare));
        const priorityNames = {
            food: 'Vivres',
            materials: 'Matériaux',
            services: 'Services'
        };
        this.root.querySelectorAll('[data-priority]').forEach((button)=>{
            const category = button.dataset.priority;
            button.textContent = `${priorityNames[category]} : ${[
                'basse',
                'normale',
                'haute'
            ][state.priorities[category]]}`;
            button.classList.toggle('is-active', state.priorities[category] === 2);
        });
        const seasonNode = this.root.querySelector('[data-season]');
        if (seasonNode) seasonNode.textContent = SEASONS[seasonOf(this.city.state)];
        this.root.querySelectorAll('[data-tool]').forEach((button)=>button.classList.toggle('is-active', button.dataset.tool === this.city.tool));
        this.root.querySelectorAll('[data-resource]').forEach((node)=>{
            node.title = `Capacité de stockage : ${storageCap(this.city.state)}`;
        });
        for (const gauge of [
            'honneur',
            'piete',
            'concorde'
        ]){
            const node = this.root.querySelector(`[data-gauge="${gauge}"]`);
            if (node) node.textContent = String(this.city.story.gauges[gauge]);
        }
        const populationNode = this.root.querySelector('[data-population]');
        if (populationNode) populationNode.textContent = String(population(state));
        const buildingTotal = this.root.querySelector('[data-building-total]');
        if (buildingTotal) buildingTotal.textContent = String(this.city.buildingCount);
        for (const building of BUILDINGS){
            const button = this.root.querySelector(`[data-build="${building.id}"]`);
            if (!button) continue;
            const count = countBuildings(state, building.id);
            const available = this.city.isAvailable(building.id);
            const countNode = button.querySelector('.build-count');
            if (countNode) countNode.textContent = count ? `×${count}` : '';
            const prereq = !isUnlocked(state, building.id);
            const canUse = this.city.canChoose(building.id);
            button.disabled = !available || !canUse && !prereq;
            button.classList.toggle('is-locked', !available || prereq);
            button.classList.toggle('is-selected', this.city.selectedBuilding === building.id);
            button.setAttribute('aria-pressed', String(this.city.selectedBuilding === building.id));
            const status = button.querySelector('.build-status');
            if (status) status.textContent = !available ? 'À VENIR' : prereq ? 'VERROUILLÉ' : state.won && building.id === 'keep' ? 'ACCOMPLI' : count ? `×${count} BÂTI` : '';
            const cost = button.querySelector('.build-cost');
            if (cost) cost.innerHTML = available ? this.costMarkup(building.id) : '<span class="cost-free">Démo partielle</span>';
            button.title = available ? `${building.description}${knightNote(building.id)}` : 'Le donjon n’est pas jouable dans cette version partielle.';
        }
        const done = [
            countBuildings(state, 'cottage') > 0,
            countBuildings(state, 'sawmill') > 0,
            countBuildings(state, 'quarry') > 0
        ];
        const progress = done.filter(Boolean).length;
        const progressText = this.root.querySelector('[data-progress]');
        if (progressText) progressText.textContent = state.won ? 'Cité établie' : `${progress}/3 fondations`;
        const fill = this.root.querySelector('.objective-fill');
        if (fill) fill.style.transform = `scaleX(${state.won ? 1 : progress / 3})`;
        for (const [index, complete] of done.entries()){
            const row = this.root.querySelector(`[data-step="${index}"]`);
            row?.classList.toggle('is-done', complete);
        }
        const keepStep = this.root.querySelector('[data-step="3"]');
        keepStep?.classList.toggle('is-done', state.won);
        this.root.querySelector('.victory-overlay')?.classList.toggle('is-visible', state.won);
    }
    showCodex() {
        if (this.city.pendingEvent) {
            this.toast('Réglez d’abord l’événement en cours.', 'warn');
            return;
        }
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const state = this.city.state, hall = countBuildings(state, 'hall') > 0;
        const body = [
            ...new Set(LAWS.map((law)=>law.group))
        ].map((group)=>{
            const taken = state.laws.some((id)=>LAWS.find((law)=>law.id === id)?.group === group);
            const buttons = LAWS.filter((law)=>law.group === group).map((law)=>`<button class="text-button event-choice${state.laws.includes(law.id) ? ' is-adopted' : ''}" type="button" data-law="${law.id}" data-nav${!hall || taken ? ' disabled' : ''}><b>${law.name}</b> : ${law.text}</button>`).join('');
            return `<div class="law-group"><span class="panel-kicker">${group}</span>${buttons}</div>`;
        }).join('');
        box.innerHTML = `<span class="panel-kicker">Codex d’Arthur</span><h2>Les lois du royaume</h2><p>${hall ? 'Chaque loi est définitive : une fois choisie, elle ne se retire pas.' : 'Le Codex se rédige à l’Hôtel de Ville (Bohort) : bâtissez-le d’abord.'}</p>${body}<button class="text-button" type="button" data-action="close-card" data-nav>Fermer</button>`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    showTable() {
        if (this.city.pendingEvent) {
            this.toast('Réglez d’abord l’événement en cours.', 'warn');
            return;
        }
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const state = this.city.state, story = this.city.story, chapter = CHAPTERS[story.era - 1];
        const knights = KNIGHTS.map((knight)=>{
            const knightState = state.knights[knight.id];
            const status = !knightState.alive ? 'mort' : isAway(state, knight.id) ? 'en expédition' : knightState.loyalty < 30 ? 'a quitté la Table' : seated(state, knight.id) ? 'siège à la Table, bonus actif' : `siège vide : bâtissez ${definition(SEATS[knight.id]).name.toLowerCase()} dans son secteur`;
            return `<li style="border-left:4px solid ${SECTOR_HEX[KNIGHTS.indexOf(knight)]};padding-left:.5rem"><b>${knight.name}</b> : ${status} (loyauté ${knightState.loyalty}).<br>Bonus : ${KNIGHT_POWERS[knight.id]}</li>`;
        }).join('');
        const closed = state.merlin <= 0 || story.era < 2;
        const spells = Object.keys(SPELLS).map((id)=>`<button class="text-button event-choice" type="button" data-spell="${id}" data-nav${closed ? ' disabled' : ''}><b>${SPELLS[id].name}</b> : ${SPELLS[id].text}</button>`).join('');
        box.innerHTML = `<span class="panel-kicker">Chapitre ${story.era} · ${chapter.volume}</span><h2>${chapter.title}</h2><p>Objectif : ${chapter.goal}</p><p>Chaque chevalier bâtit un type de structure, <b>uniquement dans son secteur</b> (la zone à son nom et à sa couleur sur la carte). Une fois la structure achevée, il prend son siège à la Table et son bonus s’applique, tant qu’il est vivant et loyal (au moins 30).</p><ul class="knight-list">${knights}</ul><span class="panel-kicker">Merlin : ${state.merlin} enchantement(s) restant(s), 15 deniers l’unité${story.era < 2 ? ' (il arrive au chapitre 2)' : ''}</span>${spells}<button class="text-button" type="button" data-action="close-card" data-nav>Fermer</button>`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    showDefense() {
        if (this.city.pendingEvent) {
            this.toast('Réglez d’abord l’événement en cours.', 'warn');
            return;
        }
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const state = this.city.state, threat = nextThreat(state);
        const price = (cost)=>[
                cost.wood && `${cost.wood} bois`,
                cost.stone && `${cost.stone} pierre`,
                cost.food && `${cost.food} vivres`,
                cost.gold && `${cost.gold} deniers`
            ].filter(Boolean).join(', ');
        const enemy = threat?.kind === 'raid' ? `Force ennemie estimée : ${20 + 12 * state.crises}.` : warningLead(state) ? 'Aucun assaut annoncé pour le moment.' : 'Sans tour de guet, la force ennemie est inconnue.';
        const stances = [
            [
                'hold',
                'Tenir les murs',
                'aucun changement'
            ],
            [
                'sortie',
                'Sortie',
                '+20 de défense, mais 2 soldats perdus en cas d’échec'
            ],
            [
                'barricade',
                'Barricades',
                '+10 de défense, et la moitié du pillage évitée en cas d’échec'
            ]
        ];
        const stanceButtons = stances.map(([id, name, text])=>`<button class="text-button event-choice${state.stance === id ? ' is-adopted' : ''}" type="button" data-defense="${id}" data-nav><b>${name}</b> : ${text}</button>`).join('');
        const cap = garrisonCap(state), canRecruit = canGarrison(state) && state.garrison < cap;
        box.innerHTML = `<span class="panel-kicker">Défense</span><h2>Les remparts de Camelot</h2><p>Murs niveau ${state.walls.level}/${MAX_WALL_LEVEL}, solidité ${state.walls.hp} %. Garnison ${state.garrison}/${cap} (1 denier d’entretien par soldat). <b>Défense totale : ${defense(state)}.</b> ${enemy}</p><div class="law-group"><span class="panel-kicker">Attitude face au prochain assaut</span>${stanceButtons}</div><div class="law-group"><button class="text-button event-choice" type="button" data-defense="recruit" data-nav${canRecruit ? '' : ' disabled'}>Recruter un soldat (${price(RECRUIT_COST)}) : +8 de défense</button><button class="text-button event-choice" type="button" data-defense="fortify" data-nav${state.walls.level >= MAX_WALL_LEVEL ? ' disabled' : ''}>Renforcer les murs au niveau ${state.walls.level + 1} (${price(wallUpgradeCost(state))}) : +25 de défense</button><button class="text-button event-choice" type="button" data-defense="mend" data-nav${state.walls.hp >= 100 ? ' disabled' : ''}>Réparer les murs (${price(wallRepairCost(state))})</button></div><button class="text-button" type="button" data-action="close-card" data-nav>Fermer</button>`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    showExpeditions() {
        if (this.city.pendingEvent) {
            this.toast('Réglez d’abord l’événement en cours.', 'warn');
            return;
        }
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const state = this.city.state;
        const legend = Object.keys(DESTINATIONS).map((id)=>`<li><b>${DESTINATIONS[id].name}</b> : ${DESTINATIONS[id].duration} cycles, butin ${DESTINATIONS[id].text}.</li>`).join('');
        const rows = KNIGHTS.map((knight)=>{
            const knightState = state.knights[knight.id], trip = state.expeditions.find((entry)=>entry.knight === knight.id);
            const able = knightState.alive && knightState.loyalty >= 30 && !trip;
            const status = !knightState.alive ? 'mort' : trip ? `en expédition (${DESTINATIONS[trip.dest].short}), retour dans ${Math.max(0, trip.back - state.tick)} cycles` : knightState.loyalty < 30 ? 'a quitté la Table' : `disponible (loyauté ${knightState.loyalty})`;
            const buttons = Object.keys(DESTINATIONS).map((id)=>`<button class="text-button event-choice" type="button" data-expedition="${knight.id}:${id}" data-nav${able ? '' : ' disabled'}>${DESTINATIONS[id].short} · risque ${Math.round(expeditionRisk(state, knight.id, id) * 100)} %</button>`).join('');
            return `<div class="law-group"><span class="panel-kicker">${knight.name} : ${status}</span><div class="exp-row">${buttons}</div></div>`;
        }).join('');
        box.innerHTML = `<span class="panel-kicker">Expéditions</span><h2>Envoyer un chevalier hors de la carte</h2><p>Pendant son absence, le chevalier ne siège plus (son bonus est perdu). Au retour : butin, ou blessure (loyauté en baisse), ou mort. Le risque baisse avec la loyauté et monte en hiver.</p><ul class="knight-list">${legend}</ul>${rows}<button class="text-button" type="button" data-action="close-card" data-nav>Fermer</button>`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    showTrade() {
        if (this.city.pendingEvent) {
            this.toast('Réglez d’abord l’événement en cours.', 'warn');
            return;
        }
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const state = this.city.state, open = caravanOpen(state), hasMarket = countBuildings(state, 'market') > 0;
        const header = open ? `Une caravane est installée : encore ${caravanIn(state)} cycles.` : hasMarket ? `Prochaine caravane dans ${caravanIn(state)} cycles.` : 'Bâtissez un marché (Perceval) pour attirer les caravanes.';
        const names = {
            wood: 'bois',
            stone: 'pierre',
            food: 'vivres'
        };
        const lines = [
            'wood',
            'stone',
            'food'
        ].map((resource)=>{
            const buy = `<button class="text-button event-choice" type="button" data-trade="buy:${resource}" data-nav${open ? '' : ' disabled'}>Acheter 10 ${names[resource]} (${tradeQuote(state, 'buy', resource)} deniers)</button>`;
            const sell = `<button class="text-button event-choice" type="button" data-trade="sell:${resource}" data-nav${open ? '' : ' disabled'}>Vendre 10 ${names[resource]} (+${tradeQuote(state, 'sell', resource)} deniers)</button>`;
            return `<div class="law-group"><span class="panel-kicker">${names[resource]} : stock ${state.resources[resource]}, prix du jour ${marketPrice(state, resource).toFixed(2)} denier l’unité</span>${buy}${sell}</div>`;
        }).join('');
        box.innerHTML = `<span class="panel-kicker">Commerce</span><h2>Les marchands de passage</h2><p>${header} Les vivres sont chers l’hiver et bon marché à l’automne : achetez quand c’est bon marché, vendez quand c’est cher. Vos deniers : ${state.resources.gold}.</p>${lines}<button class="text-button" type="button" data-action="close-card" data-nav>Fermer</button>`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    showEnding(ending) {
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const texts = {
            avalon: [
                'Avalon',
                'Le roi blessé est emporté vers l’île d’Avalon, et la coupe a guéri le royaume : les conteurs diront qu’Arthur dort, non qu’il est mort.'
            ],
            apaise: [
                'Un règne apaisé',
                'Mordred reste un nom que l’on murmure. La Table Ronde tient, la cité prospère et chacun garde son siège.'
            ],
            salesbieres: [
                'Salesbières',
                'La plaine boit le sang des chevaliers. Il ne restera de Camelot qu’un chant et quelques pierres.'
            ]
        };
        const [title, text] = texts[ending] ?? texts.salesbieres;
        box.innerHTML = `<span class="panel-kicker">FIN DU RÈGNE</span><h2>${title}</h2><p>${text}</p><button class="primary-button" type="button" data-action="close-card" data-nav>Poursuivre le règne</button><button class="text-button" type="button" data-action="restart" data-nav>Tracer un nouveau plan</button>`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    showDefeat(reason) {
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const causes = {
            hope: 'Le désespoir a gagné Camelot : plus personne ne croit à la Table Ronde.',
            discontent: 'Le peuple se révolte et chasse son roi.',
            walls: 'Les remparts sont tombés : Camelot est prise.'
        };
        box.innerHTML = `<span class="panel-kicker">LE ROYAUME SUCCOMBE</span><h2>Camelot est tombée.</h2><p>${causes[reason] ?? 'Camelot a succombé.'}</p><button class="primary-button" type="button" data-action="restart" data-nav>Tracer un nouveau plan</button>`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    hint(text, x, y) {
        const tip = this.root.querySelector('.ghost-tip');
        if (!tip) return;
        tip.hidden = !text;
        if (text) {
            tip.textContent = text;
            tip.style.transform = `translate(${x + 16}px, ${y + 16}px)`;
        }
    }
    showEvent(event) {
        const box = this.root.querySelector('.event-card');
        if (!box) return;
        const list = event.choices.map((choice, index)=>`<button class="text-button event-choice" type="button" data-choice="${index}" data-nav${storyCanChoose(choice, this.city.state.resources) ? '' : ' disabled'}>${choice.label}</button>`).join('');
        box.innerHTML = `<span class="panel-kicker">${event.volume}</span><h2>${event.title}</h2><p>${event.text}</p>${list}`;
        this.root.querySelector('.event-overlay')?.classList.add('is-visible');
    }
    costMarkup(kind) {
        const cost = definition(kind).cost;
        return [
            'wood',
            'stone',
            'food'
        ].filter((resource)=>cost[resource] > 0).map((resource)=>`<span class="cost-chip"><i class="resource-mark ${resource}">${RESOURCE_MARKS[resource]}</i>${cost[resource]}</span>`).join('') || '<span class="cost-free">Sans coût</span>';
    }
    template() {
        const cards = BUILDINGS.map((building)=>`
      <button class="build-card" type="button" data-build="${building.id}" aria-pressed="false" data-nav>
        <span class="building-icon">${BUILDING_ICONS[building.id]}</span>
        <span class="build-copy"><b>${building.name}</b><small>${building.subtitle}</small><span class="build-cost"></span></span>
        <span class="build-meta"><span class="build-count"></span><span class="build-status"></span></span>
      </button>`).join('');
        return `
      <div class="game-shell">
        <header class="topbar">
          <div class="brand-lockup">
            <span class="brand-seal" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M5 25 8 8l8 7 8-7 3 17H5Z"/><path d="M9 25v3h14v-3M9 22h14"/></svg></span>
            <span class="brand-name"><strong>CAMELOT</strong><small>LA PREMIÈRE PIERRE</small></span>
          </div>
          <div class="resource-ribbon" role="status" aria-label="Réserves de la cité">
            ${[
            'wood',
            'stone',
            'food',
            'gold'
        ].map((resource)=>`<div class="resource-pill ${resource}" data-resource="${resource}"><i class="resource-mark ${resource}">${RESOURCE_MARKS[resource]}</i><span class="resource-label">${RESOURCE_LABELS[resource]}</span><b class="resource-amount">0</b><small class="trend" data-trend></small></div>`).join('')}
            ${[
            'honneur',
            'piete',
            'concorde'
        ].map((gauge)=>`<div class="resource-pill"><i class="resource-mark">${gauge === 'honneur' ? 'H' : gauge === 'piete' ? '✝' : 'C'}</i><span class="resource-label">${gauge[0].toUpperCase() + gauge.slice(1)}</span><b class="resource-amount" data-gauge="${gauge}">50</b></div>`).join('')}<div class="resource-pill"><i class="resource-mark">☼</i><span class="resource-label">Saison</span><b class="resource-amount" data-season>Printemps</b></div><div class="resource-pill people"><i class="people-mark">✣</i><span class="resource-label">Âmes</span><b class="resource-amount" data-population>0</b></div>
          </div>
          <div class="top-actions"><button class="icon-button" type="button" data-action="restart" aria-label="Recommencer la cité" title="Recommencer" data-nav><span>↺</span></button></div>
        </header>

        <aside class="build-panel parchment-panel" aria-label="Bâtiments disponibles">
          <div class="panel-kicker">BÂTISSEURS DE CAMELOT</div>
          <div class="build-heading"><div><h1>Élever une cité</h1><p>Fondez le village, puis dressez le donjon.</p></div><span class="building-total"><b data-building-total>1</b><small>BÂTIS</small></span></div>
          <div class="tool-row">${[
            'view',
            'build',
            'upgrade',
            'demolish',
            'move',
            'repair'
        ].map((tool)=>`<button class="tool-button" type="button" data-tool="${tool}" data-nav>${tool === 'view' ? 'Contempler' : tool === 'build' ? 'Bâtir' : tool === 'upgrade' ? 'Améliorer' : tool === 'demolish' ? 'Démolir' : tool === 'move' ? 'Déplacer' : 'Réparer'}</button>`).join('')}<button class="tool-button" type="button" data-action="codex" data-nav>Codex</button><button class="tool-button" type="button" data-action="table" data-nav>Table</button><button class="tool-button" type="button" data-action="trade" data-nav>Commerce</button><button class="tool-button" type="button" data-action="expeditions" data-nav>Expéditions</button><button class="tool-button" type="button" data-action="defense" data-nav>Défense</button></div>
          <div class="tool-row">${[
            [
                'none',
                'Sans calque'
            ],
            [
                'logistics',
                'Trajets'
            ],
            [
                'sectors',
                'Secteurs'
            ],
            [
                'resources',
                'Réserves'
            ],
            [
                'wear',
                'Usure'
            ]
        ].map(([id, label])=>`<button class="tool-button" type="button" data-overlay="${id}" data-nav>${label}</button>`).join('')}</div>
          <div class="tool-row">${[
            [
                0.25,
                'Bâtisseurs 25 %'
            ],
            [
                0.5,
                '50 %'
            ],
            [
                0.75,
                '75 %'
            ]
        ].map(([share, label])=>`<button class="tool-button" type="button" data-share="${share}" data-nav title="Part des habitants affectée aux chantiers">${label}</button>`).join('')}</div>
          <div class="tool-row">${[
            'food',
            'materials',
            'services'
        ].map((category)=>`<button class="tool-button" type="button" data-priority="${category}" data-nav title="Priorité des ouvriers en cas de pénurie : basse, normale ou haute"></button>`).join('')}</div>
          <div class="building-list">${cards}</div>
          <div class="panel-foot"><span class="foot-seal">✦</span><p><b>Comment bâtir</b><br>Posez un chantier : les villageois le bâtissent. Les trajets longs réduisent le rendement.</p></div>
        </aside>

        <section class="objective-panel parchment-panel" aria-label="Objectif de la partie">
          <div class="objective-top"><div><span class="panel-kicker">VOTRE PREMIÈRE QUÊTE</span><h2>Le noyau fortifié</h2></div><span class="progress-label" data-progress>1/3 fondations</span></div>
          <div class="objective-track"><i class="objective-fill"></i></div>
          <div class="objective-steps">
            <div class="objective-step" data-step="0"><i></i><span>Fonder le premier foyer</span><b>FAIT</b></div>
            <div class="objective-step" data-step="1"><i></i><span>Établir une scierie</span><b>À BÂTIR</b></div>
            <div class="objective-step" data-step="2"><i></i><span>Ouvrir une carrière</span><b>À BÂTIR</b></div>
            <div class="objective-step" data-step="3"><i></i><span>Ériger le donjon</span><b>À BÂTIR</b></div>
          </div>
          <div class="objective-hint"><span class="hint-dot"></span>Les ateliers produisent des ressources à chaque cloche.</div>
        </section>

        <div class="map-controls" aria-label="Commandes de la carte"><span><kbd>Clic</kbd> bâtir</span><span><kbd>Molette</kbd> zoomer</span><span><kbd>Clic droit</kbd> déplacer</span></div>
        <div class="save-note"><span></span>Partie sauvegardée sur cet appareil</div>
        <div class="toast" aria-live="polite" role="status"></div>
        <div class="loading-screen"><div class="loading-card parchment-panel"><div class="loading-seal">✦</div><span class="panel-kicker">UN ROYAUME PREND FORME</span><h2>Les plans de Camelot</h2><div class="loading-progress"><i></i></div><p class="loading-copy">Le conseil prépare les plans…</p><button class="loading-retry" type="button" hidden onclick="location.reload()">Réessayer</button></div></div>
        <div class="speed-bar">${[
            0,
            1,
            2,
            3
        ].map((n)=>`<button class="tool-button speed-button" type="button" data-speed="${n}" data-nav title="${n ? 'Vitesse ×' + n : 'Pause (Espace)'}">${n ? '×' + n : '⏸'}</button>`).join('')}</div>
        <div class="alert-bar"></div>
        <div class="mood-bar"><div class="mood-pill">Espoir <b data-mood="hope">60</b></div><div class="mood-pill">Colère <b data-mood="discontent">10</b></div><div class="mood-pill">Menace <b data-threat>—</b></div><div class="mood-pill" title="Ouvriers disponibles / postes à pourvoir">Travail <b data-work>0/0</b></div><div class="mood-pill">Chap. <b data-chapter>1</b></div></div>
        <div class="ghost-tip" hidden></div>
        <div class="event-overlay"><div class="event-card parchment-panel"></div></div>
        <div class="victory-overlay" role="dialog" aria-modal="true" aria-labelledby="victory-title"><div class="victory-card parchment-panel"><span class="victory-crown">✦</span><span class="panel-kicker">LE PREMIER SERMENT EST TENU</span><h2 id="victory-title">Camelot est née.</h2><p>Un donjon veille désormais sur vos foyers. Le royaume n’en est qu’à sa première pierre.</p><button class="primary-button" type="button" data-action="continue">Poursuivre le règne <span>→</span></button><button class="text-button" type="button" data-action="restart">Tracer un nouveau plan</button></div></div>
        <div class="help-popover" hidden><b>Un village devient royaume</b><p>Bâtissez une scierie et une carrière. Chaque atelier ajoute des ressources à la cloche. Avec assez de bois, de pierre et de vivres, le donjon se déverrouille.</p></div>
        <button class="help-button" type="button" data-action="help" aria-label="Aide du jeu" data-nav>?</button>
      </div>`;
    }
    handleClick = (event)=>{
        const target = event.target.closest('[data-build], [data-action], [data-choice], [data-tool], [data-law], [data-spell], [data-speed], [data-overlay], [data-share], [data-trade], [data-expedition], [data-priority], [data-defense]');
        if (!target) return;
        if (target.dataset.action === 'codex') {
            this.showCodex();
            return;
        }
        if (target.dataset.action === 'table') {
            this.showTable();
            return;
        }
        if (target.dataset.spell) {
            this.city.castSpell(target.dataset.spell);
            this.showTable();
            return;
        }
        if (target.dataset.action === 'close-card') {
            this.root.querySelector('.event-overlay')?.classList.remove('is-visible');
            return;
        }
        if (target.dataset.action === 'restart') this.root.querySelector('.event-overlay')?.classList.remove('is-visible');
        if (target.dataset.law) {
            this.city.adoptLaw(target.dataset.law);
            this.showCodex();
            return;
        }
        if (target.dataset.priority) {
            this.city.cyclePriority(target.dataset.priority);
            this.update();
            return;
        }
        if (target.dataset.defense) {
            this.city.defend(target.dataset.defense);
            this.showDefense();
            return;
        }
        if (target.dataset.action === 'defense') {
            this.showDefense();
            return;
        }
        if (target.dataset.expedition) {
            const [knight, dest] = target.dataset.expedition.split(':');
            this.city.sendExpedition(knight, dest);
            this.showExpeditions();
            return;
        }
        if (target.dataset.action === 'expeditions') {
            this.showExpeditions();
            return;
        }
        if (target.dataset.trade) {
            const [action, resource] = target.dataset.trade.split(':');
            this.city.trade(action, resource);
            this.showTrade();
            return;
        }
        if (target.dataset.action === 'trade') {
            this.showTrade();
            return;
        }
        if (target.dataset.share) {
            this.city.setBuilderShare(Number(target.dataset.share));
            this.update();
            return;
        }
        if (target.dataset.speed) {
            this.city.setSpeed(Number(target.dataset.speed));
            this.update();
            return;
        }
        if (target.dataset.overlay) {
            this.city.setOverlay(target.dataset.overlay);
            this.update();
            return;
        }
        if (target.dataset.tool) {
            this.city.setTool(target.dataset.tool);
            this.update();
            return;
        }
        if (target.dataset.choice !== undefined) {
            this.root.querySelector('.event-overlay')?.classList.remove('is-visible');
            this.city.resolveEvent(Number(target.dataset.choice));
            if (this.city.pendingEvent) this.showEvent(this.city.pendingEvent);
            return;
        }
        const kind = target.dataset.build;
        if (kind) {
            if (target instanceof HTMLButtonElement && target.disabled) {
                if (!isUnlocked(this.city.state, kind)) this.toast('Ce bâtiment n’est pas encore débloqué.', 'warn');
                else this.toast('Les réserves ne suffisent pas encore.', 'warn');
                return;
            }
            this.city.selectBuilding(kind);
            const building = definition(kind);
            this.toast(`${building.name} sélectionnée — choisissez une parcelle libre.`, 'good');
            return;
        }
        switch(target.dataset.action){
            case 'restart':
                this.city.reset();
                break;
            case 'continue':
                this.root.querySelector('.victory-overlay')?.classList.remove('is-visible');
                break;
            case 'help':
                {
                    const help = this.root.querySelector('.help-popover');
                    if (help) help.hidden = !help.hidden;
                    break;
                }
            default:
                break;
        }
    };
    toast(message, tone) {
        const toast = this.root.querySelector('.toast');
        if (!toast) return;
        toast.textContent = message;
        toast.dataset.tone = tone;
        toast.classList.add('is-visible');
        window.clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(()=>toast.classList.remove('is-visible'), 2600);
    }
}
