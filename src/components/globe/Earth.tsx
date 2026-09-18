import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";

export const EARTH_RADIUS = 1;
const LIGHT_DIR = new THREE.Vector3(-1.2, 0.6, 0.9).normalize();

const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D uSpec;
  uniform sampler2D uLights;
  uniform vec3 uLightDir;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float ocean = texture2D(uSpec, vUv).r;
    float land = 1.0 - smoothstep(0.35, 0.65, ocean);
    vec3 oceanCol = vec3(0.010, 0.014, 0.024);
    vec3 landCol  = vec3(0.105, 0.120, 0.150);
    vec3 col = mix(oceanCol, landCol, land);

    vec3 n = normalize(vNormal);
    vec3 l = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
    float diff = clamp(dot(n, l), 0.0, 1.0);
    float wrap = clamp(dot(n, l) * 0.5 + 0.5, 0.0, 1.0);
    col *= 0.30 + 1.05 * wrap;

    // Subtle coastline edge highlight
    float coast = smoothstep(0.30, 0.50, ocean) * (1.0 - smoothstep(0.50, 0.72, ocean));
    col += vec3(0.28, 0.36, 0.50) * coast * 0.20;

    // Night lights, only where the sun is not
    float lights = texture2D(uLights, vUv).r;
    float night = 1.0 - smoothstep(0.0, 0.25, diff);
    col += vec3(0.90, 0.86, 0.72) * lights * night * 0.55;

    // Specular glint on oceans
    vec3 h = normalize(l + normalize(vViewDir));
    float spec = pow(clamp(dot(n, h), 0.0, 1.0), 60.0) * ocean * 0.10;
    col += vec3(spec);

    // Fresnel rim
    float fres = pow(1.0 - clamp(dot(n, normalize(vViewDir)), 0.0, 1.0), 3.5);
    col += vec3(0.30, 0.45, 0.75) * fres * 0.55;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const atmoVert = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const atmoFrag = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float d = dot(normalize(vNormal), normalize(vViewDir));
    float intensity = pow(clamp(0.72 - d, 0.0, 1.0), 2.4);
    vec3 glow = vec3(0.32, 0.52, 0.95);
    gl_FragColor = vec4(glow * intensity, intensity * 0.9);
  }
`;

export function Earth() {
  const [spec, lights] = useLoader(THREE.TextureLoader, ["/textures/earth_specular_2048.jpg", "/textures/earth_lights_2048.png"]);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uSpec: { value: spec },
      uLights: { value: lights },
      uLightDir: { value: LIGHT_DIR },
      uTime: { value: 0 },
    }),
    [spec, lights],
  );

  useMemo(() => {
    for (const t of [spec, lights]) {
      if (!t) continue;
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 8;
    }
  }, [spec, lights]);

  useFrame((state) => {
    const u = matRef.current?.uniforms['uTime'];
    if (u) u.value = state.clock.elapsedTime;
  });

  return (
    <group>
      <mesh name="earth">
        <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
        <shaderMaterial ref={matRef} vertexShader={earthVert} fragmentShader={earthFrag} uniforms={uniforms} />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <shaderMaterial
          vertexShader={atmoVert}
          fragmentShader={atmoFrag}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
