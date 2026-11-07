const fs = require('fs');

let html = fs.readFileSync('e:/Zacbov/projets/catacombes/fps.html', 'utf8');

// 1. Add mobRagdolls array to globals
html = html.replace('let particles3D = [];', 'let particles3D = [];\nlet mobRagdolls = [];');

// 2. Clear mobRagdolls in buildLevel3D
const clearTarget = `  mob3DMap.forEach(m => scene.remove(m));
  mob3DMap.clear();`;

const clearReplacement = `  mob3DMap.forEach(m => scene.remove(m));
  mob3DMap.clear();
  mobRagdolls.forEach(r => scene.remove(r.mesh));
  mobRagdolls = [];`;

html = html.replace(clearTarget, clearReplacement);

// 3. Trigger 3D ragdoll / death animation on mob defeat
const deathTarget = `  // Nettoyage des monstres vaincus
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

const deathReplacement = `  // Effondrement cinématique (Ragdoll 3D) & nettoyage des monstres vaincus
  mob3DMap.forEach((mesh, m) => {
    if (!activeMobs.has(m)) {
      // Si le monstre était visible ou proche, lance une animation d'effondrement ragdoll
      const isVis = (G.vis && G.vis[(m.y | 0) * MW + (m.x | 0)] === 1);
      if (isVis && mobRagdolls.length < 24) {
        // Détache le monstre pour l'animer en chute avec bascule
        const fallAngle = (Math.random() - 0.5) * 0.4;
        const pushDir = Math.atan2(m.x - G.p.x, m.y - G.p.y);
        mobRagdolls.push({
          mesh: mesh,
          life: 4.5,
          rotSpeedX: 1.8 + Math.random() * 1.2,
          tiltZ: fallAngle,
          vx: Math.sin(pushDir) * 0.8,
          vz: Math.cos(pushDir) * 0.8,
          curRotX: 0,
          curY: mesh.position.y
        });
      } else {
        scene.remove(mesh);
      }
      mob3DMap.delete(m);
      const shw = mobShadows.get(m);
      if (shw) { scene.remove(shw); mobShadows.delete(m); }
      const hp = mobHPBars.get(m);
      if (hp) { scene.remove(hp.sprite); mobHPBars.delete(m); }
    }
  });

  // Mise à jour des ragdolls de monstres au sol
  for (let ri = mobRagdolls.length - 1; ri >= 0; ri--) {
    const rd = mobRagdolls[ri];
    rd.life -= dt;
    if (rd.curRotX < Math.PI / 2.1) {
      rd.curRotX += rd.rotSpeedX * dt;
      rd.mesh.rotation.x = rd.curRotX;
      rd.mesh.rotation.z = rd.tiltZ;
      rd.mesh.position.y = Math.max(0.04, rd.mesh.position.y - 0.9 * dt);
      rd.mesh.position.x += rd.vx * dt;
      rd.mesh.position.z += rd.vz * dt;
      rd.vx *= 0.88; rd.vz *= 0.88;
    }
    // Disparition progressive par enfoncement / fondu à la fin
    if (rd.life < 1.0) {
      const k = Math.max(0, rd.life);
      rd.mesh.scale.setScalar(k);
    }
    if (rd.life <= 0) {
      scene.remove(rd.mesh);
      mobRagdolls.splice(ri, 1);
    }
  }`;

html = html.replace(deathTarget, deathReplacement);

// 4. Enhance mob animation in render loop to include attack windup animation!
const mobAnimTarget = `      // Animation 3D des membres et respiration
      const isMoving = (m.state === 'chase' || Math.hypot(m.vx || 0, m.vy || 0) > 0.05);
      const walkCycle = Math.sin(ts / 120 + (m.ph || 0) * 10);
      const breath = Math.sin(ts / 350 + (m.ph || 0) * 5) * 0.03;`;

const mobAnimReplacement = `      // Animation 3D des membres, respiration et préparation de frappe (windup)
      const isMoving = (m.state === 'chase' || Math.hypot(m.vx || 0, m.vy || 0) > 0.05);
      const isAttacking = (m.state === 'wind');
      const attackProgress = isAttacking ? Math.max(0, 1 - (m.wt || 0) / (m.wind || 0.6)) : 0;
      const walkCycle = Math.sin(ts / 120 + (m.ph || 0) * 10);
      const breath = Math.sin(ts / 350 + (m.ph || 0) * 5) * 0.03;`;

html = html.replace(mobAnimTarget, mobAnimReplacement);

// 5. Apply attack posture to arms & posture when m.state === 'wind'
const armSwingTarget = `        // Balancement des bras et flexions des coudes
        if (mMesh.userData.parts.armL && mMesh.userData.parts.armR) {
          const armSwing = isMoving ? walkCycle * 0.7 : Math.sin(ts / 400) * 0.08;
          mMesh.userData.parts.armL.rotation.x = armSwing;
          mMesh.userData.parts.armR.rotation.x = -armSwing;
          if (mMesh.userData.parts.elbowL && mMesh.userData.parts.elbowR) {
            mMesh.userData.parts.elbowL.rotation.x = Math.PI / 6 + (isMoving ? Math.sin(walkCycle) * 0.2 : 0);
            mMesh.userData.parts.elbowR.rotation.x = Math.PI / 6 - (isMoving ? Math.sin(walkCycle) * 0.2 : 0);
          }
        }`;

const armSwingReplacement = `        // Balancement des bras et posture d'attaque cinématique
        if (mMesh.userData.parts.armL && mMesh.userData.parts.armR) {
          if (isAttacking) {
            // Bras armé levé haut prêt à s'abattre (télégraphie visuelle de l'attaque)
            const windupPose = Math.PI / 2.2 + Math.sin(attackProgress * Math.PI) * 0.6;
            mMesh.userData.parts.armL.rotation.x = windupPose;
            mMesh.userData.parts.armR.rotation.x = -0.2;
            if (mMesh.userData.parts.elbowL) mMesh.userData.parts.elbowL.rotation.x = Math.PI / 3;
          } else {
            const armSwing = isMoving ? walkCycle * 0.7 : Math.sin(ts / 400) * 0.08;
            mMesh.userData.parts.armL.rotation.x = armSwing;
            mMesh.userData.parts.armR.rotation.x = -armSwing;
            if (mMesh.userData.parts.elbowL && mMesh.userData.parts.elbowR) {
              mMesh.userData.parts.elbowL.rotation.x = Math.PI / 6 + (isMoving ? Math.sin(walkCycle) * 0.2 : 0);
              mMesh.userData.parts.elbowR.rotation.x = Math.PI / 6 - (isMoving ? Math.sin(walkCycle) * 0.2 : 0);
            }
          }
        }`;

html = html.replace(armSwingTarget, armSwingReplacement);

// 6. Boss aura in 3D: If m.boss, add a subtle pulsating glowing aura under feet
const shadowScaleTarget = `    const shwScale = (m.r / 0.33) * (m.boss ? 1.6 : 1.0);
    shw.scale.set(shwScale, 1, shwScale);
    shw.position.set(m.x, 0.02, m.y);
    shw.visible = isVis;`;

const shadowScaleReplacement = `    const shwScale = (m.r / 0.33) * (m.boss ? 1.6 : 1.0);
    shw.scale.set(shwScale, 1, shwScale);
    shw.position.set(m.x, 0.02, m.y);
    shw.visible = isVis;

    // Halo d'aura magique 3D au sol pour les Boss et Élites
    if (m.boss) {
      if (!mMesh.userData.bossAura) {
        const auraGeo = new THREE.RingGeometry(0.55 * m.r / 0.33, 0.75 * m.r / 0.33, 16);
        auraGeo.rotateX(-Math.PI / 2);
        const auraMat = new THREE.MeshBasicMaterial({
          color: 0xe0a44c, transparent: true, opacity: 0.45, side: THREE.DoubleSide
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        scene.add(aura);
        mMesh.userData.bossAura = aura;
      }
      mMesh.userData.bossAura.position.set(m.x, 0.025, m.y);
      mMesh.userData.bossAura.rotation.y = ts * 0.002;
      mMesh.userData.bossAura.material.opacity = 0.35 + Math.sin(ts / 200) * 0.15;
      mMesh.userData.bossAura.visible = isVis;
    }`;

html = html.replace(shadowScaleTarget, shadowScaleReplacement);

// 7. Clean boss aura on death
const auraCleanTarget = `      scene.remove(mesh);
      mob3DMap.delete(m);`;

const auraCleanReplacement = `      if (mesh.userData && mesh.userData.bossAura) {
        scene.remove(mesh.userData.bossAura);
      }
      scene.remove(mesh);
      mob3DMap.delete(m);`;

html = html.replace(auraCleanTarget, auraCleanReplacement);

fs.writeFileSync('e:/Zacbov/projets/catacombes/fps.html', html, 'utf8');
console.log('Advanced AAA death animations, attack postures, and boss auras applied!');
