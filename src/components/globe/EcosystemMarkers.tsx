import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { latLngToVec3 } from "@/lib/geo";
import { useGlobeStore } from "@/lib/store";
import type { Ecosystem } from "@/lib/types";

const UP = new THREE.Vector3(0, 1, 0);

function Marker({ eco }: { eco: Ecosystem }) {
  const selected = useGlobeStore((s) => s.selectedEcosystem === eco.slug);
  const hovered = useGlobeStore((s) => s.hovered === eco.slug);
  const selectEcosystem = useGlobeStore((s) => s.selectEcosystem);
  const setHovered = useGlobeStore((s) => s.setHovered);

  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const tipRef = useRef<THREE.Mesh>(null);

  const { position, quaternion } = useMemo(() => {
    const p = latLngToVec3(eco.lat, eco.lng, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, p.clone().normalize());
    return { position: p, quaternion: q };
  }, [eco.lat, eco.lng]);

  const color = useMemo(() => new THREE.Color(eco.color), [eco.color]);
  const glowTexture = useMemo(() => makeGlowTexture(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const active = selected || hovered;
    if (ringRef.current) {
      const s = 1 + ((t * 0.6) % 1) * 1.6;
      ringRef.current.scale.setScalar(s);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - ((t * 0.6) % 1)) * 0.55;
    }
    if (ring2Ref.current) {
      const s = 1 + (((t * 0.6) + 0.5) % 1) * 1.6;
      ring2Ref.current.scale.setScalar(s);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - (((t * 0.6) + 0.5) % 1)) * 0.4;
    }
    if (glowRef.current) {
      const target = active ? 0.26 : 0.17;
      glowRef.current.scale.lerp(new THREE.Vector3(target, target, 1), 0.1);
      (glowRef.current.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.lerp(
        (glowRef.current.material as THREE.SpriteMaterial).opacity,
        active ? 0.95 : 0.6 + Math.sin(t * 2 + eco.lat) * 0.1,
        0.1,
      );
    }
    if (tipRef.current) {
      const s = active ? 1.5 : 1;
      tipRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectEcosystem(eco.slug, { lat: eco.lat, lng: eco.lng });
  };

  return (
    <group position={position} quaternion={quaternion}>
      {/* base rings (pulsing on the surface) */}
      <mesh ref={ringRef} rotation-x={-Math.PI / 2} position-y={0.002}>
        <ringGeometry args={[0.02, 0.024, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref} rotation-x={-Math.PI / 2} position-y={0.002}>
        <ringGeometry args={[0.02, 0.024, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001}>
        <circleGeometry args={[0.014, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* pillar */}
      <mesh position-y={0.045}>
        <cylinderGeometry args={[0.0022, 0.0035, 0.09, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>

      {/* tip */}
      <mesh
        ref={tipRef}
        position-y={0.095}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(eco.slug);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[0.013, 24, 24]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* invisible bigger hit target */}
      <mesh position-y={0.08} onClick={onClick} visible={false}>
        <sphereGeometry args={[0.05, 8, 8]} />
      </mesh>

      <sprite ref={glowRef} position-y={0.095} scale={[0.17, 0.17, 1]}>
        <spriteMaterial map={glowTexture} color={color} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>

      <Html position={[0, 0.15, 0]} center distanceFactor={2.2} occlude zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="marker-label" style={{ opacity: selected || hovered ? 1 : 0.8 }}>
          {eco.name}
        </div>
      </Html>
    </group>
  );
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(0.6, "rgba(255,255,255,0.08)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function EcosystemMarkers({ ecosystems }: { ecosystems: Ecosystem[] }) {
  return (
    <>
      {ecosystems.map((eco) => (
        <Marker key={eco.slug} eco={eco} />
      ))}
    </>
  );
}
