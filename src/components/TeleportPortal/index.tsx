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
        <mesh>
          <torusGeometry args={[1.2, 0.08, 16, 64]} />
          <meshStandardMaterial
            color="#88ccff"
            emissive="#4499ff"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
      </Interactable>
    </group>
  )
}
