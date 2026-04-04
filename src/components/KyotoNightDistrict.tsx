import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  COLORS,
  GATE_POSITION,
  MACHIYA_BUILDINGS,
  MACHIYA_ROOF_PROFILES,
  OUTSKIRT_CROSS_ROAD_POSITIONS,
  OUTSKIRT_BUILDINGS,
  OUTSKIRT_SIDE_ROAD_POSITIONS,
  PAGODA_POSITION,
  STREET_LANTERNS,
  WORLD_DIMENSION_MULTIPLIER,
  getMachiyaColliderSections,
  getOutskirtBodyMetrics,
  getOutskirtRoofGeometry,
  getMachiyaBodyMetrics,
  getMachiyaRoofGeometry,
  type LanternConfig,
  type MachiyaConfig,
  type OutskirtBuildingConfig,
  type Vector3Tuple,
  WORLD_CONFIG,
} from '../constants'

export function KyotoNightDistrict() {
  return (
    <>
      <GroundPlane />
      <NearDistrictGroundDetails />

      {MACHIYA_BUILDINGS.map((building) => (
        <MachiyaBlock key={building.name} building={building} />
      ))}

      <OutskirtDistrict />

      {STREET_LANTERNS.map((lantern) => (
        <LanternPost key={lantern.name} lantern={lantern} />
      ))}

      <TempleGate position={GATE_POSITION} />
      <PagodaTower position={PAGODA_POSITION} />
      <CanalDetails />
    </>
  )
}

function OutskirtDistrict() {
  return (
    <>
      <OutskirtRoadGrid />

      {OUTSKIRT_BUILDINGS.map((building) => (
        <OutskirtBuilding key={building.name} building={building} />
      ))}
    </>
  )
}

function OutskirtRoadGrid() {
  const [outerWestRoadX, innerWestRoadX, innerEastRoadX, outerEastRoadX] = OUTSKIRT_SIDE_ROAD_POSITIONS
  const [northRoadZ, southRoadZ] = OUTSKIRT_CROSS_ROAD_POSITIONS

  return (
    <>
      <mesh position={[innerWestRoadX, 0.012, 0]}>
        <boxGeometry args={[7.2, 0.024, 118 * WORLD_DIMENSION_MULTIPLIER]} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.92} />
      </mesh>

      <mesh position={[innerEastRoadX, 0.012, 0]}>
        <boxGeometry args={[7.2, 0.024, 118 * WORLD_DIMENSION_MULTIPLIER]} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.92} />
      </mesh>

      <mesh position={[outerWestRoadX, 0.012, 0]}>
        <boxGeometry args={[7.8, 0.024, 114 * WORLD_DIMENSION_MULTIPLIER]} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.94} />
      </mesh>

      <mesh position={[outerEastRoadX, 0.012, 0]}>
        <boxGeometry args={[7.8, 0.024, 114 * WORLD_DIMENSION_MULTIPLIER]} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.94} />
      </mesh>

      <mesh position={[0, 0.014, northRoadZ]}>
        <boxGeometry args={[102 * WORLD_DIMENSION_MULTIPLIER, 0.028, 8.2]} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.93} />
      </mesh>

      <mesh position={[0, 0.014, southRoadZ]}>
        <boxGeometry args={[102 * WORLD_DIMENSION_MULTIPLIER, 0.028, 8.2]} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.93} />
      </mesh>
    </>
  )
}

function getMachiyaFacadeX(building: Pick<MachiyaConfig, 'width' | 'facing'>) {
  return (building.width / 2 - 0.08) * building.facing
}

function NearDistrictGroundDetails() {
  return (
    <>
      {MACHIYA_BUILDINGS.map((building) => {
        const sideDirection = building.position[0] >= 0 ? 1 : -1
        const facadeWorldX = building.position[0] + getMachiyaFacadeX(building)
        const alleyCenterX = facadeWorldX + sideDirection * 1.6
        const lotCenterX = building.position[0] + sideDirection * (building.width / 2 + building.lotWidth / 2 + 0.9)
        const lotCenterZ = building.position[2] + building.lotOffsetZ
        const lotFenceX = -sideDirection * (building.lotWidth / 2 - 0.08)

        return (
          <group key={`${building.name}-ground-details`}>
            {building.alleyWidth > 0 ? (
              <group position={[alleyCenterX, 0, building.position[2]]}>
                <mesh position={[0, 0.03, 0]} receiveShadow>
                  <boxGeometry args={[4.4, 0.05, building.alleyWidth]} />
                  <meshStandardMaterial color={COLORS.ground.street} roughness={0.94} />
                </mesh>
                <mesh position={[0.2 * sideDirection, 0.045, 0]} receiveShadow>
                  <boxGeometry args={[3.5, 0.03, Math.max(building.alleyWidth - 0.22, 0.42)]} />
                  <meshStandardMaterial color={COLORS.ground.drain} roughness={0.88} />
                </mesh>
              </group>
            ) : null}

            {building.lotKind !== 'none' ? (
              <group position={[lotCenterX, 0, lotCenterZ]}>
                <mesh position={[0, 0.03, 0]} receiveShadow>
                  <boxGeometry args={[building.lotWidth, 0.05, building.lotDepth]} />
                  <meshStandardMaterial
                    color={building.lotKind === 'gravel' ? COLORS.ground.stone : COLORS.ground.base}
                    roughness={0.96}
                  />
                </mesh>
                <mesh position={[lotFenceX, 0.16, 0]} receiveShadow>
                  <boxGeometry args={[0.08, 0.26, building.lotDepth * 0.84]} />
                  <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.84} />
                </mesh>

                {building.lotKind === 'garden' ? (
                  <>
                    <mesh position={[0.55 * sideDirection, 0.13, -building.lotDepth * 0.18]} receiveShadow>
                      <boxGeometry args={[building.lotWidth * 0.34, 0.18, building.lotDepth * 0.26]} />
                      <meshStandardMaterial color={COLORS.foliage} roughness={1} />
                    </mesh>
                    <mesh position={[-0.3 * sideDirection, 0.12, building.lotDepth * 0.22]} receiveShadow>
                      <boxGeometry args={[building.lotWidth * 0.24, 0.16, building.lotDepth * 0.22]} />
                      <meshStandardMaterial color={COLORS.foliage} roughness={1} />
                    </mesh>
                  </>
                ) : (
                  <>
                    <mesh position={[0.32 * sideDirection, 0.08, -building.lotDepth * 0.16]} receiveShadow>
                      <boxGeometry args={[0.42, 0.14, 0.56]} />
                      <meshStandardMaterial color={COLORS.stone} roughness={0.9} />
                    </mesh>
                    <mesh position={[-0.44 * sideDirection, 0.06, building.lotDepth * 0.12]} receiveShadow>
                      <boxGeometry args={[0.32, 0.1, 0.42]} />
                      <meshStandardMaterial color={COLORS.stone} roughness={0.92} />
                    </mesh>
                  </>
                )}
              </group>
            ) : null}
          </group>
        )
      })}
    </>
  )
}

function GroundPlane() {
  const halfWorldSize = WORLD_CONFIG.size / 2
  const pagodaCourtX = WORLD_CONFIG.pagodaCourtPosition[0]
  const pagodaCourtZ = WORLD_CONFIG.pagodaCourtPosition[2]

  return (
    <>
      <RigidBody type="fixed" colliders={false} friction={1}>
        <CuboidCollider args={[halfWorldSize, 0.6, halfWorldSize]} position={[0, -0.6, 0]} />
        <mesh position={[0, -0.6, 0]} receiveShadow>
          <boxGeometry args={[WORLD_CONFIG.size, 1.2, WORLD_CONFIG.size]} />
          <meshStandardMaterial color={COLORS.ground.base} roughness={1} />
        </mesh>
      </RigidBody>

      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[WORLD_CONFIG.streetWidth, 0.04, WORLD_CONFIG.streetLength]} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.88} />
      </mesh>

      <mesh position={[0, 0.045, 0]} receiveShadow>
        <boxGeometry args={[WORLD_CONFIG.streetWidth * 0.62, 0.02, WORLD_CONFIG.streetLength - 1.4]} />
        <meshStandardMaterial color={COLORS.ground.stone} roughness={0.76} />
      </mesh>

      <mesh position={WORLD_CONFIG.westLanePosition} receiveShadow>
        <boxGeometry args={WORLD_CONFIG.westLaneSize} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.9} />
      </mesh>

      <mesh position={WORLD_CONFIG.eastLanePosition} receiveShadow>
        <boxGeometry args={WORLD_CONFIG.eastLaneSize} />
        <meshStandardMaterial color={COLORS.ground.street} roughness={0.9} />
      </mesh>

      <mesh position={WORLD_CONFIG.pagodaCourtPosition} receiveShadow>
        <boxGeometry args={WORLD_CONFIG.pagodaCourtSize} />
        <meshStandardMaterial color={COLORS.ground.stone} roughness={0.88} />
      </mesh>

      <mesh position={[-6, 0.05, 0]} receiveShadow>
        <boxGeometry args={[WORLD_CONFIG.sidewalkWidth, 0.1, WORLD_CONFIG.streetLength]} />
        <meshStandardMaterial color={COLORS.ground.curb} roughness={0.86} />
      </mesh>

      <mesh position={[6, 0.05, 0]} receiveShadow>
        <boxGeometry args={[WORLD_CONFIG.sidewalkWidth, 0.1, WORLD_CONFIG.streetLength]} />
        <meshStandardMaterial color={COLORS.ground.curb} roughness={0.86} />
      </mesh>

      <mesh position={[-5.4, 0.07, 0]}>
        <boxGeometry args={[0.14, 0.14, WORLD_CONFIG.streetLength]} />
        <meshStandardMaterial color={COLORS.ground.drain} roughness={0.88} />
      </mesh>

      <mesh position={[5.4, 0.07, 0]}>
        <boxGeometry args={[0.14, 0.14, WORLD_CONFIG.streetLength]} />
        <meshStandardMaterial color={COLORS.ground.drain} roughness={0.88} />
      </mesh>

      <mesh position={[pagodaCourtX + 6.2, 0.2, pagodaCourtZ]}>
        <boxGeometry args={[5.5, 0.4, 1.2]} />
        <meshStandardMaterial color={COLORS.stone} roughness={0.85} />
      </mesh>

      <mesh position={[pagodaCourtX + 3.6, 0.22, pagodaCourtZ]}>
        <boxGeometry args={[0.9, 0.44, 5.2]} />
        <meshStandardMaterial color={COLORS.foliage} roughness={1} />
      </mesh>

      <mesh position={[pagodaCourtX - 3.6, 0.22, pagodaCourtZ]}>
        <boxGeometry args={[0.9, 0.44, 5.2]} />
        <meshStandardMaterial color={COLORS.foliage} roughness={1} />
      </mesh>
    </>
  )
}

function MachiyaBlock({ building }: { building: MachiyaConfig }) {
  const { depth, facing, height, position, stories, width } = building
  const bodyMetrics = getMachiyaBodyMetrics(building)
  const { lowerFloorHeight, upperDepth, upperFloorHeight, upperWidth } = bodyMetrics
  const frontX = getMachiyaFacadeX(building)
  const facadeScreenX = frontX + facing * 0.18
  const facadeSlatX = frontX + facing * 0.24
  const entranceDoorX = frontX + facing * 0.3
  const upperScreenX = frontX + facing * 0.2
  const upperSlatX = frontX + facing * 0.26
  const windowTop = stories === 2 ? lowerFloorHeight + upperFloorHeight * 0.56 : lowerFloorHeight * 0.8
  const lowerSlatPositions = Array.from({ length: 5 }, (_, index) => -depth * 0.28 + index * (depth * 0.14))
  const upperSlatPositions = Array.from({ length: 4 }, (_, index) => -depth * 0.21 + index * (depth * 0.14))
  const colliderSections = getMachiyaColliderSections(building)
  const canopyWidth = depth * (stories === 2 ? 0.72 : 0.64)
  const lanternZ = building.signStyle === 'vertical' ? -0.95 : 0.9

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        {colliderSections.map((section, index) => (
          <CuboidCollider
            key={`${building.name}-collider-${index}`}
            args={section.halfExtents}
            position={section.position}
            rotation={section.rotation}
          />
        ))}

        <mesh position={[0, 0.16, 0]} receiveShadow>
          <boxGeometry args={[width + 0.22, 0.18, depth + 0.26]} />
          <meshStandardMaterial color={COLORS.stone} roughness={0.86} />
        </mesh>

        <mesh position={[0, lowerFloorHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[width, lowerFloorHeight, depth]} />
          <meshStandardMaterial color={COLORS.machiya.plaster} roughness={0.94} />
        </mesh>

        <mesh position={[0, 1.06, 0]} castShadow>
          <boxGeometry args={[width + 0.12, 0.2, depth + 0.14]} />
          <meshStandardMaterial color={COLORS.machiya.wood} roughness={0.88} />
        </mesh>

        <mesh position={[0, lowerFloorHeight + 0.08, 0]} castShadow>
          <boxGeometry args={[width + 0.42, 0.14, depth + 0.54]} />
          <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.82} />
        </mesh>

        {stories === 2 ? (
          <>
            <mesh position={[0, lowerFloorHeight + upperFloorHeight / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[upperWidth, upperFloorHeight, upperDepth]} />
              <meshStandardMaterial color={COLORS.machiya.plaster} roughness={0.92} />
            </mesh>

            <mesh position={[0, lowerFloorHeight + upperFloorHeight + 0.08, 0]} castShadow>
              <boxGeometry args={[upperWidth + 0.32, 0.14, upperDepth + 0.3]} />
              <meshStandardMaterial color={COLORS.machiya.wood} roughness={0.84} />
            </mesh>
          </>
        ) : (
          <mesh position={[0, height * 0.56, 0]} castShadow receiveShadow>
            <boxGeometry args={[width * 0.94, height * 0.24, depth * 0.88]} />
            <meshStandardMaterial color={COLORS.machiya.plaster} roughness={0.92} />
          </mesh>
        )}

        <mesh position={[frontX, lowerFloorHeight * 0.52, 0]} receiveShadow>
          <boxGeometry args={[0.14, lowerFloorHeight * 0.82, depth * 0.84]} />
          <meshStandardMaterial color={COLORS.machiya.lattice} roughness={0.84} />
        </mesh>

        <mesh position={[facadeScreenX, 1.02, 0]} receiveShadow>
          <boxGeometry args={[0.08, 1.4, depth * 0.66]} />
          <meshStandardMaterial
            color={COLORS.machiya.screen}
            emissive={COLORS.lantern.paper}
            emissiveIntensity={0.18}
            roughness={0.98}
          />
        </mesh>

        {lowerSlatPositions.map((z, index) => (
          <mesh key={`${building.name}-lower-slat-${index}`} position={[facadeSlatX, 1.02, z]} receiveShadow>
            <boxGeometry args={[0.08, 1.44, 0.08]} />
            <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.8} />
          </mesh>
        ))}

        <mesh position={[facadeSlatX, 1.2, 0]} receiveShadow>
          <boxGeometry args={[0.08, 0.06, depth * 0.66]} />
          <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.8} />
        </mesh>

        <mesh position={[entranceDoorX, 0.92, 0]} receiveShadow>
          <boxGeometry args={[0.18, 1.35, 1.55]} />
          <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.8} />
        </mesh>

        <mesh position={[upperScreenX, windowTop, 0]} receiveShadow>
          <boxGeometry args={[0.1, 0.86, depth * 0.58]} />
          <meshStandardMaterial
            color={COLORS.machiya.screen}
            emissive={COLORS.lantern.paper}
            emissiveIntensity={0.1}
            roughness={0.98}
          />
        </mesh>

        {stories === 2
          ? upperSlatPositions.map((z, index) => (
              <mesh
                key={`${building.name}-upper-slat-${index}`}
                position={[upperSlatX, windowTop, z]}
                receiveShadow
              >
                <boxGeometry args={[0.08, 0.86, 0.08]} />
                <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.8} />
              </mesh>
            ))
          : null}

        {building.canopyDepth > 0.6 ? (
          <group position={[frontX + facing * 0.46, lowerFloorHeight + 0.22, 0]} rotation={[0, 0, facing * 0.18]}>
            <mesh castShadow>
              <boxGeometry args={[building.canopyDepth, 0.1, canopyWidth]} />
              <meshStandardMaterial color={COLORS.machiya.roof} roughness={0.8} />
            </mesh>
            {[-canopyWidth * 0.22, canopyWidth * 0.22].map((z, index) => (
              <mesh key={`${building.name}-canopy-strut-${index}`} position={[-facing * building.canopyDepth * 0.24, -0.28, z]}>
                <boxGeometry args={[0.05, 0.56, 0.05]} />
                <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.82} />
              </mesh>
            ))}
          </group>
        ) : null}

        <mesh position={[frontX + facing * 0.5, 0.18, 0]} receiveShadow>
          <boxGeometry args={[0.85, 0.16, 2.3]} />
          <meshStandardMaterial color={COLORS.stone} roughness={0.9} />
        </mesh>

        {building.signStyle === 'board' ? (
          <mesh position={[frontX + facing * 0.1, lowerFloorHeight + 0.52, 0]} receiveShadow>
            <boxGeometry args={[0.12, 0.46, depth * 0.4]} />
            <meshStandardMaterial color={COLORS.machiya.lattice} roughness={0.8} />
          </mesh>
        ) : null}

        {building.signStyle === 'vertical' ? (
          <mesh position={[frontX + facing * 0.72, 2.15, -depth * 0.18]} castShadow>
            <boxGeometry args={[0.18, 1.04, 0.48]} />
            <meshStandardMaterial color={COLORS.machiya.lattice} roughness={0.78} />
          </mesh>
        ) : null}

        <MachiyaRoof building={building} />

        <mesh position={[frontX + facing * 0.58, 2.2, lanternZ]}>
          <cylinderGeometry args={[0.16, 0.2, 0.46, 12]} />
          <meshStandardMaterial
            color={COLORS.lantern.paper}
            emissive={COLORS.lantern.glow}
            emissiveIntensity={1.45}
            roughness={0.72}
          />
        </mesh>
      </RigidBody>
    </group>
  )
}

function MachiyaRoof({ building }: { building: Pick<MachiyaConfig, 'stories' | 'width' | 'height' | 'depth'> }) {
  const roofProfile = MACHIYA_ROOF_PROFILES[building.stories]
  const roofGeometry = getMachiyaRoofGeometry(building)

  return (
    <>
      <RoofSlope
        anchorX={-roofGeometry.mainAnchorHalfWidth}
        anchorY={roofGeometry.roofSeatY}
        span={roofGeometry.mainSpan}
        depth={roofGeometry.roofDepth}
        thickness={roofProfile.mainThickness}
        pitch={roofProfile.mainPitch}
        direction={1}
      />
      <RoofSlope
        anchorX={roofGeometry.mainAnchorHalfWidth}
        anchorY={roofGeometry.roofSeatY}
        span={roofGeometry.mainSpan}
        depth={roofGeometry.roofDepth}
        thickness={roofProfile.mainThickness}
        pitch={roofProfile.mainPitch}
        direction={-1}
      />
      <RoofEave
        anchorX={-roofGeometry.roofSeatHalfWidth}
        anchorY={roofGeometry.eaveJoinY}
        span={roofGeometry.eaveSpan}
        depth={roofGeometry.eaveDepth}
        thickness={roofProfile.eaveThickness}
        pitch={roofProfile.eavePitch}
        direction={1}
      />
      <RoofEave
        anchorX={roofGeometry.roofSeatHalfWidth}
        anchorY={roofGeometry.eaveJoinY}
        span={roofGeometry.eaveSpan}
        depth={roofGeometry.eaveDepth}
        thickness={roofProfile.eaveThickness}
        pitch={roofProfile.eavePitch}
        direction={-1}
      />

      <mesh position={[0, roofGeometry.ridgeBaseY + roofProfile.ridgeHeight / 2, 0]} castShadow>
        <boxGeometry args={[roofProfile.ridgeWidth, roofProfile.ridgeHeight, roofGeometry.roofDepth + 0.12]} />
        <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.76} />
      </mesh>
    </>
  )
}

function RoofSlope({
  anchorX,
  anchorY,
  span,
  depth,
  thickness,
  pitch,
  direction,
}: {
  anchorX: number
  anchorY: number
  span: number
  depth: number
  thickness: number
  pitch: number
  direction: -1 | 1
}) {
  return (
    <group position={[anchorX, anchorY, 0]} rotation={[0, 0, direction * pitch]}>
      <mesh position={[direction * span * 0.5, thickness * 0.5, 0]} castShadow>
        <boxGeometry args={[span, thickness, depth]} />
        <meshStandardMaterial color={COLORS.machiya.roof} roughness={0.78} />
      </mesh>
    </group>
  )
}

function RoofEave({
  anchorX,
  anchorY,
  span,
  depth,
  thickness,
  pitch,
  direction,
}: {
  anchorX: number
  anchorY: number
  span: number
  depth: number
  thickness: number
  pitch: number
  direction: -1 | 1
}) {
  return (
    <group position={[anchorX, anchorY, 0]} rotation={[0, 0, direction * pitch]}>
      <mesh position={[-direction * span * 0.5, -thickness * 0.5, 0]} castShadow>
        <boxGeometry args={[span, thickness, depth]} />
        <meshStandardMaterial color={COLORS.machiya.roof} roughness={0.8} />
      </mesh>
    </group>
  )
}

function OutskirtBuilding({ building }: { building: OutskirtBuildingConfig }) {
  const bodyMetrics = getOutskirtBodyMetrics(building)
  const roofGeometry = getOutskirtRoofGeometry(building)

  return (
    <group position={building.position} rotation={[0, building.rotationY, 0]}>
      <mesh position={[0, bodyMetrics.lowerHeight / 2, 0]}>
        <boxGeometry args={[building.width, bodyMetrics.lowerHeight, building.depth]} />
        <meshStandardMaterial color={COLORS.machiya.plaster} roughness={0.96} />
      </mesh>

      {building.stories === 2 ? (
        <mesh position={[0, bodyMetrics.lowerHeight + bodyMetrics.upperHeight / 2, 0]}>
          <boxGeometry args={[bodyMetrics.upperWidth, bodyMetrics.upperHeight, bodyMetrics.upperDepth]} />
          <meshStandardMaterial color={COLORS.machiya.plaster} roughness={0.95} />
        </mesh>
      ) : (
        <mesh position={[0, building.height * 0.68, 0]}>
          <boxGeometry args={[building.width * 0.92, building.height * 0.18, building.depth * 0.9]} />
          <meshStandardMaterial color={COLORS.machiya.plaster} roughness={0.95} />
        </mesh>
      )}

      <mesh position={[0, bodyMetrics.lowerHeight + 0.08, 0]}>
        <boxGeometry args={[building.width + 0.18, 0.12, building.depth + 0.22]} />
        <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.84} />
      </mesh>

      <mesh position={[0, bodyMetrics.windowBandY, building.depth / 2 - 0.04]}>
        <boxGeometry args={[building.width * 0.58, building.stories === 2 ? 0.54 : 0.42, 0.08]} />
        <meshStandardMaterial
          color={COLORS.machiya.screen}
          emissive={COLORS.lantern.paper}
          emissiveIntensity={0.08}
          roughness={0.98}
        />
      </mesh>

      <RoofSlope
        anchorX={-roofGeometry.roofSeatHalfWidth}
        anchorY={roofGeometry.roofSeatY}
        span={roofGeometry.mainSpan}
        depth={roofGeometry.roofDepth}
        thickness={roofGeometry.thickness}
        pitch={roofGeometry.pitch}
        direction={1}
      />
      <RoofSlope
        anchorX={roofGeometry.roofSeatHalfWidth}
        anchorY={roofGeometry.roofSeatY}
        span={roofGeometry.mainSpan}
        depth={roofGeometry.roofDepth}
        thickness={roofGeometry.thickness}
        pitch={roofGeometry.pitch}
        direction={-1}
      />

      <mesh position={[0, roofGeometry.ridgeBaseY + roofGeometry.ridgeHeight / 2, 0]}>
        <boxGeometry args={[roofGeometry.ridgeWidth, roofGeometry.ridgeHeight, roofGeometry.roofDepth + 0.08]} />
        <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.8} />
      </mesh>
    </group>
  )
}

function LanternPost({ lantern }: { lantern: LanternConfig }) {
  return (
    <group position={lantern.position}>
      <mesh position={[0, lantern.height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, lantern.height, 10]} />
        <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.86} />
      </mesh>

      <mesh position={[0, lantern.height + 0.12, 0]} castShadow>
        <boxGeometry args={[0.85, 0.08, 0.08]} />
        <meshStandardMaterial color={COLORS.machiya.trim} roughness={0.82} />
      </mesh>

      <mesh position={[0, lantern.height - 0.12, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.52, 14]} />
        <meshStandardMaterial
          color={COLORS.lantern.paper}
          emissive={COLORS.lantern.glow}
          emissiveIntensity={1.7}
          roughness={0.7}
        />
      </mesh>

      <pointLight
        color={COLORS.lighting.warm}
        intensity={lantern.intensity}
        distance={10}
        decay={2}
        position={[0, lantern.height - 0.1, 0]}
      />
    </group>
  )
}

function TempleGate({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.35, 2.9, 0.35]} position={[-3.35, 2.9, 0]} />
        <CuboidCollider args={[0.35, 2.9, 0.35]} position={[3.35, 2.9, 0]} />
        <CuboidCollider args={[4.4, 0.3, 0.6]} position={[0, 5.65, 0]} />

        <mesh position={[-3.35, 2.9, 0]} castShadow>
          <boxGeometry args={[0.7, 5.8, 0.7]} />
          <meshStandardMaterial color={COLORS.shrine.vermilion} roughness={0.78} />
        </mesh>

        <mesh position={[3.35, 2.9, 0]} castShadow>
          <boxGeometry args={[0.7, 5.8, 0.7]} />
          <meshStandardMaterial color={COLORS.shrine.vermilion} roughness={0.78} />
        </mesh>

        <mesh position={[0, 5.65, 0]} castShadow>
          <boxGeometry args={[8.8, 0.6, 1.2]} />
          <meshStandardMaterial color={COLORS.shrine.vermilion} roughness={0.8} />
        </mesh>

        <mesh position={[0, 6.22, 0]} castShadow>
          <boxGeometry args={[9.8, 0.18, 1.8]} />
          <meshStandardMaterial color={COLORS.shrine.beam} roughness={0.82} />
        </mesh>

        <mesh position={[0, 4.95, 0]} castShadow>
          <boxGeometry args={[6.9, 0.34, 0.9]} />
          <meshStandardMaterial color={COLORS.shrine.beam} roughness={0.8} />
        </mesh>
      </RigidBody>

      <GateLantern position={[-2.2, 4.15, 0]} />
      <GateLantern position={[2.2, 4.15, 0]} />
    </group>
  )
}

function GateLantern({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.18, 0.22, 0.5, 12]} />
        <meshStandardMaterial
          color={COLORS.lantern.paper}
          emissive={COLORS.lantern.glow}
          emissiveIntensity={1.5}
          roughness={0.72}
        />
      </mesh>
      <pointLight color={COLORS.lighting.warm} intensity={0.68} distance={7} decay={2} />
    </group>
  )
}

function PagodaTower({ position }: { position: Vector3Tuple }) {
  const tiers = [
    { bodyWidth: 3.9, bodyDepth: 3.9, bodyHeight: 1.7, roofWidth: 6.4, roofDepth: 6.4 },
    { bodyWidth: 3.2, bodyDepth: 3.2, bodyHeight: 1.45, roofWidth: 5.5, roofDepth: 5.5 },
    { bodyWidth: 2.6, bodyDepth: 2.6, bodyHeight: 1.2, roofWidth: 4.6, roofDepth: 4.6 },
    { bodyWidth: 2, bodyDepth: 2, bodyHeight: 1, roofWidth: 3.7, roofDepth: 3.7 },
  ] as const

  let tierY = 1.05

  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[3.4, 4.9, 3.4]} position={[0, 4.9, 0]} />

        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.8, 1.1, 6.8]} />
          <meshStandardMaterial color={COLORS.stone} roughness={0.9} />
        </mesh>

        {tiers.map((tier, index) => {
          const bodyCenterY = tierY + tier.bodyHeight / 2
          const roofY = tierY + tier.bodyHeight + 0.2
          tierY += tier.bodyHeight + 1.1

          return (
            <group key={`pagoda-tier-${index}`}>
              <mesh position={[0, bodyCenterY, 0]} castShadow>
                <boxGeometry args={[tier.bodyWidth, tier.bodyHeight, tier.bodyDepth]} />
                <meshStandardMaterial color={COLORS.pagoda.wood} roughness={0.86} />
              </mesh>
              <mesh position={[0, roofY, 0]} castShadow>
                <boxGeometry args={[tier.roofWidth, 0.18, tier.roofDepth]} />
                <meshStandardMaterial color={COLORS.pagoda.roof} roughness={0.78} />
              </mesh>
              <mesh position={[0, roofY + 0.18, 0]} castShadow>
                <boxGeometry args={[tier.roofWidth * 0.78, 0.14, tier.roofDepth * 0.78]} />
                <meshStandardMaterial color={COLORS.pagoda.roof} roughness={0.8} />
              </mesh>
            </group>
          )
        })}

        <mesh position={[0, 9.9, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, 3.4, 10]} />
          <meshStandardMaterial color={COLORS.pagoda.finial} metalness={0.08} roughness={0.52} />
        </mesh>

        <mesh position={[0, 11.65, 0]} castShadow>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color={COLORS.pagoda.finial} metalness={0.08} roughness={0.48} />
        </mesh>
      </RigidBody>

      <pointLight
        color={COLORS.lighting.warm}
        intensity={0.9}
        distance={11}
        decay={2}
        position={[0, 1.6, 2.2]}
      />
    </group>
  )
}

function CanalDetails() {
  return (
    <>
      <StoneLantern position={[-15.2, 0, -18.5]} />
      <StoneLantern position={[-20.6, 0, -18.5]} />
      <StoneLantern position={[14.5, 0, 8.1]} />
      <StoneLantern position={[18.8, 0, 8.1]} />
    </>
  )
}

function StoneLantern({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.18, 0.24, 0.9, 10]} />
        <meshStandardMaterial color={COLORS.stone} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[0.7, 0.18, 0.7]} />
        <meshStandardMaterial color={COLORS.stone} roughness={0.84} />
      </mesh>
      <mesh position={[0, 1.32, 0]}>
        <boxGeometry args={[0.48, 0.34, 0.48]} />
        <meshStandardMaterial
          color={COLORS.stone}
          emissive={COLORS.lantern.glow}
          emissiveIntensity={0.25}
          roughness={0.82}
        />
      </mesh>
    </group>
  )
}
