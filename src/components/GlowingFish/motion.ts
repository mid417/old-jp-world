export interface MotionPreset {
  separation: number
  alignment: number
  cohesion: number
  wander: number
  drift: number
  vortex: number
  wave: number
  formation: number
  flashTurn: number
  speed: number
  energy: number
  schoolMix: number
  colorAffinity: number
  randomDrift: number
  schoolSpacing: number
  schoolClusterSpread: number
}

export interface MotionState extends MotionPreset {
  flashPulse: number
}

export interface MotionModeDefinition {
  id: string
  label: string
  duration: number
  preset: MotionPreset
}

export interface MotionModeScheduleEntry extends MotionModeDefinition {
  startTime: number
  endTime: number
}

const MODE_TRANSITION_DURATION = 4.5

export const GLOWING_FISH_MODE_SEQUENCE: ReadonlyArray<MotionModeDefinition> = [
  {
    id: 'drift',
    label: 'ドリフト遊泳',
    duration: 14,
    preset: {
      separation: 0.82,
      alignment: 0.22,
      cohesion: 0.14,
      wander: 1.55,
      drift: 1.0,
      vortex: 0.04,
      wave: 0.18,
      formation: 0.0,
      flashTurn: 0.0,
      speed: 0.9,
      energy: 0.22,
      schoolMix: 0.15,
      colorAffinity: 0.72,
      randomDrift: 0.22,
      schoolSpacing: 1.12,
      schoolClusterSpread: 0.72,
    },
  },
  {
    id: 'wild-random',
    label: '完全ランダム遊泳',
    duration: 12,
    preset: {
      separation: 1.06,
      alignment: 0.12,
      cohesion: 0.05,
      wander: 2.28,
      drift: 0.72,
      vortex: 0.0,
      wave: 0.3,
      formation: 0.0,
      flashTurn: 0.16,
      speed: 1.16,
      energy: 0.44,
      schoolMix: 0.12,
      colorAffinity: 0.06,
      randomDrift: 1.0,
      schoolSpacing: 1.14,
      schoolClusterSpread: 0.54,
    },
  },
  {
    id: 'color-school',
    label: '同色魚群',
    duration: 16,
    preset: {
      separation: 1.12,
      alignment: 1.1,
      cohesion: 1.08,
      wander: 0.56,
      drift: 0.24,
      vortex: 0.0,
      wave: 0.28,
      formation: 0.0,
      flashTurn: 0.24,
      speed: 0.98,
      energy: 0.4,
      schoolMix: 0.0,
      colorAffinity: 1.0,
      randomDrift: 0.08,
      schoolSpacing: 2.0,
      schoolClusterSpread: 1.0,
    },
  },
  {
    id: 'mixed-school',
    label: '混色魚群',
    duration: 14,
    preset: {
      separation: 1.18,
      alignment: 1.18,
      cohesion: 1.34,
      wander: 0.38,
      drift: 0.16,
      vortex: 0.0,
      wave: 0.24,
      formation: 0.0,
      flashTurn: 0.12,
      speed: 0.98,
      energy: 0.52,
      schoolMix: 1.0,
      colorAffinity: 0.0,
      randomDrift: 0.1,
      schoolSpacing: 2.05,
      schoolClusterSpread: 0.1,
    },
  },
  {
    id: 'vortex-orbit',
    label: '渦旋回',
    duration: 14,
    preset: {
      separation: 1.02,
      alignment: 0.82,
      cohesion: 0.42,
      wander: 0.28,
      drift: 0.4,
      vortex: 1.0,
      wave: 1.0,
      formation: 0.0,
      flashTurn: 0.82,
      speed: 1.2,
      energy: 0.84,
      schoolMix: 0.42,
      colorAffinity: 0.7,
      randomDrift: 0.12,
      schoolSpacing: 1.46,
      schoolClusterSpread: 0.42,
    },
  },
  {
    id: 'showcase-ribbon',
    label: 'ショーケース隊列',
    duration: 14,
    preset: {
      separation: 0.84,
      alignment: 0.62,
      cohesion: 0.28,
      wander: 0.1,
      drift: 0.6,
      vortex: 0.42,
      wave: 1.15,
      formation: 1.0,
      flashTurn: 1.18,
      speed: 1.08,
      energy: 1.0,
      schoolMix: 0.28,
      colorAffinity: 0.86,
      randomDrift: 0.06,
      schoolSpacing: 1.72,
      schoolClusterSpread: 0.34,
    },
  },
]

export const GLOWING_FISH_MODE_SCHEDULE: ReadonlyArray<MotionModeScheduleEntry> = (() => {
  let elapsed = 0

  return GLOWING_FISH_MODE_SEQUENCE.map((mode) => {
    const startTime = elapsed
    elapsed += mode.duration
    return {
      ...mode,
      startTime,
      endTime: elapsed,
    }
  })
})()

export const GLOWING_FISH_MOTION_CYCLE_DURATION =
  GLOWING_FISH_MODE_SCHEDULE[GLOWING_FISH_MODE_SCHEDULE.length - 1]?.endTime ?? 0

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function smoothstep01(t: number) {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

export function createMotionState(): MotionState {
  return {
    ...GLOWING_FISH_MODE_SEQUENCE[0].preset,
    flashPulse: 0,
  }
}

export function sampleMotionState(time: number, out: MotionState) {
  let localTime = time % GLOWING_FISH_MOTION_CYCLE_DURATION
  let currentIndex = 0

  while (localTime >= GLOWING_FISH_MODE_SEQUENCE[currentIndex].duration) {
    localTime -= GLOWING_FISH_MODE_SEQUENCE[currentIndex].duration
    currentIndex = (currentIndex + 1) % GLOWING_FISH_MODE_SEQUENCE.length
  }

  const current = GLOWING_FISH_MODE_SEQUENCE[currentIndex]
  const next = GLOWING_FISH_MODE_SEQUENCE[(currentIndex + 1) % GLOWING_FISH_MODE_SEQUENCE.length]
  const blendWindow = Math.min(MODE_TRANSITION_DURATION, current.duration * 0.45)
  const blendStart = current.duration - blendWindow
  const blend =
    localTime > blendStart
      ? smoothstep01((localTime - blendStart) / Math.max(blendWindow, 0.0001))
      : 0

  out.separation = lerp(current.preset.separation, next.preset.separation, blend)
  out.alignment = lerp(current.preset.alignment, next.preset.alignment, blend)
  out.cohesion = lerp(current.preset.cohesion, next.preset.cohesion, blend)
  out.wander = lerp(current.preset.wander, next.preset.wander, blend)
  out.drift = lerp(current.preset.drift, next.preset.drift, blend)
  out.vortex = lerp(current.preset.vortex, next.preset.vortex, blend)
  out.wave = lerp(current.preset.wave, next.preset.wave, blend)
  out.formation = lerp(current.preset.formation, next.preset.formation, blend)
  out.flashTurn = lerp(current.preset.flashTurn, next.preset.flashTurn, blend)
  out.speed = lerp(current.preset.speed, next.preset.speed, blend)
  out.energy = lerp(current.preset.energy, next.preset.energy, blend)
  out.schoolMix = lerp(current.preset.schoolMix, next.preset.schoolMix, blend)
  out.colorAffinity = lerp(current.preset.colorAffinity, next.preset.colorAffinity, blend)
  out.randomDrift = lerp(current.preset.randomDrift, next.preset.randomDrift, blend)
  out.schoolSpacing = lerp(current.preset.schoolSpacing, next.preset.schoolSpacing, blend)
  out.schoolClusterSpread = lerp(
    current.preset.schoolClusterSpread,
    next.preset.schoolClusterSpread,
    blend,
  )
  out.flashPulse = out.flashTurn * Math.pow(Math.max(0, Math.sin(time * 0.92 - 0.45)), 8)
}