import { SpawnPoint } from '@xrift/world-components'
import { NightSkybox } from './components/NightSkybox'
import { KyotoNightDistrict } from './components/KyotoNightDistrict'
import { LiveStage } from './components/LiveStage'
import { GlowingFish } from './components/GlowingFish'
import { COLORS, WORLD_CONFIG } from './constants'

export interface WorldProps {
  position?: [number, number, number]
  scale?: number
}

export function World({ position = [0, 0, 0], scale = 1 }: WorldProps) {
  return (
    <>
      <fog attach="fog" args={[COLORS.sky.fog, 52, 150]} />
      <group position={position} scale={scale}>
        <NightSkybox />
        <SpawnPoint position={WORLD_CONFIG.spawnPosition} yaw={WORLD_CONFIG.spawnYaw} />

        <ambientLight color={COLORS.lighting.ambient} intensity={0.38} />
        <hemisphereLight
          args={[COLORS.lighting.moon, COLORS.lighting.groundBounce, 0.48]}
          position={[0, 24, 0]}
        />
        <directionalLight
          position={[18, 24, 10]}
          color={COLORS.lighting.moon}
          intensity={0.82}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={1}
          shadow-camera-far={58}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={32}
          shadow-camera-bottom={-32}
        />
        <pointLight position={[0, 12, 0]} color={COLORS.sky.glow} intensity={0.12} distance={52} decay={2} />

        <GlowingFish />
        <KyotoNightDistrict />
        <LiveStage />
      </group>
    </>
  )
}
