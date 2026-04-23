import * as THREE from "three";

export interface SceneRig {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  dispose: () => void;
  setViewport: (width: number, height: number, dpr: number) => void;
}

export interface SceneLighting {
  readonly sunDirection: readonly [number, number, number];
  readonly hemisphereSky: string;
  readonly hemisphereGround: string;
  readonly fogDensity: number;
}

export const createSceneRig = (canvas: HTMLCanvasElement, lighting: SceneLighting): SceneRig => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(lighting.hemisphereSky);
  scene.fog = new THREE.FogExp2(lighting.hemisphereSky, lighting.fogDensity);

  const sun = new THREE.DirectionalLight(0xffe8c0, 2.4);
  sun.position.set(lighting.sunDirection[0] * 40, lighting.sunDirection[1] * 40, lighting.sunDirection[2] * 40);
  sun.castShadow = false;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(lighting.hemisphereSky, lighting.hemisphereGround, 1.4);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 240);
  camera.position.set(0, 2, -4);

  const setViewport = (width: number, height: number, dpr: number): void => {
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const dispose = (): void => {
    renderer.dispose();
  };

  return { scene, camera, renderer, sun, hemi, dispose, setViewport };
};
