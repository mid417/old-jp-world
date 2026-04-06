import { useRef, useMemo, cloneElement, isValidElement, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Frustum, Matrix4, Sphere, Vector3 } from 'three'
import type { Group } from 'three'
import { DETAIL_DISTRICT_RADIUS } from '../constants'

const CHUNK_SIZE = DETAIL_DISTRICT_RADIUS

const _frustum = new Frustum()
const _matrix = new Matrix4()

interface ChunkItem {
  key: string
  position: [number, number, number]
  element: ReactNode
}

interface ChunkDef {
  key: string
  sphere: Sphere
  children: ReactNode[]
}

function buildChunks(items: ChunkItem[]): ChunkDef[] {
  const map = new Map<
    string,
    { elements: ReactNode[]; minX: number; maxX: number; minZ: number; maxZ: number; maxY: number }
  >()

  for (const item of items) {
    const cx = Math.floor(item.position[0] / CHUNK_SIZE)
    const cz = Math.floor(item.position[2] / CHUNK_SIZE)
    const chunkKey = `chunk-${cx}-${cz}`

    let chunk = map.get(chunkKey)
    if (!chunk) {
      chunk = { elements: [], minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, maxY: 0 }
      map.set(chunkKey, chunk)
    }
    const el = isValidElement(item.element)
      ? cloneElement(item.element, { key: item.key })
      : item.element
    chunk.elements.push(el)
    chunk.minX = Math.min(chunk.minX, item.position[0])
    chunk.maxX = Math.max(chunk.maxX, item.position[0])
    chunk.minZ = Math.min(chunk.minZ, item.position[2])
    chunk.maxZ = Math.max(chunk.maxZ, item.position[2])
    chunk.maxY = Math.max(chunk.maxY, item.position[1])
  }

  const result: ChunkDef[] = []
  for (const [key, chunk] of map) {
    const centerX = (chunk.minX + chunk.maxX) / 2
    const centerZ = (chunk.minZ + chunk.maxZ) / 2
    const halfWidth = (chunk.maxX - chunk.minX) / 2 + 12
    const halfDepth = (chunk.maxZ - chunk.minZ) / 2 + 12
    const halfHeight = Math.max(chunk.maxY, 8) + 4
    const radius = Math.sqrt(halfWidth * halfWidth + halfDepth * halfDepth + halfHeight * halfHeight)

    result.push({
      key,
      sphere: new Sphere(new Vector3(centerX, halfHeight * 0.5, centerZ), radius),
      children: chunk.elements,
    })
  }

  return result
}

export function ChunkManager({ items }: { items: ChunkItem[] }) {
  const chunks = useMemo(() => buildChunks(items), [items])
  const groupRefs = useRef<(Group | null)[]>([])

  useFrame(({ camera }) => {
    _matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    _frustum.setFromProjectionMatrix(_matrix)

    const refs = groupRefs.current
    for (let i = 0; i < chunks.length; i++) {
      const group = refs[i]
      if (group) {
        group.visible = _frustum.intersectsSphere(chunks[i].sphere)
      }
    }
  })

  return (
    <>
      {chunks.map((chunk, i) => (
        <group
          key={chunk.key}
          ref={(el: Group | null) => {
            groupRefs.current[i] = el
          }}
        >
          {chunk.children}
        </group>
      ))}
    </>
  )
}
