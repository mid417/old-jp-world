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

// ── Constants ──────────────────────────────────────────────

const FISH_COUNT_PER_COLOR = 200
const BUBBLE_COUNT = 400
const MOTE_COUNT = 300

const FISH_COLORS = [
  '#ff4466', // ピンク
  '#44ffaa', // エメラルドグリーン
  '#4488ff', // ブルー
  '#ffaa44', // オレンジ
  '#aa44ff', // パープル
  '#44ffff', // シアン
  '#ffff44', // イエロー
]

// ── Types ──────────────────────────────────────────────────

interface FishInstanceParams {
  cx: number
  cy: number
  cz: number
  rx: number
  rz: number
  speed: number
  phase: number
  yAmp: number
  yFreq: number
  swayAmp: number
  swayFreq: number
}

// ── Fish Shaders (enhanced) ────────────────────────────────

const fishVertexShader = /* glsl */ `
  attribute float instancePhase;

  uniform float time;

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
    float waveSpeed = 8.0 + instancePhase * 4.0;
    pos.x += sin(time * waveSpeed + instancePhase * 6.2832 + bodyPos * 4.5)
             * bodyPos * bodyPos * 0.035;

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
  uniform float time;

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

    // Iridescent colour shift along the body
    float iri = sin(vBodyPos * 8.0 + time * 1.2 + vPhase * 6.2832) * 0.5 + 0.5;
    vec3 shiftColor = mix(color, color.gbr, iri * 0.35);

    // Scale-shimmer sparkle highlights
    float sparkle = sin(time * 15.0 + vPhase * 37.0 + vBodyPos * 25.0);
    sparkle = pow(max(sparkle, 0.0), 16.0) * 0.5;

    // Breathing glow pulse
    float breathe = 0.75 + 0.25 * sin(time * 2.5 + vPhase * 6.2832);

    // Core colour
    vec3 core = shiftColor * breathe;

    // Rim light
    vec3 rimColor = mix(color * 2.0, vec3(1.0), 0.3);
    core += rimColor * fresnel * 0.8;

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

  // Reusable objects — avoid allocations in useFrame
  const matrixWS = useRef(new Matrix4())
  const posWS = useRef(new Vector3())
  const eulerWS = useRef(new Euler())

  const fishGeometry = useMemo(() => createFishGeometry(), [])

  const uniformsArray = useMemo(
    () =>
      FISH_COLORS.map((colorHex) => ({
        color: { value: new Color(colorHex) },
        time: { value: 0 },
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

  const refCallbacks = useMemo(
    () =>
      FISH_COLORS.map(
        (_, ci) => (el: InstancedMesh | null) => {
          meshRefs.current[ci] = el
        },
      ),
    [],
  )

  const fishParamsArray = useMemo<FishInstanceParams[][]>(
    () =>
      FISH_COLORS.map(() =>
        Array.from({ length: FISH_COUNT_PER_COLOR }, () => ({
          cx: (Math.random() - 0.5) * 60,
          cy: 2 + Math.random() * 13,
          cz: (Math.random() - 0.5) * 60,
          rx: 5 + Math.random() * 15,
          rz: 5 + Math.random() * 15,
          speed: 0.2 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
          yAmp: 0.5 + Math.random() * 1.5,
          yFreq: 0.5 + Math.random() * 2.5,
          swayAmp: 0.2 + Math.random() * 0.3,
          swayFreq: 1 + Math.random() * 3,
        })),
      ),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const matrix = matrixWS.current
    const pos = posWS.current
    const euler = eulerWS.current

    for (let ci = 0; ci < FISH_COLORS.length; ci++) {
      const mesh = meshRefs.current[ci]
      if (!mesh) continue

      uniformsArray[ci].time.value = t

      const params = fishParamsArray[ci]
      for (let i = 0; i < FISH_COUNT_PER_COLOR; i++) {
        const p = params[i]
        const angle = p.speed * t + p.phase

        const x = p.cx + p.rx * Math.cos(angle)
        const y = p.cy + p.yAmp * Math.sin(p.yFreq * t + p.phase)
        const z = p.cz + p.rz * Math.sin(angle)

        // Tangent direction of the ellipse → yaw angle
        const dx = -p.rx * Math.sin(angle)
        const dz = p.rz * Math.cos(angle)
        const heading = Math.atan2(dx, dz)

        // Gentle body sway around Y axis
        const sway = p.swayAmp * Math.sin(p.swayFreq * t + p.phase)

        pos.set(x, y, z)
        euler.set(0, heading + sway, 0)
        matrix.makeRotationFromEuler(euler)
        matrix.setPosition(pos)

        mesh.setMatrixAt(i, matrix)
      }

      mesh.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <>
      {FISH_COLORS.map((_color, ci) => (
        <instancedMesh
          key={FISH_COLORS[ci]}
          ref={refCallbacks[ci]}
          args={[fishGeometry, materialsArray[ci], FISH_COUNT_PER_COLOR]}
        />
      ))}
      <BubbleParticles />
      <LightMotes />
    </>
  )
}
