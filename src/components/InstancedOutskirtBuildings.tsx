import { useRef, useMemo, useEffect } from 'react'
import { Object3D, BoxGeometry, MeshStandardMaterial } from 'three'
import type { InstancedMesh } from 'three'
import {
  COLORS,
  OUTSKIRT_BUILDINGS,
  getOutskirtBodyMetrics,
  getOutskirtRoofGeometry,
} from '../constants'

function updateInstancedMeshBounds(mesh: InstancedMesh | null) {
  if (!mesh) return

  mesh.instanceMatrix.needsUpdate = true
  mesh.computeBoundingBox()
  mesh.computeBoundingSphere()
}

export function InstancedOutskirtBuildings() {
  const buildingCount = OUTSKIRT_BUILDINGS.length

  const metrics = useMemo(
    () =>
      OUTSKIRT_BUILDINGS.map((building) => ({
        building,
        body: getOutskirtBodyMetrics(building),
        roof: getOutskirtRoofGeometry(building),
      })),
    [],
  )

  const wallCount = buildingCount * 2
  const trimCount = buildingCount
  const windowCount = buildingCount
  const roofSlopeCount = buildingCount * 2
  const ridgeCount = buildingCount

  const wallRef = useRef<InstancedMesh>(null)
  const trimRef = useRef<InstancedMesh>(null)
  const windowRef = useRef<InstancedMesh>(null)
  const roofRef = useRef<InstancedMesh>(null)
  const ridgeRef = useRef<InstancedMesh>(null)

  const resources = useMemo(
    () => ({
      unitBox: new BoxGeometry(1, 1, 1),
      plasterMat: new MeshStandardMaterial({ color: COLORS.machiya.plaster, roughness: 0.96 }),
      trimMat: new MeshStandardMaterial({ color: COLORS.machiya.trim, roughness: 0.84 }),
      windowMat: new MeshStandardMaterial({
        color: COLORS.machiya.screen,
        emissive: COLORS.lantern.paper,
        emissiveIntensity: 0.08,
        roughness: 0.98,
      }),
      roofMat: new MeshStandardMaterial({ color: COLORS.machiya.roof, roughness: 0.78 }),
      ridgeMat: new MeshStandardMaterial({ color: COLORS.machiya.trim, roughness: 0.8 }),
    }),
    [],
  )

  useEffect(() => {
    const buildingNode = new Object3D()
    const childNode = new Object3D()
    buildingNode.add(childNode)

    const roofBuildingNode = new Object3D()
    const slopeNode = new Object3D()
    const slopeMeshNode = new Object3D()
    roofBuildingNode.add(slopeNode)
    slopeNode.add(slopeMeshNode)

    let wallIdx = 0
    let trimIdx = 0
    let windowIdx = 0
    let roofIdx = 0
    let ridgeIdx = 0

    for (const { building, body: bodyMetrics, roof: roofGeometry } of metrics) {
      const [bx, by, bz] = building.position

      // Lower wall body
      buildingNode.position.set(bx, by, bz)
      buildingNode.rotation.set(0, building.rotationY, 0)
      childNode.position.set(0, bodyMetrics.lowerHeight / 2, 0)
      childNode.rotation.set(0, 0, 0)
      childNode.scale.set(building.width, bodyMetrics.lowerHeight, building.depth)
      buildingNode.updateMatrixWorld(true)
      wallRef.current?.setMatrixAt(wallIdx++, childNode.matrixWorld)

      // Upper wall body or loft
      if (building.stories === 2) {
        childNode.position.set(0, bodyMetrics.lowerHeight + bodyMetrics.upperHeight / 2, 0)
        childNode.scale.set(bodyMetrics.upperWidth, bodyMetrics.upperHeight, bodyMetrics.upperDepth)
      } else {
        childNode.position.set(0, building.height * 0.68, 0)
        childNode.scale.set(building.width * 0.92, building.height * 0.18, building.depth * 0.9)
      }
      buildingNode.updateMatrixWorld(true)
      wallRef.current?.setMatrixAt(wallIdx++, childNode.matrixWorld)

      // Trim band
      childNode.position.set(0, bodyMetrics.lowerHeight + 0.08, 0)
      childNode.scale.set(building.width + 0.18, 0.12, building.depth + 0.22)
      buildingNode.updateMatrixWorld(true)
      trimRef.current?.setMatrixAt(trimIdx++, childNode.matrixWorld)

      // Window band
      childNode.position.set(0, bodyMetrics.windowBandY, building.depth / 2 - 0.04)
      childNode.scale.set(
        building.width * 0.58,
        building.stories === 2 ? 0.54 : 0.42,
        0.08,
      )
      buildingNode.updateMatrixWorld(true)
      windowRef.current?.setMatrixAt(windowIdx++, childNode.matrixWorld)

      // Roof slopes
      roofBuildingNode.position.set(bx, by, bz)
      roofBuildingNode.rotation.set(0, building.rotationY, 0)

      // Left slope (direction=1)
      slopeNode.position.set(-roofGeometry.roofSeatHalfWidth, roofGeometry.roofSeatY, 0)
      slopeNode.rotation.set(0, 0, roofGeometry.pitch)
      slopeMeshNode.position.set(roofGeometry.mainSpan * 0.5, roofGeometry.thickness * 0.5, 0)
      slopeMeshNode.rotation.set(0, 0, 0)
      slopeMeshNode.scale.set(roofGeometry.mainSpan, roofGeometry.thickness, roofGeometry.roofDepth)
      roofBuildingNode.updateMatrixWorld(true)
      roofRef.current?.setMatrixAt(roofIdx++, slopeMeshNode.matrixWorld)

      // Right slope (direction=-1)
      slopeNode.position.set(roofGeometry.roofSeatHalfWidth, roofGeometry.roofSeatY, 0)
      slopeNode.rotation.set(0, 0, -roofGeometry.pitch)
      slopeMeshNode.position.set(-roofGeometry.mainSpan * 0.5, roofGeometry.thickness * 0.5, 0)
      roofBuildingNode.updateMatrixWorld(true)
      roofRef.current?.setMatrixAt(roofIdx++, slopeMeshNode.matrixWorld)

      // Ridge
      childNode.position.set(0, roofGeometry.ridgeBaseY + roofGeometry.ridgeHeight / 2, 0)
      childNode.scale.set(roofGeometry.ridgeWidth, roofGeometry.ridgeHeight, roofGeometry.roofDepth + 0.08)
      buildingNode.updateMatrixWorld(true)
      ridgeRef.current?.setMatrixAt(ridgeIdx++, childNode.matrixWorld)
    }

    updateInstancedMeshBounds(wallRef.current)
    updateInstancedMeshBounds(trimRef.current)
    updateInstancedMeshBounds(windowRef.current)
    updateInstancedMeshBounds(roofRef.current)
    updateInstancedMeshBounds(ridgeRef.current)
  }, [metrics])

  useEffect(() => {
    return () => {
      resources.unitBox.dispose()
      resources.plasterMat.dispose()
      resources.trimMat.dispose()
      resources.windowMat.dispose()
      resources.roofMat.dispose()
      resources.ridgeMat.dispose()
    }
  }, [resources])

  return (
    <>
      <instancedMesh ref={wallRef} args={[resources.unitBox, resources.plasterMat, wallCount]} />
      <instancedMesh ref={trimRef} args={[resources.unitBox, resources.trimMat, trimCount]} />
      <instancedMesh ref={windowRef} args={[resources.unitBox, resources.windowMat, windowCount]} />
      <instancedMesh ref={roofRef} args={[resources.unitBox, resources.roofMat, roofSlopeCount]} />
      <instancedMesh ref={ridgeRef} args={[resources.unitBox, resources.ridgeMat, ridgeCount]} />
    </>
  )
}
