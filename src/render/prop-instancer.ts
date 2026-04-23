import * as THREE from "three";
import type { AssetCatalog } from "../engine/assets";

type PropId = "mailbox" | "bin" | "cone" | "fence-post" | "tree-conifer" | "street-light" | "parked-sedan" | "house-block";

const SCALE_BUCKETS: Record<"small" | "medium" | "large", number> = {
  small: 0.9, medium: 1.0, large: 1.1
};

const proceduralPrototype = (propId: PropId): { geometry: THREE.BufferGeometry; material: THREE.Material } => {
  // Same procedural fallbacks as original Task 22 — used when no GLB is registered for the propId.
  switch (propId) {
    case "mailbox":      return { geometry: new THREE.BoxGeometry(0.15, 0.3, 0.25),  material: new THREE.MeshStandardMaterial({ color: 0x5a5450, roughness: 0.85 }) };
    case "bin":          return { geometry: new THREE.CylinderGeometry(0.18, 0.2, 0.5, 12), material: new THREE.MeshStandardMaterial({ color: 0x303432, roughness: 0.7 }) };
    case "cone":         return { geometry: new THREE.ConeGeometry(0.12, 0.32, 10), material: new THREE.MeshStandardMaterial({ color: 0xd35a1a, roughness: 0.6 }) };
    case "fence-post":   return { geometry: new THREE.BoxGeometry(0.08, 0.6, 0.08), material: new THREE.MeshStandardMaterial({ color: 0x9a6e3c, roughness: 0.92 }) };
    case "tree-conifer": return { geometry: new THREE.ConeGeometry(0.6, 1.6, 12), material: new THREE.MeshStandardMaterial({ color: 0x3a7a48, roughness: 1.0 }) };
    case "street-light": return { geometry: new THREE.BoxGeometry(0.08, 1.6, 0.08), material: new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.6 }) };
    case "parked-sedan": return { geometry: new THREE.BoxGeometry(1.9, 0.6, 0.8), material: new THREE.MeshStandardMaterial({ color: 0x184468, roughness: 0.5, metalness: 0.2 }) };
    case "house-block":  return { geometry: new THREE.BoxGeometry(4, 2.2, 3), material: new THREE.MeshStandardMaterial({ color: 0xc06a4a, roughness: 0.9 }) };
  }
};

interface InstanceAccumulator {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material;
  readonly transforms: Array<{ position: [number, number, number]; rotation: number; scale: number }>;
}

export interface PropInstancer {
  addInstance: (propId: PropId, position: [number, number, number], rotation: number, scaleBucket: keyof typeof SCALE_BUCKETS) => void;
  build: () => THREE.Group;
}

export const createPropInstancer = (catalog: AssetCatalog | null): PropInstancer => {
  const buckets = new Map<PropId, InstanceAccumulator>();

  const addInstance: PropInstancer["addInstance"] = (propId, position, rotation, scaleBucket) => {
    let bucket = buckets.get(propId);
    if (!bucket) {
      const glbGeom = catalog?.getMesh(`prop:${propId}`) ?? null;
      const glbMat  = catalog?.getMaterial(`prop:${propId}`) ?? null;
      const proto = glbGeom && glbMat ? { geometry: glbGeom, material: glbMat } : proceduralPrototype(propId);
      bucket = { geometry: proto.geometry, material: proto.material, transforms: [] };
      buckets.set(propId, bucket);
    }
    bucket.transforms.push({ position, rotation, scale: SCALE_BUCKETS[scaleBucket] });
  };

  const build: PropInstancer["build"] = () => {
    const group = new THREE.Group();
    group.name = "props";
    const matrix = new THREE.Matrix4();
    for (const [propId, bucket] of buckets) {
      const instanced = new THREE.InstancedMesh(bucket.geometry, bucket.material, bucket.transforms.length);
      instanced.name = `prop-${propId}`;
      for (let i = 0; i < bucket.transforms.length; i += 1) {
        const { position, rotation, scale } = bucket.transforms[i];
        matrix.makeRotationY(rotation).setPosition(position[0], position[1], position[2]);
        matrix.scale(new THREE.Vector3(scale, scale, scale));
        instanced.setMatrixAt(i, matrix);
      }
      instanced.instanceMatrix.needsUpdate = true;
      group.add(instanced);
    }
    return group;
  };

  return { addInstance, build };
};
