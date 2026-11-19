export const FPS = 30;
export const SIZE = 1024;
export const DURATION = 60;
export const RENDER_SIZE = 1536;
export const PARTICLES = 1310720;

// Distances and elevations are relative to each shot's moving focus point.
// The ten-second arrival is followed by six cuts, all with linear timing.
export const SHOTS = [
  { start: 0, end: 10, name: 'Arrival — low, wide orbit into the grove', target: [[0,.88,0],[0,.93,0]], distance: [14.5,11.88], elevation: [-1.8,-2.5], azimuth: [.44,-.12], fov: 28 },
  { start: 10, end: 18, name: 'Moss — east orbit at leaf height', target: [[0,.13,0],[0,.13,0]], targetRadius: [1.95,1.95], distance: [.56,.56], elevation: [12,12], azimuth: [.94,1.18], fov: 28 },
  { start: 18, end: 26, name: 'Under the canopy — low orbit through spores', target: [[0,1.0,0],[0,1.0,0]], distance: [5.0,4.7], elevation: [-8,-7], azimuth: [-.36,.02], fov: 28 },
  { start: 26, end: 34, name: 'Moss — west orbit through the light', target: [[0,.13,0],[0,.13,0]], targetRadius: [2.1,2.1], distance: [.56,.56], elevation: [12,12], azimuth: [-1.02,-1.30], fov: 28 },
  { start: 34, end: 44, name: 'Ascent — from moss to the canopy', target: [[0,.35,0],[0,1.20,0]], distance: [4.7,4.7], elevation: [-1,5], azimuth: [.60,1.10], fov: 28 },
  { start: 44, end: 52, name: 'Above the grove — coral caps and green moss', target: [[0,.65,0],[0,.65,0]], distance: [7.54,6.77], elevation: [43,51], azimuth: [.65,1.02], fov: 28 },
  { start: 52, end: 60, name: 'Farewell — drifting through the light', target: [[0,.93,0],[0,.90,0]], distance: [7.46,8.57], elevation: [8,6], azimuth: [-.7,-.38], fov: 28 },
].map(shot => ({ ...shot, startFrame: shot.start * FPS, endFrame: shot.end * FPS }));

const lerp = (a,b,t) => a+(b-a)*t;

export function cameraPoseAt(time) {
  if (!Number.isFinite(time) || time < 0 || time > DURATION) throw new RangeError('Invalid sequence time');
  const shot = SHOTS.find(s => time < s.end) ?? SHOTS.at(-1);
  const t = (time-shot.start)/(shot.end-shot.start);
  const target = shot.target[0].map((v,i) => lerp(v,shot.target[1][i],t));
  const distance = lerp(...shot.distance,t), elevation = lerp(...shot.elevation,t)*Math.PI/180;
  const azimuth = lerp(...shot.azimuth,t), radius = distance*Math.cos(elevation);
  // Moss cameras travel around the grove's center. The focus point follows
  // a smaller concentric arc so the nearby leaves stay in focus throughout.
  if(shot.targetRadius){
    const focusRadius=lerp(...shot.targetRadius,t);
    target[0]+=Math.sin(azimuth)*focusRadius;
    target[2]+=Math.cos(azimuth)*focusRadius;
  }
  return { shot, target, distance, fov: shot.fov, position: [
    target[0]+Math.sin(azimuth)*radius,
    target[1]+Math.sin(elevation)*distance,
    target[2]+Math.cos(azimuth)*radius,
  ] };
}

export function setCaptureCamera(app,time) {
  const pose = cameraPoseAt(time), { camera,controls,spores,renderer } = app;
  controls.target.fromArray(pose.target);
  camera.position.fromArray(pose.position);
  camera.fov=pose.fov;camera.updateProjectionMatrix();camera.lookAt(controls.target);camera.updateMatrixWorld();
  // The point rasterizer uses the actual lens and drawing-buffer height.
  spores.pixelWorld.value=2*Math.tan(camera.fov*Math.PI/360)*4.7/renderer.domElement.height;
  return pose;
}
