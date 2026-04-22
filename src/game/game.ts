import {
  add,
  clamp,
  distance,
  dot,
  length,
  lerp,
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
import {
  projectGroundPoint,
  projectRaisedY,
  toViewSpace,
  type GroundProjection,
  type ProjectionOptions
} from "./view";
import { loadBestLap, saveBestLap } from "./persistence";

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  restart: boolean;
  right: boolean;
  start: boolean;
}

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

interface CarState {
  accent: string;
  angle: number;
  boostTime: number;
  checkpointArmed: boolean;
  color: string;
  id: "player" | "rival";
  lap: number;
  lastLapStamp: number;
  lastProgress: number;
  offRoad: boolean;
  position: Vec2;
  progress: number;
  velocity: Vec2;
  wheelSpin: number;
}

interface PickupState {
  active: boolean;
  position: Vec2;
  progress: number;
  pulse: number;
  respawn: number;
}

interface ControlFrame {
  brake: number;
  steer: number;
  throttle: number;
}

interface ViewSettings extends ProjectionOptions {
  cameraAngle: number;
  cameraOrigin: Vec2;
  viewportHeight: number;
}

interface RoadSlice {
  centerX: number;
  depth: number;
  groundY: number;
  innerLeftX: number;
  innerRightX: number;
  outerLeftX: number;
  outerRightX: number;
  progressDistance: number;
}

interface SceneSprite {
  depth: number;
  render: (ctx: CanvasRenderingContext2D) => void;
}

interface EffectParticle {
  color: string;
  height: number;
  life: number;
  maxLife: number;
  position: Vec2;
  size: number;
  velocity: Vec2;
}

type RaceStatus = "countdown" | "finished" | "grid" | "running";

const BEST_LAP_PLACEHOLDER = "--:--.--";
const FIXED_STEP_SECONDS = 1 / 120;
const MINIMAP_BOUNDS = {
  maxX: 700,
  maxY: 560,
  minX: -700,
  minY: -560
};
const PLAYER_LAPS_TO_WIN = 3;
const ROAD_DRAW_DISTANCE = 920;
const ROAD_SAMPLE_START = -36;
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

function rankCars(cars: CarState[]): CarState[] {
  return [...cars].sort((left, right) => {
    const leftScore = left.lap * TRACK.totalLength + left.progress;
    const rightScore = right.lap * TRACK.totalLength + right.progress;

    return rightScore - leftScore;
  });
}

function hasFinished(car: CarState): boolean {
  return car.lap >= PLAYER_LAPS_TO_WIN;
}

export class RacerGame {
  private accumulator = 0;

  private bestLapTime = Number.POSITIVE_INFINITY;

  private camera: Vec2 = { x: 0, y: 0 };

  private cameraAngle = 0;

  private countdownRemaining = 0;

  private countdownFlash = 0;

  private elapsedRaceTime = 0;

  private lastFrameTime = 0;

  private lastLapTime = 0;

  private particles: EffectParticle[] = [];

  private pickups: PickupState[] = [];

  private player: CarState;

  private playerPlace = 1;

  private rival: CarState;

  private startHeld = false;

  private readonly ctx: CanvasRenderingContext2D;

  private readonly hud: HudRefs;

  private readonly input: InputState;

  private readonly canvas: HTMLCanvasElement;

  private readonly loopHandle: (time: number) => void;

  private restartHeld = false;

  private status: RaceStatus = "grid";

  constructor(canvas: HTMLCanvasElement, hud: HudRefs, input: InputState) {
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is required.");
    }

    this.canvas = canvas;
    this.ctx = context;
    this.hud = hud;
    this.input = input;
    this.bestLapTime = loadBestLap(globalThis.localStorage);
    this.player = this.createCar("player", "#f4bf3a", "#202127", -24);
    this.rival = this.createCar("rival", "#ef4b5b", "#1a1424", 24);
    this.camera = { ...this.player.position };
    this.cameraAngle = this.player.angle;
    this.reset();
    this.loopHandle = (time) => {
      this.frame(time);
    };
    requestAnimationFrame(this.loopHandle);
  }

  private createCar(
    id: "player" | "rival",
    color: string,
    accent: string,
    laneOffset: number
  ): CarState {
    const startTransform = getStartTransform(TRACK, laneOffset);

    return {
      accent,
      angle: startTransform.angle,
      boostTime: 0,
      checkpointArmed: false,
      color,
      id,
      lap: 0,
      lastLapStamp: 0,
      lastProgress: 0,
      offRoad: false,
      position: startTransform.position,
      progress: 0,
      velocity: { x: 0, y: 0 },
      wheelSpin: 0
    };
  }

  private buildPickups(): PickupState[] {
    return PICKUP_PROGRESS.map((progress) => ({
      active: true,
      position: sampleOffsetPoint(TRACK, progress, 0),
      progress,
      pulse: 0,
      respawn: 0
    }));
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

  private reset(): void {
    this.status = "grid";
    this.countdownRemaining = 0;
    this.countdownFlash = 0;
    this.elapsedRaceTime = 0;
    this.lastLapTime = 0;
    this.particles = [];
    this.player = this.createCar("player", "#f4bf3a", "#202127", -24);
    this.rival = this.createCar("rival", "#ef4b5b", "#1a1424", 24);
    this.camera = { ...this.player.position };
    this.cameraAngle = this.player.angle;
    this.pickups = this.buildPickups();
    this.playerPlace = 1;
    this.updateHud();
    this.setOverlay(
      "Country Sprint",
      "Toy-lane launch",
      "Space starts a countdown. Battery boosts stack with clean laps across the farm loop."
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
      this.emitCarEffects(this.player, deltaSeconds);
      this.emitCarEffects(this.rival, deltaSeconds);

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
            "The loop is yours",
            `You held the line through the suburb and took the sprint.${best} Press R or Space to rerun.`
          );
        } else {
          this.setOverlay(
            "Close Run",
            "Shade slipped ahead",
            "Try staying wider before the back straight. Press R or Space to rerun."
          );
        }
      }
    }

    this.updateParticles(deltaSeconds);
    this.countdownFlash = Math.max(0, this.countdownFlash - deltaSeconds);

    const heading = { x: Math.cos(this.player.angle), y: Math.sin(this.player.angle) };
    const side = perpendicular(heading);
    const lateralSpeed = dot(this.player.velocity, side);
    const speedFactor = clamp(length(this.player.velocity) / 255, 0, 1);
    const targetCamera = add(
      add(this.player.position, scale(heading, -56 - speedFactor * 12)),
      scale(side, clamp(lateralSpeed * 0.1, -18, 18))
    );
    const targetAngle = this.player.angle + clamp(lateralSpeed / 220, -0.14, 0.14);

    this.camera = {
      x: lerp(this.camera.x, targetCamera.x, 0.18),
      y: lerp(this.camera.y, targetCamera.y, 0.18)
    };
    this.cameraAngle += wrapAngle(targetAngle - this.cameraAngle) * 0.12;

    this.updateHud();
    this.startHeld = this.input.start;
    this.restartHeld = this.input.restart;
  }

  private updatePickups(deltaSeconds: number): void {
    for (const pickup of this.pickups) {
      pickup.pulse += deltaSeconds * 2.6;

      if (!pickup.active) {
        pickup.respawn -= deltaSeconds;

        if (pickup.respawn <= 0) {
          pickup.active = true;
          pickup.respawn = 0;
        }
      }
    }
  }

  private updateParticles(deltaSeconds: number): void {
    const nextParticles: EffectParticle[] = [];

    for (const particle of this.particles) {
      const nextLife = particle.life - deltaSeconds;

      if (nextLife <= 0) {
        continue;
      }

      nextParticles.push({
        ...particle,
        life: nextLife,
        position: add(particle.position, scale(particle.velocity, deltaSeconds)),
        velocity: scale(particle.velocity, 0.94)
      });
    }

    this.particles = nextParticles;
  }

  private emitCarEffects(car: CarState, deltaSeconds: number): void {
    const speed = length(car.velocity);

    if (speed < 80) {
      return;
    }

    const heading = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
    const side = perpendicular(heading);
    const rearAnchor = add(car.position, scale(heading, -16));

    if (car.offRoad) {
      const dustCount = Math.max(1, Math.floor(deltaSeconds * 140));

      for (let index = 0; index < dustCount; index += 1) {
        const spread = (Math.random() - 0.5) * 22;

        this.particles.push({
          color: car.id === "player" ? "rgba(214, 193, 146, 0.75)" : "rgba(197, 182, 140, 0.6)",
          height: 6 + Math.random() * 8,
          life: 0.22 + Math.random() * 0.18,
          maxLife: 0.4,
          position: add(rearAnchor, scale(side, spread)),
          size: 5 + Math.random() * 7,
          velocity: add(scale(heading, -36 - Math.random() * 22), scale(side, spread * 0.7))
        });
      }
    }

    if (car.boostTime > 0) {
      this.particles.push({
        color: car.id === "player" ? "rgba(255, 203, 96, 0.88)" : "rgba(255, 142, 118, 0.75)",
        height: 8 + Math.random() * 6,
        life: 0.14 + Math.random() * 0.08,
        maxLife: 0.22,
        position: add(rearAnchor, scale(side, (Math.random() - 0.5) * 12)),
        size: 4 + Math.random() * 5,
        velocity: add(scale(heading, -58 - Math.random() * 44), scale(side, (Math.random() - 0.5) * 18))
      });
    }
  }

  private collectPickups(car: CarState): void {
    for (const pickup of this.pickups) {
      if (!pickup.active) {
        continue;
      }

      if (distance(pickup.position, car.position) < 32) {
        pickup.active = false;
        pickup.respawn = 7;
        car.boostTime = Math.max(car.boostTime, 1.8);
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
    car.wheelSpin += forwardSpeed * deltaSeconds * 0.045;

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

  private createView(): ViewSettings {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const speedFactor = clamp(length(this.player.velocity) / 255, 0, 1);
    const boostShake = this.player.boostTime > 0 ? Math.sin(this.elapsedRaceTime * 34) * 3 : 0;

    return {
      cameraAngle: this.cameraAngle,
      cameraHeight: 82 + boostShake,
      cameraOrigin: this.camera,
      focalLength: width * (0.86 + speedFactor * 0.08),
      horizonY: height * (0.26 - speedFactor * 0.02),
      viewportHeight: height,
      viewportWidth: width
    };
  }

  private projectWorldPoint(worldPoint: Vec2, view: ViewSettings): GroundProjection | null {
    return projectGroundPoint(
      toViewSpace(view.cameraOrigin, view.cameraAngle, worldPoint),
      view
    );
  }

  private buildRoadSlices(view: ViewSettings): RoadSlice[] {
    const slices: RoadSlice[] = [];
    let distanceOnTrack = ROAD_SAMPLE_START;
    let sampleIndex = 0;

    while (distanceOnTrack <= ROAD_DRAW_DISTANCE) {
      const frame = sampleTrackFrame(TRACK, this.player.progress + distanceOnTrack);
      const shoulderWidth = TRACK.halfWidth + 20;
      const centerProjection = this.projectWorldPoint(frame.center, view);
      const innerLeft = this.projectWorldPoint(
        add(frame.center, scale(frame.normal, TRACK.halfWidth)),
        view
      );
      const innerRight = this.projectWorldPoint(
        add(frame.center, scale(frame.normal, -TRACK.halfWidth)),
        view
      );
      const outerLeft = this.projectWorldPoint(
        add(frame.center, scale(frame.normal, shoulderWidth)),
        view
      );
      const outerRight = this.projectWorldPoint(
        add(frame.center, scale(frame.normal, -shoulderWidth)),
        view
      );

      if (centerProjection && innerLeft && innerRight && outerLeft && outerRight) {
        const slice: RoadSlice = {
          centerX: centerProjection.screenX,
          depth: centerProjection.depth,
          groundY: centerProjection.groundY,
          innerLeftX: innerLeft.screenX,
          innerRightX: innerRight.screenX,
          outerLeftX: outerLeft.screenX,
          outerRightX: outerRight.screenX,
          progressDistance: distanceOnTrack
        };
        const last = slices[slices.length - 1];

        if (
          slice.groundY > view.horizonY - 18 &&
          slice.groundY < view.viewportHeight + 140 &&
          (!last || slice.groundY < last.groundY - 1)
        ) {
          slices.push(slice);
        }
      }

      distanceOnTrack += 12 + sampleIndex * 0.72;
      sampleIndex += 1;
    }

    return slices;
  }

  private buildSceneSprites(view: ViewSettings): SceneSprite[] {
    const sprites: SceneSprite[] = [];

    for (const item of DECOR) {
      const projection = this.projectWorldPoint(item.position, view);

      if (
        !projection ||
        projection.depth > ROAD_DRAW_DISTANCE + 180 ||
        projection.groundY < view.horizonY - 40 ||
        projection.groundY > view.viewportHeight + 140 ||
        projection.scale < 0.08
      ) {
        continue;
      }

      sprites.push({
        depth: projection.depth,
        render: (ctx) => {
          this.drawDecorSprite(ctx, item, projection);
        }
      });
    }

    for (const pickup of this.pickups) {
      if (!pickup.active) {
        continue;
      }

      const projection = this.projectWorldPoint(pickup.position, view);

      if (!projection || projection.depth > ROAD_DRAW_DISTANCE || projection.scale < 0.09) {
        continue;
      }

      sprites.push({
        depth: projection.depth,
        render: (ctx) => {
          this.drawPickupSprite(ctx, projection, pickup.pulse);
        }
      });
    }

    for (const particle of this.particles) {
      const projection = this.projectWorldPoint(particle.position, view);

      if (!projection || projection.depth > ROAD_DRAW_DISTANCE || projection.scale < 0.08) {
        continue;
      }

      sprites.push({
        depth: projection.depth,
        render: (ctx) => {
          this.drawParticleSprite(ctx, particle, projection);
        }
      });
    }

    const rivalProjection = this.projectWorldPoint(this.rival.position, view);

    if (
      rivalProjection &&
      rivalProjection.depth < ROAD_DRAW_DISTANCE &&
      rivalProjection.depth > 40 &&
      rivalProjection.scale > 0.1
    ) {
      sprites.push({
        depth: rivalProjection.depth,
        render: (ctx) => {
          this.drawProjectedCar(ctx, this.rival, rivalProjection);
        }
      });
    }

    return sprites.sort((left, right) => right.depth - left.depth);
  }

  private render(): void {
    const { ctx } = this;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const view = this.createView();
    const roadSlices = this.buildRoadSlices(view);

    ctx.clearRect(0, 0, width, height);
    this.drawSky(ctx, view);
    this.drawRoad(ctx, roadSlices, view);

    for (const sprite of this.buildSceneSprites(view)) {
      sprite.render(ctx);
    }

    this.drawVignette(ctx, width, height);
    this.drawPlayerCarOverlay(ctx);
    this.drawSpeedStreaks(ctx, width, height);
    this.drawScreenHud(ctx, width);
    this.drawMiniMap(ctx, width, height);
    this.drawSpeedGauge(ctx, height);
    this.drawCountdownFlash(ctx, width, height);
  }

  private drawVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const vignette = ctx.createRadialGradient(width / 2, height / 2, 180, width / 2, height / 2, 860);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(8, 14, 19, 0.34)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  private drawSky(ctx: CanvasRenderingContext2D, view: ViewSettings): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);

    skyGradient.addColorStop(0, "#fff7df");
    skyGradient.addColorStop(0.16, "#ffdba1");
    skyGradient.addColorStop(0.44, "#8cccf1");
    skyGradient.addColorStop(0.45, "#dfe0a1");
    skyGradient.addColorStop(1, "#98b764");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    const sunX = width * 0.8;
    const sunY = view.horizonY - 82;
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 124);

    sunGradient.addColorStop(0, "rgba(255, 245, 206, 0.94)");
    sunGradient.addColorStop(1, "rgba(255, 245, 206, 0)");
    ctx.fillStyle = sunGradient;
    ctx.fillRect(sunX - 130, sunY - 130, 260, 260);

    this.drawCloud(ctx, width * 0.18, view.horizonY - 84, 1.1, 0.2);
    this.drawCloud(ctx, width * 0.44, view.horizonY - 110, 1.45, 0.16);
    this.drawCloud(ctx, width * 0.67, view.horizonY - 66, 0.96, 0.18);

    ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
    ctx.fillRect(0, view.horizonY - 6, width, 4);

    ctx.fillStyle = "#82ab63";
    ctx.beginPath();
    ctx.moveTo(0, view.horizonY + 24);
    ctx.bezierCurveTo(width * 0.12, view.horizonY - 12, width * 0.24, view.horizonY + 16, width * 0.38, view.horizonY + 10);
    ctx.bezierCurveTo(width * 0.58, view.horizonY + 2, width * 0.76, view.horizonY + 34, width, view.horizonY + 18);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(93, 121, 74, 0.46)";
    ctx.beginPath();
    ctx.moveTo(0, view.horizonY + 54);
    ctx.bezierCurveTo(width * 0.16, view.horizonY + 18, width * 0.32, view.horizonY + 66, width * 0.5, view.horizonY + 48);
    ctx.bezierCurveTo(width * 0.7, view.horizonY + 28, width * 0.86, view.horizonY + 70, width, view.horizonY + 52);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ba9456";
    ctx.fillRect(0, view.horizonY + 22, width, height - (view.horizonY + 22));

    ctx.strokeStyle = "rgba(233, 204, 142, 0.18)";
    ctx.lineWidth = 6;
    for (let index = 0; index < 7; index += 1) {
      const y = view.horizonY + 44 + index * 34;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + 8);
      ctx.stroke();
    }
  }

  private drawCloud(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scaleFactor: number,
    opacity: number
  ): void {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 42 * scaleFactor, 24 * scaleFactor, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 36 * scaleFactor, y - 6 * scaleFactor, 34 * scaleFactor, 21 * scaleFactor, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 34 * scaleFactor, y - 4 * scaleFactor, 28 * scaleFactor, 18 * scaleFactor, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawRoad(
    ctx: CanvasRenderingContext2D,
    roadSlices: RoadSlice[],
    view: ViewSettings
  ): void {
    if (roadSlices.length < 2) {
      return;
    }

    for (let index = roadSlices.length - 1; index > 0; index -= 1) {
      const far = roadSlices[index];
      const near = roadSlices[index - 1];
      const roadShade = clamp(1 - far.progressDistance / ROAD_DRAW_DISTANCE, 0.28, 1);
      const shoulderColor = index % 2 === 0 ? "#c78a42" : "#efd197";

      this.fillQuad(
        ctx,
        far.outerLeftX,
        far.groundY,
        far.innerLeftX,
        far.groundY,
        near.innerLeftX,
        near.groundY,
        near.outerLeftX,
        near.groundY,
        shoulderColor
      );
      this.fillQuad(
        ctx,
        far.innerRightX,
        far.groundY,
        far.outerRightX,
        far.groundY,
        near.outerRightX,
        near.groundY,
        near.innerRightX,
        near.groundY,
        shoulderColor
      );
      this.fillQuad(
        ctx,
        far.innerLeftX,
        far.groundY,
        far.innerRightX,
        far.groundY,
        near.innerRightX,
        near.groundY,
        near.innerLeftX,
        near.groundY,
        `rgba(54, 62, 72, ${0.76 + roadShade * 0.16})`
      );

      this.fillQuad(
        ctx,
        lerp(far.innerLeftX, far.centerX, 0.47),
        far.groundY,
        lerp(far.innerLeftX, far.centerX, 0.53),
        far.groundY,
        lerp(near.innerLeftX, near.centerX, 0.53),
        near.groundY,
        lerp(near.innerLeftX, near.centerX, 0.47),
        near.groundY,
        "rgba(255, 249, 228, 0.28)"
      );

      if (index % 2 === 0) {
        this.fillQuad(
          ctx,
          far.centerX - 4,
          far.groundY,
          far.centerX + 4,
          far.groundY,
          near.centerX + 8,
          near.groundY,
          near.centerX - 8,
          near.groundY,
          "rgba(255, 250, 234, 0.9)"
        );
      }

      if (index % 4 === 0) {
        this.drawRoadsidePost(ctx, near.outerLeftX, near.groundY, -1, roadShade);
        this.drawRoadsidePost(ctx, near.outerRightX, near.groundY, 1, roadShade);
      }
    }

    const nearestSlice = roadSlices[0];

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.fillRect(0, nearestSlice.groundY, view.viewportWidth, view.viewportHeight - nearestSlice.groundY);
  }

  private fillQuad(
    ctx: CanvasRenderingContext2D,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number,
    fillStyle: string
  ): void {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.lineTo(dx, dy);
    ctx.closePath();
    ctx.fill();
  }

  private drawRoadsidePost(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    direction: -1 | 1,
    intensity: number
  ): void {
    const postHeight = clamp((y - this.canvas.height * 0.2) * 0.12, 8, 44);
    const lean = direction * (8 + postHeight * 0.14);

    ctx.strokeStyle = `rgba(110, 80, 42, ${0.24 + intensity * 0.5})`;
    ctx.lineWidth = clamp(postHeight * 0.12, 1.2, 4);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - postHeight);
    ctx.stroke();

    ctx.strokeStyle = `rgba(248, 241, 215, ${0.2 + intensity * 0.46})`;
    ctx.lineWidth = clamp(postHeight * 0.06, 1, 3);
    ctx.beginPath();
    ctx.moveTo(x + lean, y - postHeight * 0.72);
    ctx.lineTo(x + lean + direction * (10 + postHeight * 0.22), y - postHeight * 0.72);
    ctx.stroke();
  }

  private drawDecorSprite(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    projection: GroundProjection
  ): void {
    switch (item.kind) {
      case "barn":
        this.drawProjectedBarn(ctx, item, projection);
        break;
      case "haybale":
        this.drawProjectedHaybale(ctx, item, projection);
        break;
      case "house":
        this.drawProjectedHouse(ctx, item, projection);
        break;
      case "parked-car":
        this.drawProjectedParkedCar(ctx, item, projection);
        break;
      case "silo":
        this.drawProjectedSilo(ctx, item, projection);
        break;
      case "tree":
        this.drawProjectedTree(ctx, item, projection);
        break;
    }
  }

  private drawProjectedBarn(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    projection: GroundProjection
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 3.4);
    const width = item.size * spriteScale * 1.35;
    const height = item.size * spriteScale;
    const baseX = projection.screenX;
    const baseY = projection.groundY;

    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 5, width * 0.5, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsl(${item.tint} 72% 48%)`;
    ctx.fillRect(baseX - width * 0.5, baseY - height, width, height);

    ctx.fillStyle = "#f1e6d0";
    ctx.fillRect(baseX - width * 0.09, baseY - height * 0.56, width * 0.18, height * 0.56);
    ctx.fillRect(baseX - width * 0.34, baseY - height * 0.48, width * 0.14, height * 0.28);
    ctx.fillRect(baseX + width * 0.2, baseY - height * 0.48, width * 0.14, height * 0.28);

    ctx.fillStyle = "#5e3622";
    ctx.beginPath();
    ctx.moveTo(baseX - width * 0.58, baseY - height);
    ctx.lineTo(baseX, baseY - height * 1.42);
    ctx.lineTo(baseX + width * 0.58, baseY - height);
    ctx.closePath();
    ctx.fill();
  }

  private drawProjectedHouse(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    projection: GroundProjection
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 3.2);
    const width = item.size * spriteScale * 1.2;
    const height = item.size * spriteScale * 0.95;
    const roofHeight = height * 0.42;
    const baseX = projection.screenX;
    const baseY = projection.groundY;

    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 4, width * 0.54, height * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsl(${item.tint} 54% 76%)`;
    ctx.fillRect(baseX - width * 0.5, baseY - height, width, height);

    ctx.fillStyle = "#efe5d3";
    ctx.fillRect(baseX - width * 0.12, baseY - height * 0.46, width * 0.18, height * 0.3);
    ctx.fillRect(baseX + width * 0.18, baseY - height * 0.56, width * 0.22, height * 0.22);
    ctx.fillRect(baseX - width * 0.34, baseY - height * 0.56, width * 0.18, height * 0.18);

    ctx.fillStyle = `hsl(${item.tint} 58% 42%)`;
    ctx.beginPath();
    ctx.moveTo(baseX - width * 0.62, baseY - height);
    ctx.lineTo(baseX, baseY - height - roofHeight);
    ctx.lineTo(baseX + width * 0.62, baseY - height);
    ctx.closePath();
    ctx.fill();
  }

  private drawProjectedSilo(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    projection: GroundProjection
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 3);
    const width = item.size * spriteScale * 0.48;
    const height = item.size * spriteScale * 1.2;
    const baseX = projection.screenX;
    const baseY = projection.groundY;

    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 4, width * 0.72, height * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsl(${item.tint} 16% 82%)`;
    ctx.fillRect(baseX - width * 0.5, baseY - height, width, height);
    ctx.beginPath();
    ctx.ellipse(baseX, baseY - height, width * 0.5, width * 0.25, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(93, 102, 116, 0.36)";
    ctx.lineWidth = Math.max(1, spriteScale * 1.5);
    ctx.beginPath();
    ctx.moveTo(baseX + width * 0.18, baseY - height);
    ctx.lineTo(baseX + width * 0.18, baseY);
    ctx.stroke();
  }

  private drawProjectedTree(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    projection: GroundProjection
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 2.8);
    const trunkHeight = item.size * spriteScale * 0.7;
    const crownRadius = item.size * spriteScale * 0.9;
    const baseX = projection.screenX;
    const baseY = projection.groundY;

    ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 4, crownRadius * 0.64, crownRadius * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#69482b";
    ctx.fillRect(baseX - crownRadius * 0.08, baseY - trunkHeight, crownRadius * 0.16, trunkHeight);

    ctx.fillStyle = `hsl(${item.tint} 48% 38%)`;
    ctx.beginPath();
    ctx.arc(baseX, baseY - trunkHeight - crownRadius * 0.08, crownRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
    ctx.beginPath();
    ctx.arc(
      baseX - crownRadius * 0.28,
      baseY - trunkHeight - crownRadius * 0.28,
      crownRadius * 0.42,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawProjectedParkedCar(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    projection: GroundProjection
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 2.6);
    const width = item.size * spriteScale * 1.2;
    const height = item.size * spriteScale * 0.44;
    const baseX = projection.screenX;
    const baseY = projection.groundY;

    ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
    ctx.beginPath();
    ctx.ellipse(baseX, baseY + 3, width * 0.46, height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsl(${item.tint} 72% 56%)`;
    ctx.fillRect(baseX - width * 0.5, baseY - height, width, height);
    ctx.fillStyle = "#131820";
    ctx.fillRect(baseX - width * 0.16, baseY - height * 0.96, width * 0.3, height * 0.38);
    ctx.fillStyle = "#efefe8";
    ctx.fillRect(baseX + width * 0.4, baseY - height * 0.62, width * 0.07, height * 0.12);
  }

  private drawProjectedHaybale(
    ctx: CanvasRenderingContext2D,
    item: DecorItem,
    projection: GroundProjection
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 2.6);
    const radius = item.size * spriteScale * 0.55;
    const x = projection.screenX;
    const y = projection.groundY - radius * 0.78;

    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    ctx.beginPath();
    ctx.ellipse(x, projection.groundY + 2, radius * 0.9, radius * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d6aa46";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b6320";
    ctx.lineWidth = Math.max(1.2, spriteScale * 1.8);
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.56, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawPickupSprite(
    ctx: CanvasRenderingContext2D,
    projection: GroundProjection,
    pulse: number
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 2.8);
    const x = projection.screenX;
    const y = projectRaisedY(projection, 18);
    const haloRadius = 18 * spriteScale + Math.sin(pulse * 3.2) * 4 * spriteScale;

    ctx.fillStyle = "rgba(255, 189, 54, 0.18)";
    ctx.beginPath();
    ctx.arc(x, y, haloRadius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 212, 89, 0.84)";
    ctx.lineWidth = 4 * spriteScale;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffca45";
    ctx.beginPath();
    ctx.arc(x, y, 10 * spriteScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8f4d08";
    ctx.fillRect(x - 4 * spriteScale, y - 8 * spriteScale, 8 * spriteScale, 16 * spriteScale);
    ctx.fillStyle = "#fff4c0";
    ctx.fillRect(x - 1.5 * spriteScale, y - 6 * spriteScale, 3 * spriteScale, 12 * spriteScale);
  }

  private drawParticleSprite(
    ctx: CanvasRenderingContext2D,
    particle: EffectParticle,
    projection: GroundProjection
  ): void {
    const lifeRatio = particle.life / particle.maxLife;
    const size = particle.size * projection.scale * clamp(lifeRatio + 0.2, 0.2, 1.2);
    const y = projectRaisedY(projection, particle.height);

    ctx.fillStyle = particle.color.replace(/0\.\d+\)/, `${clamp(lifeRatio * 0.9, 0.08, 0.9)})`);
    ctx.beginPath();
    ctx.arc(projection.screenX, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawProjectedCar(
    ctx: CanvasRenderingContext2D,
    car: CarState,
    projection: GroundProjection
  ): void {
    const spriteScale = clamp(projection.scale, 0.12, 2.4);
    const width = 38 * spriteScale;
    const height = 20 * spriteScale;
    const x = projection.screenX;
    const y = projectRaisedY(projection, 10);
    const yawBias = clamp(wrapAngle(car.angle - this.cameraAngle) * 26, -18, 18);

    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(x, projection.groundY + 5, width * 0.62, height * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    if (car.offRoad) {
      ctx.fillStyle = "rgba(204, 177, 126, 0.18)";
      ctx.beginPath();
      ctx.ellipse(x - yawBias * 0.4, projection.groundY - 2, width * 0.82, height * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = car.color;
    ctx.fillRect(x - width * 0.5 + yawBias * 0.1, y - height, width, height);
    ctx.fillStyle = car.accent;
    ctx.fillRect(x - width * 0.14, y - height * 0.82, width * 0.3, height * 0.64);
    ctx.fillStyle = "#11161d";
    ctx.fillRect(x - width * 0.44, y - height * 1.12, width * 0.22, height * 0.24);
    ctx.fillRect(x + width * 0.22, y - height * 1.12, width * 0.22, height * 0.24);
    ctx.fillRect(x - width * 0.44, y + height * 0.02, width * 0.22, height * 0.24);
    ctx.fillRect(x + width * 0.22, y + height * 0.02, width * 0.22, height * 0.24);

    if (car.boostTime > 0) {
      ctx.fillStyle = "rgba(255, 188, 66, 0.42)";
      ctx.fillRect(x - width * 0.72, y - height * 0.64, width * 0.26, height * 0.54);
    }
  }

  private drawPlayerCarOverlay(ctx: CanvasRenderingContext2D): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const speedFactor = clamp(length(this.player.velocity) / 255, 0, 1);
    const steer = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const bounce = Math.sin(this.elapsedRaceTime * (12 + speedFactor * 12)) * (3 + speedFactor * 4);
    const screenX = width * 0.5 + steer * 28;
    const screenY = height * 0.82 + bounce;
    const scaleFactor = 1 + speedFactor * 0.16;
    const bodyWidth = 170 * scaleFactor;
    const bodyHeight = 80 * scaleFactor;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(steer * 0.06);

    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 20, bodyWidth * 0.42, bodyHeight * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.player.boostTime > 0) {
      ctx.fillStyle = "rgba(255, 190, 66, 0.22)";
      ctx.beginPath();
      ctx.arc(-bodyWidth * 0.54, -8, 44 + Math.sin(this.elapsedRaceTime * 28) * 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#11161c";
    ctx.fillRect(-bodyWidth * 0.42, -bodyHeight * 0.56, bodyWidth * 0.2, bodyHeight * 0.18);
    ctx.fillRect(bodyWidth * 0.22, -bodyHeight * 0.56, bodyWidth * 0.2, bodyHeight * 0.18);
    ctx.fillRect(-bodyWidth * 0.42, bodyHeight * 0.24, bodyWidth * 0.2, bodyHeight * 0.18);
    ctx.fillRect(bodyWidth * 0.22, bodyHeight * 0.24, bodyWidth * 0.2, bodyHeight * 0.18);

    ctx.fillStyle = this.player.color;
    ctx.fillRect(-bodyWidth * 0.5, -bodyHeight * 0.42, bodyWidth, bodyHeight * 0.8);
    ctx.fillStyle = this.player.accent;
    ctx.fillRect(-bodyWidth * 0.12, -bodyHeight * 0.36, bodyWidth * 0.3, bodyHeight * 0.56);

    ctx.fillStyle = "#f7f3da";
    ctx.fillRect(bodyWidth * 0.38, -bodyHeight * 0.14, bodyWidth * 0.08, bodyHeight * 0.08);
    ctx.fillRect(bodyWidth * 0.38, bodyHeight * 0.02, bodyWidth * 0.08, bodyHeight * 0.08);
    ctx.fillStyle = "#b42032";
    ctx.fillRect(-bodyWidth * 0.48, -bodyHeight * 0.14, bodyWidth * 0.06, bodyHeight * 0.08);
    ctx.fillRect(-bodyWidth * 0.48, bodyHeight * 0.02, bodyWidth * 0.06, bodyHeight * 0.08);

    ctx.restore();
  }

  private drawSpeedStreaks(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const speedFactor = clamp(length(this.player.velocity) / 255, 0, 1);

    if (speedFactor < 0.5) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + speedFactor * 0.08})`;
    ctx.lineWidth = 2;

    for (let index = 0; index < 10; index += 1) {
      const progress = (this.elapsedRaceTime * 420 + index * 74) % width;
      const y = height * (0.18 + index * 0.055);

      ctx.beginPath();
      ctx.moveTo(progress, y);
      ctx.lineTo(progress + 60 + speedFactor * 70, y + 8);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawScreenHud(ctx: CanvasRenderingContext2D, width: number): void {
    const bestLap = Number.isFinite(this.bestLapTime) ? formatRaceTime(this.bestLapTime) : "--:--.--";
    const lastLap = this.lastLapTime > 0 ? formatRaceTime(this.lastLapTime) : "--:--.--";
    const lap = Math.min(this.player.lap + (this.status === "finished" ? 0 : 1), PLAYER_LAPS_TO_WIN);

    ctx.save();
    ctx.font = '600 18px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillStyle = "rgba(8, 14, 20, 0.58)";
    ctx.fillRect(18, 18, 210, 84);
    ctx.fillRect(width - 238, 18, 220, 104);

    ctx.fillStyle = "#ffe9a6";
    ctx.fillText("COUNTRY HUD", 34, 44);
    ctx.fillStyle = "#f8fbff";
    ctx.fillText(`LAP ${lap}/${PLAYER_LAPS_TO_WIN}`, 34, 70);
    ctx.fillText(`PLACE ${this.playerPlace}/${TOTAL_RACERS}`, 34, 94);

    ctx.fillStyle = "#ffe9a6";
    ctx.fillText("TIMES", width - 220, 44);
    ctx.fillStyle = "#f8fbff";
    ctx.fillText(`RUN  ${formatRaceTime(this.elapsedRaceTime)}`, width - 220, 68);
    ctx.fillText(`BEST ${bestLap}`, width - 220, 90);
    ctx.fillText(`LAST ${lastLap}`, width - 220, 112);
    ctx.restore();
  }

  private drawMiniMap(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const panelWidth = 190;
    const panelHeight = 130;
    const panelX = width - panelWidth - 18;
    const panelY = height - panelHeight - 18;
    const padding = 18;

    ctx.save();
    ctx.fillStyle = "rgba(8, 14, 20, 0.58)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    ctx.strokeStyle = "rgba(255, 237, 178, 0.86)";
    ctx.lineWidth = 3;
    ctx.beginPath();

    TRACK.centerline.forEach((point, index) => {
      const x =
        panelX +
        padding +
        ((point.x - MINIMAP_BOUNDS.minX) / (MINIMAP_BOUNDS.maxX - MINIMAP_BOUNDS.minX)) *
          (panelWidth - padding * 2);
      const y =
        panelY +
        padding +
        ((point.y - MINIMAP_BOUNDS.minY) / (MINIMAP_BOUNDS.maxY - MINIMAP_BOUNDS.minY)) *
          (panelHeight - padding * 2);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.closePath();
    ctx.stroke();
    this.drawMiniMapMarker(ctx, panelX, panelY, panelWidth, panelHeight, this.rival.position, "#ef4b5b");
    this.drawMiniMapMarker(ctx, panelX, panelY, panelWidth, panelHeight, this.player.position, "#f4bf3a");
    ctx.fillStyle = "#ffe9a6";
    ctx.font = '600 16px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText("MAP", panelX + 16, panelY + 18);
    ctx.restore();
  }

  private drawMiniMapMarker(
    ctx: CanvasRenderingContext2D,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number,
    position: Vec2,
    color: string
  ): void {
    const padding = 18;
    const x =
      panelX +
      padding +
      ((position.x - MINIMAP_BOUNDS.minX) / (MINIMAP_BOUNDS.maxX - MINIMAP_BOUNDS.minX)) *
        (panelWidth - padding * 2);
    const y =
      panelY +
      padding +
      ((position.y - MINIMAP_BOUNDS.minY) / (MINIMAP_BOUNDS.maxY - MINIMAP_BOUNDS.minY)) *
        (panelHeight - padding * 2);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fffbe8";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawSpeedGauge(ctx: CanvasRenderingContext2D, height: number): void {
    const centerX = 128;
    const centerY = height - 46;
    const radius = 78;
    const speedFactor = clamp(length(this.player.velocity) / 280, 0, 1);
    const boostFactor = clamp(this.player.boostTime / 1.8, 0, 1);
    const startAngle = Math.PI * 0.88;
    const endAngle = Math.PI * 0.12;
    const currentAngle = startAngle + (endAngle - startAngle) * speedFactor;

    ctx.save();
    ctx.strokeStyle = "rgba(8, 14, 20, 0.5)";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.stroke();

    ctx.strokeStyle = "#f5bd43";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, currentAngle, false);
    ctx.stroke();

    if (boostFactor > 0) {
      ctx.strokeStyle = `rgba(255, 123, 75, ${0.35 + boostFactor * 0.4})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 14, startAngle, startAngle + (endAngle - startAngle) * boostFactor, false);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(8, 14, 20, 0.62)";
    ctx.fillRect(18, height - 112, 220, 84);
    ctx.fillStyle = "#ffe9a6";
    ctx.font = '600 18px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.fillText("SPEED", 36, height - 78);
    ctx.fillStyle = "#f8fbff";
    ctx.fillText(`${Math.round(length(this.player.velocity) * 0.82)} KM/H`, 36, height - 52);
    ctx.fillText(this.status === "countdown" ? "COUNTDOWN" : "FARM LANE", 36, height - 28);

    ctx.strokeStyle = "#fff8dd";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + Math.cos(currentAngle) * (radius - 12), centerY + Math.sin(currentAngle) * (radius - 12));
    ctx.stroke();
    ctx.restore();
  }

  private drawCountdownFlash(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (this.countdownFlash <= 0) {
      return;
    }

    const alpha = clamp(this.countdownFlash / 0.8, 0, 1);

    ctx.save();
    ctx.fillStyle = `rgba(255, 239, 196, ${alpha * 0.18})`;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = `rgba(255, 243, 218, ${alpha})`;
    ctx.font = '700 110px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("GO", width * 0.5, height * 0.42);
    ctx.restore();
  }
}
