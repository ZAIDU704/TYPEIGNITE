import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHYSICS_CONSTANTS,
  createInitialCarPhysics,
  launchCarsAtBaseSpeed,
  applyTypingToCarPhysics,
  stepCarPhysics,
} from './carPhysics';

test('cars remain stationary at starting grid before race begins (idle and countdown)', () => {
  let car = createInitialCarPhysics('p1', 0, true, true);
  for (let i = 0; i < 20; i++) {
    car = stepCarPhysics(car, 0.05, 'idle', i * 0.05);
  }
  assert.equal(car.currentSpeed, 0);
  assert.equal(car.distance, 0);
  assert.equal(car.progress, 0);

  for (let i = 0; i < 20; i++) {
    car = stepCarPhysics(car, 0.05, 'countdown', i * 0.05);
  }
  assert.equal(car.currentSpeed, 0);
  assert.equal(car.distance, 0);
});

test('all four cars launch together at the exact same initial base speed when race starts', () => {
  const cars = [
    createInitialCarPhysics('p1', 0, true, true),
    createInitialCarPhysics('bot1', 1, false, false, 65),
    createInitialCarPhysics('bot2', 2, false, false, 58),
    createInitialCarPhysics('bot3', 3, false, false, 50),
  ];

  const launched = launchCarsAtBaseSpeed(cars);
  for (const car of launched) {
    assert.equal(car.currentSpeed, PHYSICS_CONSTANTS.BASE_SPEED);
    assert.equal(car.targetSpeed, PHYSICS_CONSTANTS.BASE_SPEED);
  }
});

test('correct typing progressively accelerates car without instant position jumps', () => {
  let car = launchCarsAtBaseSpeed([createInitialCarPhysics('p1', 0, true, true)])[0];
  const initialDistance = car.distance;

  // Player types 5 correct characters
  car = applyTypingToCarPhysics(car, 5, 0);
  // Distance must not jump on the keystroke event itself
  assert.equal(car.distance, initialDistance);
  assert.ok(car.targetSpeed > PHYSICS_CONSTANTS.BASE_SPEED, 'Target speed increases on correct typing');
  // Current speed has not jumped instantaneously to targetSpeed
  assert.equal(car.currentSpeed, PHYSICS_CONSTANTS.BASE_SPEED);

  // Step physics forward over several frames and verify progressive acceleration
  const speedAfter1Frame = stepCarPhysics(car, 0.016, 'racing', 0.1).currentSpeed;
  assert.ok(speedAfter1Frame > PHYSICS_CONSTANTS.BASE_SPEED);
  assert.ok(speedAfter1Frame < car.targetSpeed, 'Accelerates smoothly, not in 1 frame');
});

test('faster consistent typing produces higher speed than slow typing', () => {
  let slowCar = launchCarsAtBaseSpeed([createInitialCarPhysics('slow', 0, true, true)])[0];
  let fastCar = launchCarsAtBaseSpeed([createInitialCarPhysics('fast', 1, true, true)])[0];

  // Simulate 3 seconds (60 steps of 0.05s)
  for (let step = 0; step < 60; step++) {
    // Slow typer types 1 char every 10 steps (~2 chars/sec = 24 WPM)
    if (step % 10 === 0) {
      slowCar = applyTypingToCarPhysics(slowCar, 1, 0);
    }
    // Fast typer types 1 char every 2 steps (~10 chars/sec = 120 WPM)
    if (step % 2 === 0) {
      fastCar = applyTypingToCarPhysics(fastCar, 1, 0);
    }
    slowCar = stepCarPhysics(slowCar, 0.05, 'racing', step * 0.05);
    fastCar = stepCarPhysics(fastCar, 0.05, 'racing', step * 0.05);
  }

  assert.ok(fastCar.currentSpeed > slowCar.currentSpeed, 'Fast typing yields higher speed');
  assert.ok(fastCar.distance > slowCar.distance, 'Fast typing covers more distance');
});

test('stopping typing gradually decelerates car toward base speed instead of stopping abruptly', () => {
  let car = launchCarsAtBaseSpeed([createInitialCarPhysics('p1', 0, true, true)])[0];
  // Build up high speed by typing consistently for 1 second (20 steps of 0.05s)
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
      car = applyTypingToCarPhysics(car, 2, 0);
    }
    car = stepCarPhysics(car, 0.05, 'racing', i * 0.05);
  }
  const peakSpeed = car.currentSpeed;
  assert.ok(peakSpeed > PHYSICS_CONSTANTS.BASE_SPEED + 4, 'Reached elevated speed during typing');

  // Advance past the active typing grace window and verify smooth deceleration over 3 seconds
  for (let i = 0; i < 10; i++) {
    car = stepCarPhysics(car, 0.05, 'racing', 1 + i * 0.05);
  }
  let prevSpeed = car.currentSpeed;
  for (let i = 0; i < 50; i++) {
    car = stepCarPhysics(car, 0.05, 'racing', 1.5 + i * 0.05);
    assert.ok(car.currentSpeed <= prevSpeed + 0.001, 'Speed should smoothly decrease when not typing');
    assert.ok(car.currentSpeed >= PHYSICS_CONSTANTS.BASE_SPEED, 'Never drops below base speed during race');
    prevSpeed = car.currentSpeed;
  }
  assert.ok(car.currentSpeed < peakSpeed - 3, 'Decelerated significantly from peak speed toward base speed');
});

test('incorrect characters do not provide positive acceleration', () => {
  let car = launchCarsAtBaseSpeed([createInitialCarPhysics('p1', 0, true, true)])[0];
  car = applyTypingToCarPhysics(car, 0, 5);
  assert.equal(car.typingMomentum, 0);
  assert.equal(car.targetSpeed, PHYSICS_CONSTANTS.BASE_SPEED);

  // If car already has momentum, errors reduce momentum slightly rather than boosting it
  car = applyTypingToCarPhysics(car, 6, 0);
  const momentumBeforeError = car.typingMomentum;
  car = applyTypingToCarPhysics(car, 0, 2);
  assert.ok(car.typingMomentum < momentumBeforeError, 'Errors reduce momentum slightly');
});
