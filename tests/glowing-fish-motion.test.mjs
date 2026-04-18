import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  GLOWING_FISH_MODE_SCHEDULE,
  GLOWING_FISH_MOTION_CYCLE_DURATION,
  createMotionState,
  sampleMotionState,
} from '../src/components/GlowingFish/motion.ts'

const approx = (actual, expected, epsilon = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  )
}

const midpointFor = (id) => {
  const mode = GLOWING_FISH_MODE_SCHEDULE.find((entry) => entry.id === id)
  assert.ok(mode, `mode ${id} exists`)
  return mode.startTime + mode.duration / 2
}

test('glowing fish motion schedule exposes readable names and explicit switch seconds', () => {
  assert.deepEqual(
    GLOWING_FISH_MODE_SCHEDULE.map(({ id, label, duration, startTime, endTime }) => ({
      id,
      label,
      duration,
      startTime,
      endTime,
    })),
    [
      { id: 'drift', label: 'ドリフト遊泳', duration: 14, startTime: 0, endTime: 14 },
      { id: 'wild-random', label: '完全ランダム遊泳', duration: 12, startTime: 14, endTime: 26 },
      { id: 'color-school', label: '同色魚群', duration: 16, startTime: 26, endTime: 42 },
      { id: 'mixed-school', label: '混色魚群', duration: 14, startTime: 42, endTime: 56 },
      { id: 'vortex-orbit', label: '渦旋回', duration: 14, startTime: 56, endTime: 70 },
      { id: 'showcase-ribbon', label: 'ショーケース隊列', duration: 14, startTime: 70, endTime: 84 },
    ],
  )
  assert.equal(GLOWING_FISH_MOTION_CYCLE_DURATION, 84)
})

test('sampleMotionState preserves same-color schooling and adds random plus mixed-color presets', () => {
  const state = createMotionState()

  sampleMotionState(midpointFor('color-school'), state)
  approx(state.schoolMix, 0)
  approx(state.colorAffinity, 1)
  approx(state.schoolSpacing, 2)
  approx(state.schoolClusterSpread, 1)
  assert.ok(state.alignment > 1)
  assert.ok(state.cohesion >= 1.08)

  sampleMotionState(midpointFor('wild-random'), state)
  approx(state.randomDrift, 1)
  assert.ok(state.colorAffinity < 0.1)
  assert.ok(state.alignment < 0.15)
  assert.ok(state.cohesion < 0.08)
  assert.ok(state.wander >= 2.2)
  assert.ok(state.flashTurn >= 0.16)
  assert.ok(state.speed >= 1.16)

  sampleMotionState(midpointFor('mixed-school'), state)
  approx(state.schoolMix, 1)
  approx(state.colorAffinity, 0)
  approx(state.schoolSpacing, 2.05)
  approx(state.schoolClusterSpread, 0.1)
  assert.ok(state.alignment >= 1.18)
  assert.ok(state.cohesion >= 1.34)
})

test('GlowingFish update keeps the spatial hash and consumes the new motion axes', () => {
  const source = fs.readFileSync(
    new URL('../src/components/GlowingFish/index.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /hash\.queryInto\(/)
  assert.match(source, /motion\.schoolMix/)
  assert.match(source, /motion\.colorAffinity/)
  assert.match(source, /motion\.randomDrift/)
  assert.match(source, /motion\.schoolSpacing/)
  assert.match(source, /motion\.schoolClusterSpread/)
  assert.match(source, /SEPARATION_RADIUS \* schoolSpacing/)
  assert.doesNotMatch(source, /for \(let j = 0; j < n; j\+\+\)/)
})
