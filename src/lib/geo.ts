import * as THREE from "three";

const DEG = Math.PI / 180;

/** Convert lat/lng to a point on a sphere (matches three.js equirectangular UV mapping). */
export function latLngToVec3(lat: number, lng: number, radius = 1): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function shortAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export const CHAIN_LABEL: Record<string, string> = { solana: "Solana", evm: "EVM" };
