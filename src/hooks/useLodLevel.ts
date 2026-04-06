import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'

export type LodLevel = 'near' | 'mid' | 'far'

const HYSTERESIS = 2

export function useLodLevel(
  worldPosition: [number, number, number],
  nearThreshold: number,
  farThreshold: number,
): LodLevel {
  const [lodLevel, setLodLevel] = useState<LodLevel>('far')
  const currentRef = useRef<LodLevel>('far')

  useFrame(({ camera }) => {
    const dx = worldPosition[0] - camera.position.x
    const dz = worldPosition[2] - camera.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const current = currentRef.current
    let next: LodLevel

    if (current === 'near') {
      next = dist >= farThreshold + HYSTERESIS ? 'far' : dist >= nearThreshold + HYSTERESIS ? 'mid' : 'near'
    } else if (current === 'mid') {
      next = dist < nearThreshold - HYSTERESIS ? 'near' : dist >= farThreshold + HYSTERESIS ? 'far' : 'mid'
    } else {
      next = dist < nearThreshold - HYSTERESIS ? 'near' : dist < farThreshold - HYSTERESIS ? 'mid' : 'far'
    }

    if (next !== current) {
      currentRef.current = next
      setLodLevel(next)
    }
  })

  return lodLevel
}

export function useDistanceVisible(
  worldPosition: [number, number, number],
  threshold: number,
): boolean {
  const [visible, setVisible] = useState(false)
  const currentRef = useRef(false)

  useFrame(({ camera }) => {
    const dx = worldPosition[0] - camera.position.x
    const dz = worldPosition[2] - camera.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    const current = currentRef.current
    const next = current ? dist < threshold + HYSTERESIS : dist < threshold - HYSTERESIS

    if (next !== current) {
      currentRef.current = next
      setVisible(next)
    }
  })

  return visible
}
