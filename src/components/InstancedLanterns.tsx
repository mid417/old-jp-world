import { useRef, useMemo, useEffect } from 'react'
import { Object3D, CylinderGeometry, BoxGeometry, MeshStandardMaterial } from 'three'
import type { InstancedMesh } from 'three'
import { COLORS, STREET_LANTERNS, DETAIL_DISTRICT_RADIUS, type LanternConfig } from '../constants'
import { useDistanceVisible } from '../hooks/useLodLevel'

function updateInstancedMeshBounds(mesh: InstancedMesh | null) {
  if (!mesh) return

  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()
}

export function InstancedLanterns() {
  const count = STREET_LANTERNS.length

  const poleRef = useRef<InstancedMesh>(null)
  const crossbarRef = useRef<InstancedMesh>(null)
  const bodyRef = useRef<InstancedMesh>(null)

  const resources = useMemo(() => ({
    poleGeo: new CylinderGeometry(0.09, 0.11, 1, 10),
    crossbarGeo: new BoxGeometry(0.85, 0.08, 0.08),
    bodyGeo: new CylinderGeometry(0.22, 0.28, 0.52, 14),
    poleMat: new MeshStandardMaterial({ color: COLORS.machiya.trim, roughness: 0.86 }),
    crossbarMat: new MeshStandardMaterial({ color: COLORS.machiya.trim, roughness: 0.82 }),
    bodyMat: new MeshStandardMaterial({
      color: COLORS.lantern.paper,
      emissive: COLORS.lantern.glow,
      emissiveIntensity: 2.2,
      roughness: 0.7,
    }),
  }), [])

  useEffect(() => {
    const dummy = new Object3D()

    for (let i = 0; i < count; i++) {
      const lantern = STREET_LANTERNS[i]
      const [x, y, z] = lantern.position

      dummy.position.set(x, y + lantern.height / 2, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, lantern.height, 1)
      dummy.updateMatrix()
      poleRef.current?.setMatrixAt(i, dummy.matrix)

      dummy.position.set(x, y + lantern.height + 0.12, z)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      crossbarRef.current?.setMatrixAt(i, dummy.matrix)

      dummy.position.set(x, y + lantern.height - 0.12, z)
      dummy.updateMatrix()
      bodyRef.current?.setMatrixAt(i, dummy.matrix)
    }

    updateInstancedMeshBounds(poleRef.current)
    updateInstancedMeshBounds(crossbarRef.current)
    updateInstancedMeshBounds(bodyRef.current)
  }, [count])

  useEffect(() => {
    return () => {
      resources.poleGeo.dispose()
      resources.crossbarGeo.dispose()
      resources.bodyGeo.dispose()
      resources.poleMat.dispose()
      resources.crossbarMat.dispose()
      resources.bodyMat.dispose()
    }
  }, [resources])

  return (
    <>
      <instancedMesh ref={poleRef} args={[resources.poleGeo, resources.poleMat, count]} />
      <instancedMesh ref={crossbarRef} args={[resources.crossbarGeo, resources.crossbarMat, count]} />
      <instancedMesh ref={bodyRef} args={[resources.bodyGeo, resources.bodyMat, count]} />

      {STREET_LANTERNS.map((lantern) => (
        <LanternLight key={lantern.name} lantern={lantern} />
      ))}
    </>
  )
}

function LanternLight({ lantern }: { lantern: LanternConfig }) {
  const visible = useDistanceVisible(lantern.position, DETAIL_DISTRICT_RADIUS)
  if (!visible) return null

  return (
    <pointLight
      color={COLORS.lighting.warm}
      intensity={lantern.intensity}
      distance={10}
      decay={2}
      position={[
        lantern.position[0],
        lantern.position[1] + lantern.height - 0.1,
        lantern.position[2],
      ]}
    />
  )
}
