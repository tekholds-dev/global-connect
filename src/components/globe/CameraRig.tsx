import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { latLngToVec3 } from "@/lib/geo";
import { useGlobeStore } from "@/lib/store";

const FOCUS_DISTANCE = 1.85;
const target = new THREE.Vector3();

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const focus = useGlobeStore((s) => s.focus);
  const clearFocus = useGlobeStore((s) => s.clearFocus);
  const selectedEcosystem = useGlobeStore((s) => s.selectedEcosystem);
  const selectedUserId = useGlobeStore((s) => s.selectedUserId);
  const { camera, size } = useThree();
  const idle = !selectedEcosystem && !selectedUserId;
  const isMobile = size.width < 768;

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const onStart = () => clearFocus();
    c.addEventListener("start", onStart);
    return () => c.removeEventListener("start", onStart);
  }, [clearFocus]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    c.autoRotate = idle;
    if (focus) {
      const dist = isMobile ? FOCUS_DISTANCE + 0.35 : FOCUS_DISTANCE;
      target.copy(latLngToVec3(focus.lat, focus.lng, dist));
      // On desktop, nudge the focused point slightly left so it isn't hidden by the side panel
      const k = 1 - Math.exp(-4.5 * Math.min(delta, 0.05));
      camera.position.lerp(target, k);
      if (camera.position.distanceTo(target) < 0.004) clearFocus();
    }
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.45}
      zoomSpeed={0.6}
      minDistance={1.35}
      maxDistance={4.2}
      autoRotate
      autoRotateSpeed={0.35}
      makeDefault
    />
  );
}
