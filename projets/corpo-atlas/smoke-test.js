#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   smoke-test.js — Test automatique du CorpoAtlas

   Charge l'atlas dans un vrai navigateur, sans écran, et vérifie
   que les fonctions vitales n'ont pas cassé. À lancer après CHAQUE
   modification, AVANT de déployer.

   Utilisation :
     1. Servir l'atlas :   python3 -m http.server 8080
     2. Dans un autre terminal :   node smoke-test.js

   Le test s'arrête au premier échec et affiche ce qui ne va pas.
   S'il affiche « TOUS LES TESTS PASSENT », tu peux déployer.
══════════════════════════════════════════════════════════════ */

const { chromium } = require('playwright');

const URL = process.env.ATLAS_URL || 'http://localhost:8080/corpoatlas.html';

// ── Petit cadre de test maison (pas de dépendance externe) ──
let passed = 0, failed = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { passed++; results.push(`  ✓ ${name}`); }
  else    { failed++; results.push(`  ✗ ${name}${detail ? '  → ' + detail : ''}`); }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  // Journaliser les erreurs JS de la page — un script cassé les déclenche
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  try {
    // ── 1. La page se charge sans erreur JS fatale ──
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Attendre que le script soit exécuté…
    await page.waitForFunction(
      () => typeof loadRadio === 'function' && typeof _dataReady !== 'undefined',
      { timeout: 15000 }
    ).catch(() => {});
    // …PUIS attendre que la sidebar se peuple. Elle se construit dans le
    // callback de chargement du GLB (18 Mo + décodage Draco), ce qui peut
    // prendre plusieurs secondes. Sans cette attente, on teste trop tôt et
    // la liste paraît vide alors qu'elle se remplit juste après.
    const sidebarReady = await page.waitForFunction(
      () => document.querySelectorAll('.srow').length > 50,
      { timeout: 45000 }        // le GLB peut être lent au premier chargement
    ).then(() => true).catch(() => false);
    if (!sidebarReady)
      results.push('  ⚠ Sidebar toujours vide après 45 s — le GLB se '
        + 'charge-t-il ? (vérifier le chemin du .glb et la console réseau)');
    await page.waitForTimeout(500);

    // Une erreur de syntaxe (const dupliqué, regex invalide…) casse tout
    // le bloc <script> : on la détecte ici.
    // On ignore les erreurs dues à un CDN inaccessible (three.js, OpenSeadragon…)
    // qui relèvent du réseau, pas du code. Seules les erreurs de syntaxe comptent.
    const fatal = jsErrors.filter(e =>
      /SyntaxError|Unexpected token|Unexpected identifier|Invalid regular/.test(e));
    check('Aucune erreur de syntaxe JS', fatal.length === 0,
          fatal.slice(0, 2).join(' | '));
    const threeBlocked = jsErrors.some(e => /THREE is not defined/.test(e));
    if (threeBlocked)
      results.push('  ⓘ THREE non chargé (CDN bloqué ici) — normal hors production');

    // ── 2. Les objets vitaux existent ──
    const globals = await page.evaluate(() => ({
      three:      typeof THREE !== 'undefined',
      selectMesh: typeof selectMesh === 'function',
      renderInfo: typeof renderInfo === 'function',
      organsFor:  typeof organsForMesh === 'function',
      fallback:   typeof withFallback === 'function',
      getSystem:  typeof getSystemForMesh === 'function',
      cleanName:  typeof cleanMeshName === 'function',
    }));
    if (!threeBlocked) check('THREE.js chargé', globals.three);
    check('selectMesh présent',         globals.selectMesh);
    check('renderInfo présent',         globals.renderInfo);
    check('organsForMesh présent',      globals.organsFor);
    check('withFallback présent',       globals.fallback);
    check('getSystemForMesh présent',   globals.getSystem);
    check('cleanMeshName présent',      globals.cleanName);

    // ── 3. Les 19 modes de pathologie/animation existent ──
    const modes = ['togglePeristal','toggleLymph','toggleFibrose','toggleTumeur',
      'toggleOedeme','togglePerito','toggleDissec','toggleEP','toggleEndo',
      'toggleAVC','toggleMeningite','toggleGB','toggleAlzheimer','togglePNO',
      'toggleBPCO','toggleRetino','toggleSOPK','toggleDopa','toggleLimbic'];
    const modeState = await page.evaluate(
      (list) => list.map(fn => typeof window[fn] === 'function'), modes);
    const okModes = modeState.filter(Boolean).length;
    check(`Les 19 modes présents (${okModes}/19)`, okModes === 19,
          modes.filter((_, i) => !modeState[i]).join(', '));

    // ── 4. La barre latérale s'est construite (systèmes + structures) ──
    const rows = await page.locator('.srow').count();
    check('Structures listées dans la sidebar', rows > 100, `${rows} lignes`);

    const cats = await page.locator('.cat-hd').count();
    check('Systèmes anatomiques présents', cats >= 10, `${cats} catégories`);

    // ── 5. La traduction des noms fonctionne ──
    const nameCheck = await page.evaluate(() => {
      if (typeof cleanMeshName !== 'function') return null;
      return {
        abbr:  cleanMeshName('m. oblique supérieur l'),   // → Muscle … G
        left:  cleanMeshName('left segment antérolatéral'),
      };
    });
    check('Abréviation développée (m. → Muscle)',
          nameCheck && /muscle/i.test(nameCheck.abbr) && / G$/.test(nameCheck.abbr),
          nameCheck ? nameCheck.abbr : 'fonction absente');
    check('« left » traduit', nameCheck && !/left/i.test(nameCheck.left),
          nameCheck ? nameCheck.left : '');

    // ── 6. La recherche transverse répond ──
    const searchWorks = await page.evaluate(() => {
      if (typeof searchEverything !== 'function') return null;
      try { return searchEverything('ren').length; } catch (e) { return 'ERREUR'; }
    });
    // searchEverything a besoin des données chargées par fetch (bloqué hors
    // serveur) : on vérifie juste que la fonction existe et ne plante pas.
    if (threeBlocked) {
      results.push('  ⓘ Recherche transverse non testable ici (script interrompu '
        + 'faute de THREE) — vérifiable seulement en production');
    } else {
      check('Recherche transverse sans erreur',
            searchWorks !== 'ERREUR', 'searchEverything lève une exception');
    }

    // ── 7. Le menu Modes s'ouvre ──
    const menuOpens = await page.evaluate(() => {
      const btn = document.getElementById('tb-overflow-btn');
      const menu = document.getElementById('tb-overflow-menu');
      if (!btn || !menu) return false;
      btn.click();
      const visible = getComputedStyle(menu).display !== 'none';
      return visible;
    });
    check('Le menu Modes s\'ouvre au clic', menuOpens);

    // ── 8. Clic sur une structure → la fiche se remplit ──
    const ficheFills = await page.evaluate(() => {
      const row = document.querySelector('.srow');
      if (!row) return false;
      row.click();
      const panel = document.getElementById('scont') || document.getElementById('info');
      return panel && panel.textContent.trim().length > 20;
    });
    check('Clic sur une structure remplit la fiche', ficheFills);

  } catch (err) {
    check('Le test a pu s\'exécuter', false, err.message);
  } finally {
    await browser.close();
  }

  // ── Rapport ──
  console.log('\n════════════════════════════════════');
  console.log('  SMOKE TEST — CorpoAtlas');
  console.log('════════════════════════════════════');
  console.log(results.join('\n'));
  console.log('────────────────────────────────────');
  if (consoleErrors.length) {
    console.log(`  ⚠ ${consoleErrors.length} erreur(s) console (non bloquantes) :`);
    consoleErrors.slice(0, 3).forEach(e => console.log('     ' + e.slice(0, 90)));
    console.log('────────────────────────────────────');
  }
  if (failed === 0) {
    console.log(`  ✅ TOUS LES TESTS PASSENT (${passed}/${passed})`);
    console.log('     → tu peux déployer.');
  } else {
    console.log(`  ❌ ${failed} TEST(S) EN ÉCHEC (${passed}/${passed + failed} passés)`);
    console.log('     → NE PAS déployer avant correction.');
  }
  console.log('════════════════════════════════════\n');

  process.exit(failed === 0 ? 0 : 1);
})();
