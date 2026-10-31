const fs = require('fs');

let code = fs.readFileSync('e:/Zacbov/projets/catacombes/fps.html', 'utf8');

// 1. Déclarer mob3DGroup et item3DGroup
code = code.replace(
  'let mobSprites = new Map();',
  `let mob3DMap = new Map(); // Monstres réels en mesh 3D géométrique
let item3DMap = new Map(); // Objets 3D réels sculptés
let mobSprites = new Map();`
);

// 2. Fonctions de génération des modèles 3D pour chaque type de monstre
const monster3DGenerators = `
/* ==========================================================================
   CONSTRUCTEURS DE MODÈLES 3D RÉELS POUR LES MONSTRES
   Chaque monstre possède un corps 3D, une tête, des membres/ailes animés et des yeux lumineux
   ========================================================================== */
function create3DMonster(m) {
  const group = new THREE.Group();
  const hex = parseInt((m.c || '#7f9b6a').replace('#',''), 16);
  const skinMat = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7, metalness: 0.1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x18141e, roughness: 0.8 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xded5c0, roughness: 0.75 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3322 });
  const eyeGoldMat = new THREE.MeshBasicMaterial({ color: 0xffbe33 });
  const eyeGreenMat = new THREE.MeshBasicMaterial({ color: 0x55ff66 });

  group.userData = { parts: {}, kind: m.k };

  if (m.k === 'rat') {
    // Corps rat
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.42, 7);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    group.add(body);

    // Tête pointue
    const headGeo = new THREE.ConeGeometry(0.11, 0.22, 6);
    headGeo.rotateX(-Math.PI / 2);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0.02, -0.26);
    group.add(head);

    // Yeux rouges
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), eyeMat);
    e1.position.set(0.05, 0.06, -0.28);
    const e2 = e1.clone();
    e2.position.set(-0.05, 0.06, -0.28);
    group.add(e1); group.add(e2);

    // Queue articulée
    const tailGeo = new THREE.CylinderGeometry(0.015, 0.035, 0.35, 5);
    tailGeo.rotateX(Math.PI / 3);
    const tail = new THREE.Mesh(tailGeo, darkMat);
    tail.position.set(0, 0.04, 0.28);
    group.add(tail);
    group.userData.parts.tail = tail;

  } else if (m.k === 'bat') {
    // Chauve-souris volante
    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), skinMat);
    group.add(body);

    // Ailes battantes gauche et droite
    const wingGeo = new THREE.PlaneGeometry(0.35, 0.22);
    const wingL = new THREE.Mesh(wingGeo, darkMat);
    wingL.position.set(-0.25, 0, 0);
    wingL.rotation.y = Math.PI / 8;
    const wingR = new THREE.Mesh(wingGeo, darkMat);
    wingR.position.set(0.25, 0, 0);
    wingR.rotation.y = -Math.PI / 8;
    group.add(wingL); group.add(wingR);
    group.userData.parts.wingL = wingL;
    group.userData.parts.wingR = wingR;

    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.028, 4, 4), eyeGoldMat);
    e1.position.set(0.05, 0.04, -0.12);
    const e2 = e1.clone();
    e2.position.set(-0.05, 0.04, -0.12);
    group.add(e1); group.add(e2);

  } else if (m.k === 'skel' || m.k === 'archer') {
    // Squelette guerrier / archer 3D complet
    // Cage thoracique
    const chestGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.32, 6);
    const chest = new THREE.Mesh(chestGeo, boneMat);
    chest.position.set(0, 0.42, 0);
    group.add(chest);

    // Crâne
    const skullGeo = new THREE.BoxGeometry(0.18, 0.20, 0.18);
    const skull = new THREE.Mesh(skullGeo, boneMat);
    skull.position.set(0, 0.72, 0);
    group.add(skull);

    // Orbites incandescentes
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.028, 4, 4), m.k === 'archer' ? eyeGreenMat : eyeGoldMat);
    e1.position.set(0.05, 0.74, -0.10);
    const e2 = e1.clone();
    e2.position.set(-0.05, 0.74, -0.10);
    group.add(e1); group.add(e2);

    // Bras gauche et droit
    const armGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.35, 5);
    const armL = new THREE.Mesh(armGeo, boneMat);
    armL.position.set(-0.25, 0.40, 0);
    const armR = new THREE.Mesh(armGeo, boneMat);
    armR.position.set(0.25, 0.40, 0);
    group.add(armL); group.add(armR);
    group.userData.parts.armL = armL;
    group.userData.parts.armR = armR;

    // Arme tenue
    if (m.k === 'archer') {
      const bowGeo = new THREE.TorusGeometry(0.22, 0.02, 5, 10, Math.PI);
      const bow = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: 0x5a3d24 }));
      bow.position.set(-0.25, 0.28, -0.15);
      bow.rotation.y = Math.PI / 2;
      group.add(bow);
    } else {
      const swordGeo = new THREE.BoxGeometry(0.05, 0.55, 0.02);
      const sword = new THREE.Mesh(swordGeo, new THREE.MeshStandardMaterial({ color: 0xb5bcc8, metalness: 0.6 }));
      sword.position.set(0.28, 0.45, -0.18);
      sword.rotation.x = Math.PI / 4;
      group.add(sword);
    }

  } else if (m.k === 'slime' || m.k === 'spore') {
    // Vase gélatineuse / rampant à spores
    const slimeGeo = new THREE.SphereGeometry(0.32, 10, 8);
    slimeGeo.scale(1.1, 0.75, 1.1);
    const slimeMat = new THREE.MeshStandardMaterial({
      color: hex, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.88
    });
    const body = new THREE.Mesh(slimeGeo, slimeMat);
    body.position.set(0, 0.24, 0);
    group.add(body);
    group.userData.parts.body = body;

    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), eyeGoldMat);
    e1.position.set(0.12, 0.26, -0.26);
    const e2 = e1.clone();
    e2.position.set(-0.12, 0.26, -0.26);
    group.add(e1); group.add(e2);

  } else if (m.boss || m.k === 'ogre' || m.k === 'knight') {
    // Boss / Chevalier / Colosse imposant
    const sc = m.boss ? 1.5 : 1.25;
    // Torse cuirassé
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48 * sc, 0.62 * sc, 0.36 * sc), skinMat);
    body.position.set(0, 0.52 * sc, 0);
    group.add(body);

    // Tête casquée
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 * sc, 1), darkMat);
    head.position.set(0, 0.95 * sc, 0);
    group.add(head);

    // Yeux rougeoyants
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.045 * sc, 5, 5), eyeMat);
    e1.position.set(0.09 * sc, 0.98 * sc, -0.20 * sc);
    const e2 = e1.clone();
    e2.position.set(-0.09 * sc, 0.98 * sc, -0.20 * sc);
    group.add(e1); group.add(e2);

    // Épaulettes massives
    const epL = new THREE.Mesh(new THREE.BoxGeometry(0.24 * sc, 0.22 * sc, 0.30 * sc), darkMat);
    epL.position.set(-0.35 * sc, 0.75 * sc, 0);
    const epR = epL.clone();
    epR.position.set(0.35 * sc, 0.75 * sc, 0);
    group.add(epL); group.add(epR);

  } else {
    // Humanoïde standard (Gobelin, Goule, Cultiste, Wraith)
    // Corps
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.44, 7);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.position.set(0, 0.38, 0);
    group.add(body);

    // Tête
    const headGeo = new THREE.SphereGeometry(0.18, 8, 7);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0.68, 0);
    group.add(head);

    // Yeux luisants
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 5), eyeMat);
    e1.position.set(0.07, 0.70, -0.15);
    const e2 = e1.clone();
    e2.position.set(-0.07, 0.70, -0.15);
    group.add(e1); group.add(e2);

    // Bras
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.36, 5);
    const armL = new THREE.Mesh(armGeo, skinMat);
    armL.position.set(-0.25, 0.38, 0);
    const armR = new THREE.Mesh(armGeo, skinMat);
    armR.position.set(0.25, 0.38, 0);
    group.add(armL); group.add(armR);
    group.userData.parts.armL = armL;
    group.userData.parts.armR = armR;
  }

  return group;
}
`;

code = code.replace('function buildLevel3D() {', monster3DGenerators + '\nfunction buildLevel3D() {');

// 3. Constructeurs d'objets 3D réels avec icônes de rareté
const item3DGenerators = `
/* ==========================================================================
   CONSTRUCTEURS D'OBJETS 3D SCULPTÉS AU SOL
   Potion (fiole de verre), Arme (lame plantée dans le sol), Parchemin, Coffre d'or, Anneau
   ========================================================================== */
function create3DItemMesh(it) {
  const group = new THREE.Group();
  const rar = (it.rar !== undefined) ? it.rar : 0;
  const rarColors = [0x8d8798, 0x5e9a86, 0x5a86c4, 0x9a6ec4, 0xe0a44c];
  const rCol = rarColors[rar] || 0xffffff;

  // Socle de rareté lumineux
  const pedestalGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.06, 8);
  const pedestalMat = new THREE.MeshStandardMaterial({ color: rCol, metalness: 0.8, roughness: 0.2 });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.set(0, 0.03, 0);
  group.add(pedestal);

  // Anneau de runes brillantes de rareté
  const ringGeo = new THREE.TorusGeometry(0.26, 0.02, 6, 16);
  ringGeo.rotateX(Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({ color: rCol });
  const runicRing = new THREE.Mesh(ringGeo, ringMat);
  runicRing.position.set(0, 0.05, 0);
  group.add(runicRing);

  // Modèle 3D spécifique au type d'objet
  if (it.t === 'potion') {
    // Fiole d'alchimiste en verre avec bouchon
    const bottleGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const pColHex = parseInt(icol(it).replace('#',''), 16) || 0xc8503a;
    const glassMat = new THREE.MeshStandardMaterial({
      color: pColHex, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.85
    });
    const bottle = new THREE.Mesh(bottleGeo, glassMat);
    bottle.position.set(0, 0.20, 0);
    group.add(bottle);

    // Goulot et bouchon de liège
    const neckGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6);
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.set(0, 0.32, 0);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x8a623a }));
    cork.position.set(0, 0.38, 0);
    group.add(neck); group.add(cork);

  } else if (it.t === 'weapon') {
    // Épée médiévale 3D fichée dans le sol
    const bladeGeo = new THREE.BoxGeometry(0.06, 0.48, 0.02);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xc8d2dc, metalness: 0.8, roughness: 0.2 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.26, 0);

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.05), new THREE.MeshStandardMaterial({ color: rCol, metalness: 0.9 }));
    guard.position.set(0, 0.46, 0);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0x4a3222 }));
    grip.position.set(0, 0.54, 0);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshStandardMaterial({ color: rCol }));
    pommel.position.set(0, 0.62, 0);

    group.add(blade); group.add(guard); group.add(grip); group.add(pommel);

  } else if (it.t === 'armor') {
    // Cuirasse protectrice en relief
    const cuirassGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.32, 6);
    const cuirassMat = new THREE.MeshStandardMaterial({ color: 0x5a6068, metalness: 0.7, roughness: 0.3 });
    const cuirass = new THREE.Mesh(cuirassGeo, cuirassMat);
    cuirass.position.set(0, 0.24, 0);
    group.add(cuirass);

  } else if (it.t === 'scroll') {
    // Rouleau de parchemin ancien ficelé
    const scrollGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.28, 7);
    scrollGeo.rotateZ(Math.PI / 2);
    const scrollMat = new THREE.MeshStandardMaterial({ color: 0xd8cba8, roughness: 0.9 });
    const scroll = new THREE.Mesh(scrollGeo, scrollMat);
    scroll.position.set(0, 0.18, 0);
    group.add(scroll);

  } else if (it.t === 'gold') {
    // Tas de pièces d'or scintillantes
    for (let c = 0; c < 5; c++) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 7), new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.9, roughness: 0.1 }));
      coin.position.set((Math.random() - 0.5) * 0.12, 0.08 + c * 0.022, (Math.random() - 0.5) * 0.12);
      coin.rotation.y = Math.random() * Math.PI;
      group.add(coin);
    }
  } else {
    // Anneau / Amulette / Autre relique
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({ color: rCol, metalness: 0.9, roughness: 0.1 }));
    jewel.position.set(0, 0.22, 0);
    group.add(jewel);
  }

  // Icône flottante au-dessus pour identification instantanée
  const iconTex = getTextureFromCanvasDraw('icon_it_' + it.t + '_' + (it.k || ''), () => {
    (ISPR[it.t] || ISPR.gold)(icol(it));
  }, 128);
  const iconSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, transparent: true }));
  iconSpr.scale.set(0.35, 0.35, 1);
  iconSpr.position.set(0, 0.75, 0);
  group.add(iconSpr);

  return group;
}
`;

code = code.replace('function buildLevel3D() {', item3DGenerators + '\nfunction buildLevel3D() {');

// 4. Nettoyer mob3DMap et item3DMap dans buildLevel3D
code = code.replace(
  'mobSprites.forEach(s => scene.remove(s));\n  mobSprites.clear();',
  `mob3DMap.forEach(m => scene.remove(m));
  mob3DMap.clear();
  item3DMap.forEach(it => scene.remove(it));
  item3DMap.clear();
  mobSprites.forEach(s => scene.remove(s));
  mobSprites.clear();`
);

// 5. Remplacer la gestion des monstres dans update3D pour animer les vrais modèles 3D
const oldMobLoopStart = 'const activeMobs = new Set();\n  for (const m of G.mobs) {';
const newMobLoop = `const activeMobs = new Set();
  for (const m of G.mobs) {
    if (m.hp <= 0) continue;
    activeMobs.add(m);

    // Modèle 3D réel du monstre
    let mMesh = mob3DMap.get(m);
    if (!mMesh) {
      mMesh = create3DMonster(m);
      scene.add(mMesh);
      mob3DMap.set(m, mMesh);
    }

    const isVis = (G.vis && G.vis[(m.y | 0) * MW + (m.x | 0)] === 1);
    mMesh.visible = isVis;

    if (isVis) {
      // Rotation vers le joueur (face au joueur en 3D)
      const toPlayerAngle = Math.atan2(G.p.x - m.x, G.p.y - m.y);
      mMesh.rotation.y = toPlayerAngle + Math.PI;

      // Animation 3D des membres et respiration
      const isMoving = (m.state === 'chase' || Math.hypot(m.vx || 0, m.vy || 0) > 0.05);
      const walkCycle = Math.sin(ts / 120 + (m.ph || 0) * 10);
      const breath = Math.sin(ts / 350 + (m.ph || 0) * 5) * 0.03;

      // Battement d'ailes pour la chauve-souris
      if (mMesh.userData.parts.wingL && mMesh.userData.parts.wingR) {
        const flap = Math.sin(ts / 55) * 0.6;
        mMesh.userData.parts.wingL.rotation.z = flap;
        mMesh.userData.parts.wingR.rotation.z = -flap;
        mMesh.position.set(m.x, 0.65 + Math.sin(ts / 150) * 0.12, m.y);
      } else {
        // Balancement des bras et marche
        if (mMesh.userData.parts.armL && mMesh.userData.parts.armR) {
          mMesh.userData.parts.armL.rotation.x = isMoving ? walkCycle * 0.6 : 0;
          mMesh.userData.parts.armR.rotation.x = isMoving ? -walkCycle * 0.6 : 0;
        }
        if (mMesh.userData.parts.tail) {
          mMesh.userData.parts.tail.rotation.y = Math.sin(ts / 100) * 0.4;
        }

        const bounce = isMoving ? Math.abs(walkCycle) * 0.06 : 0;
        mMesh.position.set(m.x, bounce, m.y);
        mMesh.scale.set(1 + breath, 1 - breath, 1 + breath);
      }

      // Flash rouge/blanc si blessé
      if (m.flash > 0) {
        mMesh.scale.multiplyScalar(1.15);
      }
    }

    // Ombre circulaire au sol
    let shw = mobShadows.get(m);
    if (!shw) {
      const shwGeo = new THREE.PlaneGeometry(0.7, 0.7);
      shwGeo.rotateX(-Math.PI / 2);
      const shwMat = new THREE.MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false });
      shw = new THREE.Mesh(shwGeo, shwMat);
      scene.add(shw);
      mobShadows.set(m, shw);
    }
    const shwScale = (m.r / 0.33) * (m.boss ? 1.6 : 1.0);
    shw.scale.set(shwScale, 1, shwScale);
    shw.position.set(m.x, 0.02, m.y);
    shw.visible = isVis;

    // Barre de vie au-dessus de la tête si blessé
    let hpBar = mobHPBars.get(m);
    if (m.hp < m.mhp) {
      if (!hpBar) {
        const hpC = document.createElement('canvas');
        hpC.width = 64; hpC.height = 8;
        const hpTex = new THREE.CanvasTexture(hpC);
        const hpMat = new THREE.SpriteMaterial({ map: hpTex, transparent: true, depthTest: false });
        hpBar = new THREE.Sprite(hpMat);
        hpBar.scale.set(0.65, 0.08, 1);
        scene.add(hpBar);
        mobHPBars.set(m, { sprite: hpBar, canvas: hpC, tex: hpTex });
      }
      const g = hpBar.canvas.getContext('2d');
      g.fillStyle = '#06050b';
      g.fillRect(0, 0, 64, 8);
      g.fillStyle = m.boss ? '#e0a44c' : '#c8503a';
      const pct = Math.max(0, Math.min(1, m.hp / m.mhp));
      g.fillRect(1, 1, Math.round(62 * pct), 6);
      hpBar.tex.needsUpdate = true;
      hpBar.sprite.position.set(m.x, 1.05 + (m.boss ? 0.45 : 0.1), m.y);
      hpBar.sprite.visible = isVis;
    } else if (hpBar) {
      hpBar.sprite.visible = false;
    }
  }

  // Nettoyage des monstres vaincus
  mob3DMap.forEach((mesh, m) => {
    if (!activeMobs.has(m)) {
      scene.remove(mesh);
      mob3DMap.delete(m);
      const shw = mobShadows.get(m);
      if (shw) { scene.remove(shw); mobShadows.delete(m); }
      const hp = mobHPBars.get(m);
      if (hp) { scene.remove(hp.sprite); mobHPBars.delete(m); }
    }
  });`;

const sMobIdx = code.indexOf('const activeMobs = new Set();');
const eMobIdx = code.indexOf('const activeItems = new Set(G.items);');
code = code.substring(0, sMobIdx) + newMobLoop + '\n\n  ' + code.substring(eMobIdx);

// 6. Remplacer la gestion des objets dans update3D pour animer les vrais modèles 3D sculptés
const newItemLoop = `const activeItems = new Set(G.items);
  for (const it of G.items) {
    let iMesh = item3DMap.get(it);
    if (!iMesh) {
      iMesh = create3DItemMesh(it);
      scene.add(iMesh);
      item3DMap.set(it, iMesh);
    }
    const isVis = (G.vis && G.vis[(it.y | 0) * MW + (it.x | 0)] === 1);
    iMesh.visible = isVis;

    if (isVis) {
      // Rotation lente et lévitation élégante
      iMesh.position.set(it.x, Math.sin(ts / 520 + (it.bob || 0)) * 0.04, it.y);
      iMesh.rotation.y = ts / 750 + (it.bob || 0);
    }

    // Colonne de lueur colorée selon la rareté
    let pillar = itemPillars.get(it);
    if (!pillar) {
      const pCol = icol(it);
      const pGeo = new THREE.CylinderGeometry(0.06, 0.22, 0.7, 8, 1, true);
      const pMat = new THREE.MeshBasicMaterial({ color: parseInt(pCol.replace('#',''), 16), transparent: true, opacity: 0.45, side: THREE.DoubleSide });
      pillar = new THREE.Mesh(pGeo, pMat);
      scene.add(pillar);
      itemPillars.set(it, pillar);
    }
    pillar.position.set(it.x, 0.25, it.y);
    pillar.rotation.y = -ts / 600;
    pillar.visible = isVis;
  }

  item3DMap.forEach((mesh, it) => {
    if (!activeItems.has(it)) {
      scene.remove(mesh);
      item3DMap.delete(it);
      const p = itemPillars.get(it);
      if (p) { scene.remove(p); itemPillars.delete(it); }
    }
  });`;

const sItIdx = code.indexOf('const activeItems = new Set(G.items);');
const eItIdx = code.indexOf('// Animation de l\'arme en première personne');
code = code.substring(0, sItIdx) + newItemLoop + '\n\n  ' + code.substring(eItIdx);

fs.writeFileSync('e:/Zacbov/projets/catacombes/fps.html', code, 'utf8');
console.log('Real 3D monsters and sculpted items integrated successfully!');
