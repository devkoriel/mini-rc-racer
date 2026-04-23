import * as THREE from "three";

export interface BoostDustPool {
  readonly group: THREE.Group;
  spawn: (position: THREE.Vector3, intensity: number) => void;
  update: (stepSeconds: number) => void;
}

export const createBoostDustPool = (capacity = 64): BoostDustPool => {
  const group = new THREE.Group();
  group.name = "boost-dust";
  const geometry = new THREE.SphereGeometry(0.05, 6, 6);
  const material = new THREE.MeshBasicMaterial({
    color: 0xf8d6a4,
    transparent: true,
    opacity: 0,
  });
  const particles: Array<{
    mesh: THREE.Mesh;
    life: number;
    velocity: THREE.Vector3;
  }> = [];
  for (let i = 0; i < capacity; i += 1) {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.visible = false;
    group.add(mesh);
    particles.push({ mesh, life: 0, velocity: new THREE.Vector3() });
  }
  let cursor = 0;
  const spawn = (position: THREE.Vector3, intensity: number): void => {
    const count = Math.min(4, Math.max(1, Math.floor(intensity * 4)));
    for (let i = 0; i < count; i += 1) {
      const p = particles[cursor];
      cursor = (cursor + 1) % particles.length;
      p.mesh.position.copy(position);
      p.mesh.position.y += 0.05;
      p.mesh.visible = true;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
      p.life = 0.35;
      const angle = Math.random() * Math.PI * 2;
      p.velocity.set(Math.cos(angle) * 0.8, 1.2, Math.sin(angle) * 0.8);
    }
  };
  const update = (stepSeconds: number): void => {
    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= stepSeconds;
      p.mesh.position.addScaledVector(p.velocity, stepSeconds);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (p.life / 0.35) * 0.8,
      );
      p.velocity.y -= 2.0 * stepSeconds;
      if (p.life <= 0) p.mesh.visible = false;
    }
  };
  return { group, spawn, update };
};
