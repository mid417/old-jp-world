import { SpawnPoint, VideoPlayer } from '@xrift/world-components'
import { NightSkybox } from './components/NightSkybox'
import { KyotoNightDistrict } from './components/KyotoNightDistrict'
import { LiveStage } from './components/LiveStage'
import { GlowingFish } from './components/GlowingFish'
import { TeleportPortal } from './components/TeleportPortal'
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
          intensity={0.9}
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-near={1}
          shadow-camera-far={58}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={32}
          shadow-camera-bottom={-32}
        />
        <pointLight position={[0, 12, 0]} color={COLORS.sky.glow} intensity={0.12} distance={52} decay={2} />

        <GlowingFish />
        {/* 小さい鳥居（GATE_POSITION付近）のポータル → 大きい鳥居南側へ */}
        <TeleportPortal
          id="tp-small-gate"
          position={[0, 1.5, 66]}
          destination={[0, 0.05, -90]}
          yaw={180}
          label="大鳥居へテレポート"
        />
        {/* 大きい鳥居（GIANT_GATE_POSITION付近）のポータル → 小さい鳥居北側へ */}
        <TeleportPortal
          id="tp-giant-gate"
          position={[0, 1.5, -93]}
          destination={[0, 0.05, 69]}
          yaw={0}
          label="小鳥居へテレポート"
        />
        <KyotoNightDistrict />
        <LiveStage />
        {/* ライブステージ後方のVideoPlayer（Z=-110, Y=7に浮かせて配置） */}
        <VideoPlayer
          id="live-stage-video"
          url="https://example.com/live.mp4"
          position={[0, 12, -110]}
          width={20}
        />
      </group>
    </>
  )
}
