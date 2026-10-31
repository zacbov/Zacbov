const fs = require('fs');

let code = fs.readFileSync('e:/Zacbov/projets/catacombes/fps.html', 'utf8');

// 1. Ajouter la mini-map dans le DOM
code = code.replace(
  '<div id="crosshair"></div>',
  `<div id="crosshair"></div>
    <div id="minimap-container" style="position:absolute;top:10px;right:10px;width:110px;height:110px;border:1px solid rgba(232,220,192,.25);background:rgba(8,6,12,.82);border-radius:4px;overflow:hidden;z-index:20;pointer-events:none;">
      <canvas id="mmcv" width="110" height="110" style="display:block;width:100%;height:100%;"></canvas>
    </div>`
);

// 2. Déclarer les variables pour le viewmodel d'arme, projectiles et minimap
code = code.replace(
  'let isPointerLocked = false;\nlet CW = 0, CH = 0;',
  `let isPointerLocked = false;
let CW = 0, CH = 0;
let weaponSprite = null;
let shotSprites = new Map();
let hitSparkSprites = [];
let mmcv = null, mmcx = null;`
);

// 3. Initialiser le viewmodel d'arme et la minimap dans init3D
code = code.replace(
  'playerTorchLight = new THREE.PointLight(0xffc870, 3.2, 22, 1.2);\n  scene.add(playerTorchLight);',
  `playerTorchLight = new THREE.PointLight(0xffc870, 3.2, 22, 1.2);
  scene.add(playerTorchLight);

  // Viewmodel d'arme 3D attaché à la caméra
  const wTex = getTextureFromCanvasDraw('viewmodel_weapon', () => {
    ISPR.weapon('#c8ccd8');
  }, 256);
  const wMat = new THREE.SpriteMaterial({ map: wTex, transparent: true, depthTest: false, depthWrite: false });
  weaponSprite = new THREE.Sprite(wMat);
  weaponSprite.scale.set(0.42, 0.42, 1);
  weaponSprite.position.set(0.24, -0.19, -0.42);
  camera.add(weaponSprite);
  scene.add(camera);

  mmcv = document.getElementById('mmcv');
  if (mmcv) mmcx = mmcv.getContext('2d');`
);

// 4. Mettre à jour update3D pour animer l'arme, les projectiles et la minimap
const oldUpdateEnd = 'if (renderer3D && scene && camera) { renderer3D.render(scene, camera); }';
const newUpdateEnd = `  // Animation de l'arme en première personne
  if (weaponSprite) {
    const isSwinging = (G.p.swingT > 0);
    const swingProg = isSwinging ? (G.p.swingT / 0.16) : 0;
    const walkBobX = Math.sin(ts / 180) * (Math.hypot(INPUT.mx, INPUT.my) > 0.1 ? 0.015 : 0.002);
    const walkBobY = Math.abs(Math.cos(ts / 180)) * (Math.hypot(INPUT.mx, INPUT.my) > 0.1 ? 0.015 : 0.002);
    
    // Coup d'estoc / balayage de l'arme
    const swingOffsetX = isSwinging ? Math.sin(swingProg * Math.PI) * -0.12 : 0;
    const swingOffsetY = isSwinging ? Math.sin(swingProg * Math.PI) * 0.08 : 0;
    const swingOffsetZ = isSwinging ? Math.sin(swingProg * Math.PI) * -0.14 : 0;

    weaponSprite.position.set(
      0.24 + walkBobX + swingOffsetX,
      -0.19 + walkBobY + swingOffsetY,
      -0.42 + swingOffsetZ
    );
    weaponSprite.material.rotation = isSwinging ? (swingProg * -0.4) : 0;
  }

  // Rendu 3D des projectiles (flèches, boules de feu, traits de lance)
  const activeShots = new Set(G.shots);
  for (const s of G.shots) {
    let spr = shotSprites.get(s);
    if (!spr) {
      const tex = getTextureFromCanvasDraw('shot_' + (s.kind || s.sh || 'bolt') + '_' + s.c, () => {
        cx.fillStyle = s.c || '#ffbe6e';
        cx.beginPath(); cx.arc(0.5, 0.5, 0.45, 0, 6.28); cx.fill();
        cx.fillStyle = '#fff';
        cx.beginPath(); cx.arc(0.5, 0.5, 0.22, 0, 6.28); cx.fill();
      }, 64);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending });
      spr = new THREE.Sprite(mat);
      spr.scale.set(0.3, 0.3, 1);
      scene.add(spr);
      shotSprites.set(s, spr);
    }
    spr.position.set(s.x, 0.5, s.y);
  }

  shotSprites.forEach((spr, s) => {
    if (!activeShots.has(s)) {
      scene.remove(spr);
      shotSprites.delete(s);
    }
  });

  // Rendu de la Mini-map radar
  if (mmcx && G.map) {
    mmcx.fillStyle = 'rgba(6,5,10,0.92)';
    mmcx.fillRect(0, 0, 110, 110);
    const rad = 10;
    const px = Math.floor(G.p.x), py = Math.floor(G.p.y);
    const scale = 110 / (rad * 2);

    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        const mx = px + dx, my = py + dy;
        if (mx < 0 || my < 0 || mx >= MW || my >= MH) continue;
        const id = my * MW + mx;
        if (!G.seen || !G.seen[id]) continue;
        const isWall = SOLID[G.map[id]];
        mmcx.fillStyle = isWall ? '#5a4f6e' : (G.map[id] === STAIR ? '#e0a44c' : '#231f2d');
        mmcx.fillRect((dx + rad) * scale, (dy + rad) * scale, scale + 0.5, scale + 0.5);
      }
    }

    // Monstres sur la minimap
    for (const m of G.mobs) {
      if (m.hp <= 0) continue;
      const mdx = m.x - G.p.x, mdy = m.y - G.p.y;
      if (Math.abs(mdx) <= rad && Math.abs(mdy) <= rad) {
        mmcx.fillStyle = m.boss ? '#e0a44c' : '#c8503a';
        mmcx.fillRect((mdx + rad) * scale - 1.5, (mdy + rad) * scale - 1.5, 3.5, 3.5);
      }
    }

    // Flèche du joueur sur la minimap
    const cx0 = 55, cy0 = 55;
    mmcx.save();
    mmcx.translate(cx0, cy0);
    mmcx.rotate(-playerYaw - Math.PI / 2);
    mmcx.fillStyle = '#8fd4c0';
    mmcx.beginPath();
    mmcx.moveTo(0, -5);
    mmcx.lineTo(-3.5, 4);
    mmcx.lineTo(3.5, 4);
    mmcx.closePath();
    mmcx.fill();
    mmcx.restore();
  }

  if (renderer3D && scene && camera) { renderer3D.render(scene, camera); }`;

code = code.replace(oldUpdateEnd, newUpdateEnd);

fs.writeFileSync('e:/Zacbov/projets/catacombes/fps.html', code, 'utf8');
console.log('Added viewmodel, minimap and projectiles successfully!');
