import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(
  new URL('../src/components/GlowingFish/index.tsx', import.meta.url),
  'utf8',
)

test('GlowingFish reverts fish control to the pre-boids elliptical orbit animation', () => {
  assert.match(source, /interface FishInstanceParams/)
  assert.match(source, /cx: \(Math\.random\(\) - 0\.5\) \* 60,/)
  assert.match(source, /cy: 2 \+ Math\.random\(\) \* 13,/)
  assert.match(source, /cz: \(Math\.random\(\) - 0\.5\) \* 60,/)
  assert.match(source, /const angle = p\.speed \* t \+ p\.phase/)
  assert.match(source, /const x = p\.cx \+ p\.rx \* Math\.cos\(angle\)/)
  assert.match(source, /const y = p\.cy \+ p\.yAmp \* Math\.sin\(p\.yFreq \* t \+ p\.phase\)/)
  assert.match(source, /const z = p\.cz \+ p\.rz \* Math\.sin\(angle\)/)
  assert.match(source, /const heading = Math\.atan2\(dx, dz\)/)
  assert.match(source, /euler\.set\(0, heading \+ sway, 0\)/)

  assert.doesNotMatch(source, /from '\.\/motion'/)
  assert.doesNotMatch(source, /sampleMotionState\(/)
  assert.doesNotMatch(source, /hash\.queryInto\(/)
  assert.doesNotMatch(source, /interface BoidsState/)
})

test('GlowingFish keeps rising bubble and floating light effects', () => {
  assert.match(source, /function BubbleParticles\(\)/)
  assert.match(source, /worldCenter\.y \+= life \* 5\.0;/)
  assert.match(source, /function LightMotes\(\)/)
  assert.match(source, /worldCenter\.y \+= sin\(time \* 0\.7 \+ instancePhase \* 12\.0\) \* 0\.8;/)
  assert.match(source, /<BubbleParticles \/>/)
  assert.match(source, /<LightMotes \/>/)
})

test('GlowingFish updates instanced bounds so moving schools are not frustum-culled from the origin', () => {
  const source = fs.readFileSync(
    new URL('../src/components/GlowingFish/index.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /function updateFishMeshBounds\(mesh: InstancedMesh \| null\)/)
  assert.match(source, /mesh\.computeBoundingSphere\(\)/)
  assert.match(source, /updateFishMeshBounds\(mesh\)/)
})

test('GlowingFish shader spreads palette colours across the body instead of only tinting the tail', () => {
  const source = fs.readFileSync(
    new URL('../src/components/GlowingFish/index.tsx', import.meta.url),
    'utf8',
  )

  assert.match(source, /uniform vec3 accentColor;/)
  assert.match(source, /vec3 rainbowBody = mix\(color, accentColor, bodyBlend\);/)
  assert.match(source, /mix\(rainbowBody, mix\(color, accentColor, iri\), 0\.28\)/)
})
