import { CylinderCollider, RigidBody } from '@react-three/rapier'

export function LiveStage() {
  return (
    <group position={[0, 0, -97.5]}>
      {/* 1段目（下段）: 半径9.6、高さ1.2 */}
      <RigidBody type="fixed">
        <CylinderCollider args={[0.6, 9.6]} position={[0, 0.6, 0]} />
        <mesh position={[0, 0.6, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[9.6, 9.96, 1.2, 64]} />
          <meshStandardMaterial color="#8B1A0A" roughness={0.8} metalness={0.1} />
        </mesh>
      </RigidBody>
      {/* 2段目（上段）: 半径6.6、高さ1.0 */}
      <RigidBody type="fixed">
        <CylinderCollider args={[0.5, 6.6]} position={[0, 1.7, 0]} />
        <mesh position={[0, 1.7, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[6.6, 6.96, 1.0, 64]} />
          <meshStandardMaterial color="#CC2200" roughness={0.7} metalness={0.15} />
        </mesh>
      </RigidBody>
    </group>
  )
}
