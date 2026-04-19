import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  BufferAttribute,
  InstancedBufferAttribute,
  Matrix4,
  Vector3,
  Euler,
  InstancedMesh,
  Color,
  ShaderMaterial,
  DoubleSide,
  AdditiveBlending,
  PlaneGeometry,
} from 'three'
import { createMotionState, sampleMotionState, type MotionState } from './motion'

// ── Constants ──────────────────────────────────────────────

const FISH_COUNT_PER_COLOR = 200
const BUBBLE_COUNT = 400
const MOTE_COUNT = 300

const FISH_COLORS = [
  '#ff5c7a', // ピンクレッド
  '#ff9a4d', // オレンジ
  '#ffe066', // イエロー
  '#57f287', // グリーン
  '#52d8ff', // シアン
  '#4d78ff', // ブルー
  '#c76bff', // バイオレット
]

// ── Boids Constants ────────────────────────────────────────

const TOTAL_FISH = FISH_COUNT_PER_COLOR * FISH_COLORS.length

const PERCEPTION_RADIUS = 6.0
const SEPARATION_RADIUS = 1.8
const CELL_SIZE = PERCEPTION_RADIUS

// Force weights (accelerations, units/s²)
const SEP_WEIGHT = 18.0
const ALI_WEIGHT = 10.0
const COH_WEIGHT = 4.0
const BOUNDARY_WEIGHT = 50.0
const WANDER_WEIGHT = 4.0
const MAX_FORCE = 30.0
const MAX_SPEED = 2.5
const MIN_SPEED = 0.5
const TAU = Math.PI * 2

// World bounds
const HALF_X = 30
const HALF_Z = 30
const Y_MIN = 2
const Y_MAX = 15
const B_MARGIN = 6.0

const MAX_NEIGHBORS = 1024
const MIXED_GROUP_COUNT = 3
const GROUP_ANGLE_STEP = TAU / FISH_COLORS.length
const DETAILED_NEIGHBOR_RADIUS_RATIO = 0.52
const DETAILED_NEIGHBOR_SEPARATION_MULTIPLIER = 1.8
const MIN_FAR_SCHOOL_NEIGHBORS = 8
const MAX_FAR_SCHOOL_NEIGHBORS = 24
const SCHOOL_SPACING_PERCEPTION_GAIN = 0.58
const SCHOOL_SPACING_DRIFT_RADIUS_GAIN = 0.42
const SCHOOL_SPACING_FORMATION_GAIN = 0.72
const SCHOOL_SPACING_RIBBON_GAIN = 0.48
const SCHOOL_SPACING_VORTEX_RADIUS_GAIN = 0.38

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function updateFishMeshBounds(mesh: InstancedMesh | null) {
  if (!mesh) return

  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingSphere()
}

// ── Types ──────────────────────────────────────────────────

interface BoidsState {
  posX: Float32Array
  posY: Float32Array
  posZ: Float32Array
  velX: Float32Array
  velY: Float32Array
  velZ: Float32Array
  prefSpeed: Float32Array
  wanderPhase: Float32Array
  driftPhase: Float32Array
  speedVariance: Float32Array
  schoolGroup: Uint8Array
}

// ── Spatial Hash ───────────────────────────────────────────

class SpatialHash {
  private readonly cellSize: number
  private readonly inv: number
  private readonly cells: Map<number, number[]> = new Map()
  private readonly pool: number[][] = []

  constructor(cellSize: number) {
    this.cellSize = cellSize
    this.inv = 1.0 / cellSize
  }

  clear() {
    this.cells.forEach((arr) => {
      arr.length = 0
      this.pool.push(arr)
    })
    this.cells.clear()
  }

  insert(index: number, x: number, y: number, z: number) {
    const key = this.hashKey(
      Math.floor(x * this.inv),
      Math.floor(y * this.inv),
      Math.floor(z * this.inv),
    )
    let cell = this.cells.get(key)
    if (!cell) {
      cell = this.pool.pop() || []
      this.cells.set(key, cell)
    }
    cell.push(index)
  }

  queryInto(x: number, y: number, z: number, radius: number, buf: Int32Array): number {
    const inv = this.inv
    const cellSize = this.cellSize
    const radiusSq = radius * radius
    const cx = Math.floor(x * inv)
    const cy = Math.floor(y * inv)
    const cz = Math.floor(z * inv)
    const cellRadius = Math.max(1, Math.ceil(radius * inv))
    let count = 0
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      const xDist =
        dx === 0
          ? 0
          : dx > 0
            ? (cx + dx) * cellSize - x
            : x - (cx + dx + 1) * cellSize
      const xDistSq = xDist > 0 ? xDist * xDist : 0
      if (xDistSq > radiusSq) continue

      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const yDist =
          dy === 0
            ? 0
            : dy > 0
              ? (cy + dy) * cellSize - y
              : y - (cy + dy + 1) * cellSize
        const yDistSq = yDist > 0 ? yDist * yDist : 0
        if (xDistSq + yDistSq > radiusSq) continue

        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const zDist =
            dz === 0
              ? 0
              : dz > 0
                ? (cz + dz) * cellSize - z
                : z - (cz + dz + 1) * cellSize
          const zDistSq = zDist > 0 ? zDist * zDist : 0
          if (xDistSq + yDistSq + zDistSq > radiusSq) continue

          const cell = this.cells.get(
            this.hashKey(cx + dx, cy + dy, cz + dz),
          )
          if (cell) {
            for (let i = 0, len = cell.length; i < len; i++) {
              if (count < buf.length) buf[count++] = cell[i]
            }
          }
        }
      }
    }
    return count
  }

  private hashKey(cx: number, cy: number, cz: number): number {
    return ((cx * 92837111) ^ (cy * 689287499) ^ (cz * 283923481)) | 0
  }
}

// ── Boids State Factory ────────────────────────────────────

function createBoidsState(): BoidsState {
  const n = TOTAL_FISH
  const state: BoidsState = {
    posX: new Float32Array(n),
    posY: new Float32Array(n),
    posZ: new Float32Array(n),
    velX: new Float32Array(n),
    velY: new Float32Array(n),
    velZ: new Float32Array(n),
    prefSpeed: new Float32Array(n),
    wanderPhase: new Float32Array(n),
    driftPhase: new Float32Array(n),
    speedVariance: new Float32Array(n),
    schoolGroup: new Uint8Array(n),
  }

  for (let ci = 0; ci < FISH_COLORS.length; ci++) {
    // Place each colour group in a loose cluster
    const a = (ci / FISH_COLORS.length) * Math.PI * 2
    const gcx = Math.cos(a) * 15
    const gcy = 5 + (ci % 3) * 3
    const gcz = Math.sin(a) * 15

    for (let fi = 0; fi < FISH_COUNT_PER_COLOR; fi++) {
      const idx = ci * FISH_COUNT_PER_COLOR + fi
      state.posX[idx] = gcx + (Math.random() - 0.5) * 12
      state.posY[idx] = gcy + (Math.random() - 0.5) * 4
      state.posZ[idx] = gcz + (Math.random() - 0.5) * 12

      const spd = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED)
      const dir = Math.random() * Math.PI * 2
      state.velX[idx] = Math.cos(dir) * spd
      state.velY[idx] = (Math.random() - 0.5) * 0.3
      state.velZ[idx] = Math.sin(dir) * spd

      state.prefSpeed[idx] = 0.8 + Math.random() * 1.4
      state.wanderPhase[idx] = Math.random() * Math.PI * 2
      state.driftPhase[idx] = Math.random() * TAU
      state.speedVariance[idx] = 0.84 + Math.random() * 0.32
      state.schoolGroup[idx] = (Math.random() * MIXED_GROUP_COUNT) | 0
    }
  }

  return state
}

// ── Boids Simulation Step ──────────────────────────────────

function updateBoids(
  s: BoidsState,
  hash: SpatialHash,
  nBuf: Int32Array,
  rawDt: number,
  time: number,
  motion: MotionState,
) {
  const dt = Math.min(rawDt, 0.05)
  const {
    posX,
    posY,
    posZ,
    velX,
    velY,
    velZ,
    prefSpeed,
    wanderPhase,
    driftPhase,
    speedVariance,
    schoolGroup,
  } = s
  const n = TOTAL_FISH
  const schoolSpacing = motion.schoolSpacing
  const spacingOffset = Math.max(0, schoolSpacing - 1)
  const clusterSpread = motion.schoolClusterSpread
  const perceptionRadius =
    PERCEPTION_RADIUS * (1 + spacingOffset * SCHOOL_SPACING_PERCEPTION_GAIN)
  const separationRadius = SEPARATION_RADIUS * schoolSpacing
  const percSq = perceptionRadius * perceptionRadius
  const sepSq = separationRadius * separationRadius
  const schoolDriftSpacingScale =
    1 + spacingOffset * SCHOOL_SPACING_DRIFT_RADIUS_GAIN
  const formationSpacingScale =
    1 + spacingOffset * SCHOOL_SPACING_FORMATION_GAIN
  const ribbonSpacingScale = 1 + spacingOffset * SCHOOL_SPACING_RIBBON_GAIN
  const vortexSpacingScale =
    1 + spacingOffset * SCHOOL_SPACING_VORTEX_RADIUS_GAIN
  const useSeparation = motion.separation > 0.001
  const useAlignment = motion.alignment > 0.001
  const useCohesion = motion.cohesion > 0.001
  const useSchooling = useAlignment || useCohesion
  const useDrift = motion.drift > 0.001
  const useSchoolDrift = useDrift && motion.randomDrift < 0.999
  const usePersonalDrift = useDrift && motion.randomDrift > 0.001
  const useNoise = motion.randomDrift > 0.001
  const schoolInfluence = Math.min(
    1,
    Math.max(motion.alignment, motion.cohesion) * 0.65 + motion.schoolMix * 0.35,
  )
  const detailedSchoolRadius = Math.min(
    perceptionRadius,
    Math.max(
      separationRadius * DETAILED_NEIGHBOR_SEPARATION_MULTIPLIER,
      perceptionRadius * DETAILED_NEIGHBOR_RADIUS_RATIO,
    ),
  )
  const detailedSchoolSq = detailedSchoolRadius * detailedSchoolRadius
  const farSchoolNeighborBudget = useSchooling
    ? Math.round(
        lerp(
          MIN_FAR_SCHOOL_NEIGHBORS,
          MAX_FAR_SCHOOL_NEIGHBORS,
          schoolInfluence,
        ),
      )
    : 0
  const waveLift = 1.3 + motion.wave * 3.8
  const vortexCenterX = Math.sin(time * 0.21) * 6.0
  const vortexCenterY = 7.0 + Math.sin(time * 0.47) * 1.3
  const vortexCenterZ = Math.cos(time * 0.18) * 6.0
  const flashStrength = motion.flashPulse * 7.5
  const flashTurnAngle = time * 0.65 + Math.sin(time * 0.52) * 1.8
  const mixedGroupAngleStep = TAU / MIXED_GROUP_COUNT

  hash.clear()
  for (let i = 0; i < n; i++) {
    hash.insert(i, posX[i], posY[i], posZ[i])
  }

  for (let i = 0; i < n; i++) {
    const myC = (i / FISH_COUNT_PER_COLOR) | 0
    const localIndex = i - myC * FISH_COUNT_PER_COLOR
    const colorAngle = myC * GROUP_ANGLE_STEP
    const groupId = schoolGroup[i]
    const groupAngle = groupId * mixedGroupAngleStep * clusterSpread
    const personalPhase = driftPhase[i]
    const speedFactor = lerp(1, speedVariance[i], motion.randomDrift)
    const sharedGroupPhase = lerp(groupAngle, colorAngle, motion.colorAffinity)
    const px = posX[i]
    const py = posY[i]
    const pz = posZ[i]
    const vx = velX[i]
    const vy = velY[i]
    const vz = velZ[i]

    let sepX = 0
    let sepY = 0
    let sepZ = 0
    let sepN = 0
    let aliVx = 0
    let aliVy = 0
    let aliVz = 0
    let aliN = 0
    let cohX = 0
    let cohY = 0
    let cohZ = 0
    let cohN = 0
    let farSchoolSamples = 0

    const nc = hash.queryInto(px, py, pz, perceptionRadius, nBuf)
    for (let ni = 0; ni < nc; ni++) {
      const j = nBuf[ni]
      if (j === i) continue

      const dx = posX[j] - px
      const dy = posY[j] - py
      const dz = posZ[j] - pz
      const dSq = dx * dx + dy * dy + dz * dz
      if (dSq > percSq || dSq < 0.0001) continue

      let schoolWeight = 0
      if (useSchooling) {
        const jC = (j / FISH_COUNT_PER_COLOR) | 0
        schoolWeight = myC === jC ? 1 : motion.schoolMix
      }

      const canSeparate = useSeparation && dSq < sepSq
      const canSchool = schoolWeight > 0.001
      if (!canSeparate && !canSchool) continue

      if (canSeparate) {
        const dist = Math.sqrt(dSq)
        const invD = 1.0 / dist
        const w = (separationRadius - dist) / Math.max(separationRadius, 0.0001)
        sepX -= dx * invD * w
        sepY -= dy * invD * w
        sepZ -= dz * invD * w
        sepN++
      }

      if (canSchool) {
        if (dSq > detailedSchoolSq) {
          if (farSchoolSamples >= farSchoolNeighborBudget) continue
          farSchoolSamples++
        }

        if (useAlignment) {
          aliVx += velX[j] * schoolWeight
          aliVy += velY[j] * schoolWeight
          aliVz += velZ[j] * schoolWeight
          aliN += schoolWeight
        }
        if (useCohesion) {
          cohX += dx * schoolWeight
          cohY += dy * schoolWeight
          cohZ += dz * schoolWeight
          cohN += schoolWeight
        }
      }
    }

    let fx = 0
    let fy = 0
    let fz = 0

    if (useSeparation && sepN > 0) {
      const inv = 1.0 / sepN
      const separationForce = motion.separation * (1 + spacingOffset * 0.3)
      fx += sepX * inv * SEP_WEIGHT * separationForce
      fy += sepY * inv * SEP_WEIGHT * separationForce
      fz += sepZ * inv * SEP_WEIGHT * separationForce
    }
    if (useAlignment && aliN > 0) {
      const inv = 1.0 / aliN
      fx += (aliVx * inv - vx) * ALI_WEIGHT * motion.alignment
      fy += (aliVy * inv - vy) * ALI_WEIGHT * motion.alignment
      fz += (aliVz * inv - vz) * ALI_WEIGHT * motion.alignment
    }
    if (useCohesion && cohN > 0) {
      const inv = 1.0 / cohN
      fx += cohX * inv * COH_WEIGHT * motion.cohesion
      fy += cohY * inv * COH_WEIGHT * motion.cohesion
      fz += cohZ * inv * COH_WEIGHT * motion.cohesion
    }

    if (useDrift) {
      let schoolDriftX = px
      let schoolDriftY = py
      let schoolDriftZ = pz
      if (useSchoolDrift) {
        const structuredDriftAngle =
          colorAngle + time * 0.18 + Math.sin(time * 0.24 + myC * 0.7) * 0.35
        const mixedDriftAngle =
          groupAngle +
          time * 0.19 +
          Math.sin(time * 0.28 + groupId * 1.1 * clusterSpread) *
            (0.12 + clusterSpread * 0.3)
        const schoolDriftAngle = lerp(
          mixedDriftAngle,
          structuredDriftAngle,
          motion.colorAffinity,
        )
        const structuredDriftRadius =
          (15 + Math.sin(time * 0.55 + myC * 0.9) * 4) * schoolDriftSpacingScale
        const mixedDriftRadius =
          (12.5 +
            groupId * 0.9 * clusterSpread +
            Math.sin(
              time * 0.46 + groupAngle * 0.7 + groupId * 0.35 * clusterSpread,
            ) * (1.1 + clusterSpread * 1.4)) *
          schoolDriftSpacingScale
        const schoolDriftRadius = lerp(
          mixedDriftRadius,
          structuredDriftRadius,
          motion.colorAffinity,
        )
        schoolDriftX = Math.cos(schoolDriftAngle) * schoolDriftRadius
        schoolDriftY =
          lerp(
            6.4 +
              Math.sin(
                time * 0.82 + groupAngle * 0.8 + groupId * 0.24 * clusterSpread,
              ) * 1.4,
            6.0 + Math.sin(time * 0.9 + myC * 0.6) * 1.6,
            motion.colorAffinity,
          ) +
          spacingOffset * 0.15
        schoolDriftZ = Math.sin(schoolDriftAngle) * schoolDriftRadius
      }

      let driftX = schoolDriftX
      let driftY = schoolDriftY
      let driftZ = schoolDriftZ
      if (usePersonalDrift) {
        const personalDriftAngle =
          personalPhase +
          time * (0.38 + speedFactor * 0.24) +
          Math.sin(time * 0.57 + personalPhase) * 0.82 +
          Math.cos(time * 0.31 + personalPhase * 1.6) * 0.24 * motion.randomDrift
        const personalDriftRadius =
          12 +
          speedFactor * 6.6 +
          Math.sin(time * 0.91 + personalPhase * 1.3) * 4.6 +
          motion.randomDrift * 2.2
        const personalDriftX =
          Math.cos(personalDriftAngle) * personalDriftRadius +
          Math.sin(time * 0.23 + personalPhase) * (2.4 + motion.randomDrift * 1.2)
        const personalDriftY =
          6.2 +
          Math.sin(time * 1.4 + personalPhase * 0.8) *
            (2.2 + motion.randomDrift * 0.9) +
          Math.cos(time * 0.51 + personalPhase) *
            (0.8 + motion.randomDrift * 0.35)
        const personalDriftZ =
          Math.sin(personalDriftAngle) * personalDriftRadius +
          Math.cos(time * 0.27 + personalPhase * 1.1) *
            (2.4 + motion.randomDrift * 1.2)

        if (useSchoolDrift) {
          driftX = lerp(schoolDriftX, personalDriftX, motion.randomDrift)
          driftY = lerp(schoolDriftY, personalDriftY, motion.randomDrift)
          driftZ = lerp(schoolDriftZ, personalDriftZ, motion.randomDrift)
        } else {
          driftX = personalDriftX
          driftY = personalDriftY
          driftZ = personalDriftZ
        }
      }

      fx += (driftX - px) * motion.drift * 0.55
      fy += (driftY - py) * motion.drift * 0.35
      fz += (driftZ - pz) * motion.drift * 0.55
    }

    const wavePhase = lerp(
      sharedGroupPhase,
      personalPhase,
      motion.randomDrift * 0.78,
    )
    const waveTargetY =
      7.2 +
      Math.sin(time * 1.7 + px * 0.14 + pz * 0.1 + wavePhase) *
        (0.7 + motion.wave * 1.8) +
      Math.sin(
        time * 0.6 + localIndex * 0.045 + personalPhase * motion.randomDrift,
      ) *
        motion.wave *
        (0.9 + motion.randomDrift * 0.55)
    fy += (waveTargetY - py) * waveLift

    if (motion.vortex > 0.001) {
      const offsetX = px - vortexCenterX
      const offsetZ = pz - vortexCenterZ
      const radialLength = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ) + 0.0001
      const invRadial = 1.0 / radialLength
      const spinDir = lerp(
        (groupId & 1) === 0 ? 1 : -1,
        (myC & 1) === 0 ? 1 : -1,
        motion.colorAffinity,
      )
      const desiredRadius =
        lerp(
          8.4 +
            groupId * 1.4 * clusterSpread +
            Math.sin(time * 0.72 + personalPhase * 0.35 + groupAngle) *
              (0.9 + clusterSpread * 0.7),
          8 + myC * 1.4 + Math.sin(time * 0.7 + localIndex * 0.03) * 1.5,
          motion.colorAffinity,
        ) * vortexSpacingScale
      const radiusError = desiredRadius - radialLength
      const tangentX = -offsetZ * invRadial * spinDir
      const tangentZ = offsetX * invRadial * spinDir

      fx +=
        (tangentX * 2.4 + offsetX * invRadial * radiusError * 0.7) *
        motion.vortex *
        8.0
      fz +=
        (tangentZ * 2.4 + offsetZ * invRadial * radiusError * 0.7) *
        motion.vortex *
        8.0

      const swirlY =
        vortexCenterY +
        Math.sin(time * 1.8 + radialLength * 0.45 + localIndex * 0.05) * 1.8
      fy += (swirlY - py) * motion.vortex * 2.3
    }

    if (motion.formation > 0.001) {
      const u = localIndex / (FISH_COUNT_PER_COLOR - 1)
      const spread =
        (u - 0.5) * lerp(10, 14, motion.colorAffinity) * formationSpacingScale
      const formationAngle = lerp(
        groupAngle +
          time * 0.24 +
          Math.sin(time * 0.39 + groupId * 0.8 * clusterSpread) *
            (0.08 + clusterSpread * 0.18),
        colorAngle + time * 0.28 + Math.sin(time * 0.43 + myC) * 0.22,
        motion.colorAffinity,
      )
      const formationRadius =
        lerp(
          13.5 +
            groupId * 1.2 * clusterSpread +
            Math.sin(time * 0.47 + groupId * clusterSpread + groupAngle) *
              (0.8 + clusterSpread * 1.2),
          17 + Math.sin(time * 0.5 + myC * 0.7) * 2.5,
          motion.colorAffinity,
        ) *
        (1 + spacingOffset * 0.55)
      const centerX = Math.cos(formationAngle) * formationRadius
      const centerZ = Math.sin(formationAngle) * formationRadius
      const tangentX = -Math.sin(formationAngle)
      const tangentZ = Math.cos(formationAngle)
      const normalX = Math.cos(formationAngle)
      const normalZ = Math.sin(formationAngle)
      const ribbon = Math.sin(
        u * TAU * 3 +
          time * 2.2 +
          lerp(groupId * 0.9 * clusterSpread, myC * 0.9, motion.colorAffinity),
      )
      const ribbonAmplitude = 2.6 * ribbonSpacingScale
      const targetX =
        centerX + tangentX * spread + normalX * ribbon * ribbonAmplitude
      const targetY =
        8.0 +
        Math.sin(
          u * TAU * 2 +
            time * 2.5 +
            lerp(
              groupId * 0.6 * clusterSpread,
              myC * 0.6,
              motion.colorAffinity,
            ),
        ) *
          1.8 +
        Math.cos(
          time * 0.8 +
            lerp(groupId * clusterSpread, myC, motion.colorAffinity),
        ) *
          0.8
      const targetZ =
        centerZ + tangentZ * spread + normalZ * ribbon * ribbonAmplitude

      fx += (targetX - px) * motion.formation * 1.2
      fy += (targetY - py) * motion.formation * 0.95
      fz += (targetZ - pz) * motion.formation * 1.2
    }

    if (flashStrength > 0.001) {
      const targetSpeed = clamp(
        prefSpeed[i] * motion.speed * speedFactor * 1.2,
        MIN_SPEED,
        MAX_SPEED * 1.15,
      )
      const turnAngle =
        flashTurnAngle +
        sharedGroupPhase * 0.35 +
        Math.sin(time * 0.33 + sharedGroupPhase) * 0.12 +
        personalPhase * motion.randomDrift * 0.08
      const desiredDirX = Math.sin(turnAngle)
      const desiredDirZ = Math.cos(turnAngle)

      fx += (desiredDirX * targetSpeed - vx) * flashStrength
      fz += (desiredDirZ * targetSpeed - vz) * flashStrength
    }

    if (px < -HALF_X + B_MARGIN) {
      fx += ((-HALF_X + B_MARGIN - px) / B_MARGIN) * BOUNDARY_WEIGHT
    }
    if (px > HALF_X - B_MARGIN) {
      fx += ((HALF_X - B_MARGIN - px) / B_MARGIN) * BOUNDARY_WEIGHT
    }
    if (py < Y_MIN + B_MARGIN * 0.5) {
      fy += ((Y_MIN + B_MARGIN * 0.5 - py) / B_MARGIN) * BOUNDARY_WEIGHT
    }
    if (py > Y_MAX - B_MARGIN * 0.5) {
      fy += ((Y_MAX - B_MARGIN * 0.5 - py) / B_MARGIN) * BOUNDARY_WEIGHT
    }
    if (pz < -HALF_Z + B_MARGIN) {
      fz += ((-HALF_Z + B_MARGIN - pz) / B_MARGIN) * BOUNDARY_WEIGHT
    }
    if (pz > HALF_Z - B_MARGIN) {
      fz += ((HALF_Z - B_MARGIN - pz) / B_MARGIN) * BOUNDARY_WEIGHT
    }

    wanderPhase[i] += dt * (1.0 + (i & 7) * 0.15)
    const wp = wanderPhase[i]
    const wanderStrength = motion.wander * (1 + motion.randomDrift * 0.95)
    fx += Math.sin(wp * 1.7 + i * 0.37) * WANDER_WEIGHT * wanderStrength
    fy += Math.sin(wp * 0.9 + i * 0.73) * WANDER_WEIGHT * 0.3 * wanderStrength
    fz += Math.cos(wp * 1.3 + i * 0.51) * WANDER_WEIGHT * wanderStrength

    if (useNoise) {
      const noiseStrength = motion.randomDrift * (0.82 + speedFactor * 0.45)
      const noiseTime = time * (0.92 + speedFactor * 0.58) + personalPhase
      fx += Math.sin(noiseTime * 1.9 + i * 0.13) * noiseStrength * 1.95
      fy += Math.cos(noiseTime * 1.1 + i * 0.07) * noiseStrength * 0.7
      fz += Math.cos(noiseTime * 1.5 + i * 0.17) * noiseStrength * 1.95
    }

    const fMag = Math.sqrt(fx * fx + fy * fy + fz * fz)
    if (fMag > MAX_FORCE) {
      const sc = MAX_FORCE / fMag
      fx *= sc
      fy *= sc
      fz *= sc
    }

    velX[i] = vx + fx * dt
    velY[i] = vy + fy * dt
    velZ[i] = vz + fz * dt
  }

  for (let i = 0; i < n; i++) {
    const vx2 = velX[i]
    const vy2 = velY[i]
    const vz2 = velZ[i]
    const curSpd = Math.sqrt(vx2 * vx2 + vy2 * vy2 + vz2 * vz2)
    const speedFactor = lerp(1, speedVariance[i], motion.randomDrift)
    const speedPulse =
      1 +
      Math.sin(time * (0.7 + motion.randomDrift * 0.9) + driftPhase[i] * 1.3) *
        0.12 *
        motion.randomDrift +
      Math.cos(time * 1.17 + driftPhase[i] * 0.7) * 0.05 * motion.randomDrift
    const desiredSpeed = clamp(
      prefSpeed[i] * motion.speed * speedFactor * speedPulse,
      MIN_SPEED * 0.85,
      MAX_SPEED * 1.15,
    )
    const minSpeed =
      MIN_SPEED * (0.82 + motion.speed * 0.22) * (1 - motion.randomDrift * 0.04)
    const maxSpeed =
      MAX_SPEED * (0.84 + motion.speed * 0.26) * (1 + motion.randomDrift * 0.08)

    if (curSpd > 0.001) {
      let spd = curSpd + (desiredSpeed - curSpd) * 0.6 * dt
      if (spd < minSpeed) spd = minSpeed
      if (spd > maxSpeed) spd = maxSpeed
      const sc = spd / curSpd
      velX[i] = vx2 * sc
      velY[i] = vy2 * sc
      velZ[i] = vz2 * sc
    }

    posX[i] += velX[i] * dt
    posY[i] += velY[i] * dt
    posZ[i] += velZ[i] * dt

    if (posX[i] < -HALF_X - 1) posX[i] = -HALF_X - 1
    if (posX[i] > HALF_X + 1) posX[i] = HALF_X + 1
    if (posY[i] < Y_MIN - 1) posY[i] = Y_MIN - 1
    if (posY[i] > Y_MAX + 1) posY[i] = Y_MAX + 1
    if (posZ[i] < -HALF_Z - 1) posZ[i] = -HALF_Z - 1
    if (posZ[i] > HALF_Z + 1) posZ[i] = HALF_Z + 1
  }
}


// ── Fish Shaders (enhanced) ────────────────────────────────

const fishVertexShader = /* glsl */ `
  attribute float instancePhase;

  uniform float time;
  uniform float energy;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vBodyPos;
  varying float vPhase;

  void main() {
    vPhase = instancePhase;

    // Body position: nose(z=0.3)=0  tail(z=-0.45)=1
    float bodyPos = clamp((-position.z + 0.3) / 0.75, 0.0, 1.0);
    vBodyPos = bodyPos;

    // Swimming body-wave — amplitude grows toward the tail
    vec3 pos = position;
    float waveSpeed = 8.0 + instancePhase * 4.0 + energy * 4.0;
    pos.x += sin(time * waveSpeed + instancePhase * 6.2832 + bodyPos * 4.5)
             * bodyPos * bodyPos * (0.035 + energy * 0.018);

    vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
    vec4 mvPosition = modelViewMatrix * worldPos;

    mat3 nMat = mat3(instanceMatrix);
    vNormal = normalize(normalMatrix * nMat * normal);
    vViewDir = normalize(-mvPosition.xyz);

    gl_Position = projectionMatrix * mvPosition;
  }
`

const fishFragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform vec3 accentColor;
  uniform float time;
  uniform float energy;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vBodyPos;
  varying float vPhase;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(vViewDir);

    // Fresnel rim glow
    float NdotV = max(dot(n, v), 0.0);
    float fresnel = pow(1.0 - NdotV, 3.0);

    // Rainbow body tint so the whole fish reads as a palette colour, not only the tail.
    float bodyBlend = smoothstep(0.05, 0.95, vBodyPos);
    vec3 rainbowBody = mix(color, accentColor, bodyBlend);

    // Iridescent colour shift across the full body
    float iri = sin(vBodyPos * 10.0 + time * 1.2 + vPhase * 6.2832) * 0.5 + 0.5;
    vec3 shiftColor = mix(rainbowBody, mix(color, accentColor, iri), 0.28);

    // Scale-shimmer sparkle highlights
    float sparkle = sin(time * 15.0 + vPhase * 37.0 + vBodyPos * 25.0);
    sparkle = pow(max(sparkle, 0.0), 16.0) * (0.5 + energy * 0.85);

    // Breathing glow pulse
    float breathe = 0.72 + 0.28 * sin(time * (2.5 + energy * 1.2) + vPhase * 6.2832);

    // Core colour
    vec3 core = shiftColor * breathe;

    // Rim light
    vec3 rimColor = mix(rainbowBody * 1.9, vec3(1.0), 0.28);
    core += rimColor * fresnel * (0.8 + energy * 0.45);

    // Mode accent glow
    core += mix(rainbowBody, accentColor, 0.35 + iri * 0.25) * energy * 0.18;

    // Sparkle
    core += vec3(1.0) * sparkle;

    gl_FragColor = vec4(core, 0.92 + fresnel * 0.08);
  }
`

// ── Bubble Shaders ─────────────────────────────────────────

const bubbleVertexShader = /* glsl */ `
  attribute float instancePhase;
  attribute float instanceSpeed;

  uniform float time;

  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    vUv = uv;

    // Looping life cycle 0→1
    float life = fract(time * 0.12 * instanceSpeed + instancePhase);

    // Fade in / out
    vAlpha = sin(life * 3.14159) * 0.45;

    // Scale pulses with life
    float scale = (0.06 + instancePhase * 0.08) * (0.5 + 0.5 * sin(life * 3.14159));

    // Instance base position
    vec4 worldCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

    // Rise
    worldCenter.y += life * 5.0;

    // Wobble
    worldCenter.x += sin(time * 2.0 + instancePhase * 20.0) * 0.5 * life;
    worldCenter.z += cos(time * 1.7 + instancePhase * 15.0) * 0.5 * life;

    // Billboard in view space
    vec4 mvCenter = modelViewMatrix * worldCenter;
    mvCenter.xy += position.xy * scale;

    gl_Position = projectionMatrix * mvCenter;
  }
`

const bubbleFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec2 vUv;

  void main() {
    // Soft circle
    float dist = length(vUv - 0.5) * 2.0;
    float circle = 1.0 - smoothstep(0.6, 1.0, dist);

    // Rim highlight for bubble look
    float rim = smoothstep(0.3, 0.8, dist) * (1.0 - smoothstep(0.8, 1.0, dist));

    vec3 color = vec3(0.5, 0.85, 1.0) + vec3(0.3) * rim;

    gl_FragColor = vec4(color, vAlpha * circle);
  }
`

// ── Light-Mote Shaders ────────────────────────────────────

const moteVertexShader = /* glsl */ `
  attribute float instancePhase;

  uniform float time;

  varying float vAlpha;
  varying vec2 vUv;
  varying float vHue;

  void main() {
    vUv = uv;
    vHue = instancePhase;

    // Pulsing brightness
    float pulse = sin(time * 2.0 + instancePhase * 6.2832) * 0.5 + 0.5;
    vAlpha = 0.15 + pulse * 0.45;

    // Scale
    float scale = (0.05 + instancePhase * 0.08) * (0.6 + 0.4 * pulse);

    // Instance base position
    vec4 worldCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

    // Gentle floating
    worldCenter.y += sin(time * 0.7 + instancePhase * 12.0) * 0.8;
    worldCenter.x += sin(time * 0.4 + instancePhase * 7.0) * 0.5;
    worldCenter.z += cos(time * 0.5 + instancePhase * 9.0) * 0.5;

    // Billboard
    vec4 mvCenter = modelViewMatrix * worldCenter;
    mvCenter.xy += position.xy * scale;

    gl_Position = projectionMatrix * mvCenter;
  }
`

const moteFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec2 vUv;
  varying float vHue;

  void main() {
    // Soft radial glow
    float dist = length(vUv - 0.5) * 2.0;
    float glow = exp(-dist * dist * 3.0);

    // Colour variation: warm golden ↔ cool blue
    vec3 warmColor = vec3(1.0, 0.85, 0.4);
    vec3 coolColor = vec3(0.4, 0.7, 1.0);
    vec3 color = mix(warmColor, coolColor, vHue);

    gl_FragColor = vec4(color * 1.5, vAlpha * glow);
  }
`

// ── Geometry ───────────────────────────────────────────────

function createFishGeometry(): BufferGeometry {
  const geometry = new BufferGeometry()

  const nose: number[] = [0, 0, 0.3]
  const top: number[] = [0, 0.05, 0.0]
  const bottom: number[] = [0, -0.05, 0.0]
  const left: number[] = [-0.1, 0, 0.0]
  const right: number[] = [0.1, 0, 0.0]
  const tailBase: number[] = [0, 0, -0.25]
  const tailLeft: number[] = [-0.15, 0, -0.45]
  const tailRight: number[] = [0.15, 0, -0.45]

  const positions = new Float32Array([
    ...nose, ...top, ...right,
    ...nose, ...right, ...bottom,
    ...nose, ...bottom, ...left,
    ...nose, ...left, ...top,
    ...tailBase, ...right, ...top,
    ...tailBase, ...bottom, ...right,
    ...tailBase, ...left, ...bottom,
    ...tailBase, ...top, ...left,
    ...tailBase, ...tailLeft, ...tailRight,
  ])

  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.computeVertexNormals()

  // Per-instance phase for shader variation
  const phases = new Float32Array(FISH_COUNT_PER_COLOR)
  for (let i = 0; i < FISH_COUNT_PER_COLOR; i++) {
    phases[i] = Math.random()
  }
  geometry.setAttribute(
    'instancePhase',
    new InstancedBufferAttribute(phases, 1),
  )

  return geometry
}

// ── Sub-components ─────────────────────────────────────────

/** Rising bubble particles — GPU-animated via shader */
function BubbleParticles() {
  const meshRef = useRef<InstancedMesh>(null)

  const { geometry, material } = useMemo(() => {
    const geo = new PlaneGeometry(1, 1)

    const p = new Float32Array(BUBBLE_COUNT)
    const s = new Float32Array(BUBBLE_COUNT)
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      p[i] = Math.random()
      s[i] = 0.5 + Math.random() * 1.5
    }
    geo.setAttribute('instancePhase', new InstancedBufferAttribute(p, 1))
    geo.setAttribute('instanceSpeed', new InstancedBufferAttribute(s, 1))

    const mat = new ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: bubbleVertexShader,
      fragmentShader: bubbleFragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    return { geometry: geo, material: mat }
  }, [])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const matrix = new Matrix4()
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      matrix.makeTranslation(
        (Math.random() - 0.5) * 60,
        2 + Math.random() * 13,
        (Math.random() - 0.5) * 60,
      )
      mesh.setMatrixAt(i, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true

    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(({ clock }) => {
    material.uniforms.time.value = clock.getElapsedTime()
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, BUBBLE_COUNT]}
      frustumCulled={false}
    />
  )
}

/** Floating light motes — GPU-animated via shader */
function LightMotes() {
  const meshRef = useRef<InstancedMesh>(null)

  const { geometry, material } = useMemo(() => {
    const geo = new PlaneGeometry(1, 1)

    const phases = new Float32Array(MOTE_COUNT)
    for (let i = 0; i < MOTE_COUNT; i++) {
      phases[i] = Math.random()
    }
    geo.setAttribute('instancePhase', new InstancedBufferAttribute(phases, 1))

    const mat = new ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: moteVertexShader,
      fragmentShader: moteFragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    })

    return { geometry: geo, material: mat }
  }, [])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const matrix = new Matrix4()
    for (let i = 0; i < MOTE_COUNT; i++) {
      matrix.makeTranslation(
        (Math.random() - 0.5) * 70,
        2 + Math.random() * 18,
        (Math.random() - 0.5) * 70,
      )
      mesh.setMatrixAt(i, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true

    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(({ clock }) => {
    material.uniforms.time.value = clock.getElapsedTime()
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MOTE_COUNT]}
      frustumCulled={false}
    />
  )
}

// ── Main Component ─────────────────────────────────────────

export function GlowingFish() {
  const meshRefs = useRef<Array<InstancedMesh | null>>(
    FISH_COLORS.map(() => null),
  )

  const matrixWS = useRef(new Matrix4())
  const posWS = useRef(new Vector3())
  const eulerWS = useRef(new Euler())

  const fishGeometry = useMemo(() => createFishGeometry(), [])

  const uniformsArray = useMemo(
    () =>
      FISH_COLORS.map((colorHex, index) => ({
        color: { value: new Color(colorHex) },
        accentColor: {
          value: new Color(FISH_COLORS[(index + 1) % FISH_COLORS.length]),
        },
        time: { value: 0 },
        energy: { value: 0 },
      })),
    [],
  )

  const materialsArray = useMemo(
    () =>
      uniformsArray.map(
        (uniforms) =>
          new ShaderMaterial({
            uniforms,
            vertexShader: fishVertexShader,
            fragmentShader: fishFragmentShader,
            side: DoubleSide,
            transparent: true,
          }),
      ),
    [uniformsArray],
  )

  useEffect(() => {
    return () => {
      fishGeometry.dispose()
      materialsArray.forEach((m) => m.dispose())
    }
  }, [fishGeometry, materialsArray])

  const boidsRef = useRef(createBoidsState())
  const hashRef = useRef(new SpatialHash(CELL_SIZE))
  const neighborBufRef = useRef(new Int32Array(MAX_NEIGHBORS))
  const motionRef = useRef(createMotionState())

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const motion = motionRef.current

    sampleMotionState(t, motion)
    updateBoids(
      boidsRef.current,
      hashRef.current,
      neighborBufRef.current,
      delta,
      t,
      motion,
    )

    const { posX, posY, posZ, velX, velY, velZ } = boidsRef.current
    const matrix = matrixWS.current
    const pos = posWS.current
    const euler = eulerWS.current
    const shaderEnergy = motion.energy + motion.flashPulse * 0.35

    for (let ci = 0; ci < FISH_COLORS.length; ci++) {
      const mesh = meshRefs.current[ci]
      if (!mesh) continue

      uniformsArray[ci].time.value = t
      uniformsArray[ci].energy.value = shaderEnergy

      const offset = ci * FISH_COUNT_PER_COLOR
      for (let fi = 0; fi < FISH_COUNT_PER_COLOR; fi++) {
        const idx = offset + fi
        const heading = Math.atan2(velX[idx], velZ[idx])
        const horizontalSpeed =
          Math.sqrt(velX[idx] * velX[idx] + velZ[idx] * velZ[idx]) + 0.0001
        const pitch = Math.atan2(velY[idx], horizontalSpeed) * 0.55
        const sway =
          0.12 * Math.sin(t * (2.0 + shaderEnergy * 1.1) + idx * 0.37)
        const bank = Math.sin(t * 2.2 + idx * 0.29) * (0.04 + shaderEnergy * 0.08)

        pos.set(posX[idx], posY[idx], posZ[idx])
        euler.set(-pitch, heading + sway, bank)
        matrix.makeRotationFromEuler(euler)
        matrix.setPosition(pos)

        mesh.setMatrixAt(fi, matrix)
      }

      updateFishMeshBounds(mesh)
    }
  })

  return (
    <>
      {FISH_COLORS.map((_color, ci) => (
        <instancedMesh
          key={FISH_COLORS[ci]}
          ref={(el) => {
            meshRefs.current[ci] = el
          }}
          args={[fishGeometry, materialsArray[ci], FISH_COUNT_PER_COLOR]}
        />
      ))}
      <BubbleParticles />
      <LightMotes />
    </>
  )
}
