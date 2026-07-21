import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const CARD_DEFINITIONS = {
  pharmacie_base:  { name:"Pharmacie",                  emoji:"🏬", activation:[1,2],  income:1, cost:0,  color:'green',  type:'income', maxOwned:1, starter:true, description:"Vous gagnez 1€ à votre tour si vous faites 1–2" },
  labo_base:       { name:"Laboratoire",                emoji:"🔭", activation:[3],    income:1, cost:0,  color:'blue',   type:'income', maxOwned:1, starter:true, description:"Gagnez 1€ si quelqu'un fait 3 (vous ou l'adversaire)" },
  hopital:         { name:"Hôpital Cochin",             emoji:"🏥", activation:[9,10], income:3, cost:6,  color:'blue',   type:'income', maxOwned:3, description:"Gagnez 3€ quel que soit le joueur qui fait 9–10" },
  clinique:        { name:"Clinique privée",            emoji:"🩺", activation:[5],    income:2, cost:4,  color:'blue',   type:'income', maxOwned:3, description:"Gagnez 2€ quel que soit le joueur qui fait 5" },
  fabrication:     { name:"Dolpharm",                   emoji:"⚗️", activation:[4],    income:3, cost:3,  color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 3€ à votre tour si vous faites 4" },
  recherche:       { name:"Sanophi",                    emoji:"🔬", activation:[6],    income:5, cost:6,  color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 5€ à votre tour si vous faites 6" },
  biotech:         { name:"Bo2pharm",                   emoji:"✨", activation:[11,12], income:8, cost:12, color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 8€ si vous faites 11–12" },
  startup:         { name:"Startup Biotech",            emoji:"🚀", activation:[8],    income:4, cost:7,  color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 4€ à votre tour si vous faites 8" },
  labo_innovation: { name:"Labo d'innovation",          emoji:"🧪", activation:[5],    income:3, cost:5,  color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 3€ à votre tour si vous faites 5" },
  centre_essais:   { name:"Centre d'essais cliniques",  emoji:"🌡️", activation:[7],    income:4, cost:6,  color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 4€ à votre tour si vous faites 7" },
  pharma_premium:  { name:"Pharmacie du Val de Grâce",  emoji:"💊", activation:[3],    income:2, cost:4,  color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 2€ à votre tour si vous faites 3" },
  usine_production:{ name:"Usine Gerbet",               emoji:"🏭", activation:[9],    income:5, cost:8,  color:'green',  type:'income', maxOwned:3, description:"Vous gagnez 5€ à votre tour si vous faites 9" },
  grossiste:       { name:"Tidis",                      emoji:"📦", activation:[7],    income:2, cost:4,  color:'red',    type:'steal',  maxOwned:3, description:"Au tour des autres, volez 2€ pour 7" },
  importateur:     { name:"Ceropharm",                  emoji:"🚢", activation:[9],    income:3, cost:6,  color:'red',    type:'steal',  maxOwned:3, description:"Au tour des autres, volez 3€ pour 9" },
  distributeur:    { name:"Distributeur Allance",       emoji:"🚚", activation:[5],    income:2, cost:5,  color:'red',    type:'steal',  maxOwned:3, description:"Au tour des autres, volez 2€ pour 5" },
  courtier:        { name:"Courtier en médicaments",    emoji:"💹", activation:[8],    income:3, cost:5,  color:'red',    type:'steal',  maxOwned:3, description:"Au tour des autres, volez 3€ pour 8" },
  centrale_achat:  { name:"Centrale d'achat",           emoji:"🏪", activation:[6],    income:2, cost:5,  color:'red',    type:'steal',  maxOwned:3, description:"Au tour des autres, volez 2€ pour 6" },
  rachat:          { name:"Rachat d'entreprise",        emoji:"💰", activation:[8],    income:5, cost:8,  color:'purple', type:'steal',  maxOwned:3, description:"À votre tour, volez 5€ à un joueur pour 8" },
  fusion:          { name:"Fusion-acquisition",         emoji:"🤝", activation:[10],   income:6, cost:10, color:'purple', type:'steal',  maxOwned:3, description:"À votre tour, volez 6€ à un joueur pour 10" },
  opa:             { name:"OPA hostile",                emoji:"⚡", activation:[7],    income:4, cost:7,  color:'purple', type:'steal',  maxOwned:3, description:"À votre tour, volez 4€ à un joueur pour 7" },
  lobbying:        { name:"Lobbying pharmaceutique",    emoji:"🎯", activation:[9],    income:5, cost:9,  color:'purple', type:'steal',  maxOwned:3, description:"À votre tour, volez 5€ à un joueur pour 9" },
  brevet_vol:      { name:"Vol de brevet",              emoji:"📋", activation:[6],    income:4, cost:6,  color:'purple', type:'steal',  maxOwned:3, description:"À votre tour, volez 4€ à un joueur pour 6" },
  espionnage:      { name:"Espionnage industriel",      emoji:"🕵️", activation:[11],   income:7, cost:11, color:'purple', type:'steal',  maxOwned:3, description:"À votre tour, volez 7€ à un joueur pour 11" },
};

const MONUMENTS = [
  { id:'fda',    name:"Autorisation FDA",     emoji:"🏅", cost:16, benefit:"Relancez les dés une fois par tour", colorFrom:'#78350f', colorTo:'#b45309', border:'#f59e0b' },
  { id:'patent', name:"Brevet exclusif",      emoji:"📜", cost:22, benefit:"+10€ si vous ne gagnez rien",        colorFrom:'#1e3a5f', colorTo:'#1d4ed8', border:'#3b82f6' },
  { id:'usine',  name:"NOVORTIS",             emoji:"🏗️", cost:30, benefit:"Cartes vertes rapportent +2€",       colorFrom:'#14532d', colorTo:'#15803d', border:'#22c55e' },
  { id:'campus', name:"Faculté de Pharmacie", emoji:"🎓", cost:60, benefit:"Achetez 2 cartes par tour",          colorFrom:'#3b0764', colorTo:'#7e22ce', border:'#a855f7' },
];

const ALL_BY_COLOR = {
  blue:   ['hopital','clinique'],
  green:  ['fabrication','recherche','biotech','startup','labo_innovation','centre_essais','pharma_premium','usine_production'],
  red:    ['grossiste','importateur','distributeur','courtier','centrale_achat'],
  purple: ['rachat','fusion','opa','lobbying','brevet_vol','espionnage'],
};

const DOTS = {
  1:[[1,1]], 2:[[0,0],[2,2]], 3:[[0,0],[1,1],[2,2]],
  4:[[0,0],[0,2],[2,0],[2,2]], 5:[[0,0],[0,2],[1,1],[2,0],[2,2]],
  6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]],
};

const PROB_2D = {2:1,3:2,4:3,5:4,6:5,7:6,8:5,9:4,10:3,11:2,12:1};

const CARD_BG     = { blue:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', green:'linear-gradient(135deg,#14532d,#15803d)', red:'linear-gradient(135deg,#7f1d1d,#dc2626)', purple:'linear-gradient(135deg,#3b0764,#7e22ce)' };
const CARD_BORDER = { blue:'rgba(59,130,246,0.45)', green:'rgba(34,197,94,0.45)', red:'rgba(239,68,68,0.45)', purple:'rgba(168,85,247,0.45)' };
const CARD_GLOW   = { blue:'rgba(59,130,246,0.55)', green:'rgba(34,197,94,0.55)', red:'rgba(239,68,68,0.55)', purple:'rgba(168,85,247,0.55)' };

// ─── SOUND ENGINE ─────────────────────────────────────────────────────────────

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

const SFX = {
  _play(fn) { try { fn(getAudioCtx()); } catch(e) {} },
  dice() {
    this._play(ctx => {
      for (let i=0;i<3;i++) setTimeout(()=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.type='square';o.frequency.setValueAtTime(150+Math.random()*300,ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(60,ctx.currentTime+0.09);
        g.gain.setValueAtTime(0.1,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.09);
        o.start();o.stop(ctx.currentTime+0.09);
      },i*55);
    });
  },
  coin(amount) {
    this._play(ctx => {
      const n=Math.min(Math.ceil(amount/2),5);
      for(let i=0;i<n;i++) setTimeout(()=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);o.type='sine';
        const f=880+i*120;o.frequency.setValueAtTime(f,ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(f*1.4,ctx.currentTime+0.06);
        g.gain.setValueAtTime(0.15,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);
        o.start();o.stop(ctx.currentTime+0.2);
      },i*90);
    });
  },
  steal() {
    this._play(ctx => {
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g);g.connect(ctx.destination);o.type='sawtooth';
      o.frequency.setValueAtTime(380,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(90,ctx.currentTime+0.28);
      g.gain.setValueAtTime(0.09,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.28);
      o.start();o.stop(ctx.currentTime+0.28);
    });
  },
  buy() {
    this._play(ctx => {
      [523,659,784].forEach((f,i)=>setTimeout(()=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(0.1,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.14);
        o.start();o.stop(ctx.currentTime+0.14);
      },i*80));
    });
  },
  monument() {
    this._play(ctx => {
      [523,659,784,1047].forEach((f,i)=>setTimeout(()=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(0.18,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.32);
        o.start();o.stop(ctx.currentTime+0.32);
      },i*100));
    });
  },
  victory() {
    this._play(ctx => {
      [523,659,784,1047,784,1047,1319].forEach((f,i)=>setTimeout(()=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.value=f;
        g.gain.setValueAtTime(0.18,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.22);
        o.start();o.stop(ctx.currentTime+0.22);
      },i*115));
    });
  },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const shuffle = arr => [...arr].sort(()=>Math.random()-0.5);
const rollD6 = () => Math.floor(Math.random()*6)+1;

function initShop() {
  return [
    ...shuffle(ALL_BY_COLOR.blue).slice(0,2),
    ...shuffle(ALL_BY_COLOR.green).slice(0,3),
    ...shuffle(ALL_BY_COLOR.red).slice(0,2),
    ...shuffle(ALL_BY_COLOR.purple).slice(0,2),
  ];
}

function initPlayers() {
  const s = { pharmacie_base:1, labo_base:1 };
  return [
    { id:0, money:3, cards:{...s}, monuments:[], diceCount:1, isAI:false },
    { id:1, money:3, cards:{...s}, monuments:[], diceCount:1, isAI:true  },
  ];
}

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

function DiceFace({ value, rolling, size=70 }) {
  return (
    <div style={{width:size,height:size,background:'white',borderRadius:size*0.19,boxShadow:'0 4px 20px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.9)',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gridTemplateRows:'repeat(3,1fr)',padding:size*0.11,gap:2,animation:rolling?'spinDie 0.38s ease':'none'}}>
      {Array.from({length:9}).map((_,idx)=>{
        const row=Math.floor(idx/3),col=idx%3;
        const hasDot=DOTS[value]?.some(([r,c])=>r===row&&c===col);
        const ds=size*0.155;
        return <div key={idx} style={{display:'flex',alignItems:'center',justifyContent:'center'}}>{hasDot&&<div style={{width:ds,height:ds,background:'#1e293b',borderRadius:'50%',boxShadow:'0 1px 3px rgba(0,0,0,0.4)'}}/>}</div>;
      })}
    </div>
  );
}

function CardChip({ color, label }) {
  const s={blue:{bg:'rgba(59,130,246,0.2)',text:'#93c5fd',border:'rgba(59,130,246,0.35)'},green:{bg:'rgba(34,197,94,0.2)',text:'#86efac',border:'rgba(34,197,94,0.35)'},red:{bg:'rgba(239,68,68,0.2)',text:'#fca5a5',border:'rgba(239,68,68,0.35)'},purple:{bg:'rgba(168,85,247,0.2)',text:'#d8b4fe',border:'rgba(168,85,247,0.35)'}}[color]||{};
  return <span style={{display:'inline-block',padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:700,letterSpacing:'0.5px',textTransform:'uppercase',background:s.bg,color:s.text,border:`1px solid ${s.border}`}}>{label}</span>;
}

function Panel({ children, style={} }) {
  return <div style={{background:'rgba(17,24,39,0.88)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:15,...style}}>{children}</div>;
}

function SectionTitle({ children }) {
  return <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:12,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#475569',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>{children}<div style={{flex:1,height:1,background:'rgba(255,255,255,0.05)'}}/></div>;
}

function Btn({ children, onClick, disabled, color='purple' }) {
  const c={purple:{from:'#7c3aed',to:'#4f46e5',sh:'rgba(124,58,237,0.4)',br:'rgba(167,139,250,0.3)'},green:{from:'#166534',to:'#15803d',sh:'rgba(34,197,94,0.3)',br:'rgba(34,197,94,0.3)'},red:{from:'#7f1d1d',to:'#dc2626',sh:'rgba(239,68,68,0.3)',br:'rgba(239,68,68,0.3)'},gold:{from:'#78350f',to:'#b45309',sh:'rgba(245,158,11,0.3)',br:'rgba(245,158,11,0.3)'}}[color]||{from:'#374151',to:'#374151',sh:'none',br:'transparent'};
  return <button onClick={onClick} disabled={disabled} style={{width:'100%',padding:'10px 14px',border:`1px solid ${c.br}`,borderRadius:10,fontWeight:700,fontFamily:'Rajdhani,sans-serif',fontSize:13,letterSpacing:'0.5px',textTransform:'uppercase',cursor:disabled?'not-allowed':'pointer',background:disabled?'rgba(55,65,81,0.5)':`linear-gradient(135deg,${c.from},${c.to})`,color:disabled?'#4b5563':'white',boxShadow:disabled?'none':`0 4px 14px ${c.sh}`,transition:'all 0.15s'}}>{children}</button>;
}

function AnimatedMoney({ value }) {
  const [disp, setDisp] = useState(value);
  const [flash, setFlash] = useState(null);
  const prev = useRef(value);
  useEffect(()=>{
    if (value===prev.current) return;
    const diff=value-prev.current;
    setFlash(diff>0?'up':'down');
    const start=prev.current,steps=10,sv=diff/steps;
    let i=0;
    const id=setInterval(()=>{i++;setDisp(Math.round(start+sv*i));if(i>=steps){clearInterval(id);setDisp(value);setTimeout(()=>setFlash(null),500);}},22);
    prev.current=value;
    return ()=>clearInterval(id);
  },[value]);
  const col=flash==='up'?'#86efac':flash==='down'?'#fca5a5':'#fef3c7';
  return <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:19,fontWeight:800,color:col,transition:'color 0.3s',textShadow:flash?`0 0 10px ${col}`:'none'}}>💰 {disp}€</span>;
}

function EventLog({ events }) {
  const ref=useRef(null);
  useEffect(()=>{if(ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[events]);
  return (
    <div ref={ref} style={{height:135,overflowY:'auto',background:'rgba(0,0,0,0.28)',borderRadius:10,padding:'7px 10px',display:'flex',flexDirection:'column',gap:3,scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.1) transparent'}}>
      {events.length===0&&<div style={{color:'#334155',fontSize:11,textAlign:'center',marginTop:14}}>Aucun événement</div>}
      {events.map((e,i)=>(
        <div key={i} style={{fontSize:11,color:e.type==='gain'?'#86efac':e.type==='steal'?'#fca5a5':e.type==='buy'?'#c4b5fd':'#475569',lineHeight:1.5,animation:i===events.length-1?'fadeIn 0.3s ease':'none'}}>
          <span style={{color:'#1e293b',marginRight:5}}>{e.turn}</span>{e.msg}
        </div>
      ))}
    </div>
  );
}

function TurnSummary({ summary, onClose }) {
  if (!summary) return null;
  const gained = summary.events.filter(e=>e.type==='gain').reduce((s,e)=>s+e.amount,0);
  const lost   = summary.events.filter(e=>e.type==='lost').reduce((s,e)=>s+e.amount,0);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(135deg,#0f172a,#1e1b4b)',border:'1px solid rgba(167,139,250,0.3)',borderRadius:20,padding:26,maxWidth:390,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.6)',animation:'summaryIn 0.25s ease'}}>
        <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:20,fontWeight:700,letterSpacing:2,marginBottom:14}}>📊 RÉSUMÉ — TOUR {summary.turn}</div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:9,padding:'9px 13px',marginBottom:11,display:'flex',alignItems:'center',gap:9}}>
          <span style={{fontSize:18}}>🎲</span>
          <span style={{color:'#64748b',fontSize:12}}>Résultat</span>
          <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:22,fontWeight:800,color:'white',marginLeft:'auto'}}>{summary.roll}</span>
        </div>
        {summary.events.length===0
          ? <div style={{color:'#475569',fontSize:12,textAlign:'center',padding:'10px 0'}}>Aucun effet ce tour.</div>
          : <div style={{display:'flex',flexDirection:'column',gap:5,marginBottom:11}}>
              {summary.events.map((e,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:9,background:e.type==='gain'?'rgba(34,197,94,0.1)':e.type==='lost'?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.04)',border:`1px solid ${e.type==='gain'?'rgba(34,197,94,0.2)':e.type==='lost'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.06)'}`,borderRadius:8,padding:'7px 11px',fontSize:12}}>
                  <span style={{fontSize:15}}>{e.emoji}</span>
                  <span style={{flex:1,color:'#94a3b8'}}>{e.label}</span>
                  <span style={{fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,color:e.type==='gain'?'#86efac':'#fca5a5'}}>{e.type==='gain'?'+':'-'}{e.amount}€</span>
                </div>
              ))}
            </div>
        }
        {(gained>0||lost>0)&&(
          <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:10,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:'#475569',fontSize:12}}>Bilan net</span>
            <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:19,fontWeight:800,color:gained-lost>=0?'#86efac':'#fca5a5'}}>{gained-lost>=0?'+':''}{gained-lost}€</span>
          </div>
        )}
        <button onClick={onClose} style={{width:'100%',padding:'10px',borderRadius:10,border:'1px solid rgba(167,139,250,0.3)',background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontWeight:700,fontFamily:'Rajdhani,sans-serif',fontSize:14,textTransform:'uppercase',cursor:'pointer',letterSpacing:1}}>CONTINUER →</button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function PharmaVille() {
  const [screen, setScreen] = useState('menu');
  const [difficulty, setDifficulty] = useState('moyen');
  const [showRules, setShowRules] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [shop, setShop] = useState([]);
  const [diceResult, setDiceResult] = useState(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [hasBought, setHasBought] = useState(0);
  const [canReroll, setCanReroll] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [events, setEvents] = useState([]);
  const [turnNum, setTurnNum] = useState(1);
  const [winner, setWinner] = useState(null);
  const [turnSummary, setTurnSummary] = useState(null);
  const [activatedCards, setActivatedCards] = useState([]);

  const eventsRef = useRef([]);
  const turnNumRef = useRef(1);

  const sfx = useCallback((fn) => { if (soundOn) fn(); }, [soundOn]);

  const addToast = (msg) => {
    const id = Date.now()+Math.random();
    setToasts(p=>[...p,{id,msg}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),2800);
  };

  const pushEvent = (msg, type='info') => {
    const e = { turn:`T${turnNumRef.current}`, msg, type };
    eventsRef.current = [...eventsRef.current.slice(-60), e];
    setEvents([...eventsRef.current]);
  };

  const buyLimit = (pls, cp) => pls[cp].monuments.includes('campus') ? 2 : 1;

  const startGame = () => {
    eventsRef.current = [];
    turnNumRef.current = 1;
    setPlayers(initPlayers());
    setCurrentPlayer(0);
    setShop(initShop());
    setDiceResult(null);
    setHasRolled(false);
    setHasBought(0);
    setCanReroll(false);
    setEvents([]);
    setTurnNum(1);
    setWinner(null);
    setTurnSummary(null);
    setActivatedCards([]);
    setIsAIThinking(false);
    setScreen('playing');
  };

  // ── Resolve ───────────────────────────────────────────────────────────────
  const resolveEffects = useCallback((rollValue, pls, cp) => {
    const np = pls.map(p=>({...p,cards:{...p.cards},monuments:[...p.monuments]}));
    const hasNovortis = np[cp].monuments.includes('usine');
    let anyGained = false;
    const litCards = [];
    const summaryEvs = [];

    // BLUE
    Object.entries(CARD_DEFINITIONS).forEach(([id,card])=>{
      if (card.color!=='blue'||!card.activation.includes(rollValue)) return;
      np.forEach((p,i)=>{
        const cnt=p.cards[id]||0;
        if (!cnt) return;
        const earned=card.income*cnt; p.money+=earned; anyGained=true; litCards.push(id);
        pushEvent(`${card.emoji} ${card.name} → J${i+1} +${earned}€`,'gain');
        if (i===cp) summaryEvs.push({emoji:card.emoji,label:`${card.name} (×${cnt})`,amount:earned,type:'gain'});
        else summaryEvs.push({emoji:card.emoji,label:`${card.name} → J${i+1} +${earned}€`,amount:earned,type:'gain'});
      });
    });
    // RED
    Object.entries(CARD_DEFINITIONS).forEach(([id,card])=>{
      if (card.color!=='red'||!card.activation.includes(rollValue)) return;
      np.forEach((p,i)=>{
        if (i===cp) return;
        const cnt=p.cards[id]||0;
        if (!cnt) return;
        const stolen=Math.min(card.income*cnt,np[cp].money);
        if (!stolen) return;
        np[cp].money-=stolen; p.money+=stolen; litCards.push(id);
        pushEvent(`${card.emoji} ${card.name} → J${i+1} vole ${stolen}€`,'steal');
        summaryEvs.push({emoji:card.emoji,label:`${card.name} — volé par J${i+1}`,amount:stolen,type:'lost'});
      });
    });
    // GREEN
    Object.entries(CARD_DEFINITIONS).forEach(([id,card])=>{
      if (card.color!=='green'||!card.activation.includes(rollValue)) return;
      const cnt=np[cp].cards[id]||0;
      if (!cnt) return;
      const bonus=hasNovortis?2:0;
      const earned=(card.income+bonus)*cnt; np[cp].money+=earned; anyGained=true; litCards.push(id);
      pushEvent(`${card.emoji} ${card.name} → +${earned}€${bonus?' (NOVORTIS)':''}`,'gain');
      summaryEvs.push({emoji:card.emoji,label:`${card.name} (×${cnt})${bonus?' +NOVORTIS':''}`,amount:earned,type:'gain'});
    });
    // PURPLE
    Object.entries(CARD_DEFINITIONS).forEach(([id,card])=>{
      if (card.color!=='purple'||!card.activation.includes(rollValue)) return;
      const cnt=np[cp].cards[id]||0;
      if (!cnt) return;
      const targets=np.map((p,i)=>({p,i})).filter(({i})=>i!==cp&&np[i].money>0).sort((a,b)=>b.p.money-a.p.money);
      if (!targets.length) return;
      const {p:target,i:tidx}=targets[0];
      const stolen=Math.min(card.income*cnt,target.money);
      target.money-=stolen; np[cp].money+=stolen; litCards.push(id);
      pushEvent(`${card.emoji} ${card.name} → vole ${stolen}€ à J${tidx+1}`,'steal');
      summaryEvs.push({emoji:card.emoji,label:`${card.name} → volé à J${tidx+1}`,amount:stolen,type:'gain'});
    });
    // Patent
    if (!anyGained&&np[cp].monuments.includes('patent')) {
      np[cp].money+=10; pushEvent(`📜 Brevet exclusif → +10€`,'gain');
      summaryEvs.push({emoji:'📜',label:'Brevet exclusif (aucun gain)',amount:10,type:'gain'});
    }

    return { np, litCards, summaryEvs };
  }, []);

  // ── Roll ──────────────────────────────────────────────────────────────────
  const performRoll = useCallback((pls, cp, isReroll=false) => {
    const numDice=pls[cp].diceCount;
    const d1=rollD6(), d2=numDice===2?rollD6():null, total=d1+(d2||0);
    setIsRolling(true);
    sfx(()=>SFX.dice());
    setTimeout(()=>setIsRolling(false),370);
    setDiceResult({d1,d2,total});
    pushEvent(`🎲 J${cp+1} lance → ${total}`,'info');

    setTimeout(()=>{
      const {np,litCards,summaryEvs}=resolveEffects(total,pls,cp);
      setPlayers(np);
      setActivatedCards(litCards);
      const gained=summaryEvs.filter(e=>e.type==='gain').reduce((s,e)=>s+e.amount,0);
      const lost=summaryEvs.filter(e=>e.type==='lost').reduce((s,e)=>s+e.amount,0);
      if (lost>0) sfx(()=>SFX.steal());
      else if (gained>0) sfx(()=>SFX.coin(gained));
      if (!isReroll&&pls[cp].monuments.includes('fda')) { setCanReroll(true); addToast('🏅 FDA : vous pouvez relancer !'); }
    },420);
  }, [resolveEffects, sfx]);

  const handleRoll = useCallback(()=>{
    if (hasRolled&&!canReroll) return;
    setHasRolled(true);
    setActivatedCards([]);
    if (canReroll) setCanReroll(false);
    performRoll(players,currentPlayer,canReroll);
  },[players,currentPlayer,hasRolled,canReroll,performRoll]);

  // ── End turn ──────────────────────────────────────────────────────────────
  const doEndTurn = useCallback(()=>{
    setTurnSummary(null);
    setActivatedCards([]);
    const next=(currentPlayer+1)%2;
    setCurrentPlayer(next);
    setHasRolled(false);
    setHasBought(0);
    setCanReroll(false);
    setDiceResult(null);
    const newT=turnNumRef.current+1;
    turnNumRef.current=newT;
    setTurnNum(newT);
  },[currentPlayer]);

  const handleEndTurn = useCallback(()=>{
    if (!players[currentPlayer]?.isAI && diceResult) {
      // Build summary from events this turn
      const tLabel=`T${turnNumRef.current}`;
      const evs=eventsRef.current.filter(e=>e.turn===tLabel&&(e.type==='gain'||e.type==='steal'));
      const summaryEvs=evs.map(e=>{
        const amtMatch=e.msg.match(/(\d+)€/);
        const amt=amtMatch?parseInt(amtMatch[1]):0;
        return {emoji:e.msg.match(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]/u)?.[0]||'•',label:e.msg.replace(/^[^\s]+\s/,'').replace(/→\s/,'').trim(),amount:amt,type:e.type==='gain'?'gain':'lost'};
      });
      setTurnSummary({turn:turnNumRef.current,roll:diceResult.total,events:summaryEvs});
    } else {
      doEndTurn();
    }
  },[players,currentPlayer,diceResult,doEndTurn]);

  // ── Buys ──────────────────────────────────────────────────────────────────
  const handleBuyCard = useCallback((cardId)=>{
    const card=CARD_DEFINITIONS[cardId];
    if (!card) return;
    let ok=false;
    setPlayers(prev=>{
      const lim=buyLimit(prev,currentPlayer);
      if (hasBought>=lim) return prev;
      const np=prev.map(p=>({...p,cards:{...p.cards}}));
      const p=np[currentPlayer];
      if (p.money<card.cost||(p.cards[cardId]||0)>=card.maxOwned) return prev;
      p.money-=card.cost; p.cards[cardId]=(p.cards[cardId]||0)+1; ok=true;
      return np;
    });
    if (!ok) return;
    setHasBought(b=>b+1);
    sfx(()=>SFX.buy());
    addToast(`✅ ${card.emoji} ${card.name} acheté`);
    pushEvent(`🛒 Achat : ${card.name}`,'buy');
    setShop(prev=>{
      const n=[...prev],idx=n.indexOf(cardId);
      if (idx===-1) return prev;
      const pool=ALL_BY_COLOR[card.color].filter(id=>id!==cardId);
      if (pool.length>0) n[idx]=shuffle(pool)[0];
      return n;
    });
  },[currentPlayer,hasBought,sfx]);

  const handleBuyMonument = useCallback((monumentId)=>{
    const m=MONUMENTS.find(m=>m.id===monumentId);
    if (!m) return;
    setPlayers(prev=>{
      const lim=buyLimit(prev,currentPlayer);
      if (hasBought>=lim) return prev;
      const np=prev.map(p=>({...p,monuments:[...p.monuments]}));
      const p=np[currentPlayer];
      if (p.money<m.cost||p.monuments.includes(monumentId)) return prev;
      p.money-=m.cost; p.monuments.push(monumentId);
      return np;
    });
    setHasBought(b=>b+1);
    sfx(()=>SFX.monument());
    addToast(`🏆 ${m.emoji} ${m.name} construit !`);
    pushEvent(`🏗️ Monument : ${m.name}`,'buy');
  },[currentPlayer,hasBought,sfx]);

  // Vérification de victoire après chaque changement de players
  useEffect(()=>{
    if (screen!=='playing'||players.length===0) return;
    const winner = players.findIndex(p=>p.monuments.length===4);
    if (winner!==-1) {
      setTimeout(()=>{ setWinner(winner); setScreen('victory'); sfx(()=>SFX.victory()); },300);
    }
  },[players, screen]);

  const handleBuyDice = useCallback(()=>{
    setPlayers(prev=>{
      const lim=buyLimit(prev,currentPlayer);
      if (hasBought>=lim) return prev;
      const np=prev.map(p=>({...p}));
      if (np[currentPlayer].money<20||np[currentPlayer].diceCount===2) return prev;
      np[currentPlayer].money-=20; np[currentPlayer].diceCount=2;
      return np;
    });
    setHasBought(b=>b+1);
    sfx(()=>SFX.buy());
    addToast('🎲🎲 Deuxième dé acheté !');
    pushEvent(`🎲 2ème dé acheté`,'buy');
  },[currentPlayer,hasBought,sfx]);

  const handleSwapShop = (cardId)=>{
    const card=CARD_DEFINITIONS[cardId];
    if (!card) return;
    setShop(prev=>{
      const n=[...prev],idx=n.indexOf(cardId);
      if (idx===-1) return prev;
      const pool=ALL_BY_COLOR[card.color].filter(id=>id!==cardId);
      if (pool.length>0) n[idx]=shuffle(pool)[0];
      return n;
    });
    addToast('🔄 Carte remplacée');
  };

  // ── AI ────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if (screen!=='playing'||players.length===0) return;
    const cp=currentPlayer;
    if (!players[cp]?.isAI||hasRolled) return;
    setIsAIThinking(true);
    const t=setTimeout(()=>{ performRoll(players,cp,true); setHasRolled(true); },1200);
    return ()=>clearTimeout(t);
  },[currentPlayer,screen,hasRolled,players]);

  useEffect(()=>{
    if (screen!=='playing'||players.length===0) return;
    const cp=currentPlayer;
    if (!players[cp]?.isAI||!hasRolled) return;
    const p=players[cp];
    const lim=buyLimit(players,cp);
    if (hasBought>=lim) {
      const t=setTimeout(()=>{ setIsAIThinking(false); doEndTurn(); },900);
      return ()=>clearTimeout(t);
    }
    setIsAIThinking(true);
    const t=setTimeout(()=>{
      let best=null,bs=-1;
      for (const m of MONUMENTS) {
        if (!p.monuments.includes(m.id)&&p.money>=m.cost) {
          let s=200-p.monuments.length*20+(difficulty==='difficile'?60:difficulty==='facile'?-30:0);
          if (s>bs){bs=s;best={type:'monument',id:m.id};}
        }
      }
      if (p.diceCount===1&&p.money>=20) {
        const s=difficulty==='facile'?45:difficulty==='difficile'?90:70;
        if (s>bs){bs=s;best={type:'dice'};}
      }
      for (const cardId of shop) {
        const card=CARD_DEFINITIONS[cardId];
        if (!card) continue;
        const owned=p.cards[cardId]||0;
        if (p.money>=card.cost&&owned<card.maxOwned) {
          let s=(card.income/card.cost)*20;
          if(difficulty==='facile'){if(card.color==='blue')s+=12;}
          else if(difficulty==='moyen'){if(card.color==='green')s+=10;if(card.color==='purple')s+=12;if(card.color==='red')s+=8;}
          else{if(card.color==='purple')s+=25;if(card.color==='red')s+=20;if(card.color==='green')s+=15;}
          if(s>bs){bs=s;best={type:'card',id:cardId};}
        }
      }
      if(difficulty==='facile'&&Math.random()<0.3) best=null;
      if(best){
        if(best.type==='monument') handleBuyMonument(best.id);
        else if(best.type==='dice') handleBuyDice();
        else handleBuyCard(best.id);
      } else {
        setTimeout(()=>{ setIsAIThinking(false); doEndTurn(); },700);
      }
    },1800);
    return ()=>clearTimeout(t);
  },[currentPlayer,hasRolled,hasBought,screen,players,difficulty]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!players||players.length===0||screen==='menu') return <MenuScreen difficulty={difficulty} setDifficulty={setDifficulty} startGame={startGame} showRules={showRules} setShowRules={setShowRules} soundOn={soundOn} setSoundOn={setSoundOn}/>;
  if (screen==='victory') return <VictoryScreen winner={winner} players={players} onReplay={()=>{setScreen('menu');setPlayers([]);}} />;

  const p=players[currentPlayer], opp=players[1-currentPlayer];
  const lim=buyLimit(players,currentPlayer);
  const canBuyMore=hasRolled&&hasBought<lim&&!p.isAI;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh',background:'#0a0e1a',color:'#e0e8ff',fontFamily:'Exo 2,sans-serif',padding:13,position:'relative'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Exo+2:wght@300;400;600;700;800&display=swap');
        @keyframes slideIn{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes spinDie{0%{transform:rotate(0)scale(0.72)}55%{transform:rotate(195deg)scale(1.18)}100%{transform:rotate(360deg)scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes summaryIn{from{transform:scale(0.9)translateY(14px);opacity:0}to{transform:scale(1)translateY(0);opacity:1}}
        @keyframes cardGlow{0%,100%{box-shadow:0 0 10px var(--glow,transparent)}50%{box-shadow:0 0 26px var(--glow,transparent),0 0 45px var(--glow,transparent)}}
        @keyframes activated{0%{transform:scale(1)}20%{transform:scale(1.04)}100%{transform:scale(1)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
      `}</style>

      {/* Popup */}
      {turnSummary && <TurnSummary summary={turnSummary} onClose={doEndTurn}/>}

      {/* Toasts */}
      <div style={{position:'fixed',top:13,right:13,display:'flex',flexDirection:'column',gap:7,zIndex:150}}>
        {toasts.map(t=>(
          <div key={t.id} style={{background:'linear-gradient(135deg,#312e81,#4c1d95)',border:'1px solid rgba(167,139,250,0.4)',color:'white',padding:'8px 13px',borderRadius:10,fontWeight:600,fontSize:12,boxShadow:'0 4px 18px rgba(124,58,237,0.4)',animation:'slideIn 0.3s ease',whiteSpace:'nowrap'}}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{background:'rgba(17,24,39,0.92)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'11px 19px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11,flexWrap:'wrap',gap:9}}>
        <div>
          <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:19,fontWeight:700,letterSpacing:3,background:'linear-gradient(135deg,#c084fc,#818cf8,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PHARMAVILLE</div>
          <div style={{fontSize:11,color:'#334155',marginTop:1}}>
            Tour {turnNum} · {p.isAI?<span style={{color:'#f59e0b',animation:'pulse 1.2s infinite'}}>🤖 IA réfléchit…</span>:<span style={{color:'#86efac'}}>🎮 Votre tour</span>}
          </div>
        </div>
        <div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={()=>setSoundOn(s=>!s)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:7,padding:'5px 9px',color:'#475569',cursor:'pointer',fontSize:15}}>
            {soundOn?'🔊':'🔇'}
          </button>
          {players.map((pl,i)=>(
            <div key={i} style={{padding:'7px 14px',borderRadius:10,border:i===currentPlayer?'2px solid rgba(168,85,247,0.4)':'1px solid rgba(255,255,255,0.06)',background:i===currentPlayer?'rgba(124,58,237,0.14)':'rgba(255,255,255,0.03)',transition:'all 0.3s'}}>
              <div style={{fontSize:10,fontWeight:600,color:'#334155',marginBottom:2}}>{pl.isAI?'🤖 IA':'👤 Vous'}</div>
              <AnimatedMoney value={pl.money}/>
              <div style={{fontSize:10,color:'#1e293b',marginTop:2}}>🏆{pl.monuments.length}/4 · {pl.diceCount===1?'🎲':'🎲🎲'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3-col */}
      <div style={{display:'grid',gridTemplateColumns:'252px 1fr 258px',gap:11,maxWidth:1100,margin:'0 auto'}}>

        {/* LEFT */}
        <div style={{display:'flex',flexDirection:'column',gap:11}}>

          {/* Dice panel */}
          <Panel>
            <SectionTitle>🎲 Dés</SectionTitle>
            {!hasRolled||canReroll ? (
              p.isAI
                ? <div style={{textAlign:'center',padding:'15px 0',color:'#334155',fontFamily:'Rajdhani,sans-serif',letterSpacing:1,animation:'pulse 1.2s infinite'}}>⏳ IA EN JEU…</div>
                : <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    <Btn color="green" onClick={handleRoll}>🎲 {canReroll?'RELANCER (FDA)':`LANCER ${p.diceCount===1?'1 DÉ':'2 DÉS'}`}</Btn>
                    {canReroll&&<div style={{fontSize:10,color:'#fbbf24',textAlign:'center'}}>Gardez le résultat ou relancez</div>}
                  </div>
            ) : (
              <div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9,flexWrap:'wrap',marginBottom:11}}>
                  <DiceFace value={diceResult.d1} rolling={isRolling}/>
                  {diceResult.d2!==null&&<><span style={{color:'#1e293b',fontFamily:'Rajdhani,sans-serif',fontSize:19,fontWeight:700}}>+</span><DiceFace value={diceResult.d2} rolling={isRolling}/></>}
                  <div style={{width:50,height:50,background:'linear-gradient(135deg,#7c3aed,#4f46e5)',borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,fontFamily:'Rajdhani,sans-serif',color:'white',boxShadow:'0 4px 18px rgba(124,58,237,0.5)'}}>
                    {diceResult.total}
                  </div>
                </div>
                {!p.isAI&&<Btn color="red" onClick={handleEndTurn}>📊 FIN DU TOUR</Btn>}
              </div>
            )}
          </Panel>

          {/* 2nd die */}
          {p.diceCount===1&&!p.isAI&&(
            <Panel style={{border:'1px solid rgba(245,158,11,0.18)'}}>
              <SectionTitle>🎲🎲 Deuxième dé</SectionTitle>
              <div style={{textAlign:'center',marginBottom:7,fontFamily:'Rajdhani,sans-serif',fontSize:22,fontWeight:800,color:'#f59e0b'}}>20€</div>
              <Btn color="gold" onClick={handleBuyDice} disabled={!canBuyMore||p.money<20}>
                {p.money<20?'💸 FONDS INSUFF':!canBuyMore?'✓ DÉJÀ ACHETÉ':'ACHETER LE 2E DÉ'}
              </Btn>
            </Panel>
          )}

          {/* Your cards */}
          <Panel style={{flex:1}}>
            <SectionTitle>📂 Vos cartes</SectionTitle>
            <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:310,overflowY:'auto'}}>
              {/* Starters */}
              {['pharmacie_base','labo_base'].map(id=>{
                const card=CARD_DEFINITIONS[id];
                const isLit=activatedCards.includes(id);
                const glowC=CARD_GLOW[card.color];
                return (
                  <div key={id} style={{background:isLit?CARD_BG[card.color]:'rgba(255,255,255,0.03)',border:isLit?`1px solid ${CARD_BORDER[card.color]}`:'1px solid rgba(255,255,255,0.07)',borderRadius:9,padding:'7px 9px',display:'flex',alignItems:'center',gap:7,transition:'all 0.35s',boxShadow:isLit?`0 0 14px ${glowC}`:'none','--glow':glowC,animation:isLit?'cardGlow 1.2s ease 2':'none'}}>
                    <span style={{fontSize:15}}>{card.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:600,display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                        {card.name}
                        <span style={{fontSize:9,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:3,padding:'1px 4px',color:'#334155',fontWeight:400}}>DÉPART</span>
                        {isLit&&<span style={{fontSize:9,background:'rgba(34,197,94,0.2)',border:'1px solid rgba(34,197,94,0.35)',borderRadius:3,padding:'1px 5px',color:'#86efac',fontWeight:700}}>✓ ACTIF</span>}
                      </div>
                      <div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap'}}>
                        <CardChip color={card.color} label={card.color==='blue'?'TOUT TOUR':'ACTIF'}/>
                        <span style={{background:'rgba(0,0,0,0.28)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:4,padding:'1px 5px',fontSize:10,fontFamily:'Rajdhani,sans-serif',fontWeight:600}}>🎲{card.activation.join(',')}</span>
                        <span style={{color:'#86efac',fontWeight:700,fontSize:11,fontFamily:'Rajdhani,sans-serif'}}>+{card.income}€</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Purchased */}
              {Object.entries(p.cards).filter(([id,cnt])=>cnt>0&&!CARD_DEFINITIONS[id]?.starter).map(([id,cnt])=>{
                const card=CARD_DEFINITIONS[id];
                if (!card) return null;
                const isLit=activatedCards.includes(id);
                const glowC=CARD_GLOW[card.color];
                return (
                  <div key={id} style={{background:isLit?CARD_BG[card.color]:'rgba(255,255,255,0.04)',border:isLit?`1px solid ${CARD_BORDER[card.color]}`:'1px solid rgba(255,255,255,0.06)',borderRadius:9,padding:'7px 9px',display:'flex',alignItems:'center',gap:7,transition:'all 0.35s',boxShadow:isLit?`0 0 16px ${glowC}`:'none','--glow':glowC,animation:isLit?'cardGlow 1.2s ease 2':'none'}}>
                    <span style={{fontSize:15}}>{card.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5}}>
                        <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{card.name}</span>
                        {isLit&&<span style={{fontSize:9,background:'rgba(255,255,255,0.14)',borderRadius:3,padding:'1px 5px',color:'white',fontWeight:700,flexShrink:0}}>✓ ACTIF</span>}
                      </div>
                      <div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap'}}>
                        <CardChip color={card.color} label={card.color==='blue'?'TOUT TOUR':card.color==='green'?'ACTIF':card.color==='red'?'VOL/ADV':'VOL/TOI'}/>
                        <span style={{background:'rgba(0,0,0,0.28)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:4,padding:'1px 5px',fontSize:10,fontFamily:'Rajdhani,sans-serif',fontWeight:600}}>🎲{card.activation.join(',')}</span>
                        <span style={{color:'#86efac',fontWeight:700,fontSize:11,fontFamily:'Rajdhani,sans-serif'}}>+{card.income}€</span>
                      </div>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.14)',borderRadius:18,padding:'2px 8px',fontSize:12,fontWeight:700,flexShrink:0}}>×{cnt}</div>
                  </div>
                );
              })}
              {Object.entries(p.cards).filter(([id,c])=>c>0&&!CARD_DEFINITIONS[id]?.starter).length===0&&(
                <div style={{color:'#1e293b',textAlign:'center',padding:'5px 0',fontSize:11}}>Aucune carte achetée</div>
              )}
            </div>
          </Panel>

          {/* Log */}
          <Panel>
            <SectionTitle>📋 Journal</SectionTitle>
            <EventLog events={events}/>
          </Panel>
        </div>

        {/* CENTER — Shop */}
        <div style={{background:'rgba(17,24,39,0.88)',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:17}}>
          <SectionTitle>🛒 Boutique</SectionTitle>
          <div style={{display:'flex',gap:5,marginBottom:11,flexWrap:'wrap'}}>
            {[['blue','🔵 TOUT TOUR'],['green','🟢 ACTIF'],['red','🔴 ADV VOLE'],['purple','🟣 VOUS VOLEZ']].map(([c,l])=>(
              <CardChip key={c} color={c} label={l}/>
            ))}
          </div>
          {lim===2&&(
            <div style={{marginBottom:9,padding:'5px 9px',background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.22)',borderRadius:7,fontSize:11,color:'#d8b4fe'}}>
              🎓 Faculté : {hasBought}/{lim} achats ce tour
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:10,maxHeight:'calc(100vh - 185px)',overflowY:'auto'}}>
            {shop.map((cardId,idx)=>{
              const card=CARD_DEFINITIONS[cardId];
              if (!card) return null;
              const owned=p.cards[cardId]||0;
              const canAfford=p.money>=card.cost;
              const canBuy=canAfford&&owned<card.maxOwned&&canBuyMore;
              const isLitInShop=diceResult&&card.activation.includes(diceResult.total);
              const probPct=p.diceCount===2?Math.round((card.activation.reduce((s,v)=>s+(PROB_2D[v]||0),0)/36)*100):null;
              const glowC=CARD_GLOW[card.color];

              return (
                <div key={cardId+idx} style={{background:CARD_BG[card.color],border:`${isLitInShop?2:1}px solid ${CARD_BORDER[card.color]}`,borderRadius:12,padding:12,transition:'all 0.3s',boxShadow:isLitInShop?`0 0 22px ${glowC}`:'none','--glow':glowC,animation:isLitInShop?'cardGlow 1.2s ease 2':'none',position:'relative'}}>
                  {isLitInShop&&(
                    <div style={{position:'absolute',top:7,right:7,background:'rgba(255,255,255,0.18)',borderRadius:5,padding:'2px 6px',fontSize:9,fontWeight:700,color:'white',letterSpacing:'0.5px'}}>⚡ ACTIVÉ</div>
                  )}
                  <div style={{display:'flex',gap:9,alignItems:'flex-start',marginBottom:9}}>
                    <span style={{fontSize:24,lineHeight:1}}>{card.emoji}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{card.name}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.58)',marginBottom:6,lineHeight:1.4}}>{card.description}</div>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap',alignItems:'center'}}>
                        <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:17,fontWeight:800,color:'#fde68a'}}>💰{card.cost}€</span>
                        <span style={{background:'rgba(0,0,0,0.28)',border:'1px solid rgba(255,255,255,0.13)',borderRadius:5,padding:'2px 6px',fontSize:10,fontFamily:'Rajdhani,sans-serif',fontWeight:600}}>🎲 {card.activation.join(', ')}</span>
                        <span style={{color:'#86efac',fontWeight:700,fontFamily:'Rajdhani,sans-serif',fontSize:12}}>+{card.income}€</span>
                        {probPct!==null&&<span style={{fontSize:9,color:'rgba(255,255,255,0.45)',background:'rgba(0,0,0,0.18)',borderRadius:4,padding:'2px 5px'}}>~{probPct}% /tour</span>}
                        {owned>0&&<span style={{background:'rgba(255,255,255,0.17)',borderRadius:18,padding:'2px 7px',fontSize:10,fontWeight:700}}>Pos:{owned}/{card.maxOwned}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>handleBuyCard(cardId)} disabled={!canBuy||p.isAI} style={{flex:1,padding:'8px',borderRadius:8,border:'none',fontWeight:700,fontFamily:'Rajdhani,sans-serif',fontSize:12,textTransform:'uppercase',cursor:canBuy&&!p.isAI?'pointer':'not-allowed',background:canBuy&&!p.isAI?'white':'rgba(0,0,0,0.32)',color:canBuy&&!p.isAI?'#1e1b4b':'rgba(255,255,255,0.28)',transition:'all 0.15s'}}>
                      {owned>=card.maxOwned?'🔒 MAX':!canAfford?'💸 CHER':!hasRolled?'— LANCEZ D\'ABORD':hasBought>=lim?'✓ LIMITE':p.isAI?'🤖':`🛒 ${card.cost}€`}
                    </button>
                    {!p.isAI&&hasRolled&&hasBought<lim&&(
                      <button onClick={()=>handleSwapShop(cardId)} style={{padding:'8px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,0.09)',background:'rgba(255,255,255,0.06)',color:'#475569',cursor:'pointer',fontSize:12,transition:'all 0.15s'}} title="Remplacer">🔄</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{display:'flex',flexDirection:'column',gap:11}}>
          <Panel>
            <SectionTitle>🏆 Monuments</SectionTitle>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {MONUMENTS.map(m=>{
                const built=p.monuments.includes(m.id);
                const canAfford=p.money>=m.cost;
                const canBuy=canAfford&&!built&&canBuyMore;
                return (
                  <div key={m.id} style={{background:`linear-gradient(135deg,${m.colorFrom},${m.colorTo})`,border:`2px solid ${built?m.border:'rgba(255,255,255,0.07)'}`,borderRadius:12,padding:12,transition:'all 0.3s',boxShadow:built?`0 0 18px ${m.border}50`:'none'}}>
                    <div style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:8}}>
                      <span style={{fontSize:19}}>{m.emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13}}>{m.name}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,0.62)',marginTop:2,lineHeight:1.4}}>{m.benefit}</div>
                      </div>
                      <span style={{fontFamily:'Rajdhani,sans-serif',fontSize:14,fontWeight:800,color:'#fde68a',whiteSpace:'nowrap'}}>{m.cost}€</span>
                    </div>
                    {built
                      ? <div style={{background:'rgba(0,0,0,0.2)',border:`1px solid ${m.border}`,borderRadius:7,padding:'6px',textAlign:'center',fontWeight:700,fontFamily:'Rajdhani,sans-serif',color:'#fde68a',fontSize:12}}>✓ CONSTRUIT</div>
                      : <button onClick={()=>handleBuyMonument(m.id)} disabled={!canBuy||p.isAI} style={{width:'100%',padding:'7px',borderRadius:7,border:'none',fontWeight:700,fontFamily:'Rajdhani,sans-serif',fontSize:11,cursor:canBuy&&!p.isAI?'pointer':'not-allowed',background:canBuy&&!p.isAI?'white':'rgba(0,0,0,0.28)',color:canBuy&&!p.isAI?'#1e1b4b':'rgba(255,255,255,0.28)',textTransform:'uppercase',transition:'all 0.15s'}}>
                          {!canAfford?'💸 MANQUE DE FONDS':!hasRolled?'— LANCEZ D\'ABORD':hasBought>=lim?'✓ LIMITE':p.isAI?'🤖':`ACHETER ${m.cost}€`}
                        </button>
                    }
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Opponent */}
          <Panel>
            <SectionTitle>👁 Adversaire</SectionTitle>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
              <span style={{fontSize:11,color:'#334155'}}>{opp.isAI?'🤖 IA':'👤 Vous'}</span>
              <AnimatedMoney value={opp.money}/>
            </div>
            <div style={{fontSize:10,color:'#1e293b',marginBottom:7}}>Monuments : {opp.monuments.length}/4 · {opp.diceCount===1?'1 dé':'2 dés'}</div>
            <div style={{display:'flex',gap:7,marginBottom:9}}>
              {MONUMENTS.map(m=>(
                <span key={m.id} style={{fontSize:18,opacity:opp.monuments.includes(m.id)?1:0.18,transition:'opacity 0.3s'}} title={m.name}>{m.emoji}</span>
              ))}
            </div>
            <div style={{fontSize:10,color:'#1e293b',marginBottom:5}}>Cartes :</div>
            <div style={{display:'flex',flexDirection:'column',gap:3,maxHeight:125,overflowY:'auto'}}>
              {Object.entries(opp.cards).filter(([id,c])=>c>0&&!CARD_DEFINITIONS[id]?.starter).map(([id,cnt])=>{
                const card=CARD_DEFINITIONS[id];
                if (!card) return null;
                const isLit=activatedCards.includes(id);
                return (
                  <div key={id} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:isLit?'#e2e8f0':'#475569',background:isLit?'rgba(255,255,255,0.07)':'transparent',borderRadius:6,padding:'3px 5px',transition:'all 0.3s'}}>
                    <span style={{fontSize:13}}>{card.emoji}</span>
                    <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{card.name}</span>
                    {isLit&&<span style={{fontSize:9,color:'#86efac',fontWeight:700,flexShrink:0}}>ACTIF</span>}
                    <span style={{fontWeight:700,flexShrink:0}}>×{cnt}</span>
                  </div>
                );
              })}
              {Object.entries(opp.cards).filter(([id,c])=>c>0&&!CARD_DEFINITIONS[id]?.starter).length===0&&(
                <div style={{color:'#1e293b',fontSize:11}}>Aucune carte achetée</div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── MENU ─────────────────────────────────────────────────────────────────────

function MenuScreen({ difficulty, setDifficulty, startGame, showRules, setShowRules, soundOn, setSoundOn }) {
  return (
    <div style={{minHeight:'100vh',background:'radial-gradient(ellipse at 60% 20%,#120a1f 0%,#0a0e1a 60%)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Exo 2,sans-serif',color:'#e0e8ff'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&family=Exo+2:wght@400;600;700;800&display=swap');`}</style>
      <div style={{maxWidth:510,width:'100%',textAlign:'center'}}>
        <div style={{fontSize:46,marginBottom:5}}>💊⚗️</div>
        <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:48,fontWeight:700,letterSpacing:4,background:'linear-gradient(135deg,#c084fc,#818cf8,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:4}}>PHARMAVILLE</div>
        <div style={{color:'#1e293b',marginBottom:30,fontSize:11,letterSpacing:2,textTransform:'uppercase',fontFamily:'Rajdhani,sans-serif'}}>Construisez votre empire pharmaceutique</div>
        <div style={{background:'rgba(17,24,39,0.85)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,marginBottom:16}}>
          <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:12,fontWeight:700,letterSpacing:2,color:'#334155',textTransform:'uppercase',marginBottom:13}}>Difficulté IA</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9}}>
            {[['facile','🟢','Facile','IA maladroite','#22c55e'],['moyen','🟡','Moyen','Équilibré','#f59e0b'],['difficile','🔴','Difficile','IA agressive','#ef4444']].map(([val,em,label,desc,col])=>(
              <div key={val} onClick={()=>setDifficulty(val)} style={{padding:13,borderRadius:11,cursor:'pointer',border:difficulty===val?`2px solid ${col}`:'1px solid rgba(255,255,255,0.06)',background:difficulty===val?`${col}14`:'rgba(255,255,255,0.02)',boxShadow:difficulty===val?`0 0 16px ${col}25`:'none',transition:'all 0.2s'}}>
                <div style={{fontSize:22,marginBottom:4}}>{em}</div>
                <div style={{fontWeight:700,fontFamily:'Rajdhani,sans-serif',fontSize:14,marginBottom:2}}>{label}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9,marginBottom:14}}>
          <span style={{fontSize:11,color:'#334155'}}>Sons</span>
          <button onClick={()=>setSoundOn(s=>!s)} style={{background:soundOn?'rgba(34,197,94,0.13)':'rgba(255,255,255,0.04)',border:`1px solid ${soundOn?'rgba(34,197,94,0.28)':'rgba(255,255,255,0.09)'}`,borderRadius:7,padding:'5px 12px',color:soundOn?'#86efac':'#334155',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.2s'}}>
            {soundOn?'🔊 ON':'🔇 OFF'}
          </button>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          <button onClick={startGame} style={{padding:'14px',borderRadius:12,border:'1px solid rgba(167,139,250,0.3)',background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontWeight:800,fontFamily:'Rajdhani,sans-serif',fontSize:16,letterSpacing:1,textTransform:'uppercase',cursor:'pointer',boxShadow:'0 8px 26px rgba(124,58,237,0.4)'}}>⚗️ COMMENCER</button>
          <button onClick={()=>setShowRules(true)} style={{padding:'10px',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',color:'#475569',fontWeight:600,fontSize:12,cursor:'pointer'}}>📖 Comment jouer</button>
        </div>
      </div>
      {showRules&&(
        <div onClick={e=>e.target===e.currentTarget&&setShowRules(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.82)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:20}}>
          <div style={{background:'#0f172a',border:'1px solid rgba(255,255,255,0.09)',borderRadius:20,padding:26,maxWidth:540,width:'100%',maxHeight:'88vh',overflowY:'auto'}}>
            <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:24,fontWeight:700,marginBottom:16,letterSpacing:2}}>📖 RÈGLES</div>
            {[
              ['🎲 Dés','Lancez 1 ou 2 dés. Le résultat active des cartes — les vôtres s\'illuminent en temps réel !'],
              ['🃏 Couleurs','🔵 Bleu = vous gagnez à n\'importe quel tour (si vous avez la carte) · 🟢 Vert = vous seul, uniquement votre tour · 🔴 Rouge = adversaires vous volent à votre tour · 🟣 Violet = vous volez à votre tour'],
              ['🛒 Achat','Après le lancer, achetez UNE chose. La Faculté de Pharmacie autorise 2 achats par tour.'],
              ['📊 Résumé de tour','Un popup résume vos gains et vols avant de passer la main.'],
              ['🔊 Sons','Des effets sonores signalent chaque gain, vol et achat.'],
              ['🏆 Victoire','Construisez les 4 monuments !'],
            ].map(([t,d])=>(
              <div key={t} style={{marginBottom:13}}>
                <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:14,fontWeight:700,color:'#a78bfa',marginBottom:4}}>{t}</div>
                <div style={{fontSize:12,color:'#475569',lineHeight:'1.7'}}>{d}</div>
              </div>
            ))}
            <button onClick={()=>setShowRules(false)} style={{width:'100%',marginTop:5,padding:'10px',borderRadius:9,border:'1px solid rgba(167,139,250,0.3)',background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontWeight:700,fontFamily:'Rajdhani,sans-serif',fontSize:14,textTransform:'uppercase',cursor:'pointer'}}>FERMER</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VICTORY ──────────────────────────────────────────────────────────────────

function VictoryScreen({ winner, players, onReplay }) {
  const w=winner!==null?players[winner]:null;
  return (
    <div style={{minHeight:'100vh',background:'radial-gradient(ellipse at center,#1c1410 0%,#0a0e1a 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Exo 2,sans-serif',color:'white',textAlign:'center'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&family=Exo+2:wght@400;700;800&display=swap');@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}`}</style>
      <div>
        <div style={{fontSize:76,marginBottom:12,animation:'pulse 1.8s infinite'}}>🏆</div>
        <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:50,fontWeight:700,letterSpacing:4,background:'linear-gradient(135deg,#f59e0b,#ef4444)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:7}}>VICTOIRE !</div>
        <div style={{color:'#475569',fontSize:16,marginBottom:7}}>{w?.isAI?"L'IA a":"Vous avez"} construit les 4 monuments !</div>
        {players.map((p,i)=>(
          <div key={i} style={{display:'inline-block',margin:'0 7px',padding:'9px 18px',background:'rgba(255,255,255,0.04)',borderRadius:11,marginBottom:5}}>
            <div style={{fontSize:10,color:'#334155'}}>{p.isAI?'🤖 IA':'👤 Vous'}</div>
            <div style={{fontFamily:'Rajdhani,sans-serif',fontSize:19,fontWeight:800}}>{p.money}€ · 🏆{p.monuments.length}/4</div>
          </div>
        ))}
        <div style={{marginTop:26}}>
          <button onClick={onReplay} style={{padding:'13px 42px',borderRadius:12,border:'1px solid rgba(167,139,250,0.3)',background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'white',fontWeight:800,fontFamily:'Rajdhani,sans-serif',fontSize:16,textTransform:'uppercase',cursor:'pointer',boxShadow:'0 8px 26px rgba(124,58,237,0.4)'}}>🔄 REJOUER</button>
        </div>
      </div>
    </div>
  );
}
