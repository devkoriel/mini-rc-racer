import * as THREE from "three";
import {
  cross3,
  normalize3,
  sampleSplineFrame,
  type Vec3
} from "../util/math";
import type { SplineControl } from "../sim/track-runtime";

export interface SurfaceBand {
  readonly innerOffset: number;
  readonly outerOffset: number;
}

export interface SurfaceGeometry {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint32Array;
}

const UP: Vec3 = { x: 0, y: 1, z: 0 };

const lerpHalfWidth = (controls: readonly SplineControl[], t: number): number => {
  const n = controls.length;
  const scaled = ((t % 1) + 1) % 1 * n;
  const i0 = Math.floor(scaled) % n;
  const i1 = (i0 + 1) % n;
  const local = scaled - Math.floor(scaled);
  return controls[i0].halfWidth * (1 - local) + controls[i1].halfWidth * local;
};

export const buildTrackSurfaceGeometry = (
  controls: readonly SplineControl[],
  sampleCount: number,
  band: SurfaceBand
): SurfaceGeometry => {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= sampleCount; i += 1) {
    const t = i / sampleCount;
    const frame = sampleSplineFrame(controls as unknown as Vec3[], t, true);
    const halfWidth = lerpHalfWidth(controls, t);
    const right = normalize3(cross3(frame.tangent, UP));
    const innerHalf = halfWidth + band.innerOffset;
    const outerHalf = halfWidth + band.outerOffset;
    const lBase = { x: frame.position.x - right.x * outerHalf, y: frame.position.y, z: frame.position.z - right.z * outerHalf };
    const lInner = { x: frame.position.x - right.x * innerHalf, y: frame.position.y, z: frame.position.z - right.z * innerHalf };
    const rInner = { x: frame.position.x + right.x * innerHalf, y: frame.position.y, z: frame.position.z + right.z * innerHalf };
    const rBase = { x: frame.position.x + right.x * outerHalf, y: frame.position.y, z: frame.position.z + right.z * outerHalf };
    positions.push(
      lBase.x, lBase.y, lBase.z,
      lInner.x, lInner.y, lInner.z,
      rInner.x, rInner.y, rInner.z,
      rBase.x, rBase.y, rBase.z
    );
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(0, t, 0.33, t, 0.66, t, 1, t);
    if (i < sampleCount) {
      const base = i * 4;
      indices.push(
        base + 0, base + 1, base + 4,
        base + 1, base + 5, base + 4,
        base + 1, base + 2, base + 5,
        base + 2, base + 6, base + 5,
        base + 2, base + 3, base + 6,
        base + 3, base + 7, base + 6
      );
    }
  }
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices)
  };
};

export const buildTrackMesh = (
  controls: readonly SplineControl[],
  sampleCount: number,
  surfaces: Record<"road" | "curb" | "sidewalk" | "verge", SurfaceBand>
): THREE.Group => {
  const group = new THREE.Group();
  group.name = "track-surfaces";
  const materials = {
    road: new THREE.MeshStandardMaterial({ color: 0xb89a78, roughness: 0.92, metalness: 0.02 }),
    curb: new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.78 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: 0xe0dcd2, roughness: 0.88 }),
    verge: new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 1.0 })
  };
  for (const key of ["verge", "sidewalk", "curb", "road"] as const) {
    const geom = buildTrackSurfaceGeometry(controls, sampleCount, surfaces[key]);
    const bufferGeom = new THREE.BufferGeometry();
    bufferGeom.setAttribute("position", new THREE.BufferAttribute(geom.positions, 3));
    bufferGeom.setAttribute("normal", new THREE.BufferAttribute(geom.normals, 3));
    bufferGeom.setAttribute("uv", new THREE.BufferAttribute(geom.uvs, 2));
    bufferGeom.setIndex(new THREE.BufferAttribute(geom.indices, 1));
    bufferGeom.computeBoundingSphere();
    const mesh = new THREE.Mesh(bufferGeom, materials[key]);
    mesh.renderOrder = key === "road" ? 1 : 0;
    mesh.name = `surface-${key}`;
    group.add(mesh);
  }
  return group;
};
