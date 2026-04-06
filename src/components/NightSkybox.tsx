import { useMemo } from 'react'
import { BackSide, Color } from 'three'
import { COLORS } from '../constants'

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uZenithColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uGlowColor;
  uniform vec3 uNebulaColor;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = p * 2.0 + vec2(13.4, 7.1);
      amplitude *= 0.5;
    }
    return value;
  }

  float stars(vec3 dir, float scale, float threshold, float size, float twinkleSpeed) {
    vec2 uv = dir.xz / (dir.y + 1.4) * scale;
    vec2 cell = floor(uv);
    vec2 local = fract(uv) - 0.5;
    float seeded = hash(cell);
    float star = 1.0 - smoothstep(size, size * 2.4, length(local));
    float twinkle = sin(uTime * twinkleSpeed + seeded * 100.0) * 0.35 + 0.75;
    return step(threshold, seeded) * star * twinkle;
  }

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float elevation = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    vec3 skyColor = mix(uHorizonColor, uMidColor, smoothstep(0.04, 0.62, elevation));
    skyColor = mix(skyColor, uZenithColor, smoothstep(0.5, 1.0, elevation));

    float horizonBloom = smoothstep(-0.15, 0.22, dir.y) * (1.0 - smoothstep(0.18, 0.55, dir.y));
    skyColor += uGlowColor * horizonBloom * 0.35;

    float nebulaNoise = fbm(dir.xz * 0.9 + vec2(uTime * 0.003, -uTime * 0.002));
    float nebula = smoothstep(0.5, 0.82, nebulaNoise) * smoothstep(0.04, 0.7, dir.y);
    vec3 nebulaColor = uNebulaColor * nebula * 0.28;

    vec2 cloudUv = dir.xz / (abs(dir.y) + 0.45) * 1.45;
    float cloudNoise = fbm(cloudUv + vec2(uTime * 0.006, uTime * 0.003));
    float cloud = smoothstep(0.48, 0.78, cloudNoise);
    float cloudMask = smoothstep(-0.08, 0.34, dir.y);
    vec3 cloudColor = mix(vec3(0.04, 0.05, 0.12), vec3(0.18, 0.16, 0.24), cloudNoise) * cloud * cloudMask * 0.33;

    float starMask = smoothstep(-0.02, 0.18, dir.y);
    float starValue = stars(dir, 170.0, 0.992, 0.032, 2.0);
    starValue += stars(dir, 330.0, 0.9965, 0.018, 2.7) * 0.8;
    vec3 starColor = vec3(0.88, 0.92, 1.0) * starValue * starMask * (1.0 - cloud * 0.55);

    vec3 finalColor = skyColor + nebulaColor + cloudColor + starColor;
    finalColor = mix(vec3(0.06, 0.05, 0.09), finalColor, smoothstep(-0.32, -0.02, dir.y));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const createUniforms = () => ({
  uTime: { value: 0 },
  uZenithColor: { value: new Color(COLORS.sky.top) },
  uMidColor: { value: new Color(COLORS.sky.middle) },
  uHorizonColor: { value: new Color(COLORS.sky.horizon) },
  uGlowColor: { value: new Color(COLORS.sky.glow) },
  uNebulaColor: { value: new Color(COLORS.sky.nebula) },
})

export function NightSkybox({ radius = 420 }: { radius?: number }) {
  const uniforms = useMemo(() => createUniforms(), [])

  return (
    <mesh onBeforeRender={() => { uniforms.uTime.value = performance.now() / 1000 }}>
      <sphereGeometry args={[radius, 32, 16]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
