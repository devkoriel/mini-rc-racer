import * as THREE from "three";
import { lerp } from "../util/math";

export interface ChaseCameraTuning {
  readonly distance: number;
  readonly height: number;
  readonly lookAhead: number;
  readonly followLag: number;
  readonly boostFovBonus: number;
  readonly baseFov: number;
}

export const DEFAULT_CHASE_CAMERA_TUNING: ChaseCameraTuning = {
  distance: 2.1,
  height: 0.55,
  lookAhead: 2.6,
  followLag: 0.12,
  boostFovBonus: 8,
  baseFov: 68,
};

export interface ChaseCameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export const createChaseCameraState = (): ChaseCameraState => ({
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
});

export const updateChaseCamera = (
  camera: THREE.PerspectiveCamera,
  state: ChaseCameraState,
  carPosition: THREE.Vector3,
  carForward: THREE.Vector3,
  boostIntensity: number,
  stepSeconds: number,
  tuning: ChaseCameraTuning = DEFAULT_CHASE_CAMERA_TUNING,
): void => {
  const desired = new THREE.Vector3(
    carPosition.x - carForward.x * tuning.distance,
    carPosition.y + tuning.height,
    carPosition.z - carForward.z * tuning.distance,
  );
  const tLerp = 1 - Math.pow(tuning.followLag, stepSeconds);
  state.position.lerp(desired, tLerp);
  const desiredTarget = new THREE.Vector3(
    carPosition.x + carForward.x * tuning.lookAhead,
    carPosition.y + 0.2,
    carPosition.z + carForward.z * tuning.lookAhead,
  );
  state.target.lerp(desiredTarget, tLerp);

  camera.position.copy(state.position);
  camera.lookAt(state.target);
  camera.fov = lerp(
    tuning.baseFov,
    tuning.baseFov + tuning.boostFovBonus,
    Math.min(1, boostIntensity),
  );
  camera.updateProjectionMatrix();
};
