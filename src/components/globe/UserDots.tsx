import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVec3 } from "@/lib/geo";
import { useGlobeStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

const tmp = new THREE.Object3D();
const tmpColor = new THREE.Color();
const BASE = new THREE.Color("#9fb4d8");
const ONLINE = new THREE.Color("#7dffb8");
const SELECTED = new THREE.Color("#ffffff");

export function UserDots({ profiles }: { profiles: Profile[] }) {
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const onlineIds = useGlobeStore((s) => s.onlineIds);
  const selectedUserId = useGlobeStore((s) => s.selectedUserId);
  const selectUser = useGlobeStore((s) => s.selectUser);

  const positions = useMemo(() => profiles.map((p) => latLngToVec3(p.lat, p.lng, 1.004)), [profiles]);
  const count = profiles.length;

  useEffect(() => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) return;
    positions.forEach((pos, i) => {
      tmp.position.copy(pos);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      core.setMatrixAt(i, tmp.matrix);
      halo.setMatrixAt(i, tmp.matrix);
    });
    core.instanceMatrix.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
    core.computeBoundingSphere();
  }, [positions]);

  useFrame(({ clock }) => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo || count === 0) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const p = profiles[i];
      const pos = positions[i];
      if (!p || !pos) continue;
      const isOnline = onlineIds.has(p.id);
      const isSel = p.id === selectedUserId;
      tmpColor.copy(isSel ? SELECTED : isOnline ? ONLINE : BASE);
      if (isOnline || isSel) tmpColor.multiplyScalar(0.85 + 0.25 * Math.sin(t * 3 + i));
      core.setColorAt(i, tmpColor);
      halo.setColorAt(i, tmpColor);
      const s = isSel ? 2.2 : isOnline ? 1.5 : 1;
      tmp.position.copy(pos);
      tmp.scale.setScalar(s);
      tmp.updateMatrix();
      halo.setMatrixAt(i, tmp.matrix);
    }
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const i = e.instanceId;
    if (i == null) return;
    const p = profiles[i];
    if (!p) return;
    selectUser(p.id, { lat: p.lat, lng: p.lng });
  };

  return (
    <group>
      <instancedMesh
        key={`core-${count}`}
        ref={coreRef}
        args={[undefined, undefined, count]}
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <sphereGeometry args={[0.0055, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh key={`halo-${count}`} ref={haloRef} args={[undefined, undefined, count]} raycast={() => null}>
        <sphereGeometry args={[0.014, 10, 10]} />
        <meshBasicMaterial transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
