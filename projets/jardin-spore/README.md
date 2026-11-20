# 17 / Jardin des simples (fork de Spore)

Le rendu de Spore (matériaux de tissu translucides, lumière contre-jour chaude + remplissage bleu, spores GPU, profondeur de champ, TAA, tone mapping) appliqué à tout un petit jardin :
bassin à étang, 10 plantes générées (Fabrique : achillée, aconits, actée, thym, romarin, iris ×2, pélargonium, sycomore) + saules pleureurs, nénuphars et massettes autour du bassin, arbres et les 25 champignons d’origine.

- `garden.js` : construit le jardin. Les feuilles laissent passer la lumière avec leur propre teinte, les fleurs rayonnent de leur couleur et les feuilles brillent vers la pointe ; 4 petites lumières colorées éclairent l’anneau de plantes. Les matériaux Fabrique (WebGL) sont remplacés par `MeshSSSNodeMaterial` (feuilles, pétales, tiges vertes) ou un matériau mat (écorce), avec les mêmes paramètres de transmission que les champignons de Spore.
- `terrain.js` : ajoute le bassin (`POND`, `pondField`) à `groundHeight`.
- `fabrique.js`, `plantes.js` : générateurs de géométrie (scripts classiques chargés dans `index.html`).
- `main.js` : lumières élargies, brouillard plus léger, caméra reculée pour voir le bassin.
- Échelle : 1 mètre = 9 unités (`S` dans `garden.js`), comme les champignons de Spore (1 unité ≈ 10 cm) ; les arbres font ~58 unités. La mousse couvre tout le sol jusqu’à 12 unités (`MOSS_EXTRA`, `MOSS_R` dans `forest.js`). Pour alléger : réduire `MOSS_EXTRA`, les plantes par massif ou le nombre d’arbres.

- Bouton **Encre** (en bas) : bascule le rendu final en gravure noir et blanc (nœud TSL `inkOut` dans `post-processing.js`).

- **Timeline** (barre en bas : ▶ lecture, curseur d’heure, horloge) : `timeline.js`. La nuit (23:00 par défaut, ou `?time=21:30` dans l’adresse) est l’ambiance de Spore ; le jour éteint la bioluminescence, allume un soleil et un ciel. Réglages en tête de fichier : `DAY_EXPOSURE`, palette `PAL`, intensités soleil/hémisphère dans `apply()`.

- `especes.js` : les six champignons de la page « Spore · microscope » (amanite tue-mouches, coprin chevelu, morille, inocybe étoilé, reishi, vesse-de-loup), avec leur géométrie procédurale d’origine (cm → `SM` dans `garden.js`) et leurs couleurs ; matériaux WebGPU avec une lueur nocturne qui s’éteint le jour.

- **Arbres** : `eztree/` est EZ-Tree (https://github.com/dgreenheck/ez-tree, licence MIT, voir `eztree/LICENSE`) adapté pour s’exécuter sans bundler (imports `.js`, JSON → modules, textures par URL). Chênes, frênes et trembles avec écorce et feuilles texturées, re-matérialisés en `MeshStandardNodeMaterial` / `MeshSSSNodeMaterial` (feuilles translucides). Rochers du bassin et fleurs de prairie : `assets/*.glb` de l’app EZ-Tree (compression Draco : le décodeur est téléchargé depuis gstatic ; vérifie la licence de ces modèles avant de publier).

- **Eau** : le matériau du bassin reçoit deux couches de `assets/waternormals.jpg` (carte de normales de Three.js) qui défilent, pour des rides et des reflets mobiles (reflet de l’environnement, pas de reflet planaire : `WaterMesh` de Three.js relance un rendu de scène, risqué avec le pipeline personnalisé de Spore). **Vent** : balancement léger des plantes et des feuillages d’arbres (`positionNode` dans `garden.js`).

Lancer : `npm start` puis http://localhost:8016/ dans un navigateur WebGPU.

---

# 16 / Spore

A dark grove of 25 mushrooms above a luminous green mossy floor. Warm and cool backlights travel through branching orange gill folds and curved ivory stems; neutral spores catch those lights as they rise, settle and curl through the air. Terracotta and coral caps have translucent rolled edges and individual pigment, wetness and tissue-density variation. Rose/copper individuals sit among honey and ivory mushrooms; their pigment carries through caps, fins and stems. Inner fins glow amber and the stem bases fade gradually from green into ivory. Every mushroom continuously releases spores. The camera slowly orbits the grove.

## Run

```sh
npm start
```

Open **http://localhost:8016/** in a WebGPU-capable browser. The import map loads the WebGPU build, TSL and addons from [Three.js commit `4f5d6bc0c7ec777e06703b56c7b7089e99be11d5`](https://github.com/mrdoob/three.js/commit/4f5d6bc0c7ec777e06703b56c7b7089e99be11d5) via jsDelivr's GitHub CDN. No build step is needed. The upstream meshlet pipeline includes the merged surface-distance LOD fix; the local backport has been removed. `npm install` installs the same commit locally for tests and source inspection.

To browse the whole Codevember gallery, serve the parent directory as described in its README.

## Controls

Drag to orbit, scroll to zoom. **Space** pauses the simulation and automatic orbit, **R** restores the camera, and **H** hides the interface.

The custom HTML settings panel exposes the air current, **Spore light** (default **4**, adjustable up to **6**), subsurface scattering, bioluminescent **Glow** (default **1**, its maximum), exposure, resolution, automatic particle density, and meshlet visualization. Glow also controls the cached illumination around the stems and fins. Changing the particle count manually disables automatic density. Canvas focus deliberately has no outline.

**Color grading** contains exposure, saturation, contrast, warmth, and green/magenta tint, with live numeric values. The selected defaults are exposure **0.5**, saturation **1**, contrast **1.15**, warmth **1**, and tint **0.43**. **Reset grading** restores these values. **Copy values** copies the current values and HDR peak as JSON. Grading happens before the final display transform and works in SDR and HDR.

**Display → Automatic** enables HDR when the display reports `dynamic-range: high` and the browser supports extended floating-point canvas presentation. It follows display changes without restarting the simulation. **SDR** overrides automatic selection. The status shows the active output. **HDR peak** sets a ceiling of 1–8× SDR reference white (default 4×); it is available while HDR is active. This is a creative ceiling, not a measurement of the panel's peak nits. The browser maps it to the display.

## Rendering

- **GPU spores:** TSL compute maintains position, velocity, age, and production intensity in storage buffers. A shared 96×56×96 velocity volume combines multiscale curl flow with soft deflection near caps and stems. Its nearly neutral vertical bias lets settling produce broad descending clouds while eddies still carry some spores upward. It depends on world position, time and wind, with no source-specific or age-specific steering. Every spore adds individual settling, drag and a small unresolved-turbulence displacement whose variance scales with timestep. Settling is independent of rendered point size. Fresh emission samples replace repeated quantized-time birth positions; startup prefill is shortened to five seconds. Partial obstacle deflection avoids stagnant surface ridges, with deposition/respawn for remaining impacts. A static canopy grid limits obstacle tests; a 96×96 texture-array layer per mushroom stores the warped cap surface and lower fin envelope. All 25 mushrooms emit continuously: allocation mixes a 35% equal baseline with 65% cap-area weighting. This is an analytic flow field with stochastic diffusion, not a fluid solver.
- **Particle optics:** neutral particles use the same key/fill colors and intensities as the mushrooms, inverse-square attenuation, the key spotlight cone and a Henyey–Greenstein phase function (g=0.55). They also sample the cached stem/fin emission volume with isotropic scattering. Light visibility is unshadowed. There is no spectrum band or fixed particle tint. Tiny point cores and defocused sprites receive depth-aware occlusion. GPU workgroups compact visible contributions into draw streams; only accepted particles contend for local counters. A compute rasterizer accumulates the point cores at full DPR with 16-bit fractional precision; broad defocused sprites use a half-resolution target. All active spores continue simulating, including those outside the view. Capacity is 4,194,304 and adaptive density controls the active count.
- **Steady bioluminescence:** amber emission strengthens toward each fin's attachment to the stem. A warm internal glow at the upper stipe fades down into the body, joining the brighter fins. A softer lime-to-mint glow extends along the lower stems. A cached 64×24×64 irradiance/direction volume approximates diffuse light from every stem base and gill center, plus three broad green ground pools. The Glow setting scales these together. The former animated mushroom pulses, flying lights and pulsing grass lights have been removed.
- **Particle sampling:** the defocused pass chooses one stable random particle within each group of 16. The former fixed modulo sample aliased with the 256-slot emitter table and excluded some mushrooms from the bright blurred population. Stratification keeps the same draw capacity while covering every source.
- **Mushroom tissue:** a custom physical lighting model separates diffuse transport from surface reflection. Geometry supplies local cylinder-chord, slab and cap-edge path lengths; wavelength-dependent extinction controls transmission. No shadow-depth texture is used. This smooth transport is evaluated on the dense geometry and interpolated. A normalized diffusion profile spreads diffuse irradiance with different RGB mean free paths, rejecting unrelated mushrooms and depth discontinuities. Specular highlights remain sharp. Cap skin and transmitted flesh have distinct pigment tints. Curved primary gills branch at varied radii; deeper valleys have denser tissue, and a shorter diffusion radius preserves the folds. Internal density varies through the thick ivory stems.
- **Surface and lighting:** standard Three.js lighting handles two real-time lights: a warm spotlight and a blue point fill. Clustered lighting and shadow casting are disabled. A 512×256 HDR environment with soft canopy openings and green ground bounce supplies IBL, with restrained diffuse fill on tissue and moss. Cap transport scale is 3.3; fin transport varies from 0.7 in the recesses to 4.1 on the ridges. A periodic 3D texture supplies continuous tissue grain. Gentler cap waves (42% of the original amplitude) and smaller ripples preserve asymmetry. A narrow rolled lip covers fins that extend to 97% of the cap radius; repositioning two mushrooms removes the detected cap/cap and stem/cap intersections.
- **Forest floor:** the solid-leaf moss and GPU meshlet pipeline are adapted from day 5. The source carpet contains 493,732 leaves in 4,160 tufts, including 300 smaller tufts placed against the stems, with rounded colonies, sorrel and violet-tipped shoots. Close moss leaves use five curved rings and 40 triangles per blade, 2.5× the previous 16; the medium and far meshes retain their original complexity. Near, medium and coarse moss surfaces crossfade with complementary screen-door coverage over overlapping distance bands. Coarser meshoptimizer geometry prunes leaves; it no longer appears in an instantaneous switch. Automatic simplification inside these explicit moss levels is disabled. The opaque shader resumes outside the blend, preserving early depth rejection. Thin-leaf transmission, soft specular highlights and vertex cavity attributes give plants light and depth. Brighter lime and mint growing tips retain darker cavities. No SSAO is used. Background tree trunks have been removed.
- **Soil contacts:** stem geometry extends below the actual terrain instead of ending at a common height. A ground-relative vertex attribute places irregular damp pigment, roughness and glow absorption around each base. Fine tapered mycelial cords and downy fibres join the stems to the soil, with adhering humus grains; these are merged into two opaque meshes. Fallen leaves are repositioned with conservative clearance around the curved stems, preventing litter blades from piercing the stipes. Green stem emission uses height above the local soil, fading out over 0.28–0.36 scene units with stable variation per mushroom. Its reach no longer scales with total stem height; the soft fade and moss brightness are retained.
- **Plant finishes:** broad sorrel leaves and violet shoots use a separate matte material (roughness 0.70, specular intensity 0.18). Moss uses roughness 0.55 and specular intensity 0.30 across all detail levels. Clearcoat is disabled on both; fallen leaves use roughness 0.82 and specular intensity 0.12. Thin-leaf transmission and the existing green emission are retained.
- **Composition and camera:** the diffused mushroom lighting enters a half-resolution depth-of-field gather, reconstructed at full resolution with depth-aware weights. Color and depth share the same camera jitter; temporal antialiasing then stabilizes the reconstructed grove before the particle composite and bloom. This avoids mixing resolved color with jittered depth or bleeding unrelated surfaces together during blur upsampling. Devices with insufficient MRT attachment capacity use 4× MSAA instead of TRAA. The orbiting macro light preserves the backlit composition around the grove.
- **Display output:** `tone-mapping.js` extends Three.js's ACES fitted transform with a smooth highlight shoulder. In the fit's AP1 coordinates, `d = max(x - 1, 0)` contributes `(peak - 1) * (d / (d + 4))²` before the output matrix. The toe and midtones stay unchanged; peak 1 reproduces the original SDR fit exactly. This is an artistic ACES-inspired curve, not a standardized ACES HDR output transform. Exposure and grading apply once after composition; the sRGB transfer function follows. The float presentation buffer preserves values above white. Automatic mode changes presentation and curve headroom together; unsupported HDR uses the SDR curve. A float canvas is retained on SDR displays when supported so moving the window does not rebuild GPU resources. Browsers rejecting float presentation retry their preferred canvas format. The adapted fit's MIT notice is in `licenses/three.js.txt`.

This is a real-time approximation, not volumetric path tracing. Diffusion can only sample visible surfaces. Analytic thickness models local tissue, without occlusion by other objects. The two main lights drive volumetric tissue transmission. Cached emission supplies unshadowed diffuse illumination near the stems and fins; cavity attributes supply local plant occlusion. Particle illumination does not integrate IBL or multiple scattering, and the cached volume smooths very small light footprints. Optical coefficients and bioluminescence are art-directed rather than measured fungal properties. One scene unit represents approximately ten centimetres.

## Validation and performance

```sh
npm test
```

The Node checks cover finite geometry and normals, positive tissue thickness, closed cap seams, covered fin edges, sampled layout intersections, warped collision envelopes, collision-grid coverage, emission allocation, storage/draw-count limits, automatic HDR selection/fallback and camera clearance throughout the video sequence.

Additional checks run against the live WebGPU scene in the browser console:

```js
await (await import('./scripts/browser-checks.js')).checkScene();
await (await import('./scripts/render-checks.js')).checkRendering();
await (await import('./scripts/meshlet-checks.js')).checkMeshletLOD();
await (await import('./scripts/hdr-checks.js')).checkHDR();
await (await import('./scripts/lighting-checks.js')).checkLighting();
await (await import('./scripts/air-checks.js')).checkAir();
await (await import('./scripts/bokeh-checks.js')).checkBokeh();
await (await import('./scripts/benchmark.js')).benchmark();
(await import('./scripts/soak.js')).startSoak(210);
```

The browser checks read GPU buffers, test rising and settling motion, disable airflow to verify settling, initialize the last storage range, and exercise pause, orbit, density selection, and canvas focus. The soak records a full orbit with adaptive density running normally. Read `window.sporeSoak` after it completes.

HDR checks compare GPU output with stock ACES, check the neutral ramp and saturated colors, verify grading, read values above white from the actual canvas texture, and simulate display changes on a separate GPU canvas. The development browser reports an SDR display: these checks verify the HDR data path, not physical HDR luminance. Standard PNG making-of captures are SDR and do not preserve HDR brightness.

The meshlet regression verifies that the pinned upstream build selects LOD 0 for both the merged sorrel/violet mesh and the enclosing terrain at the reference camera position. The earlier GPU A/B comparison selected LOD 1 for the plants under the npm r187 release, versus LOD 0 with PR35560; terrain was LOD 0 in both. The PR corrects an underestimated error for large objects by measuring distance to the bounding sphere's surface. Small moss tufts also had a separate abrupt topology change (one variant fell from 107 connected components to 20); explicit crossfades address that. Queue readbacks found no overflow. A warmed, static occlusion-on/off comparison differed by only a few pixels, consistent with raster precision rather than missing patches.

Performance depends on the viewport and camera position. The default resolution is 1.5 device pixels per CSS pixel (limited by the display and a four-million-pixel budget); Settings can raise it to 2. Temporal antialiasing resolves the grove before spores are composited, preserving crisp particle motion. Adaptive density balances particles against the selected resolution; total spore radiance is normalized as density increases. Development measurements and GPU check results are saved locally under `exports/checks/`.

On an Apple M1 with 7 GPU cores at 1110 × 783, the earlier DPR-1 renderer reached approximately 800,000 spores during a 210-second orbit. The compute-raster and temporal-AA version subsequently sustained 2,097,152 spores at DPR 1 during an accelerated full orbit, with one-second averages of 31–33.44 fps after warm-up. The current default prioritizes the user's requested higher DPR. These historical measurements do not describe every subsequent material revision or guarantee performance on other viewports and devices.

The earlier opal/mist version completed a 60-second accelerated orbit at **DPR 1.5**, with **31.5–34.5 fps** one-second averages after the first ten seconds and **786,432–983,040 active spores**. See `exports/checks/opal-dpr15-orbit.json`. This is a historical measurement before the latest dark lighting, denser moss and restored broad fins.

The earlier dark SSS version completed a 60-second accelerated full orbit at **DPR 1.5** on the same M1, with **31–35 fps** one-second averages after ten seconds and **983,040–1,228,800 active spores**. The normal RAF loop, adaptive density and live shadows stayed enabled. One frame exceeded 50 ms in that interval; these are measured averages, not a guarantee for every frame. Report: `exports/checks/dark-sss-dpr15-orbit.json`. All **8 Node, 10 motion/interface and 5 GPU rendering checks** passed, including a new readback check for spores penetrating stems. Results: `exports/checks/dark-sss-gpu-checks.json`.

The subsequent tissue-color pass was also checked over a 60-second orbit: **31.48–34.84 fps**, **881,408–1,310,720 spores**, and one frame over 50 ms after warm-up. See `exports/checks/dark-pigment-dpr15-orbit.json`. This predates the brighter brown caps, amber fins and denser visible spores. Portrait controls fit an emulated 390 × 844 viewport; this is not a mobile-device performance measurement.

The brighter amber/individual-variation revision completed another 60-second accelerated orbit at **DPR 1.5**: **31.48–34.43 fps**, **881,408–1,074,816 active spores**, and no frames over 50 ms after the first ten seconds. The cloud is more visible because its illumination is broader and its radiance normalization is higher; this measurement does not demonstrate a larger sustained simulation count. All 8 Node, 10 browser and 5 rendering checks passed. See `exports/checks/amber-variation-dpr15-orbit.json` and `amber-variation-gpu-checks.json`.

With brighter mushroom transport, the PR35560 backport and blended moss detail, the 60-second orbit measured **31.47–35 fps**, **741,632–983,040 spores**, and one frame over 50 ms after warm-up at the same viewport/DPR. See `exports/checks/meshlet-lod-dpr15-orbit.json`. All **10 Node, 5 meshlet regression and 5 GPU rendering checks** passed. The extra plant detail and overlapping moss surfaces consume some of the particle budget; resolution remains 1.5.

The automatic HDR/color-grading revision completed a 60-second accelerated orbit at the same viewport and DPR: **31.48–34.49 fps**, **593,280–723,456 spores**, and three frames over 50 ms after the first ten seconds. This used float canvas presentation in SDR mode; it does not measure a physical HDR display. All **14 Node tests, 15 HDR/grading GPU checks and 5 rendering checks** passed. See `exports/checks/hdr-output-dpr15-orbit.json` and `hdr-tone-mapping.json`. The grading controls also fit the portrait viewport, and keyboard activation leaves canvas focus unframed.

The canopy-IBL/stem-pulse revision completed another 60-second orbit at1111×783/DPR1.5. After ten-second warm-up it measured **30.97–34.44fps**, **786,432–983,040 spores**, and zero frames over50ms. At a fixed786,432 particles, mean submission+GPU completion was32.96ms before versus32.61ms after; this small difference does not establish a speed improvement. All17 Node tests,4 activity GPU checks,5 rendering checks and10 motion/interface checks passed. See `exports/checks/alive-ibl-dpr15.json`. The measurement predates the final removal of oversized bright motes and softer stem-pulse refinement; rendering checks were repeated after mote removal.

The earlier chestnut/branching-fin version completed a 60-second accelerated orbit at1111×783/DPR1.5: **31–33.44fps**, **433,536–644,864 spores**, and no frames over50ms after ten-second warm-up. Adaptive density stayed active with32 clustered lights and shadows disabled. This records one device and viewport, not a universal frame-rate guarantee. All16 Node tests and21 browser/GPU checks passed. See `exports/checks/chestnut-branching-fins.json`. The added geometry and lighting consume some of the particle budget.

The restored green-moss version uses standard lighting with two lights. A matched two-light comparison at 524,288 spores measured **28.68 ms** mean submission plus GPU completion with standard lighting versus **30.98 ms** with clustered lighting (about **7–8% less frame time**). A separate 60-second accelerated orbit at 1111×783/DPR 1.5 measured **32.43–34.84 fps** one-second averages after ten seconds, with **1,228,800 active spores** and no frames over 50 ms in that interval. Normal RAF and adaptive density remained active. These are individual runs, not guaranteed sustained performance under changing device load. All **17 Node tests and 22 browser/GPU checks** passed, including emission from all 25 mushrooms, green illumination at every base, shared airflow and zero shadow passes. Results: `exports/checks/green-moss-shared-air.json`.

The settling-spore/soil-contact revision completed a 60-second accelerated orbit at 1111×783/DPR 1.5: **31.48–34 fps** one-second averages after warm-up, **983,040 spores**, and no frames over 50 ms in that interval. The 17 Node tests include buried stem contacts; 25 distinct browser/GPU checks cover motion, fresh emission, all-source blur sampling, lighting and rendering. The final shortening of the green emission gradient followed this measurement. See `exports/checks/settling-spores-soil-contact.json`. Screenshots/source snapshots 115–120 preserve these stages.

The revised depth-of-field pipeline completed a 60-second accelerated orbit at 1111×783/DPR 1.5. Adaptive density started above two million spores and settled during the first 18 seconds; the remaining samples measured **31.48–33.47 fps**, **997,248–1,216,128 spores**, and no frames over 50 ms. This is a local SDR-display measurement, not a universal performance guarantee. See `exports/checks/crisp-dof-dpr15-orbit.json`. The 18 Node checks pass, including clearance along every frame of the seven-shot camera sequence.

The denser close moss was compared at a 1536×1536 drawing buffer with 1,310,720 spores. Forty triangles per leaf added about **2.9 ms** of mean submission-plus-GPU-completion time over sixteen triangles: **32.38 ms** and **33.18 ms** in the two moss views. Medium/far geometry stays unchanged. These fixed-view timings exclude RAF waiting and do not establish a sustained frame-rate guarantee; adaptive density remains active in the interactive scene. See `exports/checks/moss-detail-v3.json`.

## Video capture

The one-minute sequence uses a consistent 28° lens, with distances adjusted to preserve the framing. Its seven shots are a low, distant ten-second orbit and approach, close moss on the east side, a low-angle view through several mushrooms and spores, a second close moss orbit on the west side, a rising orbit from the moss to cap height, an elevated view and a final wide orbit. Both moss cameras travel around the grove's center; their focus points follow smaller concentric arcs to keep nearby leaves sharp. Orbit angles, target parameters and dolly distances interpolate linearly throughout each shot, without easing. Each frame advances the simulation by exactly 1/30 second. Capture uses 1,310,720 spores and renders at 1536×1536 before downsampling to 1024×1024. The title and Settings label match the other days; no cursor or audio is recorded.

Start a receiver (requires `ffmpeg` and `ffprobe`):

```sh
python3 scripts/capture-server.py exports/spore-video.mp4 --previews
```

With the local scene loaded in a **1024×1024 viewport at device scale 1**, run in the browser console:

```js
await (await import('./scripts/capture-video.js')).captureVideo();
```

Read `window.captureProgress` for progress or call `captureProgress.cancel()` to stop. The camera, display mode, resolution, particle count and interactive controls are restored afterward. A worker encodes and uploads one lossless PNG at a time; frames are acknowledged in order with encoder backpressure. The receiver checks free disk space before starting and writes MP4 indexes incrementally. It verifies the decoded frame count, duration and dimensions before finalizing the MP4 and its JSON report. `--previews` retains selected source frames for review. Use a fresh output filename and receiver for another recording.

For longer recordings, use a dedicated Chrome profile launched with `--remote-debugging-port=9226`, open the local scene, and run `node scripts/capture-browser.mjs`. This optional Node 22+ driver sets the capture viewport, reports progress, and restores the viewport afterward. It leaves Chrome running and does not enable network inspection for the large frame uploads. Optional arguments select the debugging port and receiver URL.

The MP4 is an SDR H.264 export for normal playback. It does not preserve the live canvas's HDR display headroom. Fin emission and spore light are boosted in scene-linear space; the moss's emission, illumination and grading are unchanged.

## Making of

Numbered PNGs, timestamps, and descriptions are preserved in `exports/making-of/steps.json`. Source snapshots accompany stages 007 onward in `exports/making-of/source/`. The earlier screenshots and original motion study are also retained locally. The export folder is intentionally excluded from version control.

Browse the local archive at **http://localhost:8016/exports/making-of/**.

After taking a browser screenshot:

```sh
python3 scripts/capture-step.py /path/to/screenshot.png 'Description of the step'
```

## References

- [Spore Rain — mushrooms reproduction](https://www.youtube.com/watch?v=Mrphn1zOWaE), plus the photographic and magical mushroom references supplied in the conversation.
- [Mushrooms use convectively created airflows to disperse their spores](https://pmc.ncbi.nlm.nih.gov/articles/PMC4801285/), Dressaire et al.
- [A Practical Model for Subsurface Light Transport](https://graphics.stanford.edu/~srm/publications/SG01-subsurf-abstract.html), Jensen et al.
- [Extending the Disney BRDF to a BSDF with Integrated Subsurface Scattering](https://blog.selfshadow.com/publications/s2015-shading-course/burley/s2015_pbs_disney_bsdf_notes.pdf), Burley.
- [Approximate Reflectance Profiles for Efficient Subsurface Scattering](https://graphics.pixar.com/library/ApproxBSSRDF/approxbssrdfslides.pdf), Pixar.
