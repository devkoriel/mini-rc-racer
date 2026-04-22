import * as THREE from "three";

import {
  add,
  clamp,
  distance,
  dot,
  length,
  perpendicular,
  scale,
  wrapAngle,
  type Vec2
} from "./math";
import {
  DECOR,
  PICKUP_PROGRESS,
  TRACK,
  analyzeTrack,
  getStartTransform,
  sampleOffsetPoint,
  sampleTrackFrame,
  type DecorItem
} from "./track";
import { loadBestLap, saveBestLap } from "./persistence";
import type { InputState } from "./game";

export type { InputState } from "./game";

export interface HudRefs {
  bestValue: HTMLElement;
  boostValue: HTMLElement;
  lapValue: HTMLElement;
  overlayBody: HTMLElement;
  overlayKicker: HTMLElement;
  overlayPanel: HTMLElement;
  overlayTitle: HTMLElement;
  placeValue: HTMLElement;
  speedValue: HTMLElement;
  timerValue: HTMLElement;
}

interface CarVisual {
  boostGlow: THREE.Mesh;
  mesh: THREE.Group;
  wheels: THREE.Mesh[];
}

interface CarState {
  angle: number;
  boostTime: number;
  checkpointArmed: boolean;
  id: "player" | "rival";
  laneOffset: number;
  lap: number;
  lastLapStamp: number;
  lastProgress: number;
  offRoad: boolean;
  position: Vec2;
  progress: number;
  velocity: Vec2;
  visual: CarVisual;
  wheelSpin: number;
}

interface PickupState {
  active: boolean;
  mesh: THREE.Group;
  progress: number;
  pulse: number;
  respawn: number;
}

interface ControlFrame {
  brake: number;
  steer: number;
  throttle: number;
}

type RaceStatus = "countdown" | "finished" | "grid" | "running";

const BEST_LAP_PLACEHOLDER = "--:--.--";
const FIXED_STEP_SECONDS = 1 / 120;
const PLAYER_LAPS_TO_WIN = 3;
const ROAD_SAMPLE_STEP = 18;
const TOTAL_RACERS = 2;

function formatRaceTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = seconds % 60;
  const wholeSeconds = Math.floor(remainder)
    .toString()
    .padStart(2, "0");
  const hundredths = Math.floor((remainder % 1) * 100)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${wholeSeconds}.${hundredths}`;
}

function hasFinished(car: CarState): boolean {
  return car.lap >= PLAYER_LAPS_TO_WIN;
}

function rankCars(cars: CarState[]): CarState[] {
  return [...cars].sort((left, right) => {
    const leftScore = left.lap * TRACK.totalLength + left.progress;
    const rightScore = right.lap * TRACK.totalLength + right.progress;

    return rightScore - leftScore;
  });
}

function toVector3(position: Vec2, y = 0): THREE.Vector3 {
  return new THREE.Vector3(position.x, y, position.y);
}

function createRibbonGeometry(width: number, y: number): THREE.BufferGeometry {
  const sampleCount = Math.ceil(TRACK.totalLength / ROAD_SAMPLE_STEP);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const progress = (index / sampleCount) * TRACK.totalLength;
    const frame = sampleTrackFrame(TRACK, progress);
    const left = add(frame.center, scale(frame.normal, width));
    const right = add(frame.center, scale(frame.normal, -width));

    positions.push(left.x, y, left.y, right.x, y, right.y);
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, index / sampleCount, 1, index / sampleCount);

    if (index < sampleCount) {
      const base = index * 2;

      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 3, base + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

function createSymmetricBandGeometry(
  innerWidth: number,
  outerWidth: number,
  y: number
): THREE.BufferGeometry {
  const sampleCount = Math.ceil(TRACK.totalLength / ROAD_SAMPLE_STEP);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const progress = (index / sampleCount) * TRACK.totalLength;
    const frame = sampleTrackFrame(TRACK, progress);
    const outerLeft = add(frame.center, scale(frame.normal, outerWidth));
    const innerLeft = add(frame.center, scale(frame.normal, innerWidth));
    const innerRight = add(frame.center, scale(frame.normal, -innerWidth));
    const outerRight = add(frame.center, scale(frame.normal, -outerWidth));

    positions.push(
      outerLeft.x,
      y,
      outerLeft.y,
      innerLeft.x,
      y,
      innerLeft.y,
      innerRight.x,
      y,
      innerRight.y,
      outerRight.x,
      y,
      outerRight.y
    );
    normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    uvs.push(0, index / sampleCount, 1, index / sampleCount, 1, index / sampleCount, 0, index / sampleCount);

    if (index < sampleCount) {
      const base = index * 4;
      indices.push(base, base + 1, base + 4);
      indices.push(base + 1, base + 5, base + 4);
      indices.push(base + 3, base + 2, base + 7);
      indices.push(base + 2, base + 6, base + 7);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

export class RacerGame {
  private accumulator = 0;

  private bestLapTime = Number.POSITIVE_INFINITY;

  private readonly camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 2400);

  private readonly cameraLookAt = new THREE.Vector3();

  private countdownFlash = 0;

  private countdownRemaining = 0;

  private elapsedRaceTime = 0;

  private lastFrameTime = 0;

  private lastLapTime = 0;

  private readonly loopHandle: (time: number) => void;

  private readonly renderer: THREE.WebGLRenderer;

  private playerPlace = 1;

  private readonly resizeHandle: () => void;

  private restartHeld = false;

  private readonly scene = new THREE.Scene();

  private startHeld = false;

  private status: RaceStatus = "grid";

  private readonly sun = new THREE.Mesh(
    new THREE.SphereGeometry(18, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe3a4 })
  );

  private readonly worldRoot = new THREE.Group();

  private readonly trackRoot = new THREE.Group();

  private readonly pickupRoot = new THREE.Group();

  private player: CarState;

  private pickups: PickupState[] = [];

  private rival: CarState;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly hud: HudRefs,
    private readonly input: InputState
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas,
      powerPreference: "high-performance"
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.background = new THREE.Color("#cfe6ff");
    this.scene.fog = new THREE.Fog("#cfe6ff", 150, 840);
    this.scene.add(this.worldRoot);
    this.worldRoot.add(this.trackRoot);
    this.worldRoot.add(this.pickupRoot);

    this.buildEnvironment();

    this.bestLapTime = loadBestLap(globalThis.localStorage);
    this.player = this.createCar("player", "#f4bf3a", "#202127", -24);
    this.rival = this.createCar("rival", "#ef4b5b", "#1a1424", 24);
    this.pickups = this.buildPickups();

    this.resizeHandle = () => {
      this.resizeRenderer();
    };
    window.addEventListener("resize", this.resizeHandle);
    this.resizeRenderer();
    this.reset();

    this.loopHandle = (time) => {
      this.frame(time);
    };
    requestAnimationFrame(this.loopHandle);
  }

  private buildEnvironment(): void {
    const hemisphere = new THREE.HemisphereLight(0xf5fbff, 0x708d58, 1.95);
    const sunLight = new THREE.DirectionalLight(0xffefc3, 2.25);

    sunLight.position.set(220, 340, -180);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -500;
    sunLight.shadow.camera.right = 500;
    sunLight.shadow.camera.top = 500;
    sunLight.shadow.camera.bottom = -500;
    this.scene.add(hemisphere, sunLight);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2600, 2600),
      new THREE.MeshStandardMaterial({ color: 0x87b661, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.worldRoot.add(ground);

    const sidewalk = new THREE.Mesh(
      createSymmetricBandGeometry(TRACK.halfWidth + 9, TRACK.halfWidth + 34, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xcdc8bf, roughness: 0.94, side: THREE.DoubleSide })
    );
    sidewalk.receiveShadow = true;
    this.trackRoot.add(sidewalk);

    const curb = new THREE.Mesh(
      createSymmetricBandGeometry(TRACK.halfWidth, TRACK.halfWidth + 8, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.84, side: THREE.DoubleSide })
    );
    curb.receiveShadow = true;
    this.trackRoot.add(curb);

    const shoulder = new THREE.Mesh(
      createSymmetricBandGeometry(TRACK.halfWidth + 34, TRACK.halfWidth + 66, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xa6d47a, roughness: 1, side: THREE.DoubleSide })
    );
    shoulder.receiveShadow = true;
    this.trackRoot.add(shoulder);

    const road = new THREE.Mesh(
      createRibbonGeometry(TRACK.halfWidth, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x353b43, roughness: 0.92, side: THREE.DoubleSide })
    );
    road.receiveShadow = true;
    this.trackRoot.add(road);

    this.trackRoot.add(this.createLaneMarkers());
    this.trackRoot.add(this.createTrackCurbPaint());
    this.trackRoot.add(this.createStreetFurniture());
    this.trackRoot.add(this.createIntersections());
    this.trackRoot.add(this.createStartBanner());
    this.worldRoot.add(this.createTracksideNeighborhood());
    this.worldRoot.add(this.createSectorLandmarks());
    this.worldRoot.add(this.createBackdropNeighborhood());

    for (const item of DECOR) {
      this.worldRoot.add(this.createDecorMesh(item));
    }

    this.sun.position.set(280, 180, -280);
    this.scene.add(this.sun);
    this.scene.add(this.createCloud(120, 132, -260, 1.2));
    this.scene.add(this.createCloud(-90, 116, -220, 1.6));
    this.scene.add(this.createCloud(320, 104, 60, 1));
  }

  private createLaneMarkers(): THREE.Group {
    const markers = new THREE.Group();
    const stripeGeometry = new THREE.BoxGeometry(12, 0.08, 2.8);
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8f1d1,
      emissive: 0x362e14,
      emissiveIntensity: 0.18,
      roughness: 0.5
    });

    for (let progress = 30; progress < TRACK.totalLength; progress += 78) {
      const frame = sampleTrackFrame(TRACK, progress);
      const marker = new THREE.Mesh(stripeGeometry, stripeMaterial);

      marker.position.copy(toVector3(frame.center, 0.14));
      marker.rotation.y = -Math.atan2(frame.direction.y, frame.direction.x);
      marker.receiveShadow = true;
      markers.add(marker);
    }

    return markers;
  }

  private createTrackCurbPaint(): THREE.Group {
    const group = new THREE.Group();
    const stripeGeometry = new THREE.BoxGeometry(9, 0.08, 4);
    const stripeMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0d7a2,
      roughness: 0.92
    });

    for (let progress = 0; progress < TRACK.totalLength; progress += 30) {
      const frame = sampleTrackFrame(TRACK, progress);

      for (const side of [-1, 1] as const) {
        const anchor = add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 3.5)));
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);

        stripe.position.copy(toVector3(anchor, 0.12));
        stripe.rotation.y = -Math.atan2(frame.direction.y, frame.direction.x);
        stripe.receiveShadow = true;
        group.add(stripe);
      }
    }

    return group;
  }

  private createStreetFurniture(): THREE.Group {
    const group = new THREE.Group();

    for (let progress = 18; progress < TRACK.totalLength; progress += 54) {
      const frame = sampleTrackFrame(TRACK, progress);

      for (const side of [-1, 1] as const) {
        const anchor = add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 42)));

        if (Math.floor(progress / 54) % 3 === 0) {
          group.add(this.createStreetLight(anchor, frame.direction));
        } else {
          group.add(this.createFenceSegment(anchor, frame.direction));
        }
      }
    }

    return group;
  }

  private createTracksideNeighborhood(): THREE.Group {
    const group = new THREE.Group();
    let blockIndex = 0;

    for (let progress = 28; progress < TRACK.totalLength; progress += 74) {
      const frame = sampleTrackFrame(TRACK, progress);

      for (const side of [-1, 1] as const) {
        const facing = scale(frame.normal, -side);
        const outward = scale(frame.normal, side);
        const variant = (blockIndex + (side === 1 ? 1 : 0)) % 3;
        const houseDistance = TRACK.halfWidth + 62 + variant * 10;
        const housePosition = add(frame.center, scale(frame.normal, side * houseDistance));
        const drivewayPosition = add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 34)));
        const parkedPosition = add(
          add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 48))),
          scale(frame.direction, side === 1 ? -12 : 12)
        );
        const mailboxPosition = add(
          add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 28))),
          scale(frame.direction, side === 1 ? -16 : 16)
        );
        const binPosition = add(
          add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 44))),
          scale(frame.direction, side === 1 ? 10 : -10)
        );
        const hedgePosition = add(
          add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 56))),
          scale(frame.direction, side === 1 ? -26 : 26)
        );
        const treePosition = add(
          add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 64))),
          scale(frame.direction, side === 1 ? 34 : -34)
        );
        const hydrantPosition = add(
          add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 24))),
          scale(frame.direction, side === 1 ? 30 : -30)
        );
        const facingAngle = Math.atan2(facing.y, facing.x);
        const streetAngle = Math.atan2(frame.direction.y, frame.direction.x);
        const houseTint = 18 + ((blockIndex * 13 + (side === 1 ? 21 : 7)) % 40);

        group.add(this.createDriveway(drivewayPosition, outward));
        group.add(this.createMailbox(mailboxPosition, facing));
        group.add(this.createTrashBins(binPosition, facing));
        group.add(this.createHedgeRow(hedgePosition, frame.direction));
        if ((blockIndex + (side === 1 ? 1 : 0)) % 2 === 0) {
          group.add(this.createHydrant(hydrantPosition));
        }
        group.add(
          this.createDecorMesh({
            kind: "house",
            position: housePosition,
            size: 128 + ((blockIndex + (side === 1 ? 1 : 0)) % 2) * 12,
            tint: houseTint,
            rotation: facingAngle
          })
        );
        group.add(
          this.createDecorMesh({
            kind: "parked-car",
            position: parkedPosition,
            size: 78,
            tint: side === 1 ? 216 : 8,
            rotation: streetAngle
          })
        );
        group.add(
          this.createDecorMesh({
            kind: "tree",
            position: treePosition,
            size: 42,
            tint: 108 + ((blockIndex + (side === 1 ? 2 : 0)) % 3) * 10,
            rotation: 0
          })
        );
      }

      blockIndex += 1;
    }

    return group;
  }

  private createIntersections(): THREE.Group {
    const group = new THREE.Group();
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a4148,
      roughness: 0.94
    });
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0xd3cdc4,
      roughness: 0.95
    });
    const stopLineMaterial = new THREE.MeshStandardMaterial({
      color: 0xf7f1df,
      roughness: 0.7
    });
    const intersections = [
      { progress: 176, span: 188, depth: 30 },
      { progress: 548, span: 212, depth: 30 },
      { progress: 948, span: 184, depth: 28 },
      { progress: 1336, span: 196, depth: 30 }
    ];

    for (const intersection of intersections) {
      const frame = sampleTrackFrame(TRACK, intersection.progress);
      const crossAngle = -Math.atan2(frame.normal.y, frame.normal.x);
      const node = new THREE.Group();
      const road = new THREE.Mesh(
        new THREE.BoxGeometry(intersection.span, 0.08, intersection.depth),
        roadMaterial
      );
      const sidewalkLeft = new THREE.Mesh(
        new THREE.BoxGeometry(intersection.span + 16, 0.05, 6),
        sidewalkMaterial
      );
      const sidewalkRight = sidewalkLeft.clone();
      const stopBarA = new THREE.Mesh(
        new THREE.BoxGeometry(intersection.span - 68, 0.08, 0.9),
        stopLineMaterial
      );
      const stopBarB = stopBarA.clone();

      sidewalkLeft.position.set(0, 0.02, -intersection.depth * 0.5 - 4);
      sidewalkRight.position.set(0, 0.02, intersection.depth * 0.5 + 4);
      stopBarA.position.set(0, 0.09, -intersection.depth * 0.5 + 3.6);
      stopBarB.position.set(0, 0.09, intersection.depth * 0.5 - 3.6);
      node.add(road, sidewalkLeft, sidewalkRight, stopBarA, stopBarB);
      node.position.copy(toVector3(frame.center, 0.11));
      node.rotation.y = crossAngle;
      node.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.receiveShadow = true;
        }
      });
      group.add(node);

      const signAhead = add(
        add(frame.center, scale(frame.normal, TRACK.halfWidth + 34)),
        scale(frame.direction, -20)
      );
      const signBehind = add(
        add(frame.center, scale(frame.normal, -(TRACK.halfWidth + 34))),
        scale(frame.direction, 20)
      );
      group.add(this.createStopSign(signAhead, scale(frame.normal, -1)));
      group.add(this.createStopSign(signBehind, frame.normal));
    }

    return group;
  }

  private createSectorLandmarks(): THREE.Group {
    const group = new THREE.Group();
    const landmarks = [
      { progress: 108, side: 1 as const, shift: -24, tint: 46, parkedTint: 214, treeTint: 112 },
      { progress: 402, side: -1 as const, shift: 26, tint: 24, parkedTint: 12, treeTint: 124 },
      { progress: 716, side: 1 as const, shift: -12, tint: 38, parkedTint: 210, treeTint: 118 },
      { progress: 1038, side: -1 as const, shift: 24, tint: 54, parkedTint: 9, treeTint: 128 },
      { progress: 1416, side: 1 as const, shift: 14, tint: 32, parkedTint: 216, treeTint: 114 }
    ];

    for (const landmark of landmarks) {
      const frame = sampleTrackFrame(TRACK, landmark.progress);
      const side = landmark.side;
      const facing = scale(frame.normal, -side);
      const outward = scale(frame.normal, side);
      const facingAngle = Math.atan2(facing.y, facing.x);
      const streetAngle = Math.atan2(frame.direction.y, frame.direction.x);
      const housePosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 78))),
        scale(frame.direction, landmark.shift)
      );
      const drivewayPosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 34))),
        scale(frame.direction, landmark.shift * 0.45)
      );
      const parkedPosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 52))),
        scale(frame.direction, landmark.shift + (side === 1 ? 18 : -18))
      );
      const mailboxPosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 28))),
        scale(frame.direction, landmark.shift + (side === 1 ? -14 : 14))
      );
      const hedgePosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 58))),
        scale(frame.direction, landmark.shift + (side === 1 ? -26 : 26))
      );
      const signPosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 24))),
        scale(frame.direction, landmark.shift + (side === 1 ? -42 : 42))
      );
      const hydrantPosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 22))),
        scale(frame.direction, landmark.shift + (side === 1 ? 34 : -34))
      );
      const treeNearPosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 70))),
        scale(frame.direction, landmark.shift + (side === 1 ? 34 : -34))
      );
      const treeFarPosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 92))),
        scale(frame.direction, landmark.shift + (side === 1 ? -30 : 30))
      );
      const fencePosition = add(
        add(frame.center, scale(frame.normal, side * (TRACK.halfWidth + 48))),
        scale(frame.direction, landmark.shift + (side === 1 ? -48 : 48))
      );

      group.add(this.createDriveway(drivewayPosition, outward));
      group.add(this.createMailbox(mailboxPosition, facing));
      group.add(this.createHydrant(hydrantPosition));
      group.add(this.createHedgeRow(hedgePosition, frame.direction));
      group.add(this.createFenceSegment(fencePosition, frame.direction));
      group.add(this.createStopSign(signPosition, facing));
      group.add(
        this.createDecorMesh({
          kind: "house",
          position: housePosition,
          size: 152,
          tint: landmark.tint,
          rotation: facingAngle
        })
      );
      group.add(
        this.createDecorMesh({
          kind: "parked-car",
          position: parkedPosition,
          size: 92,
          tint: landmark.parkedTint,
          rotation: streetAngle
        })
      );
      group.add(
        this.createDecorMesh({
          kind: "tree",
          position: treeNearPosition,
          size: 48,
          tint: landmark.treeTint,
          rotation: 0
        })
      );
      group.add(
        this.createDecorMesh({
          kind: "tree",
          position: treeFarPosition,
          size: 52,
          tint: landmark.treeTint + 8,
          rotation: 0
        })
      );
    }

    return group;
  }

  private createBackdropNeighborhood(): THREE.Group {
    const group = new THREE.Group();
    const clusters = [
      { house: { x: -760, y: -360 }, parked: { x: -688, y: -282 }, tree: { x: -706, y: -454 }, tint: 28, parkedTint: 214, treeTint: 118, rotation: 0.04 },
      { house: { x: -742, y: 64 }, parked: { x: -692, y: 148 }, tree: { x: -714, y: -52 }, tint: 36, parkedTint: 10, treeTint: 126, rotation: -0.06 },
      { house: { x: -672, y: 462 }, parked: { x: -604, y: 326 }, tree: { x: -742, y: 316 }, tint: 48, parkedTint: 216, treeTint: 112, rotation: 0.08 },
      { house: { x: -78, y: -576 }, parked: { x: 48, y: -556 }, tree: { x: 176, y: -572 }, tint: 54, parkedTint: 8, treeTint: 108, rotation: 0.02 },
      { house: { x: 318, y: -516 }, parked: { x: 454, y: -462 }, tree: { x: 586, y: -520 }, tint: 22, parkedTint: 212, treeTint: 124, rotation: -0.04 },
      { house: { x: 704, y: -220 }, parked: { x: 772, y: -92 }, tree: { x: 746, y: -338 }, tint: 32, parkedTint: 10, treeTint: 128, rotation: 0.02 },
      { house: { x: 716, y: 214 }, parked: { x: 784, y: 332 }, tree: { x: 732, y: 72 }, tint: 18, parkedTint: 214, treeTint: 114, rotation: -0.06 },
      { house: { x: 258, y: 622 }, parked: { x: 86, y: 650 }, tree: { x: 420, y: 648 }, tint: 46, parkedTint: 12, treeTint: 120, rotation: -0.08 }
    ];

    for (const cluster of clusters) {
      group.add(
        this.createDecorMesh({
          kind: "house",
          position: cluster.house,
          size: 150,
          tint: cluster.tint,
          rotation: cluster.rotation
        })
      );
      group.add(
        this.createDecorMesh({
          kind: "parked-car",
          position: cluster.parked,
          size: 92,
          tint: cluster.parkedTint,
          rotation: cluster.rotation
        })
      );
      group.add(
        this.createDecorMesh({
          kind: "tree",
          position: cluster.tree,
          size: 50,
          tint: cluster.treeTint,
          rotation: 0
        })
      );
    }

    return group;
  }

  private createDriveway(position: Vec2, outward: Vec2): THREE.Mesh {
    const driveway = new THREE.Mesh(
      new THREE.BoxGeometry(28, 0.08, 14),
      new THREE.MeshStandardMaterial({
        color: 0xdbd4c7,
        roughness: 0.96
      })
    );

    driveway.position.copy(toVector3(position, 0.05));
    driveway.rotation.y = -Math.atan2(outward.y, outward.x);
    driveway.receiveShadow = true;

    return driveway;
  }

  private createMailbox(position: Vec2, facing: Vec2): THREE.Group {
    const group = new THREE.Group();
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 3.8, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xf0efe7, roughness: 0.92 })
    );
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1.4, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2d5a95, roughness: 0.72 })
    );
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.9, 0.7),
      new THREE.MeshStandardMaterial({ color: 0xe15b4b, roughness: 0.7 })
    );

    post.position.y = 1.9;
    box.position.set(0.8, 3.2, 0);
    flag.position.set(1.7, 3.45, 0);
    group.add(post, box, flag);
    group.position.copy(toVector3(position));
    group.rotation.y = -Math.atan2(facing.y, facing.x);
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createTrashBins(position: Vec2, facing: Vec2): THREE.Group {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x495664, roughness: 0.88 });
    const lidMaterial = new THREE.MeshStandardMaterial({ color: 0x2b333d, roughness: 0.78 });

    for (const x of [-1.2, 1.2]) {
      const bin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 1.6), bodyMaterial);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.28, 1.75), lidMaterial);

      bin.position.set(x, 1.3, 0);
      lid.position.set(x, 2.72, 0);
      group.add(bin, lid);
    }

    group.position.copy(toVector3(position));
    group.rotation.y = -Math.atan2(facing.y, facing.x);
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createHedgeRow(position: Vec2, direction: Vec2): THREE.Group {
    const group = new THREE.Group();
    const hedgeMaterial = new THREE.MeshStandardMaterial({ color: 0x5e8f44, roughness: 1 });

    for (const x of [-5, 0, 5]) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 3.4), hedgeMaterial);

      hedge.position.set(x, 1.6, 0);
      group.add(hedge);
    }

    group.position.copy(toVector3(position));
    group.rotation.y = -Math.atan2(direction.y, direction.x);
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createHydrant(position: Vec2): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xe24c34, roughness: 0.82 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1, 2.8, 12), material);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 12), material);
    const leftNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10), material);
    const rightNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.1, 10), material);

    body.position.y = 1.4;
    cap.position.y = 3.1;
    leftNozzle.rotation.z = Math.PI / 2;
    rightNozzle.rotation.z = Math.PI / 2;
    leftNozzle.position.set(-0.95, 1.9, 0);
    rightNozzle.position.set(0.95, 1.9, 0);
    group.add(body, cap, leftNozzle, rightNozzle);
    group.position.copy(toVector3(position));
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createStopSign(position: Vec2, facing: Vec2): THREE.Group {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 4.6, 10),
      new THREE.MeshStandardMaterial({ color: 0xb8bcc3, roughness: 0.76 })
    );
    const sign = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.45, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: 0xcb4338, roughness: 0.58 })
    );
    const border = new THREE.Mesh(
      new THREE.CylinderGeometry(1.56, 1.56, 0.06, 8),
      new THREE.MeshStandardMaterial({ color: 0xf9efe2, roughness: 0.55 })
    );

    pole.position.y = 2.3;
    sign.rotation.z = Math.PI / 2;
    border.rotation.z = Math.PI / 2;
    sign.position.set(0, 4.6, 0);
    border.position.set(0, 4.6, -0.08);
    group.add(pole, border, sign);
    group.position.copy(toVector3(position));
    group.rotation.y = -Math.atan2(facing.y, facing.x);
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createStreetLight(position: Vec2, direction: Vec2): THREE.Group {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.9, 22, 12),
      new THREE.MeshStandardMaterial({ color: 0x5e6772, roughness: 0.8 })
    );
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.6, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x5e6772, roughness: 0.8 })
    );
    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.8, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0xfff6da,
        emissive: 0xffd36d,
        emissiveIntensity: 0.22,
        roughness: 0.45
      })
    );

    pole.position.y = 11;
    arm.position.set(2.4, 20, 0);
    lamp.position.set(5.2, 18.8, 0);
    group.add(pole, arm, lamp);
    group.position.copy(toVector3(position));
    group.rotation.y = -Math.atan2(direction.y, direction.x);
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createFenceSegment(position: Vec2, direction: Vec2): THREE.Group {
    const group = new THREE.Group();
    const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf1e4cb, roughness: 0.92 });
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0xf7ecd9, roughness: 0.9 });
    const postOffsets = [-5, 0, 5];

    for (const offset of postOffsets) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.2, 0.8), postMaterial);

      post.position.set(offset, 2.6, 0);
      group.add(post);
    }

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(12, 0.45, 0.45), railMaterial);
    const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(12, 0.45, 0.45), railMaterial);
    topRail.position.y = 4.2;
    bottomRail.position.y = 2.3;
    group.add(topRail, bottomRail);
    group.position.copy(toVector3(position));
    group.rotation.y = -Math.atan2(direction.y, direction.x);
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createStartBanner(): THREE.Group {
    const group = new THREE.Group();
    const frame = sampleTrackFrame(TRACK, 24);
    const forwardAngle = -Math.atan2(frame.direction.y, frame.direction.x);
    const normalAngle = -Math.atan2(frame.normal.y, frame.normal.x);

    const line = new THREE.Mesh(
      new THREE.BoxGeometry(TRACK.halfWidth * 1.6, 0.12, 4.4),
      new THREE.MeshStandardMaterial({ color: 0xf7f2e5, roughness: 0.85 })
    );
    line.position.copy(toVector3(frame.center, 0.16));
    line.rotation.y = normalAngle;
    line.receiveShadow = true;

    const gantryMaterial = new THREE.MeshStandardMaterial({ color: 0xf0e6d5, roughness: 0.7 });
    const poleGeometry = new THREE.BoxGeometry(1.6, 16, 1.6);
    const beamGeometry = new THREE.BoxGeometry(TRACK.halfWidth * 1.45, 1.2, 1.2);
    const leftPoleAnchor = add(frame.center, scale(frame.normal, TRACK.halfWidth + 12));
    const rightPoleAnchor = add(frame.center, scale(frame.normal, -(TRACK.halfWidth + 12)));
    const leftPole = new THREE.Mesh(poleGeometry, gantryMaterial);
    const rightPole = new THREE.Mesh(poleGeometry, gantryMaterial);
    const beam = new THREE.Mesh(beamGeometry, gantryMaterial);

    leftPole.position.copy(toVector3(leftPoleAnchor, 8));
    rightPole.position.copy(toVector3(rightPoleAnchor, 8));
    beam.position.copy(toVector3(add(frame.center, scale(frame.direction, -6)), 15.8));
    beam.rotation.y = normalAngle;

    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(TRACK.halfWidth * 1.2, 5.6),
      new THREE.MeshBasicMaterial({ color: 0x1a1d23, side: THREE.DoubleSide })
    );
    banner.position.copy(toVector3(add(frame.center, scale(frame.direction, -6.2)), 14.2));
    banner.rotation.y = forwardAngle + Math.PI / 2;

    group.add(line, leftPole, rightPole, beam, banner);

    return group;
  }

  private createCloud(x: number, y: number, z: number, scaleFactor: number): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.56
    });

    const bubbles = [
      new THREE.Mesh(new THREE.SphereGeometry(16 * scaleFactor, 16, 16), material),
      new THREE.Mesh(new THREE.SphereGeometry(13 * scaleFactor, 16, 16), material),
      new THREE.Mesh(new THREE.SphereGeometry(11 * scaleFactor, 16, 16), material)
    ];

    bubbles[0].position.set(0, 0, 0);
    bubbles[1].position.set(18 * scaleFactor, -3 * scaleFactor, 0);
    bubbles[2].position.set(-16 * scaleFactor, -2 * scaleFactor, 0);
    group.add(...bubbles);
    group.position.set(x, y, z);

    return group;
  }

  private createDecorMesh(item: DecorItem): THREE.Group {
    const group = new THREE.Group();
    const position = toVector3(item.position);
    const scaleFactor = item.size / 28;

    switch (item.kind) {
      case "barn": {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(18, 12, 15),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${item.tint} 72% 48%)`), roughness: 1 })
        );
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(13, 6, 4),
          new THREE.MeshStandardMaterial({ color: 0x6a3d22, roughness: 1 })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 9;
        group.add(body, roof);
        position.y = 6;
        break;
      }
      case "house": {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(20, 12, 18),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${item.tint} 54% 78%)`), roughness: 1 })
        );
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(15, 6.4, 4),
          new THREE.MeshStandardMaterial({ color: 0xa65e2e, roughness: 1 })
        );
        const garage = new THREE.Mesh(
          new THREE.BoxGeometry(8, 7, 8),
          new THREE.MeshStandardMaterial({ color: 0xe8ddcb, roughness: 0.96 })
        );
        const garageDoor = new THREE.Mesh(
          new THREE.BoxGeometry(5.4, 5, 0.45),
          new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.8 })
        );
        const chimney = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 4.2, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xa75c35, roughness: 1 })
        );
        const porchBase = new THREE.Mesh(
          new THREE.BoxGeometry(7.2, 1, 4.6),
          new THREE.MeshStandardMaterial({ color: 0xe8ddcb, roughness: 0.92 })
        );
        const porchRoof = new THREE.Mesh(
          new THREE.BoxGeometry(7.8, 0.4, 4.9),
          new THREE.MeshStandardMaterial({ color: 0xf4ede0, roughness: 0.84 })
        );
        const porchPostLeft = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 3.4, 0.42),
          new THREE.MeshStandardMaterial({ color: 0xf8f4e9, roughness: 0.88 })
        );
        const porchPostRight = porchPostLeft.clone();
        const windowMaterial = new THREE.MeshStandardMaterial({
          color: 0xf7f2d9,
          emissive: 0xffdd86,
          emissiveIntensity: 0.12,
          roughness: 0.42
        });
        const windowLeft = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.4), windowMaterial);
        const windowRight = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.4), windowMaterial);
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 5.6, 0.6),
          new THREE.MeshStandardMaterial({ color: 0x77442b, roughness: 0.9 })
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 9.4;
        garage.position.set(12, -2.5, 2);
        garageDoor.position.set(13.7, -2.7, 6.1);
        chimney.position.set(-5, 11, -3);
        porchBase.position.set(-0.6, -5.5, 11.1);
        porchRoof.position.set(-0.6, -2.7, 11);
        porchPostLeft.position.set(-2.6, -4.2, 12.9);
        porchPostRight.position.set(1.4, -4.2, 12.9);
        windowLeft.position.set(-4.8, 1.6, 9.1);
        windowRight.position.set(4.8, 1.6, 9.1);
        door.position.set(1, -1.2, 9.2);
        group.add(
          body,
          roof,
          garage,
          garageDoor,
          chimney,
          porchBase,
          porchRoof,
          porchPostLeft,
          porchPostRight,
          windowLeft,
          windowRight,
          door
        );
        position.y = 6;
        break;
      }
      case "silo": {
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(4.2, 4.2, 18, 18),
          new THREE.MeshStandardMaterial({ color: 0xd6d8dc, roughness: 0.9 })
        );
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(4.6, 4, 18),
          new THREE.MeshStandardMaterial({ color: 0x9ba4b2, roughness: 0.8 })
        );
        roof.position.y = 11;
        group.add(body, roof);
        position.y = 9;
        break;
      }
      case "tree": {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.6, 10, 12),
          new THREE.MeshStandardMaterial({ color: 0x6e4f2c, roughness: 1 })
        );
        const canopy = new THREE.Mesh(
          new THREE.SphereGeometry(7.2, 16, 16),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${item.tint} 48% 38%)`), roughness: 1 })
        );
        const canopyTop = new THREE.Mesh(
          new THREE.SphereGeometry(5.2, 14, 14),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${item.tint} 42% 44%)`), roughness: 1 })
        );
        canopy.position.set(0, 8.4, 0);
        canopyTop.position.set(-2.6, 11.4, 1.8);
        group.add(trunk, canopy);
        group.add(canopyTop);
        position.y = 5;
        break;
      }
      case "haybale": {
        const bale = new THREE.Mesh(
          new THREE.CylinderGeometry(3.3, 3.3, 4.2, 18),
          new THREE.MeshStandardMaterial({ color: 0xd6aa46, roughness: 0.95 })
        );
        bale.rotation.z = Math.PI / 2;
        group.add(bale);
        position.y = 3.3;
        break;
      }
      case "parked-car": {
        const parked = this.createCarMesh(item.tint > 100 ? "#4d74d8" : "#b94a36", "#171c24");
        parked.mesh.scale.setScalar(1.44);
        parked.mesh.rotation.y = -item.rotation;
        parked.boostGlow.visible = false;
        group.add(parked.mesh);
        position.y = 1.55;
        break;
      }
    }

    group.position.copy(position);
    group.rotation.y = -item.rotation;
    group.scale.setScalar(scaleFactor);
    group.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private createCarMesh(bodyColor: string, accentColor: string): CarVisual {
    const mesh = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.82 });
    const accentMaterial = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.65 });
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x10141a, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.55, 4.45), bodyMaterial);
    body.position.y = 1.45;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.05, 1.05, 2.6), accentMaterial);
    cabin.position.set(0.25, 2.28, 0);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.32, 4.85), accentMaterial);
    spoiler.position.set(-3.1, 2.08, 0);
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.58, 4.1), accentMaterial);
    bumper.position.set(3.58, 1.25, 0);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 3.55), bodyMaterial);
    hood.position.set(2.05, 2.02, 0);
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 2.9, 8),
      new THREE.MeshStandardMaterial({ color: 0xd8dde6, roughness: 0.5 })
    );
    const antennaTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xe24c34, roughness: 0.5 })
    );
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.14, 2.3),
      new THREE.MeshStandardMaterial({
        color: 0xf8f7ef,
        emissive: 0x263543,
        emissiveIntensity: 0.22,
        roughness: 0.3
      })
    );
    windshield.position.set(0.92, 2.78, 0);
    const boostGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 2.1),
      new THREE.MeshBasicMaterial({
        color: 0xffbf50,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide
      })
    );
    boostGlow.position.set(-4.7, 1.7, 0);
    boostGlow.rotation.y = Math.PI / 2;
    boostGlow.visible = false;

    antenna.position.set(-0.95, 3.35, 0);
    antennaTip.position.set(-0.95, 4.82, 0);
    mesh.add(body, cabin, spoiler, bumper, hood, windshield, antenna, antennaTip, boostGlow);

    const wheels: THREE.Mesh[] = [];
    const wheelGeometry = new THREE.CylinderGeometry(0.9, 0.9, 0.7, 18);

    for (const x of [-2.5, 2.5]) {
      for (const z of [-2.2, 2.2]) {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);

        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.9, z);
        wheels.push(wheel);
        mesh.add(wheel);
      }
    }

    mesh.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return { boostGlow, mesh, wheels };
  }

  private createCar(
    id: "player" | "rival",
    color: string,
    accent: string,
    laneOffset: number
  ): CarState {
    const visual = this.createCarMesh(color, accent);
    const startTransform = getStartTransform(TRACK, laneOffset);

    visual.mesh.scale.setScalar(0.76);
    this.worldRoot.add(visual.mesh);

    return {
      angle: startTransform.angle,
      boostTime: 0,
      checkpointArmed: false,
      id,
      laneOffset,
      lap: 0,
      lastLapStamp: 0,
      lastProgress: 0,
      offRoad: false,
      position: startTransform.position,
      progress: 0,
      velocity: { x: 0, y: 0 },
      visual,
      wheelSpin: 0
    };
  }

  private createPickupMesh(): THREE.Group {
    const group = new THREE.Group();
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 13),
      new THREE.MeshBasicMaterial({
        color: 0xffd86e,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide
      })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.1, 1.15, 12, 28),
      new THREE.MeshStandardMaterial({
        color: 0xf7c952,
        emissive: 0x604100,
        emissiveIntensity: 0.4,
        roughness: 0.45
      })
    );
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 6.8, 2.6),
      new THREE.MeshStandardMaterial({
        color: 0xffde88,
        emissive: 0xa86a12,
        emissiveIntensity: 0.34,
        roughness: 0.4
      })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.25;
    core.position.y = 0.2;
    group.add(halo, ring, core);

    return group;
  }

  private buildPickups(): PickupState[] {
    return PICKUP_PROGRESS.map((progress) => {
      const frame = sampleTrackFrame(TRACK, progress);
      const mesh = this.createPickupMesh();

      mesh.position.copy(toVector3(frame.center, 6.2));
      mesh.castShadow = true;
      this.pickupRoot.add(mesh);

      return {
        active: true,
        mesh,
        progress,
        pulse: progress * 0.01,
        respawn: 0
      };
    });
  }

  private resetCar(car: CarState): void {
    const startTransform = getStartTransform(TRACK, car.laneOffset);

    car.angle = startTransform.angle;
    car.boostTime = 0;
    car.checkpointArmed = false;
    car.lap = 0;
    car.lastLapStamp = 0;
    car.lastProgress = 0;
    car.offRoad = false;
    car.position = startTransform.position;
    car.progress = 0;
    car.velocity = { x: 0, y: 0 };
    car.wheelSpin = 0;
    this.syncCarVisual(car, 0);
  }

  private reset(): void {
    this.status = "grid";
    this.countdownFlash = 0;
    this.countdownRemaining = 0;
    this.elapsedRaceTime = 0;
    this.lastLapTime = 0;
    this.playerPlace = 1;
    this.resetCar(this.player);
    this.resetCar(this.rival);

    for (const pickup of this.pickups) {
      pickup.active = true;
      pickup.respawn = 0;
      this.syncPickupVisual(pickup);
    }

    this.updateHud();
    this.setOverlay(
      "Maple Block",
      "Neighborhood launch",
      "Space starts the countdown. Stay low, thread the curb line, grab the battery rings, and beat the rival around the block."
    );
    this.updateCamera();
  }

  private beginCountdown(): void {
    this.status = "countdown";
    this.countdownRemaining = 3.2;
    this.countdownFlash = 0;
    this.setOverlay(
      "Sprint Start",
      "3",
      "Hold the throttle. The timer starts when the launch drops."
    );
  }

  private frame(time: number): void {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = time;
    }

    const deltaSeconds = Math.min((time - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = time;
    this.accumulator += deltaSeconds;

    while (this.accumulator >= FIXED_STEP_SECONDS) {
      this.tick(FIXED_STEP_SECONDS);
      this.accumulator -= FIXED_STEP_SECONDS;
    }

    this.render();
    requestAnimationFrame(this.loopHandle);
  }

  private tick(deltaSeconds: number): void {
    const startPressed = this.input.start && !this.startHeld;
    const restartPressed = this.input.restart && !this.restartHeld;

    if (this.status === "grid" && (startPressed || this.input.accelerate)) {
      this.beginCountdown();
    }

    if (restartPressed && this.status !== "running") {
      this.reset();
      this.startHeld = this.input.start;
      this.restartHeld = this.input.restart;
      return;
    }

    if (this.status === "countdown") {
      this.countdownRemaining -= deltaSeconds;

      if (this.countdownRemaining > 0) {
        this.setOverlay(
          "Sprint Start",
          `${Math.max(1, Math.ceil(this.countdownRemaining))}`,
          "Keep the nose straight and pin it when the launch drops."
        );
      } else {
        this.status = "running";
        this.countdownFlash = 0.8;
        this.setOverlay("", "", "");
      }
    }

    if (this.status === "finished" && (restartPressed || startPressed)) {
      this.reset();
      this.startHeld = this.input.start;
      this.restartHeld = this.input.restart;
      return;
    }

    if (this.status === "running") {
      this.elapsedRaceTime += deltaSeconds;
      this.updatePickups(deltaSeconds);

      this.updateCar(this.player, this.readPlayerControls(), deltaSeconds);
      this.updateCar(this.rival, this.readRivalControls(this.rival), deltaSeconds);
      this.collectPickups(this.player);
      this.collectPickups(this.rival);

      this.playerPlace =
        rankCars([this.player, this.rival]).findIndex((car) => car.id === "player") + 1;

      if (hasFinished(this.player) || hasFinished(this.rival)) {
        this.status = "finished";

        if (hasFinished(this.player) && !hasFinished(this.rival)) {
          const best = Number.isFinite(this.bestLapTime)
            ? ` Best lap ${formatRaceTime(this.bestLapTime)}.`
            : "";

          this.setOverlay(
            "Block Winner",
            "The block is yours",
            `You held the lane through the neighborhood sprint and took the run.${best} Press R or Space to rerun.`
          );
        } else {
          this.setOverlay(
            "Close Run",
            "Shade slipped ahead",
            "Try braking earlier before the long curb bend. Press R or Space to rerun."
          );
        }
      }
    } else {
      this.updatePickups(deltaSeconds);
    }

    this.countdownFlash = Math.max(0, this.countdownFlash - deltaSeconds);
    this.syncCarVisual(this.player, deltaSeconds);
    this.syncCarVisual(this.rival, deltaSeconds);
    this.updateCamera();
    this.updateHud();
    this.startHeld = this.input.start;
    this.restartHeld = this.input.restart;
  }

  private updatePickups(deltaSeconds: number): void {
    for (const pickup of this.pickups) {
      pickup.pulse += deltaSeconds * 2.4;

      if (!pickup.active) {
        pickup.respawn -= deltaSeconds;

        if (pickup.respawn <= 0) {
          pickup.active = true;
          pickup.respawn = 0;
        }
      }

      this.syncPickupVisual(pickup);
    }
  }

  private syncPickupVisual(pickup: PickupState): void {
    const bob = Math.sin(pickup.pulse * 2.2) * 0.9;

    pickup.mesh.visible = pickup.active;
    pickup.mesh.rotation.y = pickup.pulse * 1.9;
    pickup.mesh.position.y = 6.2 + bob;
  }

  private collectPickups(car: CarState): void {
    for (const pickup of this.pickups) {
      if (!pickup.active) {
        continue;
      }

      const pickupPosition = sampleOffsetPoint(TRACK, pickup.progress, 0);

      if (distance(pickupPosition, car.position) < 32) {
        pickup.active = false;
        pickup.respawn = 7;
        car.boostTime = Math.max(car.boostTime, 1.8);
        this.syncPickupVisual(pickup);
      }
    }
  }

  private readPlayerControls(): ControlFrame {
    return {
      brake: this.input.brake ? 1 : 0,
      steer: (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0),
      throttle: this.input.accelerate ? 1 : 0
    };
  }

  private readRivalControls(car: CarState): ControlFrame {
    const lookAheadDistance = car.offRoad ? 110 : 150;
    const target = sampleOffsetPoint(TRACK, car.progress + lookAheadDistance, 0);
    const targetAngle = Math.atan2(target.y - car.position.y, target.x - car.position.x);
    const angleDelta = wrapAngle(targetAngle - car.angle);
    const steer = clamp(angleDelta * 1.3, -1, 1);
    const needsBrake = Math.abs(angleDelta) > 1.35;

    return {
      brake: needsBrake ? 0.42 : 0,
      steer,
      throttle: needsBrake ? 0.58 : 0.93
    };
  }

  private updateCar(car: CarState, controls: ControlFrame, deltaSeconds: number): void {
    const heading = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
    const side = perpendicular(heading);
    let forwardSpeed = dot(car.velocity, heading);
    let lateralSpeed = dot(car.velocity, side);
    const boostActive = car.boostTime > 0;
    const maxForwardSpeed = (car.offRoad ? 158 : 268) + (boostActive ? 62 : 0);

    forwardSpeed += controls.throttle * (car.offRoad ? 126 : 194) * deltaSeconds;
    forwardSpeed += boostActive ? 235 * deltaSeconds : 0;
    forwardSpeed -= controls.brake * 252 * deltaSeconds;
    forwardSpeed = clamp(forwardSpeed, -92, maxForwardSpeed);
    forwardSpeed *= Math.exp(-(car.offRoad ? 2.05 : 1.14) * deltaSeconds);

    if (controls.throttle === 0 && controls.brake === 0) {
      forwardSpeed *= Math.exp(-(car.offRoad ? 2.3 : 1.36) * deltaSeconds);
    }

    lateralSpeed *= Math.exp(-(car.offRoad ? 10 : 15) * deltaSeconds);

    const turnStrength = clamp(Math.abs(forwardSpeed) / 195, 0, 1.14);
    const reverseFactor = forwardSpeed < 0 ? -1 : 1;
    car.angle += controls.steer * 2.5 * turnStrength * deltaSeconds * reverseFactor;

    const nextHeading = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
    const nextSide = perpendicular(nextHeading);

    car.velocity = add(scale(nextHeading, forwardSpeed), scale(nextSide, lateralSpeed));
    car.position = add(car.position, scale(car.velocity, deltaSeconds));
    car.wheelSpin += forwardSpeed * deltaSeconds * 0.18;

    if (boostActive) {
      car.boostTime = Math.max(0, car.boostTime - deltaSeconds);
    }

    const analysis = analyzeTrack(TRACK, car.position);
    car.progress = analysis.progress;
    car.offRoad = analysis.distanceToCenter > TRACK.halfWidth;

    if (car.offRoad) {
      car.velocity = scale(car.velocity, 0.992);
    }

    const wrapCheckpoint = TRACK.totalLength * 0.58;
    const wrapStart = TRACK.totalLength * 0.24;
    const wrapEnd = TRACK.totalLength * 0.76;

    if (car.progress > wrapCheckpoint) {
      car.checkpointArmed = true;
    }

    if (car.checkpointArmed && car.lastProgress > wrapEnd && car.progress < wrapStart) {
      const lapTime = this.elapsedRaceTime - car.lastLapStamp;

      car.lap += 1;
      car.lastLapStamp = this.elapsedRaceTime;
      car.checkpointArmed = false;

      if (car.id === "player" && lapTime > 0) {
        this.lastLapTime = lapTime;
        const nextBestLap = Math.min(this.bestLapTime, lapTime);

        if (nextBestLap !== this.bestLapTime) {
          this.bestLapTime = nextBestLap;
          saveBestLap(globalThis.localStorage, this.bestLapTime);
        }
      }
    }

    car.lastProgress = car.progress;
  }

  private syncCarVisual(car: CarState, deltaSeconds: number): void {
    const speedFactor = clamp(length(car.velocity) / 255, 0, 1);
    const bounce = Math.sin(this.elapsedRaceTime * (10 + speedFactor * 12)) * 0.08;

    car.visual.mesh.position.copy(toVector3(car.position, 1.2 + bounce));
    car.visual.mesh.rotation.y = -car.angle;

    for (const wheel of car.visual.wheels) {
      wheel.rotation.z = car.wheelSpin;
    }

    car.visual.boostGlow.visible = car.boostTime > 0;
    const boostMaterial = car.visual.boostGlow.material;

    if (boostMaterial instanceof THREE.MeshBasicMaterial) {
      boostMaterial.opacity = 0.22 + Math.sin(this.elapsedRaceTime * 22) * 0.08;
    }

    if (deltaSeconds > 0 && car.offRoad) {
      car.visual.mesh.position.y -= Math.min(0.08, deltaSeconds * 2.2);
    }
  }

  private updateCamera(): void {
    const heading = new THREE.Vector3(Math.cos(this.player.angle), 0, Math.sin(this.player.angle));
    const side = new THREE.Vector3(-heading.z, 0, heading.x);
    const lateralSpeed = dot(this.player.velocity, { x: side.x, y: side.z });
    const speedFactor = clamp(length(this.player.velocity) / 255, 0, 1);
    const playerPosition = toVector3(this.player.position, 0.78);
    const desiredCameraPosition = playerPosition
      .clone()
      .addScaledVector(heading, -12.2 - speedFactor * 2.7)
      .addScaledVector(side, clamp(lateralSpeed * 0.08, -2.2, 2.2));

    desiredCameraPosition.y = 3.48 + speedFactor * 0.56;
    this.camera.position.lerp(desiredCameraPosition, 0.2);

    const desiredLookAt = playerPosition.clone().addScaledVector(heading, 14.2);
    desiredLookAt.y = 1.06 + speedFactor * 0.14;
    this.cameraLookAt.lerp(desiredLookAt, 0.26);
    this.camera.lookAt(this.cameraLookAt);
  }

  private updateHud(): void {
    const speedKmh = Math.round(length(this.player.velocity) * 0.82);
    const displayedLap = Math.min(
      this.player.lap + (this.status === "finished" ? 0 : 1),
      PLAYER_LAPS_TO_WIN
    );

    this.hud.lapValue.textContent = `${displayedLap} / ${PLAYER_LAPS_TO_WIN}`;
    this.hud.placeValue.textContent = `${this.playerPlace} / ${TOTAL_RACERS}`;
    this.hud.speedValue.textContent = `${speedKmh} km/h`;
    this.hud.bestValue.textContent = Number.isFinite(this.bestLapTime)
      ? formatRaceTime(this.bestLapTime)
      : BEST_LAP_PLACEHOLDER;
    this.hud.boostValue.textContent =
      this.status === "countdown"
        ? `Launch in ${Math.max(1, Math.ceil(this.countdownRemaining))}`
        : this.player.boostTime > 0
          ? `${this.player.boostTime.toFixed(1)}s live`
          : this.lastLapTime > 0
            ? `Last ${formatRaceTime(this.lastLapTime)}`
            : "Find a pickup";
    this.hud.timerValue.textContent = formatRaceTime(this.elapsedRaceTime);
  }

  private setOverlay(kicker: string, title: string, body: string): void {
    const isVisible = Boolean(kicker || title || body);

    this.hud.overlayPanel.dataset.visible = isVisible ? "true" : "false";
    this.hud.overlayKicker.textContent = kicker;
    this.hud.overlayTitle.textContent = title;
    this.hud.overlayBody.textContent = body;
  }

  private resizeRenderer(): void {
    const width = Math.max(1, Math.round(this.canvas.clientWidth));
    const height = Math.max(1, Math.round(this.canvas.clientHeight));

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private render(): void {
    const sunMaterial = this.sun.material;

    if (sunMaterial instanceof THREE.MeshBasicMaterial) {
      sunMaterial.color.setHex(this.countdownFlash > 0 ? 0xfff1bf : 0xffe3a4);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
