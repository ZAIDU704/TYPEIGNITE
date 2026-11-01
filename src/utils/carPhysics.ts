/**
 * Natural Car Acceleration & Delta-Time Physics Engine for Typing Rush.
 *
 * Enforces:
 * 1. Pre-race ('idle' / 'countdown'): speed = 0, distance = 0 (cars stay at starting grid).
 * 2. Race start ('racing'): all 4 cars launch together at the exact same BASE_SPEED.
 * 3. Correct typing progressively builds typingMomentum -> increases targetSpeed.
 * 4. Stopping typing smoothly decelerates the car back toward BASE_SPEED.
 * 5. Incorrect typing does NOT increase speed (applies a small drag penalty to momentum).
 * 6. Frame-rate independent delta-time integration (clamped dt <= 0.05s).
 */

export type RacePhase = 'idle' | 'countdown' | 'racing' | 'finished';

export interface CarPhysicsState {
  id: string;
  lane: number;
  isSelf: boolean;
  isHuman: boolean;
  /** Current forward speed in meters/units per second */
  currentSpeed: number;
  /** Target forward speed in meters/units per second */
  targetSpeed: number;
  /** Rolling typing momentum (0 to 100) built by accurate keystrokes */
  typingMomentum: number;
  /** Time in seconds since the last accurate keystroke */
  timeSinceLastKey: number;
  /** Cumulative distance traveled along the track (0 to TRACK_DISTANCE) */
  distance: number;
  /** Normalized race progress percentage (0 to 100) */
  progress: number;
  /** Current wheel rotation angle in radians */
  wheelAngle: number;
  /** Subtle chassis pitch angle (radians) from acceleration/deceleration */
  chassisPitch: number;
  /** Subtle suspension vertical offset */
  suspensionY: number;
  /** AI rhythm phase timer for believable rival acceleration/deceleration */
  aiPhaseTimer: number;
  /** AI base skill WPM */
  aiTargetWpm: number;
}

export const PHYSICS_CONSTANTS = {
  /** Base speed all cars share when the race starts (units/sec) */
  BASE_SPEED: 8.5,
  /** Maximum possible speed at peak typing velocity (units/sec) */
  MAX_SPEED: 38.0,
  /** Maximum acceleration rate (units/sec^2) - progressive buildup */
  ACCEL_RATE: 11.5,
  /** Maximum deceleration rate (units/sec^2) - smooth coasting down */
  DECEL_RATE: 5.5,
  /** Momentum added per correct character typed */
  CORRECT_CHAR_MOMENTUM: 6.5,
  /** Momentum penalty on incorrect character (never boosts speed) */
  ERROR_CHAR_PENALTY: 2.8,
  /** Grace window (seconds) after a keystroke before coasting deceleration begins */
  ACTIVE_TYPING_WINDOW: 0.42,
  /** Natural decay rate of typing momentum per second while actively typing */
  MOMENTUM_DECAY_RATE: 12.0,
  /** Maximum momentum cap */
  MAX_MOMENTUM: 100.0,
  /** Total track distance for 100% progress over a 120s race */
  TRACK_TOTAL_DISTANCE: 2200.0,
  /** Wheel radius for realistic angular velocity */
  WHEEL_RADIUS: 0.44,
};

/**
 * Returns the 3 AI bot target WPM values for the selected difficulty level.
 * - 'beginner': Scales comfortably around the user's customizable target WPM.
 * - 'rookie': ~35 WPM (unchanged)
 * - 'pro': ~62 WPM (unchanged)
 * - 'master': ~88 WPM (unchanged)
 */
export function getAiBotTargetWpms(
  difficulty: 'beginner' | 'rookie' | 'pro' | 'master' = 'beginner',
  beginnerTargetWpm: number = 25
): [number, number, number] {
  if (difficulty === 'beginner') {
    const safeTarget = Math.max(5, Math.min(120, Math.round(Number(beginnerTargetWpm) || 25)));
    return [
      Math.max(5, Math.round(safeTarget * 0.96)),
      Math.max(5, Math.round(safeTarget * 0.85)),
      Math.max(5, Math.round(safeTarget * 0.74)),
    ];
  }
  if (difficulty === 'rookie') {
    return [38, 35, 31];
  }
  if (difficulty === 'master') {
    return [92, 88, 83];
  }
  // 'pro'
  return [66, 59, 52];
}

/**
 * Creates the initial physics state for a car at the starting grid.
 */
export function createInitialCarPhysics(
  id: string,
  lane: number,
  isSelf: boolean,
  isHuman: boolean,
  aiTargetWpm: number = 60
): CarPhysicsState {
  return {
    id,
    lane,
    isSelf,
    isHuman,
    currentSpeed: 0,
    targetSpeed: 0,
    typingMomentum: 0,
    timeSinceLastKey: 99,
    distance: 0,
    progress: 0,
    wheelAngle: 0,
    chassisPitch: 0,
    suspensionY: 0,
    aiPhaseTimer: lane * 1.7,
    aiTargetWpm,
  };
}

/**
 * Transitions all cars to the exact same initial base speed at "GO!".
 */
export function launchCarsAtBaseSpeed(cars: CarPhysicsState[]): CarPhysicsState[] {
  return cars.map((car) => ({
    ...car,
    currentSpeed: PHYSICS_CONSTANTS.BASE_SPEED,
    targetSpeed: PHYSICS_CONSTANTS.BASE_SPEED,
    typingMomentum: 0,
    timeSinceLastKey: 99,
  }));
}

/**
 * Registers typing input on a car's physics state.
 * Correct characters progressively increase momentum and target speed.
 * Incorrect characters never provide positive acceleration.
 */
export function applyTypingToCarPhysics(
  car: CarPhysicsState,
  correctCharsAdded: number,
  incorrectCharsAdded: number
): CarPhysicsState {
  const speedRange = PHYSICS_CONSTANTS.MAX_SPEED - PHYSICS_CONSTANTS.BASE_SPEED;
  const currentSpeedMomentum = Math.max(
    0,
    ((car.currentSpeed - PHYSICS_CONSTANTS.BASE_SPEED) / speedRange) *
      PHYSICS_CONSTANTS.MAX_MOMENTUM
  );

  let nextMomentum = Math.max(car.typingMomentum, currentSpeedMomentum);
  let nextTimeSinceLastKey = car.timeSinceLastKey;
  let nextDistance = car.distance;

  if (correctCharsAdded > 0) {
    const headroomFactor = 1 - (nextMomentum / (PHYSICS_CONSTANTS.MAX_MOMENTUM * 1.25)) * 0.35;
    nextMomentum += correctCharsAdded * PHYSICS_CONSTANTS.CORRECT_CHAR_MOMENTUM * headroomFactor;
    nextTimeSinceLastKey = 0;
  } else if (correctCharsAdded < 0) {
    // Backspace: trim momentum slightly and recalculate distance/progress downward
    nextMomentum = Math.max(0, car.typingMomentum + correctCharsAdded * 2.5);
    nextDistance = Math.max(0, car.distance + correctCharsAdded * 0.85);
  }

  if (incorrectCharsAdded > 0) {
    nextMomentum = Math.max(
      0,
      car.typingMomentum - incorrectCharsAdded * PHYSICS_CONSTANTS.ERROR_CHAR_PENALTY
    );
  }

  nextMomentum = Math.min(PHYSICS_CONSTANTS.MAX_MOMENTUM, Math.max(0, nextMomentum));

  const targetSpeed =
    PHYSICS_CONSTANTS.BASE_SPEED + (nextMomentum / PHYSICS_CONSTANTS.MAX_MOMENTUM) * speedRange;
  const nextProgress = Math.min(
    100,
    (nextDistance / PHYSICS_CONSTANTS.TRACK_TOTAL_DISTANCE) * 100
  );

  return {
    ...car,
    typingMomentum: nextMomentum,
    timeSinceLastKey: nextTimeSinceLastKey,
    targetSpeed,
    distance: nextDistance,
    progress: nextProgress,
  };
}

/**
 * Advances a single car's physics by delta time (seconds).
 * Uses frame-rate-independent acceleration/deceleration limits and damping.
 */
export function stepCarPhysics(
  car: CarPhysicsState,
  rawDt: number,
  phase: RacePhase,
  timeSec: number
): CarPhysicsState {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);

  // Before race starts: remain stationary at starting grid (distance = 0, speed = 0)
  if (phase === 'idle' || phase === 'countdown') {
    const idleHum = Math.sin(timeSec * 7.5 + car.lane * 1.4) * 0.008;
    const idleWheelCreep = Math.sin(timeSec * 2.0 + car.lane) * 0.02 * dt;
    return {
      ...car,
      currentSpeed: 0,
      targetSpeed: 0,
      typingMomentum: 0,
      timeSinceLastKey: 99,
      distance: 0,
      progress: 0,
      wheelAngle: car.wheelAngle + idleWheelCreep,
      chassisPitch: 0,
      suspensionY: idleHum,
    };
  }

  // If race finished, gently coast down
  if (phase === 'finished') {
    const decel = PHYSICS_CONSTANTS.DECEL_RATE * dt;
    const nextSpeed = Math.max(0, car.currentSpeed - decel);
    const nextWheel = car.wheelAngle + (nextSpeed / PHYSICS_CONSTANTS.WHEEL_RADIUS) * dt;
    return {
      ...car,
      currentSpeed: nextSpeed,
      targetSpeed: 0,
      wheelAngle: nextWheel,
      chassisPitch: car.chassisPitch * Math.exp(-5 * dt),
      suspensionY: Math.sin(timeSec * 6 + car.lane) * 0.006,
    };
  }

  // Active 'racing' phase
  let nextMomentum = car.typingMomentum;
  let nextTimeSinceLastKey = car.timeSinceLastKey + dt;
  let nextAiTimer = car.aiPhaseTimer + dt;
  const speedRange = PHYSICS_CONSTANTS.MAX_SPEED - PHYSICS_CONSTANTS.BASE_SPEED;
  let targetSpeed = PHYSICS_CONSTANTS.BASE_SPEED;

  if (!car.isHuman) {
    // AI opponent natural typing simulation:
    const wave1 = Math.sin(nextAiTimer * 1.3 + car.lane * 2.1);
    const wave2 = Math.cos(nextAiTimer * 0.55 + car.lane * 0.9);
    const rhythmFactor = Math.max(0.18, 0.72 + 0.22 * wave1 + 0.14 * wave2);

    const desiredMomentum = Math.min(
      PHYSICS_CONSTANTS.MAX_MOMENTUM,
      Math.max(2, ((car.aiTargetWpm * rhythmFactor) / 95) * PHYSICS_CONSTANTS.MAX_MOMENTUM)
    );

    const momentumDiff = desiredMomentum - nextMomentum;
    const adjustRate = momentumDiff > 0 ? 18.0 : 12.0;
    nextMomentum += Math.sign(momentumDiff) * Math.min(Math.abs(momentumDiff), adjustRate * dt);
    targetSpeed =
      PHYSICS_CONSTANTS.BASE_SPEED + (nextMomentum / PHYSICS_CONSTANTS.MAX_MOMENTUM) * speedRange;
  } else {
    // Human player:
    if (nextTimeSinceLastKey <= PHYSICS_CONSTANTS.ACTIVE_TYPING_WINDOW) {
      // Actively typing: slight natural decay, full targetSpeed from momentum
      nextMomentum = Math.max(0, nextMomentum - PHYSICS_CONSTANTS.MOMENTUM_DECAY_RATE * dt);
      targetSpeed =
        PHYSICS_CONSTANTS.BASE_SPEED + (nextMomentum / PHYSICS_CONSTANTS.MAX_MOMENTUM) * speedRange;
    } else {
      // Stopped typing: coast smoothly down toward BASE_SPEED
      targetSpeed = PHYSICS_CONSTANTS.BASE_SPEED;
    }
  }

  // Smoothly interpolate currentSpeed toward targetSpeed using acceleration/deceleration limits
  const speedDiff = targetSpeed - car.currentSpeed;
  let nextSpeed = car.currentSpeed;

  if (speedDiff > 0) {
    // Accelerating: bounded by ACCEL_RATE * dt and smooth proportional approach
    const maxStep = PHYSICS_CONSTANTS.ACCEL_RATE * dt;
    const smoothStep = speedDiff * (1 - Math.exp(-4.5 * dt));
    nextSpeed += Math.min(maxStep, Math.max(smoothStep, maxStep * 0.4));
    nextSpeed = Math.min(targetSpeed, nextSpeed);
  } else if (speedDiff < 0) {
    // Decelerating: bounded by DECEL_RATE * dt
    const maxStep = PHYSICS_CONSTANTS.DECEL_RATE * dt;
    const smoothStep = Math.abs(speedDiff) * (1 - Math.exp(-3.2 * dt));
    nextSpeed -= Math.min(maxStep, Math.max(smoothStep, maxStep * 0.35));
    nextSpeed = Math.max(PHYSICS_CONSTANTS.BASE_SPEED, Math.max(targetSpeed, nextSpeed));
  }

  if (car.isHuman && nextTimeSinceLastKey > PHYSICS_CONSTANTS.ACTIVE_TYPING_WINDOW) {
    nextMomentum = Math.max(
      0,
      ((nextSpeed - PHYSICS_CONSTANTS.BASE_SPEED) / speedRange) * PHYSICS_CONSTANTS.MAX_MOMENTUM
    );
  }

  // Integrate distance and normalized progress
  const nextDistance = car.distance + nextSpeed * dt;
  const nextProgress = Math.min(
    100,
    (nextDistance / PHYSICS_CONSTANTS.TRACK_TOTAL_DISTANCE) * 100
  );

  // Wheel rotation proportional to actual linear velocity
  const nextWheelAngle = car.wheelAngle + (nextSpeed / PHYSICS_CONSTANTS.WHEEL_RADIUS) * dt;

  // Subtle squat/pitch on acceleration and nose-dive on deceleration
  const accelSigned = (nextSpeed - car.currentSpeed) / Math.max(dt, 0.001);
  const targetPitch = Math.max(-0.035, Math.min(0.045, accelSigned * 0.0035));
  const nextPitch = car.chassisPitch + (targetPitch - car.chassisPitch) * (1 - Math.exp(-8 * dt));

  // Road micro-undulation proportional to speed
  const speedRatio = nextSpeed / PHYSICS_CONSTANTS.MAX_SPEED;
  const nextSuspensionY =
    Math.sin(nextDistance * 1.4 + car.lane) * 0.012 * speedRatio +
    Math.sin(timeSec * 10 + car.lane) * 0.004;

  return {
    ...car,
    currentSpeed: nextSpeed,
    targetSpeed,
    typingMomentum: nextMomentum,
    timeSinceLastKey: nextTimeSinceLastKey,
    distance: nextDistance,
    progress: nextProgress,
    wheelAngle: nextWheelAngle,
    chassisPitch: nextPitch,
    suspensionY: nextSuspensionY,
    aiPhaseTimer: nextAiTimer,
  };
}
