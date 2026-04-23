import * as THREE from "three";

export interface CarVisualParts {
  readonly group: THREE.Group;
  readonly chassis: THREE.Object3D;
  readonly wheels: readonly THREE.Object3D[];
  readonly antenna: THREE.Object3D;
  readonly boostGlow: THREE.Mesh;
}

export interface CarStyle {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly glb?: THREE.Group | null; // optional loaded GLB scene
}

const buildProceduralCar = (style: CarStyle): CarVisualParts => {
  const group = new THREE.Group();
  group.name = "car";
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.24, 1.0),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(style.primaryColor), roughness: 0.45, metalness: 0.35 })
  );
  chassis.position.y = 0.18;
  chassis.castShadow = true;
  group.add(chassis);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.18, 0.5),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(style.secondaryColor), roughness: 0.4, metalness: 0.1 })
  );
  cabin.position.set(0, 0.36, -0.05);
  group.add(cabin);

  const wheelGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [[-0.3, 0.38], [0.3, 0.38], [-0.3, -0.38], [0.3, -0.38]] as const) {
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.position.set(x, 0.12, z);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
  }

  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })
  );
  antenna.position.set(-0.2, 0.55, -0.3);
  group.add(antenna);

  const boostGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffc84a, transparent: true, opacity: 0.0 })
  );
  boostGlow.position.set(0, 0.18, -0.6);
  group.add(boostGlow);

  return { group, chassis, wheels, antenna, boostGlow };
};

const wrapGLBCar = (glb: THREE.Group, style: CarStyle): CarVisualParts => {
  const group = new THREE.Group();
  group.name = "car";
  const root = glb.clone(true);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
      if (mat.name?.toLowerCase().includes("paint")) {
        mat.color = new THREE.Color(style.primaryColor);
      }
    }
  });
  group.add(root);

  const wheels: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.name.toLowerCase().startsWith("wheel")) wheels.push(obj);
  });

  const boostGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffc84a, transparent: true, opacity: 0.0 })
  );
  boostGlow.position.set(0, 0.18, -0.6);
  group.add(boostGlow);

  return { group, chassis: root, wheels, antenna: root, boostGlow };
};

export const createCarMesh = (style: CarStyle): CarVisualParts => {
  if (style.glb) return wrapGLBCar(style.glb, style);
  return buildProceduralCar(style);
};

export const setCarBoostGlow = (parts: CarVisualParts, intensity: number): void => {
  const material = parts.boostGlow.material as THREE.MeshBasicMaterial;
  material.opacity = Math.max(0, Math.min(1, intensity));
};
