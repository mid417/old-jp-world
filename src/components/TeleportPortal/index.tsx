import { useTeleport, Interactable } from '@xrift/world-components'

export interface TeleportPortalProps {
  id: string
  position: [number, number, number]
  destination: [number, number, number]
  yaw?: number
  label?: string
}

export function TeleportPortal({
  id,
  position,
  destination,
  yaw,
  label = 'テレポート',
}: TeleportPortalProps) {
  const { teleport } = useTeleport()

  return (
    <group position={position}>
      <Interactable
        id={id}
        onInteract={() => teleport({ position: destination, ...(yaw !== undefined && { yaw }) })}
        interactionText={label}
      >
        {/* 見た目用リング */}
        <mesh>
          <torusGeometry args={[1.2, 0.08, 16, 64]} />
          <meshStandardMaterial
            color="#88ccff"
            emissive="#4499ff"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
        {/* 輪の内側をカバーする当たり判定用の透明ディスク（内径 = torus radius - tube radius = 1.12） */}
        <mesh>
          <circleGeometry args={[1.12, 64]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </Interactable>
    </group>
  )
}
