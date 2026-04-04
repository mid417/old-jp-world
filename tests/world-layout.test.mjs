import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  BASE_WORLD_SIZE,
  CITY_AREA_MULTIPLIER,
  COLORS,
  DETAIL_DISTRICT_RADIUS,
  GATE_POSITION,
  GIANT_GATE_POSITION,
  GIANT_GATE_SCALE,
  MACHIYA_BUILDINGS,
  MACHIYA_ROOF_PROFILES,
  OUTSKIRT_BUILDINGS,
  PAGODA_POSITION,
  STREET_LANTERNS,
  WORLD_CONFIG,
  WORLD_DIMENSION_MULTIPLIER,
  getMachiyaColliderSections,
  getOutskirtBodyMetrics,
  getOutskirtRoofGeometry,
  getMachiyaBodyMetrics,
  getMachiyaRoofGeometry,
} from '../src/constants.ts'

test('spawn point sits inside the main street corridor', () => {
  assert.ok(Math.abs(WORLD_CONFIG.spawnPosition[0]) < WORLD_CONFIG.streetWidth / 2 - 1)
  assert.ok(WORLD_CONFIG.spawnPosition[2] <= WORLD_CONFIG.streetLength / 2)
  assert.ok(WORLD_CONFIG.spawnPosition[2] >= -WORLD_CONFIG.streetLength / 2)
})

test('machiya rows leave the central street walkable on both sides', () => {
  assert.ok(MACHIYA_BUILDINGS.length >= 24)

  const facings = new Set(MACHIYA_BUILDINGS.map((building) => building.facing))
  assert.deepEqual([...facings].sort(), [-1, 1])

  for (const building of MACHIYA_BUILDINGS) {
    const closestFacade = Math.abs(building.position[0]) - building.width / 2
    assert.ok(closestFacade > WORLD_CONFIG.streetWidth / 2 + 0.8)
  }

  const machiyaZPositions = MACHIYA_BUILDINGS.map((building) => building.position[2])
  assert.ok(Math.max(...machiyaZPositions) > WORLD_CONFIG.streetLength * 0.4)
  assert.ok(Math.min(...machiyaZPositions) < -WORLD_CONFIG.streetLength * 0.4)
  assert.ok(Math.max(...machiyaZPositions) - Math.min(...machiyaZPositions) >= WORLD_CONFIG.streetLength * 0.8)
})

test('machiya density near the spawn restores the original positive-z street rhythm', () => {
  const spawnZ = WORLD_CONFIG.spawnPosition[2]
  const spawnSideBuildings = MACHIYA_BUILDINGS.filter((building) => building.position[2] > 0)
  const eastSpawnSide = spawnSideBuildings
    .filter((building) => building.facing === -1)
    .map((building) => building.position[2])
    .sort((a, b) => b - a)
  const westSpawnSide = spawnSideBuildings
    .filter((building) => building.facing === 1)
    .map((building) => building.position[2])
    .sort((a, b) => b - a)

  assert.ok(eastSpawnSide.filter((z) => spawnZ - z <= 32).length >= 3)
  assert.ok(westSpawnSide.filter((z) => spawnZ - z <= 32).length >= 3)
  assert.ok(spawnZ - eastSpawnSide[0] <= 12)
  assert.ok(spawnZ - westSpawnSide[0] <= 12)

  const eastLeadingGap = eastSpawnSide[0] - eastSpawnSide[1]
  const westLeadingGap = westSpawnSide[0] - westSpawnSide[1]
  assert.ok(eastLeadingGap >= 8 && eastLeadingGap <= 14)
  assert.ok(westLeadingGap >= 8 && westLeadingGap <= 14)
})

test('machiya frontages vary with signs, canopies, alleys, and empty lots', () => {
  const signStyles = new Set(MACHIYA_BUILDINGS.map((building) => building.signStyle))
  const alleyCount = MACHIYA_BUILDINGS.filter((building) => building.alleyWidth > 0).length
  const lotKinds = new Set(MACHIYA_BUILDINGS.map((building) => building.lotKind))

  assert.deepEqual([...signStyles].sort(), ['board', 'none', 'vertical'])
  assert.ok(MACHIYA_BUILDINGS.some((building) => building.canopyDepth >= 1))
  assert.ok(MACHIYA_BUILDINGS.some((building) => building.canopyDepth < 0.8))
  assert.ok(alleyCount >= 3)
  assert.deepEqual([...lotKinds].sort(), ['garden', 'gravel', 'none'])
})

test('world width and depth triple from the expanded baseline while keeping low-detail outskirts outside the main district', () => {
  const expandedBaselineSize = Math.ceil(BASE_WORLD_SIZE * Math.sqrt(CITY_AREA_MULTIPLIER))

  assert.equal(WORLD_CONFIG.size, expandedBaselineSize * WORLD_DIMENSION_MULTIPLIER)
  assert.ok(WORLD_CONFIG.size * WORLD_CONFIG.size >= BASE_WORLD_SIZE * BASE_WORLD_SIZE * CITY_AREA_MULTIPLIER * 9)
  assert.ok(OUTSKIRT_BUILDINGS.length >= 40)

  for (const building of OUTSKIRT_BUILDINGS) {
    assert.ok(Math.abs(building.position[0]) >= DETAIL_DISTRICT_RADIUS || Math.abs(building.position[2]) >= DETAIL_DISTRICT_RADIUS)
  }

  const farthestOutskirtDistance = Math.max(
    ...OUTSKIRT_BUILDINGS.map((building) => Math.max(Math.abs(building.position[0]), Math.abs(building.position[2]))),
  )
  assert.ok(farthestOutskirtDistance > WORLD_CONFIG.size * 0.3)
})

test('machiya rows are distributed across the expanded street without leaving large empty bands', () => {
  const machiyaZPositions = [...new Set(MACHIYA_BUILDINGS.map((building) => Math.round(building.position[2])))]
    .sort((a, b) => b - a)

  const gaps = machiyaZPositions.slice(0, -1).map((z, index) => z - machiyaZPositions[index + 1])
  const largestGap = Math.max(...gaps)

  assert.ok(machiyaZPositions[0] >= WORLD_CONFIG.streetLength * 0.4)
  assert.ok(machiyaZPositions[machiyaZPositions.length - 1] <= -WORLD_CONFIG.streetLength * 0.4)
  assert.ok(largestGap <= WORLD_CONFIG.streetLength * 0.12)
})

test('night lighting and landmark anchors exist across the district', () => {
  assert.ok(STREET_LANTERNS.length >= 8)
  assert.ok(GATE_POSITION[2] > WORLD_CONFIG.streetLength * 0.3)
  assert.ok(GIANT_GATE_POSITION[2] < WORLD_CONFIG.spawnPosition[2])
  assert.ok(GIANT_GATE_POSITION[2] < GATE_POSITION[2])
  assert.ok(Math.abs(GIANT_GATE_POSITION[2] + WORLD_CONFIG.streetLength / 2) <= 6)
  assert.equal(GIANT_GATE_SCALE, 4.2)
  assert.ok(PAGODA_POSITION[0] < 0)
  assert.ok(PAGODA_POSITION[2] < -WORLD_CONFIG.streetLength * 0.3)

  const lanternZPositions = STREET_LANTERNS.map((lantern) => lantern.position[2])
  assert.ok(Math.max(...lanternZPositions) > WORLD_CONFIG.streetLength * 0.25)
  assert.ok(Math.min(...lanternZPositions) < -WORLD_CONFIG.streetLength * 0.25)
})

test('giant torii marks the negative-z street end at double the previous giant scale', () => {
  const previousGiantGateScale = 2.1
  const previousPillarThickness = 0.7 * previousGiantGateScale
  const streetHalfLength = WORLD_CONFIG.streetLength / 2
  const streetHalfWidth = WORLD_CONFIG.streetWidth / 2
  const giantGatePillarOffset = 3.35 * GIANT_GATE_SCALE
  const giantGatePillarThickness = 0.7 * GIANT_GATE_SCALE

  assert.equal(GIANT_GATE_POSITION[0], 0)
  assert.ok(GIANT_GATE_POSITION[2] <= -streetHalfLength)
  assert.ok(GIANT_GATE_POSITION[2] >= -streetHalfLength - 6)
  assert.ok(GIANT_GATE_POSITION[2] < 0)
  assert.ok(GIANT_GATE_POSITION[2] < GATE_POSITION[2])
  assert.ok(giantGatePillarOffset > streetHalfWidth)
  assert.equal(GIANT_GATE_SCALE, previousGiantGateScale * 2)
  assert.equal(giantGatePillarThickness, previousPillarThickness * 2)
})

test('giant torii uses a more shrine-like layered structure without changing the regular gate baseline', () => {
  const districtSource = fs.readFileSync(new URL('../src/components/KyotoNightDistrict.tsx', import.meta.url), 'utf8')

  assert.match(districtSource, /<TempleGate position=\{GATE_POSITION\} \/>/)
  assert.match(
    districtSource,
    /<TempleGate position=\{GIANT_GATE_POSITION\} scale=\{GIANT_GATE_SCALE\} variant="grand" \/>/,
  )
  assert.match(districtSource, /variant\?: 'standard' \| 'grand'/)
  assert.match(districtSource, /const isGrand = variant === 'grand'/)
  assert.match(districtSource, /const shimakiPosition/)
  assert.match(districtSource, /const kasagiPosition/)
  assert.match(districtSource, /const gakuzukaPosition/)
  assert.match(districtSource, /const supplementalNukiPosition/)
  assert.match(districtSource, /<cylinderGeometry args=\{\[pillarTopRadius, pillarBottomRadius, pillarHeight, 16\]\} \/>/)
})

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '')
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

test('night palette keeps the street readable while preserving sky depth', () => {
  assert.ok(luminance(COLORS.ground.street) > luminance(COLORS.ground.base))
  assert.ok(luminance(COLORS.ground.curb) > luminance(COLORS.ground.street))
  assert.ok(luminance(COLORS.sky.top) < luminance(COLORS.sky.horizon))
  assert.ok(luminance(COLORS.machiya.roof) < luminance(COLORS.machiya.plaster))
})

test('machiya roof geometry seats on the wall trim and keeps the eaves attached', () => {
  assert.ok(MACHIYA_ROOF_PROFILES[1].ridgeHeight > MACHIYA_ROOF_PROFILES[1].eaveThickness)
  assert.ok(MACHIYA_ROOF_PROFILES[2].ridgeHeight > MACHIYA_ROOF_PROFILES[2].eaveThickness)
  assert.ok(MACHIYA_ROOF_PROFILES[2].mainPitch > MACHIYA_ROOF_PROFILES[1].mainPitch)
  assert.ok(MACHIYA_ROOF_PROFILES[2].depthOverhang > MACHIYA_ROOF_PROFILES[1].depthOverhang)

  for (const building of MACHIYA_BUILDINGS) {
    const bodyMetrics = getMachiyaBodyMetrics(building)
    const roofGeometry = getMachiyaRoofGeometry(building)
    const roofProfile = MACHIYA_ROOF_PROFILES[building.stories]
    const colliderSections = getMachiyaColliderSections(building)
    const bodyColliders = colliderSections.filter((section) => section.kind === 'body')
    const mainRoofColliders = colliderSections.filter((section) => section.kind === 'roof-main')
    const eaveColliders = colliderSections.filter((section) => section.kind === 'roof-eave')
    const ridgeColliders = colliderSections.filter((section) => section.kind === 'roof-ridge')

    assert.equal(Number((roofGeometry.roofSeatY - bodyMetrics.wallTopY).toFixed(2)), 0.15)
    assert.ok(roofGeometry.mainAnchorHalfWidth < roofGeometry.roofSeatHalfWidth)
    assert.ok(roofGeometry.eaveJoinY > roofGeometry.roofSeatY)
    assert.ok(roofGeometry.eaveOuterY < roofGeometry.eaveJoinY)
    assert.ok(roofGeometry.ridgeBaseY > roofGeometry.eaveJoinY)
    assert.equal(bodyColliders.length, 2)
    assert.equal(mainRoofColliders.length, 2)
    assert.equal(eaveColliders.length, 2)
    assert.equal(ridgeColliders.length, 1)
    assert.ok(
      bodyColliders.every(
        (section) => section.position[1] + section.halfExtents[1] <= roofGeometry.roofSeatY + 0.001,
      ),
    )
    assert.ok(mainRoofColliders.every((section) => Math.abs(section.rotation[2]) === roofProfile.mainPitch))
    assert.ok(eaveColliders.every((section) => Math.abs(section.rotation[2]) === roofProfile.eavePitch))
    assert.ok(mainRoofColliders.every((section) => section.position[1] > roofGeometry.roofSeatY))
    assert.ok(eaveColliders.every((section) => section.position[1] < roofGeometry.eaveJoinY))
    assert.ok(ridgeColliders[0].position[1] > roofGeometry.ridgeBaseY)
  }
})

test('outskirt roofs stay seated on simplified walls while the skyline remains staggered', () => {
  const stories = new Set()
  const sideRows = OUTSKIRT_BUILDINGS.filter(
    (building) =>
      Math.abs(building.position[0]) >= DETAIL_DISTRICT_RADIUS &&
      Math.abs(building.position[2]) <= WORLD_CONFIG.streetLength * 0.6,
  )
  const crossRows = OUTSKIRT_BUILDINGS.filter((building) => Math.abs(building.position[2]) >= DETAIL_DISTRICT_RADIUS)

  for (const building of OUTSKIRT_BUILDINGS) {
    const bodyMetrics = getOutskirtBodyMetrics(building)
    const roofGeometry = getOutskirtRoofGeometry(building)

    stories.add(building.stories)
    assert.ok(roofGeometry.roofSeatY > bodyMetrics.wallTopY)
    assert.ok(Number((roofGeometry.roofSeatY - bodyMetrics.wallTopY).toFixed(2)) <= 0.08)
    assert.ok(roofGeometry.ridgeBaseY > roofGeometry.roofSeatY)
    assert.ok(roofGeometry.mainSpan > 0.4)
    assert.ok(roofGeometry.roofSeatHalfWidth > roofGeometry.ridgeWidth / 2)
  }

  assert.deepEqual([...stories].sort(), [1, 2])
  assert.ok(sideRows.some((building) => Math.abs(building.position[0]) > DETAIL_DISTRICT_RADIUS + 5))
  assert.ok(sideRows.some((building) => Math.abs(building.position[2]) > WORLD_CONFIG.streetLength * 0.25))
  assert.ok(crossRows.some((building) => Math.abs(building.position[0]) > WORLD_CONFIG.streetWidth * 4))
  assert.ok(crossRows.some((building) => Math.abs(building.position[2]) > WORLD_CONFIG.streetLength * 0.8))
  assert.ok(
    OUTSKIRT_BUILDINGS.some(
      (building) => Math.abs(Math.sin(building.rotationY)) > 0.06 && Math.abs(Math.cos(building.rotationY)) > 0.06,
    ),
  )
})

test('world fog is declared outside the world transform group so it attaches to the scene', () => {
  const worldSource = fs.readFileSync(new URL('../src/World.tsx', import.meta.url), 'utf8')

  assert.match(worldSource, /<fog attach="fog" args=\{\[COLORS\.sky\.fog, 52, 150\]\} \/>/)
  assert.doesNotMatch(worldSource, /<group position=\{position\} scale=\{scale\}>[\s\S]*<fog attach="fog"/)
})

test('night skybox updates shader time without relying on react-three-fiber hooks', () => {
  const nightSkyboxSource = fs.readFileSync(new URL('../src/components/NightSkybox.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(nightSkyboxSource, /@react-three\/fiber/)
  assert.doesNotMatch(nightSkyboxSource, /useFrame\(/)
  assert.match(nightSkyboxSource, /onBeforeRender=/)
})
