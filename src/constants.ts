export type Vector3Tuple = [number, number, number]

export interface MachiyaConfig {
  name: string
  position: Vector3Tuple
  width: number
  height: number
  depth: number
  facing: -1 | 1
  stories: 1 | 2
  signStyle: 'none' | 'board' | 'vertical'
  canopyDepth: number
  alleyWidth: number
  lotKind: 'none' | 'gravel' | 'garden'
  lotWidth: number
  lotDepth: number
  lotOffsetZ: number
}

export interface LanternConfig {
  name: string
  position: Vector3Tuple
  height: number
  intensity: number
}

export interface OutskirtBuildingConfig {
  name: string
  position: Vector3Tuple
  width: number
  height: number
  depth: number
  rotationY: number
  stories: 1 | 2
}

export interface MachiyaRoofProfile {
  mainInset: number
  mainPitch: number
  mainThickness: number
  eaveLength: number
  eavePitch: number
  eaveThickness: number
  eaveDepthOverhang: number
  depthOverhang: number
  ridgeWidth: number
  ridgeHeight: number
}

export interface MachiyaBodyMetrics {
  lowerFloorHeight: number
  upperFloorHeight: number
  upperWidth: number
  upperDepth: number
  wallTopY: number
  roofSeatY: number
  roofSeatWidth: number
  roofSeatDepth: number
}

export interface MachiyaRoofGeometry {
  roofSeatY: number
  roofDepth: number
  eaveDepth: number
  mainAnchorHalfWidth: number
  roofSeatHalfWidth: number
  mainSpan: number
  eaveSpan: number
  eaveJoinY: number
  eaveOuterY: number
  ridgeBaseY: number
}

export interface MachiyaColliderSection {
  kind: 'body' | 'roof-main' | 'roof-eave' | 'roof-ridge'
  halfExtents: Vector3Tuple
  position: Vector3Tuple
  rotation: Vector3Tuple
}

export interface OutskirtBodyMetrics {
  lowerHeight: number
  upperHeight: number
  upperWidth: number
  upperDepth: number
  wallTopY: number
  roofSeatY: number
  roofSeatWidth: number
  roofSeatDepth: number
  windowBandY: number
}

export interface OutskirtRoofGeometry {
  roofSeatY: number
  roofDepth: number
  roofSeatHalfWidth: number
  mainSpan: number
  ridgeBaseY: number
  pitch: number
  thickness: number
  ridgeWidth: number
  ridgeHeight: number
}

const vector3 = (x: number, y: number, z: number): Vector3Tuple => [x, y, z]

export const BASE_WORLD_SIZE = 72
export const CITY_AREA_MULTIPLIER = 5
export const WORLD_DIMENSION_MULTIPLIER = 3
// Keep the high-detail district tight around the playable core street.
// This radius also drives chunk sizing and per-building near-detail visibility.
const DETAIL_DISTRICT_BASE_RADIUS = 8
export const DETAIL_DISTRICT_RADIUS = DETAIL_DISTRICT_BASE_RADIUS * WORLD_DIMENSION_MULTIPLIER
const EXPANDED_WORLD_SIZE = Math.ceil(BASE_WORLD_SIZE * Math.sqrt(CITY_AREA_MULTIPLIER)) * WORLD_DIMENSION_MULTIPLIER

export const WORLD_CONFIG = {
  size: EXPANDED_WORLD_SIZE,
  streetWidth: 9.4,
  streetLength: 62 * WORLD_DIMENSION_MULTIPLIER,
  sidewalkWidth: 2.2,
  spawnPosition: vector3(0, 0.05, 29 * WORLD_DIMENSION_MULTIPLIER),
  spawnYaw: 0,
  westLanePosition: vector3(-13.2, 0.03, -16 * WORLD_DIMENSION_MULTIPLIER),
  westLaneSize: vector3(23.6, 0.06, 7.2),
  eastLanePosition: vector3(14.8, 0.03, 8 * WORLD_DIMENSION_MULTIPLIER),
  eastLaneSize: vector3(15.4, 0.06, 5.8),
  pagodaCourtPosition: vector3(-18.2 * WORLD_DIMENSION_MULTIPLIER, 0.03, -24 * WORLD_DIMENSION_MULTIPLIER),
  pagodaCourtSize: vector3(12.4, 0.06, 12.4),
} as const

export const GATE_POSITION = vector3(0, 0, 22 * WORLD_DIMENSION_MULTIPLIER)
export const GIANT_GATE_POSITION = vector3(0, 0, -WORLD_CONFIG.streetLength / 2 - 4.5)
export const GIANT_GATE_SCALE = 4.2
export const PAGODA_POSITION = vector3(-18.2 * WORLD_DIMENSION_MULTIPLIER, 0, -24 * WORLD_DIMENSION_MULTIPLIER)

export const COLORS = {
  sky: {
    top: '#0e1a43',
    middle: '#1b2756',
    horizon: '#4a3458',
    glow: '#8c6ba9',
    nebula: '#5f4a91',
    fog: '#211526',
  },
  lighting: {
    ambient: '#988fd1',
    moon: '#b8c8ff',
    groundBounce: '#2a1d31',
    warm: '#ffd08a',
  },
  ground: {
    base: '#181118',
    street: '#45383e',
    stone: '#66564f',
    curb: '#73645b',
    drain: '#2f2830',
  },
  machiya: {
    plaster: '#ccb7a3',
    wood: '#5a372d',
    roof: '#313746',
    trim: '#2d1b19',
    lattice: '#734b3a',
    screen: '#dcc79a',
  },
  lantern: {
    paper: '#ffd9a5',
    glow: '#ffb768',
  },
  shrine: {
    vermilion: '#8b3022',
    beam: '#281717',
  },
  pagoda: {
    wood: '#3f2824',
    roof: '#272b37',
    finial: '#a78648',
  },
  foliage: '#152117',
  stone: '#6a5e54',
} as const

export const MACHIYA_ROOF_PROFILES: Record<MachiyaConfig['stories'], MachiyaRoofProfile> = {
  1: {
    mainInset: 0.22,
    mainPitch: 0.48,
    mainThickness: 0.24,
    eaveLength: 0.72,
    eavePitch: 0.36,
    eaveThickness: 0.12,
    eaveDepthOverhang: 0.18,
    depthOverhang: 0.54,
    ridgeWidth: 0.24,
    ridgeHeight: 0.2,
  },
  2: {
    mainInset: 0.3,
    mainPitch: 0.54,
    mainThickness: 0.28,
    eaveLength: 0.88,
    eavePitch: 0.42,
    eaveThickness: 0.14,
    eaveDepthOverhang: 0.24,
    depthOverhang: 0.68,
    ridgeWidth: 0.28,
    ridgeHeight: 0.24,
  },
}

const TOP_TRIM_CENTER_OFFSET = 0.08
const TOP_TRIM_HEIGHT = 0.14
const ZERO_ROTATION = vector3(0, 0, 0)

function getRotatedOffset(x: number, y: number, rotationZ: number): Vector3Tuple {
  const cos = Math.cos(rotationZ)
  const sin = Math.sin(rotationZ)

  return vector3(x * cos - y * sin, x * sin + y * cos, 0)
}

function createRotatedMachiyaColliderSection({
  kind,
  anchorX,
  anchorY,
  centerOffsetX,
  centerOffsetY,
  span,
  thickness,
  depth,
  rotationZ,
}: {
  kind: MachiyaColliderSection['kind']
  anchorX: number
  anchorY: number
  centerOffsetX: number
  centerOffsetY: number
  span: number
  thickness: number
  depth: number
  rotationZ: number
}): MachiyaColliderSection {
  const [offsetX, offsetY] = getRotatedOffset(centerOffsetX, centerOffsetY, rotationZ)

  return {
    kind,
    halfExtents: vector3(span / 2, thickness / 2, depth / 2),
    position: vector3(anchorX + offsetX, anchorY + offsetY, 0),
    rotation: vector3(0, 0, rotationZ),
  }
}

export function getMachiyaBodyMetrics({
  stories,
  width,
  height,
  depth,
}: Pick<MachiyaConfig, 'stories' | 'width' | 'height' | 'depth'>): MachiyaBodyMetrics {
  const lowerFloorHeight = stories === 2 ? height * 0.56 : height * 0.72
  const upperFloorHeight = stories === 2 ? height - lowerFloorHeight : 0
  const upperWidth = stories === 2 ? width * 0.84 : width * 0.94
  const upperDepth = stories === 2 ? depth * 0.88 : depth * 0.88
  const wallTopY = stories === 2 ? height : lowerFloorHeight
  const roofSeatY = wallTopY + TOP_TRIM_CENTER_OFFSET + TOP_TRIM_HEIGHT / 2
  const roofSeatWidth = stories === 2 ? upperWidth + 0.32 : width + 0.42
  const roofSeatDepth = stories === 2 ? upperDepth + 0.3 : depth + 0.54

  return {
    lowerFloorHeight,
    upperFloorHeight,
    upperWidth,
    upperDepth,
    wallTopY,
    roofSeatY,
    roofSeatWidth,
    roofSeatDepth,
  }
}

export function getMachiyaRoofGeometry(
  building: Pick<MachiyaConfig, 'stories' | 'width' | 'height' | 'depth'>,
): MachiyaRoofGeometry {
  const bodyMetrics = getMachiyaBodyMetrics(building)
  const roofProfile = MACHIYA_ROOF_PROFILES[building.stories]
  const roofSeatHalfWidth = bodyMetrics.roofSeatWidth / 2
  const ridgeHalfWidth = roofProfile.ridgeWidth / 2
  const mainAnchorHalfWidth = Math.max(roofSeatHalfWidth - roofProfile.mainInset, ridgeHalfWidth + 0.36)
  const mainHorizontalRun = Math.max(mainAnchorHalfWidth - ridgeHalfWidth, 0.36)
  const mainSpan = mainHorizontalRun / Math.cos(roofProfile.mainPitch)
  const eaveSpan = roofProfile.eaveLength / Math.cos(roofProfile.eavePitch)
  const eaveJoinY = bodyMetrics.roofSeatY + roofProfile.mainThickness * 0.42
  const eaveOuterY = eaveJoinY - roofProfile.eaveLength * Math.tan(roofProfile.eavePitch)
  const ridgeBaseY =
    bodyMetrics.roofSeatY +
    mainHorizontalRun * Math.tan(roofProfile.mainPitch) +
    Math.cos(roofProfile.mainPitch) * roofProfile.mainThickness * 0.72

  return {
    roofSeatY: bodyMetrics.roofSeatY,
    roofDepth: bodyMetrics.roofSeatDepth + roofProfile.depthOverhang,
    eaveDepth: bodyMetrics.roofSeatDepth + roofProfile.depthOverhang + roofProfile.eaveDepthOverhang,
    mainAnchorHalfWidth,
    roofSeatHalfWidth,
    mainSpan,
    eaveSpan,
    eaveJoinY,
    eaveOuterY,
    ridgeBaseY,
  }
}

export function getMachiyaColliderSections(
  building: Pick<MachiyaConfig, 'stories' | 'width' | 'height' | 'depth'>,
): MachiyaColliderSection[] {
  const bodyMetrics = getMachiyaBodyMetrics(building)
  const roofGeometry = getMachiyaRoofGeometry(building)
  const roofProfile = MACHIYA_ROOF_PROFILES[building.stories]
  const sections: MachiyaColliderSection[] = [
    {
      kind: 'body',
      halfExtents: vector3(building.width / 2, bodyMetrics.lowerFloorHeight / 2, building.depth / 2),
      position: vector3(0, bodyMetrics.lowerFloorHeight / 2, 0),
      rotation: ZERO_ROTATION,
    },
  ]

  if (building.stories === 2) {
    sections.push({
      kind: 'body',
      halfExtents: vector3(bodyMetrics.upperWidth / 2, bodyMetrics.upperFloorHeight / 2, bodyMetrics.upperDepth / 2),
      position: vector3(0, bodyMetrics.lowerFloorHeight + bodyMetrics.upperFloorHeight / 2, 0),
      rotation: ZERO_ROTATION,
    })
  } else {
    sections.push({
      kind: 'body',
      halfExtents: vector3((building.width * 0.94) / 2, (building.height * 0.24) / 2, (building.depth * 0.88) / 2),
      position: vector3(0, building.height * 0.56, 0),
      rotation: ZERO_ROTATION,
    })
  }

  sections.push(
    createRotatedMachiyaColliderSection({
      kind: 'roof-main',
      anchorX: -roofGeometry.mainAnchorHalfWidth,
      anchorY: roofGeometry.roofSeatY,
      centerOffsetX: roofGeometry.mainSpan / 2,
      centerOffsetY: roofProfile.mainThickness / 2,
      span: roofGeometry.mainSpan,
      thickness: roofProfile.mainThickness,
      depth: roofGeometry.roofDepth,
      rotationZ: roofProfile.mainPitch,
    }),
    createRotatedMachiyaColliderSection({
      kind: 'roof-main',
      anchorX: roofGeometry.mainAnchorHalfWidth,
      anchorY: roofGeometry.roofSeatY,
      centerOffsetX: -roofGeometry.mainSpan / 2,
      centerOffsetY: roofProfile.mainThickness / 2,
      span: roofGeometry.mainSpan,
      thickness: roofProfile.mainThickness,
      depth: roofGeometry.roofDepth,
      rotationZ: -roofProfile.mainPitch,
    }),
    createRotatedMachiyaColliderSection({
      kind: 'roof-eave',
      anchorX: -roofGeometry.roofSeatHalfWidth,
      anchorY: roofGeometry.eaveJoinY,
      centerOffsetX: -roofGeometry.eaveSpan / 2,
      centerOffsetY: -roofProfile.eaveThickness / 2,
      span: roofGeometry.eaveSpan,
      thickness: roofProfile.eaveThickness,
      depth: roofGeometry.eaveDepth,
      rotationZ: roofProfile.eavePitch,
    }),
    createRotatedMachiyaColliderSection({
      kind: 'roof-eave',
      anchorX: roofGeometry.roofSeatHalfWidth,
      anchorY: roofGeometry.eaveJoinY,
      centerOffsetX: roofGeometry.eaveSpan / 2,
      centerOffsetY: -roofProfile.eaveThickness / 2,
      span: roofGeometry.eaveSpan,
      thickness: roofProfile.eaveThickness,
      depth: roofGeometry.eaveDepth,
      rotationZ: -roofProfile.eavePitch,
    }),
    {
      kind: 'roof-ridge',
      halfExtents: vector3(roofProfile.ridgeWidth / 2, roofProfile.ridgeHeight / 2, (roofGeometry.roofDepth + 0.12) / 2),
      position: vector3(0, roofGeometry.ridgeBaseY + roofProfile.ridgeHeight / 2, 0),
      rotation: ZERO_ROTATION,
    },
  )

  return sections
}

export function getOutskirtBodyMetrics(
  building: Pick<OutskirtBuildingConfig, 'stories' | 'width' | 'height' | 'depth'>,
): OutskirtBodyMetrics {
  const lowerHeight = building.stories === 2 ? building.height * 0.58 : building.height * 0.78
  const upperHeight = building.height - lowerHeight
  const upperWidth = building.width * 0.82
  const upperDepth = building.depth * 0.86
  const wallTopY = building.stories === 2 ? building.height : lowerHeight
  const roofSeatY = wallTopY + 0.08
  const roofSeatWidth = building.stories === 2 ? upperWidth + 0.28 : building.width + 0.34
  const roofSeatDepth = building.stories === 2 ? upperDepth + 0.34 : building.depth + 0.42
  const windowBandY = building.stories === 2 ? lowerHeight + upperHeight * 0.56 : lowerHeight * 0.72

  return {
    lowerHeight,
    upperHeight,
    upperWidth,
    upperDepth,
    wallTopY,
    roofSeatY,
    roofSeatWidth,
    roofSeatDepth,
    windowBandY,
  }
}

export function getOutskirtRoofGeometry(
  building: Pick<OutskirtBuildingConfig, 'stories' | 'width' | 'height' | 'depth'>,
): OutskirtRoofGeometry {
  const bodyMetrics = getOutskirtBodyMetrics(building)
  const pitch = building.stories === 2 ? 0.48 : 0.42
  const thickness = building.stories === 2 ? 0.16 : 0.14
  const ridgeWidth = building.stories === 2 ? 0.28 : 0.22
  const ridgeHeight = building.stories === 2 ? 0.2 : 0.16
  const roofSeatHalfWidth = bodyMetrics.roofSeatWidth / 2
  const ridgeHalfWidth = ridgeWidth / 2
  const horizontalRun = Math.max(roofSeatHalfWidth - ridgeHalfWidth, 0.42)
  const mainSpan = horizontalRun / Math.cos(pitch)
  const ridgeBaseY = bodyMetrics.roofSeatY + horizontalRun * Math.tan(pitch) + Math.cos(pitch) * thickness * 0.5

  return {
    roofSeatY: bodyMetrics.roofSeatY,
    roofDepth: bodyMetrics.roofSeatDepth + (building.stories === 2 ? 0.3 : 0.24),
    roofSeatHalfWidth,
    mainSpan,
    ridgeBaseY,
    pitch,
    thickness,
    ridgeWidth,
    ridgeHeight,
  }
}

const eastRowDepths = [7.2, 7.4, 7, 7.6, 7.3] as const
const eastRowHeights = [5.4, 5.1, 4.8, 5.2, 5.5] as const
const eastRowStories = [2, 2, 1, 2, 2] as const
const eastRowWidths = [6.4, 6.1, 5.8, 6.2, 6.3] as const
const westRowDepths = [7.4, 7.1, 7.5, 7.2, 7.4] as const
const westRowHeights = [5.2, 4.9, 5.4, 5.1, 5.6] as const
const westRowStories = [2, 1, 2, 2, 2] as const
const westRowWidths = [6.1, 5.7, 6.2, 5.9, 6] as const
const streetSlots = [78, 68, 58, 46, 34, 22, 10, -2, -16, -30, -46, -62, -78] as const
const westRowZOffsets = [0, -0.8, 0.5, -1.2, 0.6, -0.4, -1.1, 0.8, -0.6, 0.4, -0.9, 0.7, -0.3] as const
const eastRowDetails = [
  { signStyle: 'board' as const, canopyDepth: 1.16, alleyWidth: 0, lotKind: 'none' as const, lotWidth: 0, lotDepth: 0, lotOffsetZ: 0 },
  { signStyle: 'vertical' as const, canopyDepth: 0.94, alleyWidth: 1.08, lotKind: 'none' as const, lotWidth: 0, lotDepth: 0, lotOffsetZ: 0.4 },
  { signStyle: 'none' as const, canopyDepth: 0.72, alleyWidth: 0, lotKind: 'gravel' as const, lotWidth: 4.6, lotDepth: 5.4, lotOffsetZ: 0.7 },
  { signStyle: 'board' as const, canopyDepth: 1.04, alleyWidth: 0.92, lotKind: 'none' as const, lotWidth: 0, lotDepth: 0, lotOffsetZ: -0.5 },
  { signStyle: 'vertical' as const, canopyDepth: 0.78, alleyWidth: 0, lotKind: 'garden' as const, lotWidth: 4.8, lotDepth: 5.8, lotOffsetZ: -0.3 },
] as const
const westRowDetails = [
  { signStyle: 'vertical' as const, canopyDepth: 0.98, alleyWidth: 0, lotKind: 'none' as const, lotWidth: 0, lotDepth: 0, lotOffsetZ: 0 },
  { signStyle: 'none' as const, canopyDepth: 0.68, alleyWidth: 1.02, lotKind: 'none' as const, lotWidth: 0, lotDepth: 0, lotOffsetZ: -0.4 },
  { signStyle: 'board' as const, canopyDepth: 1.12, alleyWidth: 0, lotKind: 'garden' as const, lotWidth: 4.4, lotDepth: 5.2, lotOffsetZ: 0.5 },
  { signStyle: 'board' as const, canopyDepth: 0.88, alleyWidth: 1.18, lotKind: 'none' as const, lotWidth: 0, lotDepth: 0, lotOffsetZ: 0.2 },
  { signStyle: 'vertical' as const, canopyDepth: 1.08, alleyWidth: 0, lotKind: 'gravel' as const, lotWidth: 5.2, lotDepth: 6, lotOffsetZ: -0.6 },
] as const

function getCycledValue<T>(values: readonly T[], index: number): T {
  return values[index % values.length]
}

export const MACHIYA_BUILDINGS: MachiyaConfig[] = [
  ...streetSlots.map((z, index) => ({
    name: `east-machiya-${index + 1}`,
    position: vector3(12.3, 0, z),
    width: getCycledValue(eastRowWidths, index),
    height: getCycledValue(eastRowHeights, index),
    depth: getCycledValue(eastRowDepths, index),
    facing: -1 as const,
    stories: getCycledValue(eastRowStories, index),
    ...getCycledValue(eastRowDetails, index),
  })),
  ...streetSlots.map((z, index) => ({
    name: `west-machiya-${index + 1}`,
    position: vector3(-12.5, 0, z + westRowZOffsets[index]),
    width: getCycledValue(westRowWidths, index),
    height: getCycledValue(westRowHeights, index),
    depth: getCycledValue(westRowDepths, index),
    facing: 1 as const,
    stories: getCycledValue(westRowStories, index),
    ...getCycledValue(westRowDetails, index),
  })),
]

const outskirtSideZSlots = [42, 30, 18, 6, -6, -18, -30, -42].map((slot) => slot * WORLD_DIMENSION_MULTIPLIER)
const outskirtCrossXSlots = [-56, -38, -20, 20, 38, 56].map((slot) => slot * WORLD_DIMENSION_MULTIPLIER)
export const OUTSKIRT_SIDE_ROAD_POSITIONS = [-58, -36, 36, 58].map((slot) => slot * WORLD_DIMENSION_MULTIPLIER)
export const OUTSKIRT_CROSS_ROAD_POSITIONS = [-54, 54].map((slot) => slot * WORLD_DIMENSION_MULTIPLIER)
const outskirtSideProfiles = [
  { offsetX: 0.7, offsetZ: 1.2, width: 6.9, height: 5.1, depth: 7.1, rotationOffset: 0.1, stories: 2 as const },
  { offsetX: -1.1, offsetZ: -1.5, width: 5.7, height: 4.3, depth: 6.5, rotationOffset: -0.07, stories: 1 as const },
  { offsetX: 0.4, offsetZ: 0.8, width: 6.4, height: 4.8, depth: 7, rotationOffset: 0.04, stories: 2 as const },
  { offsetX: -1.3, offsetZ: -0.9, width: 5.9, height: 4.5, depth: 7.3, rotationOffset: -0.12, stories: 1 as const },
  { offsetX: 0.8, offsetZ: 1.7, width: 7.2, height: 5.3, depth: 6.8, rotationOffset: 0.08, stories: 2 as const },
  { offsetX: -0.5, offsetZ: -1.1, width: 6.1, height: 4.7, depth: 6.9, rotationOffset: -0.06, stories: 2 as const },
  { offsetX: 1.2, offsetZ: 1.1, width: 6.8, height: 5, depth: 7.4, rotationOffset: 0.11, stories: 1 as const },
  { offsetX: -0.9, offsetZ: -1.6, width: 5.8, height: 4.4, depth: 6.7, rotationOffset: -0.09, stories: 2 as const },
] as const
const outskirtCrossProfiles = [
  { offsetX: -1.8, offsetZ: 0.7, width: 6.6, height: 5, depth: 7.2, rotationOffset: 0.09, stories: 2 as const },
  { offsetX: 1.1, offsetZ: -1.2, width: 5.8, height: 4.35, depth: 6.6, rotationOffset: -0.05, stories: 1 as const },
  { offsetX: -0.6, offsetZ: 1.4, width: 6.3, height: 4.7, depth: 7, rotationOffset: 0.03, stories: 2 as const },
  { offsetX: 1.9, offsetZ: -0.8, width: 7, height: 5.15, depth: 6.9, rotationOffset: -0.11, stories: 1 as const },
  { offsetX: -1.2, offsetZ: 1, width: 6.1, height: 4.6, depth: 6.8, rotationOffset: 0.06, stories: 2 as const },
  { offsetX: 1.5, offsetZ: -1.5, width: 6.7, height: 4.9, depth: 7.1, rotationOffset: -0.08, stories: 1 as const },
] as const

const createOutskirtSideRow = (side: 'east' | 'west', x: number): OutskirtBuildingConfig[] => {
  const direction = side === 'east' ? 1 : -1
  const outerRow = Math.abs(x) > 40

  return outskirtSideZSlots.map((z, index) => {
    const profile = getCycledValue(outskirtSideProfiles, index)
    const outerXShift = outerRow ? (index % 2 === 0 ? 1.3 : 0.5) : 0
    const outerZShift = outerRow ? (index % 2 === 0 ? -0.9 : 1.1) : 0

    return {
      name: `${side}-${Math.abs(x)}-outskirt-${index + 1}`,
      position: vector3(
        x + direction * (profile.offsetX + outerXShift),
        0,
        z + profile.offsetZ + outerZShift,
      ),
      width: profile.width + (outerRow ? -0.15 : 0.1),
      height: profile.height + (outerRow ? 0.18 : 0),
      depth: profile.depth + (outerRow && index % 2 === 1 ? 0.25 : 0),
      rotationY: (direction > 0 ? 0 : Math.PI) + profile.rotationOffset * direction,
      stories: profile.stories,
    }
  })
}

const createOutskirtCrossRow = (side: 'north' | 'south', z: number): OutskirtBuildingConfig[] => {
  const direction = side === 'north' ? Math.PI / 2 : -Math.PI / 2
  const facing = side === 'north' ? -1 : 1

  return outskirtCrossXSlots.map((x, index) => {
    const profile = getCycledValue(outskirtCrossProfiles, index)

    return {
      name: `${side}-${Math.abs(z)}-outskirt-${index + 1}`,
      position: vector3(x + profile.offsetX, 0, z + facing * profile.offsetZ),
      width: profile.width,
      height: profile.height,
      depth: profile.depth,
      rotationY: direction + profile.rotationOffset * facing,
      stories: profile.stories,
    }
  })
}

// ── 内側横断道路沿いの建物 X スロット（メイン通りと外側道路の中間帯を埋める）──────────
const innerCrossXSlots = [-30, -14, 14, 30].map((slot) => slot * WORLD_DIMENSION_MULTIPLIER)

// 内側横断道路（Z=±81）沿いの建物を生成するヘルパー
const createInnerCrossRow = (side: 'north' | 'south', z: number): OutskirtBuildingConfig[] => {
  const direction = side === 'north' ? Math.PI / 2 : -Math.PI / 2
  const facing = side === 'north' ? -1 : 1

  return innerCrossXSlots.map((x, index) => {
    const profile = getCycledValue(outskirtCrossProfiles, index)
    return {
      name: `inner-cross-${side}-${index + 1}-z${Math.round(z)}`,
      position: vector3(x + profile.offsetX, 0, z + facing * profile.offsetZ),
      width: profile.width,
      height: profile.height,
      depth: profile.depth,
      rotationY: direction + profile.rotationOffset * facing,
      stories: profile.stories,
    }
  })
}

// ── 新しい内側道路の位置定数（KyotoNightDistrict で道路メッシュに使用）─────────────
export const INNER_SIDE_ROAD_POSITIONS = [-18, 18].map((slot) => slot * WORLD_DIMENSION_MULTIPLIER)
export const INNER_CROSS_ROAD_POSITIONS = [-27, 27].map((slot) => slot * WORLD_DIMENSION_MULTIPLIER)

export const OUTSKIRT_BUILDINGS: OutskirtBuildingConfig[] = [
  // ── 既存の外周道路沿い建物 ──────────────────────────────────────────────────────
  ...createOutskirtSideRow('east', 36 * WORLD_DIMENSION_MULTIPLIER),
  ...createOutskirtSideRow('east', 58 * WORLD_DIMENSION_MULTIPLIER),
  ...createOutskirtSideRow('west', -36 * WORLD_DIMENSION_MULTIPLIER),
  ...createOutskirtSideRow('west', -58 * WORLD_DIMENSION_MULTIPLIER),
  ...createOutskirtCrossRow('north', -54 * WORLD_DIMENSION_MULTIPLIER),
  ...createOutskirtCrossRow('south', 54 * WORLD_DIMENSION_MULTIPLIER),

  // ── 内側縦道路（X=±54）沿い建物 ────────────────────────────────────────────────
  ...createOutskirtSideRow('east', 18 * WORLD_DIMENSION_MULTIPLIER),
  ...createOutskirtSideRow('west', -18 * WORLD_DIMENSION_MULTIPLIER),

  // ── 内側横断道路（Z=±81）の北側・南側建物 ────────────────────────────────────────
  ...createInnerCrossRow('north', -27 * WORLD_DIMENSION_MULTIPLIER),
  ...createInnerCrossRow('south', 27 * WORLD_DIMENSION_MULTIPLIER),
  // 各横断道路の反対側（道路の内側向き）にも建物を配置
  ...createInnerCrossRow('south', -27 * WORLD_DIMENSION_MULTIPLIER),
  ...createInnerCrossRow('north', 27 * WORLD_DIMENSION_MULTIPLIER),

  // ── 既存外周横断道路の内側にも建物を追加（道路の裏面を埋める）────────────────────
  ...createOutskirtCrossRow('south', -54 * WORLD_DIMENSION_MULTIPLIER),
  ...createOutskirtCrossRow('north', 54 * WORLD_DIMENSION_MULTIPLIER),
]

const lanternSlots = [
  vector3(-4.3, 0, 18 * WORLD_DIMENSION_MULTIPLIER),
  vector3(4.3, 0, 12 * WORLD_DIMENSION_MULTIPLIER),
  vector3(-4.3, 0, 6 * WORLD_DIMENSION_MULTIPLIER),
  vector3(4.3, 0, 0),
  vector3(-4.3, 0, -6 * WORLD_DIMENSION_MULTIPLIER),
  vector3(4.3, 0, -12 * WORLD_DIMENSION_MULTIPLIER),
  vector3(-4.3, 0, -18 * WORLD_DIMENSION_MULTIPLIER),
  vector3(4.3, 0, -24 * WORLD_DIMENSION_MULTIPLIER),
] as const

export const STREET_LANTERNS: LanternConfig[] = lanternSlots.map((position, index) => ({
  name: `street-lantern-${index + 1}`,
  position,
  height: index < 4 ? 2.7 : 2.85,
  intensity: index % 2 === 0 ? 0.96 : 1.08,
}))
