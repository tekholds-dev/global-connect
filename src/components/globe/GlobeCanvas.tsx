import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import { Earth } from "./Earth";
import { EcosystemMarkers } from "./EcosystemMarkers";
import { UserDots } from "./UserDots";
import { CameraRig } from "./CameraRig";
import { useGlobeStore } from "@/lib/store";
import type { Ecosystem, Profile } from "@/lib/types";

export function GlobeCanvas({ ecosystems, profiles, onReady }: { ecosystems: Ecosystem[]; profiles: Profile[]; onReady?: () => void }) {
  const selectEcosystem = useGlobeStore((s) => s.selectEcosystem);
  const selectUser = useGlobeStore((s) => s.selectUser);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.35, 2.9], fov: 42, near: 0.05, far: 60 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#000000", 1);
        onReady?.();
      }}
      onPointerMissed={() => {
        selectEcosystem(null);
        selectUser(null);
      }}
      className="touch-none"
    >
      <Suspense fallback={null}>
        <Stars radius={40} depth={20} count={2200} factor={2.2} saturation={0} fade speed={0.3} />
        <Earth />
        <EcosystemMarkers ecosystems={ecosystems} />
        <UserDots profiles={profiles} />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
