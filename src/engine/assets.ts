import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

export interface AssetCatalog {
  registerGLB: (assetId: string, url: string) => void;
  loadAll: (renderer: THREE.WebGLRenderer) => Promise<void>;
  getMesh: (assetId: string) => THREE.BufferGeometry | null;
  getMaterial: (assetId: string) => THREE.Material | null;
  dispose: () => void;
}

interface Entry {
  url: string;
  geometry: THREE.BufferGeometry | null;
  material: THREE.Material | null;
}

export const createAssetCatalog = (): AssetCatalog => {
  const entries = new Map<string, Entry>();

  const registerGLB: AssetCatalog["registerGLB"] = (assetId, url) => {
    entries.set(assetId, { url, geometry: null, material: null });
  };

  const loadAll: AssetCatalog["loadAll"] = async (renderer) => {
    const ktx2 = new KTX2Loader()
      .setTranscoderPath("/basis/")
      .detectSupport(renderer);
    const gltf = new GLTFLoader()
      .setKTX2Loader(ktx2)
      .setMeshoptDecoder(MeshoptDecoder);

    const tasks: Array<Promise<void>> = [];
    for (const [assetId, entry] of entries) {
      tasks.push(
        new Promise<void>((resolve) => {
          gltf.load(
            entry.url,
            (gltfData) => {
              let firstMesh: THREE.Mesh | null = null;
              gltfData.scene.traverse((obj) => {
                if (firstMesh === null && (obj as THREE.Mesh).isMesh) {
                  firstMesh = obj as THREE.Mesh;
                }
              });
              const mesh = firstMesh as THREE.Mesh | null;
              if (mesh === null) {
                resolve();
                return;
              }
              entry.geometry = mesh.geometry.clone();
              entry.material = Array.isArray(mesh.material)
                ? mesh.material[0].clone()
                : mesh.material.clone();
              resolve();
            },
            undefined,
            (err) => {
              console.warn(`[assets] failed to load ${assetId}:`, err);
              resolve(); // non-fatal — instancer will fall back to procedural
            },
          );
        }),
      );
    }
    await Promise.all(tasks);
  };

  const getMesh: AssetCatalog["getMesh"] = (assetId) =>
    entries.get(assetId)?.geometry ?? null;
  const getMaterial: AssetCatalog["getMaterial"] = (assetId) =>
    entries.get(assetId)?.material ?? null;

  const dispose: AssetCatalog["dispose"] = () => {
    for (const entry of entries.values()) {
      entry.geometry?.dispose();
      if (entry.material && "dispose" in entry.material)
        (entry.material as THREE.Material).dispose();
    }
    entries.clear();
  };

  return { registerGLB, loadAll, getMesh, getMaterial, dispose };
};
