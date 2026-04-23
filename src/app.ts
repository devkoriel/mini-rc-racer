import "./style.css";
import * as THREE from "three";

import { createAssetCatalog } from "./engine/assets";
import { createLoopRunner } from "./engine/loop";
import { createSceneRig, type SceneLighting } from "./render/scene";
import { buildTrackMesh } from "./render/track-mesh";
import { createPropInstancer } from "./render/prop-instancer";
import { createCarMesh, setCarBoostGlow } from "./render/car-mesh";
import {
  createChaseCameraState,
  DEFAULT_CHASE_CAMERA_TUNING,
  updateChaseCamera,
} from "./render/camera";
import { createBoostDustPool } from "./render/fx";
import { hideOverlay, setOverlay, updateHud, type HudRefs } from "./render/hud";
import { renderOverlay } from "./ui/overlay";
import { bindMobileControls } from "./ui/mobile-controls";
import { bootShellInputs } from "./ui/shell";
import { createAudioSystem } from "./engine/audio";
import {
  createRace,
  onPausePressed,
  onStartPressed,
  stepRace,
} from "./sim/race";
import {
  stepCar,
  activateSparkBurst,
  grantPickup,
  type CarRuntime,
} from "./sim/car";
import { createTrackRuntime } from "./sim/track-runtime";
import { createPickup, collectPickup, stepPickup } from "./sim/pickups";
import { createAiDriver, aiInput } from "./sim/ai";
import { TrackSchema, CarSchema, PickupRosterSchema } from "./data/schemas";
import { loadBestLap, loadSettings, saveBestLap } from "./data/storage";
import sector18Json from "./content/tracks/sector-18.json";
import boulevardJson from "./content/cars/boulevard.json";
import pickupsJson from "./content/pickups.json";
import { type InputFrame } from "./engine/input";
import { length3, type Vec3 } from "./util/math";

// -------- Parse content --------
const track = TrackSchema.parse(sector18Json);
const car = CarSchema.parse(boulevardJson);
PickupRosterSchema.parse(pickupsJson);

// -------- Screen FSM --------
type Screen = "title" | "track-select" | "car-select" | "race";

const screensRoot = document.querySelector<HTMLElement>(".screens");
if (!screensRoot) throw new Error(".screens root missing");

const setScreen = (name: Screen): void => {
  screensRoot.dataset.screen = name;
};

// Initial screen: title (until user presses Start)
setScreen("title");

// -------- DOM refs --------
const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("#game-canvas missing");

const hud: HudRefs = {
  lap: requireEl("lap-value"),
  place: requireEl("place-value"),
  speed: requireEl("speed-value"),
  speedBar: requireEl("speed-bar"),
  pickup: requireEl("boost-value"),
  pickupSlot: requireEl("pickup-slot"),
  timer: requireEl("timer-value"),
  best: requireEl("best-value"),
  overlayKicker: requireEl("overlay-kicker"),
  overlayTitle: requireEl("overlay-title"),
  overlayBody: requireEl("overlay-body"),
  overlayPanel: requireEl("overlay-panel"),
};

// -------- Screen actions --------
document.addEventListener("click", (ev) => {
  const el = ev.target as HTMLElement;
  const btn = el.closest<HTMLElement>("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === "go-track-select") {
    setScreen("track-select");
    return;
  }
  if (action === "back-to-title") {
    setScreen("title");
    return;
  }
  if (action === "choose-track") {
    setScreen("car-select");
    return;
  }
  if (action === "back-to-track-select") {
    setScreen("track-select");
    return;
  }
  if (action === "choose-car") {
    /* stay on car-select */ return;
  }
  if (action === "start-race") {
    beginRace();
    return;
  }
});

// Keyboard shortcut — Space to progress through menus
window.addEventListener("keydown", (ev) => {
  if (ev.code !== "Space") return;
  const current = screensRoot.dataset.screen as Screen;
  if (current === "title") {
    setScreen("track-select");
    ev.preventDefault();
    return;
  }
  if (current === "track-select") {
    setScreen("car-select");
    ev.preventDefault();
    return;
  }
  if (current === "car-select") {
    beginRace();
    ev.preventDefault();
    return;
  }
});

// -------- Scene --------
const sceneLighting: SceneLighting = track.lighting;
const rig = createSceneRig(canvas, sceneLighting);
const catalog = createAssetCatalog();

// Register every distinct prop meshAsset in the track content.
const registeredProps = new Set<string>();
for (const prop of track.props) {
  if (!prop.meshAsset) continue;
  const id = `prop:${prop.propId}`;
  if (registeredProps.has(id)) continue;
  registeredProps.add(id);
  catalog.registerGLB(id, `/content/${prop.meshAsset}`);
}
if (car.meshAsset)
  catalog.registerGLB("car:boulevard", `/content/${car.meshAsset}`);

const trackRuntime = createTrackRuntime(track.spline, 512);
const trackMesh = buildTrackMesh(track.spline, 384, track.surfaces);
rig.scene.add(trackMesh);

const instancer = createPropInstancer(catalog);
for (const prop of track.props) {
  instancer.addInstance(
    prop.propId as Parameters<typeof instancer.addInstance>[0],
    prop.position,
    prop.rotation,
    prop.scaleBucket,
  );
}
// instancer.build() is deferred until catalog.loadAll resolves so GLB geometry is available.

const boostDust = createBoostDustPool();
rig.scene.add(boostDust.group);

const playerVisuals = createCarMesh({
  primaryColor: car.cosmetic.paintSlots[0],
  secondaryColor: car.cosmetic.paintSlots[1] ?? "#202222",
});
rig.scene.add(playerVisuals.group);

const rivalVisuals = createCarMesh({
  primaryColor: "#d6564a",
  secondaryColor: "#201018",
});
rig.scene.add(rivalVisuals.group);

// -------- Sim state --------
const tuning = car.tuning;
let player: CarRuntime = {
  id: "player",
  tuning,
  chassis: {
    position: { x: 0, y: 0.12, z: -1.0 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: Math.PI,
    angularVelocity: 0,
  },
  rpm: 0,
  wheelSpin: 0,
  pickupHeld: null,
  boostRemaining: 0,
  shieldRemaining: 0,
};
let rival: CarRuntime = {
  id: "rival",
  tuning,
  chassis: {
    position: { x: 1.5, y: 0.12, z: -1.2 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: Math.PI,
    angularVelocity: 0,
  },
  rpm: 0,
  wheelSpin: 0,
  pickupHeld: null,
  boostRemaining: 0,
  shieldRemaining: 0,
};
let playerPrevT = 0;
let rivalPrevT = 0;
const ai = createAiDriver({ carId: "rival", difficulty: 0.5 });

// Pickups on track
const pickupSpawns = track.pickups.map((p, i) => {
  const frame = trackRuntime.sampleFrame(p.progress);
  const pos: Vec3 = {
    x: frame.position.x + p.sideOffset,
    y: 0.3,
    z: frame.position.z,
  };
  return createPickup(`pickup-${i}`, "spark-burst", pos);
});
const pickupMeshes = pickupSpawns.map((pickup) => {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.25, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffc84a,
      emissive: 0xffc84a,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    }),
  );
  mesh.position.set(pickup.position.x, pickup.position.y, pickup.position.z);
  rig.scene.add(mesh);
  return mesh;
});
let pickups = pickupSpawns.slice();

let race = createRace({ lapsToWin: 3, countdownSeconds: 3 });
let bestLap = loadBestLap(window.localStorage, track.id);
let lapStartTime = 0;
let lapCount = 0;
let previousT = 0;

// -------- Controls --------
const touch = bindMobileControls(document.body);
const shellInputs = bootShellInputs(touch.state);

// -------- Audio --------
const settings = loadSettings(window.localStorage);
let audioSystem: ReturnType<typeof createAudioSystem> | null = null;
const ensureAudio = async (): Promise<void> => {
  if (audioSystem) return;
  try {
    audioSystem = createAudioSystem();
    audioSystem.setMasterVolume(settings.audio.master);
    await audioSystem.resume();
  } catch {
    audioSystem = null; // audio unavailable — continue silent
  }
};

// -------- Race start --------
const cameraState = createChaseCameraState();

const beginRace = (): void => {
  setScreen("race");
  race = createRace({ lapsToWin: 3, countdownSeconds: 3 });
  race = onStartPressed(race);
  lapStartTime = 0;
  lapCount = 0;
  previousT = 0;
  // Reset positions
  player = {
    ...player,
    chassis: {
      position: { x: 0, y: 0.12, z: -1.0 },
      velocity: { x: 0, y: 0, z: 0 },
      yaw: Math.PI,
      angularVelocity: 0,
    },
    pickupHeld: null,
    boostRemaining: 0,
    shieldRemaining: 0,
  };
  rival = {
    ...rival,
    chassis: {
      position: { x: 1.5, y: 0.12, z: -1.2 },
      velocity: { x: 0, y: 0, z: 0 },
      yaw: Math.PI,
      angularVelocity: 0,
    },
  };
  setOverlay(
    hud,
    "Countdown",
    String(Math.ceil(race.countdownRemaining)),
    "Get ready",
  );
  void ensureAudio();
};

// -------- Boot async: load GLBs, build instancer, start loop --------
void (async () => {
  try {
    await catalog.loadAll(rig.renderer);
  } catch (err) {
    console.warn(
      "[assets] load failed (continuing with procedural fallback):",
      err,
    );
  }

  // Build instancer after loadAll so GLB geometry is available
  rig.scene.add(instancer.build());

  const FIXED = 1 / 120;
  const loop = createLoopRunner({
    fixedStep: FIXED,
    maxStepsPerFrame: 5,
    onStep: () => stepSim(FIXED),
    onRender: () => render(1 / 60),
  });

  const resize = (): void => {
    rig.setViewport(
      window.innerWidth,
      window.innerHeight,
      Math.min(window.devicePixelRatio, 2),
    );
  };
  window.addEventListener("resize", resize);
  resize();
  setOverlay(
    hud,
    "Welcome",
    "Mini RC Racer",
    "Choose a track, then a car, and press Race.",
  );
  hideOverlay(hud);
  loop.start();
})();

// -------- Sim step --------
const stepSim = (step: number): void => {
  const input: InputFrame = shellInputs.getInput();

  // Pause toggle in race
  if (screensRoot.dataset.screen === "race" && input.buttons.pause) {
    race = onPausePressed(race);
  }

  // Run the race FSM clock
  race = stepRace(race, input, step);

  if (
    race.status === "paused" ||
    race.status === "grid" ||
    race.status === "finished"
  ) {
    return;
  }
  if (race.status === "countdown") {
    // No car sim during countdown but keep camera following
    return;
  }

  // Player step
  const offPlayer = trackRuntime.sampleProgress(
    player.chassis.position,
    playerPrevT,
  );
  playerPrevT = offPlayer.t;
  player = stepCar(player, input, step, offPlayer.offTrack);
  if (input.buttons.pickup && player.pickupHeld === "spark-burst") {
    player = activateSparkBurst(player);
  }

  // Rival step
  const rivalForward: Vec3 = {
    x: Math.sin(rival.chassis.yaw),
    y: 0,
    z: Math.cos(rival.chassis.yaw),
  };
  const rivalInput = aiInput(
    ai,
    trackRuntime,
    rival.chassis.position,
    rivalForward,
    rivalPrevT,
  );
  const offRival = trackRuntime.sampleProgress(
    rival.chassis.position,
    rivalPrevT,
  );
  rivalPrevT = offRival.t;
  rival = stepCar(rival, rivalInput, step, offRival.offTrack);

  // Pickup collection
  pickups = pickups.map((p, i) => {
    if (!p.active) {
      const next = stepPickup(p, step);
      pickupMeshes[i].visible = next.active;
      return next;
    }
    const dx = p.position.x - player.chassis.position.x;
    const dz = p.position.z - player.chassis.position.z;
    const dist = length3({ x: dx, y: 0, z: dz });
    if (dist < 0.8 && player.pickupHeld === null) {
      player = grantPickup(player, p.pickupId);
      pickupMeshes[i].visible = false;
      return collectPickup(p);
    }
    pickupMeshes[i].visible = true;
    return p;
  });

  // Lap detection: when player crosses from high t back to low t
  const nowT = playerPrevT;
  if (previousT > 0.95 && nowT < 0.05 && race.status === "running") {
    lapCount += 1;
    const lapTime = race.raceTime - lapStartTime;
    lapStartTime = race.raceTime;
    if (lapTime > 1 && (bestLap === null || lapTime < bestLap)) {
      bestLap = lapTime;
      saveBestLap(window.localStorage, track.id, lapTime);
    }
  }
  previousT = nowT;
};

// -------- Render step --------
const render = (_interp: number): void => {
  const standings: ReadonlyArray<string> = ["player", "rival"];
  const snapshot = {
    status: race.status,
    raceTime: race.raceTime,
    countdownRemaining: race.countdownRemaining,
    lapsToWin: race.lapsToWin,
    bestLap,
    lastLap: null,
    standings,
    cars: [player, rival].map((c) => ({
      id: c.id,
      position: c.chassis.position,
      forward: {
        x: Math.sin(c.chassis.yaw),
        y: 0,
        z: Math.cos(c.chassis.yaw),
      } as Vec3,
      right: {
        x: Math.cos(c.chassis.yaw),
        y: 0,
        z: -Math.sin(c.chassis.yaw),
      } as Vec3,
      up: { x: 0, y: 1, z: 0 } as Vec3,
      velocity: c.chassis.velocity,
      angularVelocity: c.chassis.angularVelocity,
      rpm: c.rpm,
      slip: 0,
      wheelSpin: c.wheelSpin,
      lap: c.id === "player" ? lapCount : 0,
      progress: 0,
      totalDistance: 0,
      offRoad: false,
      flipped: false,
      boostRemaining: c.boostRemaining,
      pickupHeld: c.pickupHeld,
      shieldRemaining: c.shieldRemaining,
    })),
  };

  updateHud(hud, snapshot, "player");
  renderOverlay(hud, race.status, race.countdownRemaining);

  // Transforms
  playerVisuals.group.position.set(
    player.chassis.position.x,
    player.chassis.position.y,
    player.chassis.position.z,
  );
  playerVisuals.group.rotation.y = player.chassis.yaw;
  setCarBoostGlow(
    playerVisuals,
    player.boostRemaining > 0 ? Math.min(1, player.boostRemaining / 2) : 0,
  );
  if (player.boostRemaining > 0) {
    boostDust.spawn(
      new THREE.Vector3(
        player.chassis.position.x,
        player.chassis.position.y,
        player.chassis.position.z,
      ),
      1,
    );
  }
  boostDust.update(1 / 60);

  rivalVisuals.group.position.set(
    rival.chassis.position.x,
    rival.chassis.position.y,
    rival.chassis.position.z,
  );
  rivalVisuals.group.rotation.y = rival.chassis.yaw;

  // Camera
  const carForward: Vec3 = {
    x: Math.sin(player.chassis.yaw),
    y: 0,
    z: Math.cos(player.chassis.yaw),
  };
  updateChaseCamera(
    rig.camera,
    cameraState,
    new THREE.Vector3(
      player.chassis.position.x,
      player.chassis.position.y,
      player.chassis.position.z,
    ),
    new THREE.Vector3(carForward.x, 0, carForward.z),
    player.boostRemaining > 0 ? 1 : 0,
    1 / 60,
    DEFAULT_CHASE_CAMERA_TUNING,
  );

  rig.renderer.render(rig.scene, rig.camera);
};

function requireEl(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}
