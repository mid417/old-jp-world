import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  DETAIL_DISTRICT_RADIUS,
  MACHIYA_BUILDINGS,
  OUTSKIRT_BUILDINGS,
  STREET_LANTERNS,
} from '../src/constants.ts'

// ── Constants ──────────────────────────────────────────────────────

test('DETAIL_DISTRICT_RADIUS defines the full-detail zone boundary', () => {
  assert.equal(DETAIL_DISTRICT_RADIUS, 24)
  assert.ok(DETAIL_DISTRICT_RADIUS > 0)
})

// ── Source-level structure checks ──────────────────────────────────

test('useLodLevel hook exports the correct API', () => {
  const hookSource = fs.readFileSync(
    new URL('../src/hooks/useLodLevel.ts', import.meta.url),
    'utf8',
  )
  assert.match(hookSource, /export function useLodLevel\(/)
  assert.match(hookSource, /export function useDistanceVisible\(/)
  assert.match(hookSource, /export type LodLevel/)
  assert.match(hookSource, /useFrame\(/)
  assert.match(hookSource, /useState/)
  assert.match(hookSource, /useRef/)
  // Hysteresis to prevent flickering
  assert.match(hookSource, /HYSTERESIS/)
})

test('MachiyaBlock has three LOD tiers driven by useLodLevel', () => {
  const districtSource = fs.readFileSync(
    new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url),
    'utf8',
  )
  // LOD hook usage: full detail within DETAIL_DISTRICT_RADIUS, simplified beyond
  assert.match(districtSource, /useLodLevel\(position, DETAIL_DISTRICT_RADIUS \* 3, DETAIL_DISTRICT_RADIUS \* 6\)/)
  // Far LOD branch
  assert.match(districtSource, /lodLevel === 'far'/)
  // Mid LOD branch
  assert.match(districtSource, /lodLevel === 'mid'/)
  // Near LOD keeps colliders
  assert.match(districtSource, /CuboidCollider/)
  assert.match(districtSource, /RigidBody/)
})

test('far LOD MachiyaBlock renders simplified geometry without colliders', () => {
  const districtSource = fs.readFileSync(
    new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url),
    'utf8',
  )
  // Far LOD section uses RoofSlope directly (no MachiyaRoof)
  const farLodMatch = districtSource.match(/lodLevel === 'far'[\s\S]*?lodLevel === 'mid'/)
  assert.ok(farLodMatch, 'Far LOD section exists')
  const farSection = farLodMatch[0]
  // Should have simple body box + roof slopes
  assert.match(farSection, /RoofSlope/)
  // Should NOT have CuboidCollider or RigidBody
  assert.doesNotMatch(farSection, /CuboidCollider/)
  assert.doesNotMatch(farSection, /RigidBody/)
})

test('mid LOD MachiyaBlock renders body with roof but skips colliders and fine details', () => {
  const districtSource = fs.readFileSync(
    new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url),
    'utf8',
  )
  // Mid LOD section between 'mid' and near
  const midLodMatch = districtSource.match(/lodLevel === 'mid'[\s\S]*?Near LOD/)
  assert.ok(midLodMatch, 'Mid LOD section exists')
  const midSection = midLodMatch[0]
  // Should have MachiyaRoof
  assert.match(midSection, /MachiyaRoof/)
  // Should NOT have slats, canopy, screen details or colliders
  assert.doesNotMatch(midSection, /CuboidCollider/)
  assert.doesNotMatch(midSection, /canopyDepth/)
  assert.doesNotMatch(midSection, /facadeSlatX/)
})

test('NearDistrictGroundDetails uses per-building distance visibility', () => {
  const districtSource = fs.readFileSync(
    new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url),
    'utf8',
  )
  assert.match(districtSource, /function BuildingGroundDetail/)
  assert.match(districtSource, /useDistanceVisible\(building\.position, DETAIL_DISTRICT_RADIUS\)/)
})

test('ChunkManager groups items into frustum-culled chunks', () => {
  const chunkSource = fs.readFileSync(
    new URL('../src/components/ChunkManager.tsx', import.meta.url),
    'utf8',
  )
  assert.match(chunkSource, /export function ChunkManager/)
  assert.match(chunkSource, /Frustum/)
  assert.match(chunkSource, /intersectsSphere/)
  assert.match(chunkSource, /useFrame/)
  assert.match(chunkSource, /visible/)
})

test('ChunkManager assigns React keys to chunk children via cloneElement', () => {
  const chunkSource = fs.readFileSync(
    new URL('../src/components/ChunkManager.tsx', import.meta.url),
    'utf8',
  )
  assert.match(chunkSource, /cloneElement/, 'cloneElement is used to propagate keys')
  assert.match(chunkSource, /isValidElement/, 'isValidElement guards cloneElement usage')
  assert.match(chunkSource, /key:\s*item\.key/, 'item.key is passed as the React key')
})

test('KyotoNightDistrict uses ChunkManager for spatial culling', () => {
  const districtSource = fs.readFileSync(
    new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url),
    'utf8',
  )
  assert.match(districtSource, /<ChunkManager items=\{chunkItems\} \/>/)
})

test('InstancedLanterns replaces individual LanternPost components', () => {
  const lanternSource = fs.readFileSync(
    new URL('../src/components/InstancedLanterns.tsx', import.meta.url),
    'utf8',
  )
  assert.match(lanternSource, /export function InstancedLanterns/)
  assert.match(lanternSource, /instancedMesh/)
  assert.match(lanternSource, /Object3D/)
  assert.match(lanternSource, /setMatrixAt/)
  assert.match(lanternSource, /computeBoundingBox/)
  assert.match(lanternSource, /computeBoundingSphere/)
  // Distance-based pointLight
  assert.match(lanternSource, /useDistanceVisible/)
  assert.match(lanternSource, /pointLight/)

  const districtSource = fs.readFileSync(
    new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url),
    'utf8',
  )
  assert.match(districtSource, /<InstancedLanterns \/>/)
  // LanternPost no longer exists in the main district file
  assert.doesNotMatch(districtSource, /const LanternPost = memo/)
})

test('InstancedOutskirtBuildings replaces individual OutskirtBuilding components', () => {
  const outskirtSource = fs.readFileSync(
    new URL('../src/components/InstancedOutskirtBuildings.tsx', import.meta.url),
    'utf8',
  )
  assert.match(outskirtSource, /export function InstancedOutskirtBuildings/)
  assert.match(outskirtSource, /instancedMesh/)
  assert.match(outskirtSource, /Object3D/)
  assert.match(outskirtSource, /setMatrixAt/)
  assert.match(outskirtSource, /updateMatrixWorld/)
  assert.match(outskirtSource, /computeBoundingBox/)
  assert.match(outskirtSource, /computeBoundingSphere/)
  // Must instance wall meshes
  assert.match(outskirtSource, /plasterMat/)
  assert.match(outskirtSource, /roofMat/)

  const districtSource = fs.readFileSync(
    new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url),
    'utf8',
  )
  assert.match(districtSource, /<InstancedOutskirtBuildings \/>/)
  assert.doesNotMatch(districtSource, /const OutskirtBuilding = memo/)
})

// ── Data integrity ─────────────────────────────────────────────────

test('instanced lanterns cover all STREET_LANTERNS entries', () => {
  const lanternSource = fs.readFileSync(
    new URL('../src/components/InstancedLanterns.tsx', import.meta.url),
    'utf8',
  )
  assert.match(lanternSource, /STREET_LANTERNS\.length/)
  assert.ok(STREET_LANTERNS.length >= 8)
})

test('instanced outskirt buildings cover all OUTSKIRT_BUILDINGS entries', () => {
  const outskirtSource = fs.readFileSync(
    new URL('../src/components/InstancedOutskirtBuildings.tsx', import.meta.url),
    'utf8',
  )
  assert.match(outskirtSource, /OUTSKIRT_BUILDINGS\.length/)
  assert.ok(OUTSKIRT_BUILDINGS.length >= 40)
})

test('instanced lantern emissive intensity is higher than original for far-distance visibility', () => {
  const lanternSource = fs.readFileSync(
    new URL('../src/components/InstancedLanterns.tsx', import.meta.url),
    'utf8',
  )
  // Original was 1.7, instanced should be higher
  const match = lanternSource.match(/emissiveIntensity:\s*([\d.]+)/)
  assert.ok(match)
  const intensity = parseFloat(match[1])
  assert.ok(intensity > 1.7, `emissiveIntensity ${intensity} should be > 1.7`)
})
