import * as THREE from 'three'
import type { BuildingId } from '../game/camelot-rules'
import { applySurface } from './surface'
import { bevelBox, hexToRgb, mergeMeshes, placeMesh, seededRandom, tintMesh, type Mesh3 } from './shapes'

type Look = { w: number; h: number; wall: string; roof?: string; towers?: number; spire?: number; chimney?: boolean }
const LOOKS: Partial<Record<BuildingId, Look>> = {
  road: { w: 1, h: 0.05, wall: '#b99b6a' },
  cottage: { w: 0.9, h: 0.5, wall: '#b79e78', roof: '#8a4b32', chimney: true },
  warehouse: { w: 1, h: 0.6, wall: '#9c7a52', roof: '#5b4636' },
  fishery: { w: 1, h: 0.5, wall: '#7f9aa8', roof: '#4a5f7a' },
  pasture: { w: 1, h: 0.4, wall: '#b6a06c', roof: '#7a6a45' },
  lodge: { w: 1, h: 0.5, wall: '#8a6a45', roof: '#5a3f2a', chimney: true },
  bakery: { w: 1, h: 0.6, wall: '#c9a273', roof: '#8c4b32', chimney: true },
  carpentry: { w: 1, h: 0.6, wall: '#a07a4f', roof: '#5f4a3a' },
  farm: { w: 1, h: 0.35, wall: '#c9a35b', roof: '#8a6a3a' },
  ramparts: { w: 0.9, h: 1.7, wall: '#a9a499', roof: '#7b3f3a' },
  keep: { w: 2, h: 1.4, wall: '#a8a39a', roof: '#7b3f3a', towers: 4 },
  cathedral: { w: 2, h: 1.2, wall: '#e3dccb', roof: '#4a5f7a', spire: 3.2 },
  tavern: { w: 1, h: 0.7, wall: '#a8744a', roof: '#6d3f33', chimney: true },
  market: { w: 1, h: 0.4, wall: '#d8c28a', roof: '#b4503f' },
  hall: { w: 2, h: 1.1, wall: '#c2b79a', roof: '#6b4a3a', towers: 2 },
}

function geometryOf(mesh: Mesh3): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(mesh.uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(mesh.colors, 3))
  geometry.setIndex(mesh.indices)
  return geometry
}

/**
 * Bâtiment procédural : volumes à arêtes chanfreinées fusionnés en un seul maillage (couleur de sommet variable
 * par volume), toit, tours et accessoires à part. Aucun fichier externe : tout est généré à partir de `seed`.
 */
export function proceduralModel(kind: BuildingId, seed = 1): THREE.Group {
  const look = LOOKS[kind] ?? LOOKS.farm!
  const random = seededRandom(seed * 7919 + kind.length * 104729)
  const group = new THREE.Group()
  const volumes: Mesh3[] = []
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string, bevel = 0.03): void => {
    volumes.push(tintMesh(placeMesh(bevelBox(w, h, d, bevel), x, y + h / 2, z), hexToRgb(color), 0.06, random))
  }
  const paint = (color: string) => applySurface(new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), 'wall')
  if (kind === 'quarry') {
    box(1, 0.22, 0.9, 0, 0, 0, '#9a978f')
    box(0.7, 0.3, 0.6, -0.12, 0.22, 0.05, '#8d8a82')
    box(0.4, 0.26, 0.4, 0.08, 0.52, 0, '#a3a097')
    box(0.3, 0.18, 0.26, 0.34, 0, 0.36, '#8d8a82')
    box(0.22, 0.14, 0.2, -0.38, 0, -0.34, '#a3a097')
  } else if (kind === 'sawmill') {
    box(1.05, 0.06, 0.8, 0, 0, 0, '#7d6a4f')
    for (const [px, pz] of [[-0.45, -0.32], [0.45, -0.32], [-0.45, 0.32], [0.45, 0.32]]) box(0.07, 0.4, 0.07, px, 0.06, pz, '#6b5237', 0.01)
    box(0.5, 0.06, 0.2, 0.15, 0.06, 0, '#a07a4f', 0.01)
    box(1.15, 0.05, 0.9, 0, 0.46, 0, '#5b4636', 0.015)
    const logs = paint('#8a6a45')
    for (let i = 0; i < 3; i += 1) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), logs)
      log.rotation.z = Math.PI / 2
      log.position.set(-0.3, 0.1 + (i % 2) * 0.1, 0.3 - (i >> 1) * 0.1)
      group.add(log)
    }
  } else {
    box(look.w, look.h, look.w, 0, 0, 0, look.wall, kind === 'road' ? 0.01 : 0.03)
    if (look.chimney) box(0.12, 0.3, 0.12, look.w * 0.28, look.h, -look.w * 0.18, '#8d8a82', 0.01)
  }
  const walls = new THREE.Mesh(geometryOf(mergeMeshes(volumes)), applySurface(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, vertexColors: true }), 'wall'))
  group.add(walls)
  if (look.roof && !look.towers && kind !== 'sawmill' && kind !== 'quarry') {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(look.w * 0.78, look.w * 0.5, 4), paint(look.roof))
    roof.position.y = look.h + look.w * 0.25
    roof.rotation.y = Math.PI / 4
    group.add(roof)
  }
  for (let i = 0; i < (look.towers ?? 0); i += 1) {
    const angle = (i / look.towers!) * Math.PI * 2 + Math.PI / 4
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, look.h + 0.7, 10), paint(look.wall))
    tower.position.set(Math.cos(angle) * look.w * 0.5, (look.h + 0.7) / 2, Math.sin(angle) * look.w * 0.5)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 10), paint(look.roof ?? '#7b3f3a'))
    cap.position.set(tower.position.x, look.h + 0.95, tower.position.z)
    group.add(tower, cap)
  }
  if (look.spire) {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.34, look.spire, 8), paint(look.roof ?? '#4a5f7a'))
    spire.position.set(0, look.h + look.spire / 2, 0)
    group.add(spire)
  }
  return group
}
