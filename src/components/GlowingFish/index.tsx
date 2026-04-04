import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const FISH_COUNT_PER_COLOR = 150

const FISH_COLORS = [
  '#ff4466', // ピンク
  '#44ffaa', // エメラルドグリーン
  '#4488ff', // ブルー
  '#ffaa44', // オレンジ
  '#aa44ff', // パープル
  '#44ffff', // シアン
  '#ffff44', // イエロー
]

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

const vertexShader = `
  void main() {
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform vec3 color;
  uniform float time;
  void main() {
    float glow = 0.85 + 0.15 * sin(time * 2.0);
    gl_FragColor = vec4(color * glow, 1.0);
  }
`

function createFishGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()

  // Body key vertices
  const nose: number[] = [0, 0, 0.3]
  const top: number[] = [0, 0.05, 0.0]
  const bottom: number[] = [0, -0.05, 0.0]
  const left: number[] = [-0.1, 0, 0.0]
  const right: number[] = [0.1, 0, 0.0]
  const tailBase: number[] = [0, 0, -0.25]
  // Tail fin vertices
  const tailLeft: number[] = [-0.15, 0, -0.45]
  const tailRight: number[] = [0.15, 0, -0.45]

  const positions = new Float32Array([
    // Front cone (nose → midsection)
    ...nose, ...top, ...right,
    ...nose, ...right, ...bottom,
    ...nose, ...bottom, ...left,
    ...nose, ...left, ...top,
    // Back cone (midsection → tailBase)
    ...tailBase, ...right, ...top,
    ...tailBase, ...bottom, ...right,
    ...tailBase, ...left, ...bottom,
    ...tailBase, ...top, ...left,
    // Tail fin (two triangles)
    ...tailBase, ...tailLeft, ...tailRight,
  ])

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.computeVertexNormals()

  return geometry
}

export function GlowingFish() {
  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>(
    FISH_COLORS.map(() => null),
  )

  // Reusable objects — avoid allocations in useFrame
  const matrixWS = useRef(new THREE.Matrix4())
  const posWS = useRef(new THREE.Vector3())
  const eulerWS = useRef(new THREE.Euler())

  const fishGeometry = useMemo(() => createFishGeometry(), [])

  const uniformsArray = useMemo(
    () =>
      FISH_COLORS.map((colorHex) => ({
        color: { value: new THREE.Color(colorHex) },
        time: { value: 0 },
      })),
    [],
  )

  const materialsArray = useMemo(
    () =>
      uniformsArray.map(
        (uniforms) =>
          new THREE.ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide,
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
        (_, ci) => (el: THREE.InstancedMesh | null) => {
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
    </>
  )
}
