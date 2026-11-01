import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { AIDifficulty, Racer } from '../types/game';
import {
  RacePhase,
  CarPhysicsState,
  PHYSICS_CONSTANTS,
  getAiBotTargetWpms,
  createInitialCarPhysics,
  launchCarsAtBaseSpeed,
  applyTypingToCarPhysics,
  stepCarPhysics,
} from '../utils/carPhysics';

export interface TypingImpulseEvent {
  correctChars: number;
  incorrectChars: number;
  seq: number;
}

interface Track3DProps {
  racers: Racer[];
  playerLane: number;
  phase?: RacePhase;
  countdown?: number | null;
  typingImpulse?: TypingImpulseEvent;
  aiDifficulty?: AIDifficulty;
  beginnerTargetWpm?: number;
  isReplay?: boolean;
  fullViewport?: boolean;
  onPhysicsUpdate?: (states: CarPhysicsState[]) => void;
}

// 4 distinct racing lanes along Z axis
const LANE_Z = [-5.1, -1.7, 1.7, 5.1];
const VISUAL_TRACK_LENGTH = 900; // Visual track length in 3D world units
const DISTANCE_TO_WORLD_SCALE = 0.35; // Maps physics distance to 3D world X units

// Pre-allocated module-scope math helpers (Zero GC in render loop)
const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();

/**
 * Generates a tileable procedural asphalt texture with subtle aggregate grain.
 */
function createAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1e2430';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle aggregate speckles
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 24 + Math.floor(Math.random() * 26);
    ctx.fillStyle = `rgb(${v}, ${v + 4}, ${v + 12})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Faint tire wear tracks along the lane centers
  ctx.fillStyle = 'rgba(12, 16, 23, 0.28)';
  ctx.fillRect(0, 20, 256, 40);
  ctx.fillRect(0, 84, 256, 40);
  ctx.fillRect(0, 148, 256, 40);
  ctx.fillRect(0, 210, 256, 40);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(90, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a soft radial contact shadow texture for grounding cars on the asphalt.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 32, 6, 64, 32, 56);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.38)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a checkered start/finish line pattern.
 */
function createCheckeredTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const cols = 4;
  const rows = 16;
  const cw = canvas.width / cols;
  const rh = canvas.height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f8fafc' : '#0f172a';
      ctx.fillRect(c * cw, r * rh, cw, rh);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const Track3D: React.FC<Track3DProps> = ({
  racers,
  playerLane,
  phase = 'racing',
  countdown = null,
  typingImpulse,
  aiDifficulty = 'beginner',
  beginnerTargetWpm = 25,
  isReplay = false,
  fullViewport = false,
  onPhysicsUpdate,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const racersRef = useRef<Racer[]>(racers);
  racersRef.current = racers;

  const phaseRef = useRef<RacePhase>(phase);
  const prevPhaseRef = useRef<RacePhase>(phase);
  phaseRef.current = phase;

  const isReplayRef = useRef<boolean>(isReplay);
  isReplayRef.current = isReplay;

  const onPhysicsUpdateRef = useRef(onPhysicsUpdate);
  onPhysicsUpdateRef.current = onPhysicsUpdate;

  const initialBotWpms = getAiBotTargetWpms(aiDifficulty, beginnerTargetWpm);

  // Store car physics states inside ref so the 60fps loop runs smoothly
  const physicsStatesRef = useRef<CarPhysicsState[]>([
    createInitialCarPhysics('player_self', 0, true, true, 65),
    createInitialCarPhysics('bot_turbo', 1, false, false, initialBotWpms[0]),
    createInitialCarPhysics('bot_flash', 2, false, false, initialBotWpms[1]),
    createInitialCarPhysics('bot_apex', 3, false, false, initialBotWpms[2]),
  ]);

  const lastProcessedSeqRef = useRef<number>(0);

  // Sync AI target WPM or reset when phase or difficulty/targetWpm changes
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    const botWpms = getAiBotTargetWpms(aiDifficulty, beginnerTargetWpm);

    if (phase === 'idle' || phase === 'countdown') {
      // Reset all 4 cars to the starting grid
      physicsStatesRef.current = racersRef.current.map((r, idx) =>
        createInitialCarPhysics(
          r.id,
          r.lane ?? idx,
          r.isSelf,
          r.isHuman,
          r.isSelf ? 65 : botWpms[idx - 1] || botWpms[1]
        )
      );
      lastProcessedSeqRef.current = 0;
    } else if (phase === 'racing' && prev !== 'racing') {
      // Launch all 4 cars together at the exact same initial base speed!
      const initialized =
        physicsStatesRef.current.length === 4
          ? physicsStatesRef.current.map((c, idx) => ({
              ...c,
              aiTargetWpm: c.isSelf ? 65 : botWpms[idx - 1] || botWpms[1],
            }))
          : racersRef.current.map((r, idx) =>
              createInitialCarPhysics(
                r.id,
                r.lane ?? idx,
                r.isSelf,
                r.isHuman,
                r.isSelf ? 65 : botWpms[idx - 1] || botWpms[1]
              )
            );
      physicsStatesRef.current = launchCarsAtBaseSpeed(initialized);
    } else if (phase === 'racing') {
      // If difficulty or beginnerTargetWpm is adjusted live, update AI target WPMs seamlessly
      physicsStatesRef.current = physicsStatesRef.current.map((c, idx) =>
        c.isSelf ? c : { ...c, aiTargetWpm: botWpms[idx - 1] || botWpms[1] }
      );
    }
  }, [phase, aiDifficulty, beginnerTargetWpm]);

  // Apply player typing impulses immediately to the player's car physics
  useEffect(() => {
    if (!typingImpulse || typingImpulse.seq === lastProcessedSeqRef.current) return;
    lastProcessedSeqRef.current = typingImpulse.seq;

    if (phaseRef.current !== 'racing') return;

    physicsStatesRef.current = physicsStatesRef.current.map((car) => {
      if (car.isSelf) {
        return applyTypingToCarPhysics(
          car,
          typingImpulse.correctChars,
          typingImpulse.incorrectChars
        );
      }
      return car;
    });
  }, [typingImpulse]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const carPaintPalettes = [
      { main: '#e11d48', dark: '#9f1239', stripe: '#fde047' }, // Lane 1 (Player): Crimson GT + Racing Yellow stripe
      { main: '#2563eb', dark: '#1e40af', stripe: '#38bdf8' }, // Lane 2: Cobalt Blue GT + Cyan stripe
      { main: '#059669', dark: '#065f46', stripe: '#a7f3d0' }, // Lane 3: British Racing Emerald + Mint stripe
      { main: '#ea580c', dark: '#9a3412', stripe: '#fef08a' }, // Lane 4: McLaren Papaya Orange + Gold stripe
    ];

    /**
     * 3D-Perspective Canvas 2D Fallback Renderer:
     * Used automatically if the browser has disabled/blocked WebGL or loses context mid-session.
     * Runs the exact same delta-time CarPhysicsState simulation and 3D camera projection.
     */
    const startCanvas2DFallback = (): (() => void) => {
      const canvas2d = document.createElement('canvas');
      canvas2d.className = 'w-full h-full block';
      container.replaceChildren(canvas2d);
      const ctx = canvas2d.getContext('2d');

      let width = container.clientWidth || 1024;
      let height = container.clientHeight || 540;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const syncSize = () => {
        if (!container) return;
        width = container.clientWidth || window.innerWidth || 1024;
        height = container.clientHeight || window.innerHeight || 540;
        canvas2d.width = Math.max(1, Math.floor(width * dpr));
        canvas2d.height = Math.max(1, Math.floor(height * dpr));
      };
      syncSize();

      let camPosX = -2.4;
      let camPosY = 5.4;
      let camPosZ = 13.8;
      let lookAtX = 1.8;
      let lookAtY = 0.85;
      let lookAtZ = -0.4;

      // 3D world -> 2D canvas projection using true pinhole camera basis vectors
      const projectPoint = (wx: number, wy: number, wz: number) => {
        const fx = lookAtX - camPosX;
        const fy = lookAtY - camPosY;
        const fz = lookAtZ - camPosZ;
        const flen = Math.hypot(fx, fy, fz) || 1;
        const fwdX = fx / flen;
        const fwdY = fy / flen;
        const fwdZ = fz / flen;

        const rlen = Math.hypot(-fwdZ, fwdX) || 1;
        const rightX = -fwdZ / rlen;
        const rightY = 0;
        const rightZ = fwdX / rlen;

        const upX = rightY * fwdZ - rightZ * fwdY;
        const upY = rightZ * fwdX - rightX * fwdZ;
        const upZ = rightX * fwdY - rightY * fwdX;

        const dx = wx - camPosX;
        const dy = wy - camPosY;
        const dz = wz - camPosZ;

        const cz = dx * fwdX + dy * fwdY + dz * fwdZ;
        if (cz <= 0.2) {
          return { x: -9999, y: -9999, scale: 0, visible: false };
        }
        const cx = dx * rightX + dy * rightY + dz * rightZ;
        const cy = dx * upX + dy * upY + dz * upZ;

        const fovRad = (42 * Math.PI) / 180;
        const focal = (height * 0.5) / Math.tan(fovRad * 0.5);
        const sx = width * 0.5 + (cx / cz) * focal;
        const sy = height * 0.5 - (cy / cz) * focal;
        return { x: sx, y: sy, scale: focal / cz, visible: true };
      };

      const drawPolygon3D = (
        pts: Array<[number, number, number]>,
        fill: string | CanvasGradient,
        stroke?: string,
        lineWidth = 1
      ) => {
        if (!ctx) return;
        const projected = pts.map(([x, y, z]) => projectPoint(x, y, z));
        if (projected.some((p) => !p.visible)) return;
        ctx.beginPath();
        ctx.moveTo(projected[0].x, projected[0].y);
        for (let i = 1; i < projected.length; i++) {
          ctx.lineTo(projected[i].x, projected[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      let animId = 0;
      let lastTime = performance.now();
      let elapsedTotal = 0;
      let lastReactSyncTime = 0;
      let disposed = false;
      const replayPositions = [0, 0, 0, 0];
      const replayWheels = [0, 0, 0, 0];

      const renderFallbackFrame = () => {
        if (disposed) return;
        const now = performance.now();
        const rawDt = Math.min((now - lastTime) / 1000, 0.5);
        const dt = rawDt;
        lastTime = now;

        const currentPhase = phaseRef.current;
        const currentRacers = racersRef.current;
        let playerWorldX = 0;

        if (isReplayRef.current) {
          elapsedTotal += dt;
          for (let idx = 0; idx < 4; idx++) {
            const racer = currentRacers[idx];
            if (!racer) continue;
            const targetWorldX =
              (racer.progress / 100) *
              PHYSICS_CONSTANTS.TRACK_TOTAL_DISTANCE *
              DISTANCE_TO_WORLD_SCALE;
            replayPositions[idx] = THREE.MathUtils.damp(
              replayPositions[idx],
              targetWorldX,
              6.0,
              dt
            );
            const visualSpeed = Math.max(0, (racer.wpm / 60) * 18);
            replayWheels[idx] += (visualSpeed / PHYSICS_CONSTANTS.WHEEL_RADIUS) * dt;
            if (racer.isSelf || idx === playerLane) {
              playerWorldX = replayPositions[idx];
            }
          }
        } else {
          let remainingDt = rawDt;
          let nextStates = physicsStatesRef.current;
          while (remainingDt > 0.0001) {
            const stepDt = Math.min(remainingDt, 0.05);
            elapsedTotal += stepDt;
            nextStates = nextStates.map((state) =>
              stepCarPhysics(state, stepDt, currentPhase, elapsedTotal)
            );
            remainingDt -= stepDt;
          }
          physicsStatesRef.current = nextStates;

          nextStates.forEach((st, idx) => {
            const worldX = st.distance * DISTANCE_TO_WORLD_SCALE;
            if (st.isSelf || idx === playerLane) {
              playerWorldX = worldX;
            }
          });

          if (onPhysicsUpdateRef.current && now - lastReactSyncTime > 100) {
            lastReactSyncTime = now;
            onPhysicsUpdateRef.current(nextStates);
          }
        }

        // Update camera tracking smoothly
        const aspect = width / Math.max(1, height);
        const isPortrait = aspect < 1;
        const portraitExtraZ = isPortrait ? (1 - aspect) * 15.5 : 0;
        const portraitExtraY = isPortrait ? (1 - aspect) * 3.2 : 0;

        let targetCamX = -2.4;
        let targetCamY = 5.4 + portraitExtraY;
        let targetCamZ = 13.8 + portraitExtraZ;
        let targetLookX = isPortrait ? 0.3 : 1.8;
        let targetLookY = 0.85;
        let targetLookZ = -0.4;

        if (currentPhase === 'idle') {
          targetCamX = -2.4 + Math.sin(elapsedTotal * 0.45) * 0.35;
          targetCamY = 5.4 + portraitExtraY + Math.cos(elapsedTotal * 0.35) * 0.1;
        } else {
          targetCamX = playerWorldX - 2.0;
          targetCamY = 4.95 + portraitExtraY;
          targetCamZ = 13.3 + portraitExtraZ;
          targetLookX = playerWorldX + (isPortrait ? 1.2 : 2.5);
          targetLookY = 0.85;
          targetLookZ = -0.25;
        }

        camPosX = THREE.MathUtils.damp(camPosX, targetCamX, 4.2, dt);
        camPosY = THREE.MathUtils.damp(camPosY, targetCamY, 4.2, dt);
        camPosZ = THREE.MathUtils.damp(camPosZ, targetCamZ, 4.2, dt);
        lookAtX = THREE.MathUtils.damp(lookAtX, targetLookX, 4.2, dt);
        lookAtY = THREE.MathUtils.damp(lookAtY, targetLookY, 4.2, dt);
        lookAtZ = THREE.MathUtils.damp(lookAtZ, targetLookZ, 4.2, dt);

        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);

          // 1. Sky & Dusk Horizon Gradient
          const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.58);
          skyGrad.addColorStop(0, '#070b14');
          skyGrad.addColorStop(0.55, '#0f172a');
          skyGrad.addColorStop(1, '#1e293b');
          ctx.fillStyle = skyGrad;
          ctx.fillRect(0, 0, width, height);

          // 2. Distant Mountains Silhouette
          ctx.fillStyle = '#131c31';
          ctx.beginPath();
          ctx.moveTo(0, height * 0.48);
          const mountainPeaks = [0.0, 0.12, 0.25, 0.38, 0.52, 0.67, 0.82, 0.95, 1.0];
          const mountainHeights = [0.34, 0.22, 0.31, 0.19, 0.29, 0.21, 0.32, 0.24, 0.33];
          for (let i = 0; i < mountainPeaks.length; i++) {
            ctx.lineTo(width * mountainPeaks[i], height * mountainHeights[i]);
          }
          ctx.lineTo(width, height * 0.55);
          ctx.lineTo(0, height * 0.55);
          ctx.closePath();
          ctx.fill();

          // 3. Ground Turf
          const turfGrad = ctx.createLinearGradient(0, height * 0.35, 0, height);
          turfGrad.addColorStop(0, '#0f172a');
          turfGrad.addColorStop(0.4, '#111c24');
          turfGrad.addColorStop(1, '#0b131a');
          ctx.fillStyle = turfGrad;
          ctx.fillRect(0, height * 0.35, width, height * 0.65);

          // Visible X window around camera
          const minVisX = Math.max(-25, camPosX - 18);
          const maxVisX = camPosX + 55;

          // 4. Asphalt 4-Lane Road Surface
          drawPolygon3D(
            [
              [minVisX, 0, -7.2],
              [maxVisX, 0, -7.2],
              [maxVisX, 0, 7.2],
              [minVisX, 0, 7.2],
            ],
            '#1e2430',
            '#334155',
            1
          );

          // 5. FIA Red & White Kerbs along North (-7.35) and South (+7.35) Track Edges
          const startKerbIdx = Math.floor(minVisX / 1.8);
          const endKerbIdx = Math.ceil(maxVisX / 1.8);
          for (let k = startKerbIdx; k < endKerbIdx; k++) {
            const kx0 = k * 1.8;
            const kx1 = kx0 + 1.8;
            const kerbColor = Math.abs(k) % 2 === 0 ? '#dc2626' : '#f8fafc';
            drawPolygon3D(
              [
                [kx0, 0.04, -7.65],
                [kx1, 0.04, -7.65],
                [kx1, 0.04, -7.15],
                [kx0, 0.04, -7.15],
              ],
              kerbColor
            );
            drawPolygon3D(
              [
                [kx0, 0.04, 7.15],
                [kx1, 0.04, 7.15],
                [kx1, 0.04, 7.65],
                [kx0, 0.04, 7.65],
              ],
              kerbColor
            );
          }

          // 6. Dashed Lane Dividers between the 4 Lanes (Z = -3.4, 0, +3.4)
          const laneDividersZ = [-3.4, 0, 3.4];
          const startDashIdx = Math.floor(minVisX / 4.0);
          const endDashIdx = Math.ceil(maxVisX / 4.0);
          for (const dz of laneDividersZ) {
            for (let d = startDashIdx; d < endDashIdx; d++) {
              const dx0 = d * 4.0;
              const dx1 = dx0 + 2.1;
              drawPolygon3D(
                [
                  [dx0, 0.02, dz - 0.08],
                  [dx1, 0.02, dz - 0.08],
                  [dx1, 0.02, dz + 0.08],
                  [dx0, 0.02, dz + 0.08],
                ],
                'rgba(226, 232, 240, 0.7)'
              );
            }
          }

          // 7. Checkered Start Grid Line (at X = 2.4) & Finish Line
          const finishWorldX =
            PHYSICS_CONSTANTS.TRACK_TOTAL_DISTANCE * DISTANCE_TO_WORLD_SCALE;
          for (const lineX of [2.4, finishWorldX]) {
            if (lineX >= minVisX - 4 && lineX <= maxVisX + 4) {
              for (let r = 0; r < 14; r++) {
                const z0 = -7.0 + r * 1.0;
                const z1 = z0 + 1.0;
                for (let c = 0; c < 2; c++) {
                  const x0 = lineX + c * 0.55;
                  const x1 = x0 + 0.55;
                  const sqColor = (r + c) % 2 === 0 ? '#f8fafc' : '#0f172a';
                  drawPolygon3D(
                    [
                      [x0, 0.03, z0],
                      [x1, 0.03, z0],
                      [x1, 0.03, z1],
                      [x0, 0.03, z1],
                    ],
                    sqColor
                  );
                }
              }
            }
          }

          // 8. Rear Guardrail & Pine Trees
          drawPolygon3D(
            [
              [minVisX, 0.65, -8.3],
              [maxVisX, 0.65, -8.3],
              [maxVisX, 0.25, -8.3],
              [minVisX, 0.25, -8.3],
            ],
            '#334155',
            '#475569',
            1
          );

          const startTreeIdx = Math.floor(minVisX / 9);
          const endTreeIdx = Math.ceil(maxVisX / 9);
          for (let t = startTreeIdx; t <= endTreeIdx; t++) {
            const tx = t * 9;
            const tz = -10.5 - (Math.abs(t * 7) % 4);
            const basePt = projectPoint(tx, 0, tz);
            const topPt = projectPoint(tx, 4.2, tz);
            if (basePt.visible && topPt.visible) {
              const treeW = Math.max(8, 1.8 * basePt.scale);
              ctx.fillStyle = '#064e3b';
              ctx.beginPath();
              ctx.moveTo(topPt.x, topPt.y);
              ctx.lineTo(basePt.x - treeW, basePt.y);
              ctx.lineTo(basePt.x + treeW, basePt.y);
              ctx.closePath();
              ctx.fill();
            }
          }

          // 9. Starting Gantry Truss & Race Lights at X = 2.8
          if (2.8 >= minVisX - 5 && 2.8 <= maxVisX + 5) {
            const pNorthBot = projectPoint(2.8, 0, -7.8);
            const pNorthTop = projectPoint(2.8, 5.4, -7.8);
            const pSouthBot = projectPoint(2.8, 0, 7.8);
            const pSouthTop = projectPoint(2.8, 5.4, 7.8);
            if (pNorthBot.visible && pNorthTop.visible && pSouthBot.visible && pSouthTop.visible) {
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = Math.max(4, 0.25 * pNorthBot.scale);
              ctx.beginPath();
              ctx.moveTo(pNorthBot.x, pNorthBot.y);
              ctx.lineTo(pNorthTop.x, pNorthTop.y);
              ctx.moveTo(pSouthBot.x, pSouthBot.y);
              ctx.lineTo(pSouthTop.x, pSouthTop.y);
              ctx.stroke();

              // Overhead Banner
              drawPolygon3D(
                [
                  [2.8, 5.5, -7.8],
                  [2.8, 5.5, 7.8],
                  [2.8, 4.5, 7.8],
                  [2.8, 4.5, -7.8],
                ],
                '#0f172a',
                '#f59e0b',
                1.5
              );

              // 5 Gantry Signal Lights
              const lightColor = currentPhase === 'racing' ? '#10b981' : '#ef4444';
              for (let li = -2; li <= 2; li++) {
                const lp = projectPoint(2.9, 4.95, li * 1.3);
                if (lp.visible) {
                  ctx.fillStyle = lightColor;
                  ctx.beginPath();
                  ctx.arc(lp.x, lp.y, Math.max(3, 0.22 * lp.scale), 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }

          // 10. Draw all 4 Realistic GT Racing Cars (back-to-front by lane index 0 -> 3)
          const currentStates = physicsStatesRef.current;
          for (let i = 0; i < 4; i++) {
            const r = currentRacers[i] || {
              id: `racer_${i}`,
              lane: i,
              name: `Racer ${i + 1}`,
              isSelf: i === 0,
            };
            const laneIdx = r.lane ?? i;
            const wz = LANE_Z[laneIdx] ?? LANE_Z[i];
            const st = currentStates[i];
            const wx = isReplayRef.current
              ? replayPositions[i]
              : (st ? st.distance : 0) * DISTANCE_TO_WORLD_SCALE;
            const suspY = st ? st.suspensionY : 0;
            const wheelAngle = isReplayRef.current
              ? replayWheels[i]
              : st
              ? st.wheelAngle
              : 0;
            const boostRatio =
              !isReplayRef.current && st
                ? Math.max(
                    0,
                    (st.currentSpeed - PHYSICS_CONSTANTS.BASE_SPEED) /
                      (PHYSICS_CONSTANTS.MAX_SPEED - PHYSICS_CONSTANTS.BASE_SPEED)
                  )
                : 0;

            const pal = carPaintPalettes[i];
            const centerPt = projectPoint(wx, 0.45 + suspY, wz);
            if (!centerPt.visible) continue;

            // Ground Contact Shadow
            drawPolygon3D(
              [
                [wx - 2.35, 0.02, wz - 0.95],
                [wx + 2.35, 0.02, wz - 0.95],
                [wx + 2.35, 0.02, wz + 0.95],
                [wx - 2.35, 0.02, wz + 0.95],
              ],
              'rgba(2, 6, 23, 0.72)'
            );

            // Nitro Flame when accelerating
            if (currentPhase === 'racing' && boostRatio > 0.08) {
              const flameLen = 0.9 + boostRatio * 1.4 + Math.sin(elapsedTotal * 35 + i) * 0.25;
              drawPolygon3D(
                [
                  [wx - 2.15, 0.35 + suspY, wz - 0.25],
                  [wx - 2.15 - flameLen, 0.38 + suspY, wz],
                  [wx - 2.15, 0.35 + suspY, wz + 0.25],
                ],
                'rgba(56, 189, 248, 0.85)'
              );
            }

            // Rear Carbon Diffuser & Front Splitter
            drawPolygon3D(
              [
                [wx - 2.22, 0.18 + suspY, wz + 0.88],
                [wx + 2.32, 0.16 + suspY, wz + 0.88],
                [wx + 2.32, 0.28 + suspY, wz + 0.88],
                [wx - 2.22, 0.32 + suspY, wz + 0.88],
              ],
              '#0f172a'
            );

            // Top/Far-Side Roof & Hood Surface (3D depth)
            drawPolygon3D(
              [
                [wx - 2.05, 0.68 + suspY, wz - 0.78],
                [wx + 1.15, 0.64 + suspY, wz - 0.78],
                [wx + 2.22, 0.38 + suspY, wz - 0.72],
                [wx + 2.22, 0.38 + suspY, wz + 0.78],
                [wx + 1.15, 0.64 + suspY, wz + 0.78],
                [wx - 2.05, 0.68 + suspY, wz + 0.78],
              ],
              pal.main,
              pal.stripe,
              1.2
            );

            // Center Racing Stripe along Hood & Roof
            drawPolygon3D(
              [
                [wx - 2.0, 0.7 + suspY, wz - 0.16],
                [wx + 2.18, 0.4 + suspY, wz - 0.16],
                [wx + 2.18, 0.4 + suspY, wz + 0.16],
                [wx - 2.0, 0.7 + suspY, wz + 0.16],
              ],
              pal.stripe
            );

            // Aerodynamic Cabin Greenhouse (Dark Tinted Glass Canopy)
            drawPolygon3D(
              [
                [wx - 1.35, 0.68 + suspY, wz - 0.64],
                [wx - 0.65, 1.12 + suspY, wz - 0.54],
                [wx + 0.38, 1.12 + suspY, wz - 0.54],
                [wx + 1.05, 0.65 + suspY, wz - 0.64],
                [wx + 1.05, 0.65 + suspY, wz + 0.64],
                [wx + 0.38, 1.12 + suspY, wz + 0.54],
                [wx - 0.65, 1.12 + suspY, wz + 0.54],
                [wx - 1.35, 0.68 + suspY, wz + 0.64],
              ],
              '#0f172a',
              '#38bdf8',
              1
            );

            // Near-Side Sculpted GT Flank Profile
            drawPolygon3D(
              [
                [wx - 2.15, 0.25 + suspY, wz + 0.84],
                [wx + 2.24, 0.22 + suspY, wz + 0.84],
                [wx + 2.12, 0.48 + suspY, wz + 0.84],
                [wx + 1.15, 0.68 + suspY, wz + 0.82],
                [wx - 1.98, 0.74 + suspY, wz + 0.82],
              ],
              pal.dark,
              pal.main,
              1
            );

            // Side Air Intake Vent
            drawPolygon3D(
              [
                [wx - 0.55, 0.34 + suspY, wz + 0.86],
                [wx + 0.25, 0.34 + suspY, wz + 0.86],
                [wx + 0.1, 0.58 + suspY, wz + 0.85],
                [wx - 0.45, 0.58 + suspY, wz + 0.85],
              ],
              '#090d16'
            );

            // Elevated Carbon-Fiber GT Rear Wing & Endplates
            drawPolygon3D(
              [
                [wx - 2.12, 0.72 + suspY, wz + 0.65],
                [wx - 1.88, 0.72 + suspY, wz + 0.65],
                [wx - 1.98, 1.16 + suspY, wz + 0.65],
                [wx - 2.18, 1.16 + suspY, wz + 0.65],
              ],
              '#1e293b'
            );
            drawPolygon3D(
              [
                [wx - 2.28, 1.16 + suspY, wz - 0.82],
                [wx - 1.82, 1.12 + suspY, wz - 0.82],
                [wx - 1.82, 1.12 + suspY, wz + 0.82],
                [wx - 2.28, 1.16 + suspY, wz + 0.82],
              ],
              '#0f172a',
              pal.stripe,
              1
            );

            // Headlight LED & Taillight LED Strip
            drawPolygon3D(
              [
                [wx + 2.12, 0.36 + suspY, wz + 0.45],
                [wx + 2.26, 0.32 + suspY, wz + 0.78],
                [wx + 2.02, 0.46 + suspY, wz + 0.78],
              ],
              '#e0f2fe'
            );
            drawPolygon3D(
              [
                [wx - 2.16, 0.48 + suspY, wz - 0.75],
                [wx - 2.16, 0.48 + suspY, wz + 0.75],
                [wx - 2.16, 0.64 + suspY, wz + 0.75],
                [wx - 2.16, 0.64 + suspY, wz - 0.75],
              ],
              '#ef4444'
            );

            // Front & Rear Near-Side Rotating Wheels with Multi-Spoke Rims
            for (const wheelOffsetX of [-1.34, 1.38]) {
              const wp = projectPoint(wx + wheelOffsetX, 0.36, wz + 0.88);
              if (wp.visible) {
                const rOuter = Math.max(5, 0.37 * wp.scale);
                const rRim = rOuter * 0.66;
                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, rOuter, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, rRim, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = Math.max(1.2, rRim * 0.18);
                for (let s = 0; s < 5; s++) {
                  const ang = wheelAngle + (s * Math.PI * 2) / 5;
                  ctx.beginPath();
                  ctx.moveTo(wp.x, wp.y);
                  ctx.lineTo(
                    wp.x + Math.cos(ang) * rRim,
                    wp.y + Math.sin(ang) * rRim
                  );
                  ctx.stroke();
                }

                ctx.fillStyle = pal.main;
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, Math.max(1.8, rRim * 0.25), 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // Floating Username Badge above Car
            const badgePt = projectPoint(wx - 0.1, 1.85 + suspY, wz);
            if (badgePt.visible) {
              const label = r.isSelf ? `${r.name} (YOU)` : r.name;
              ctx.font = 'bold 11px sans-serif';
              const textW = ctx.measureText(label).width;
              const bw = textW + 16;
              const bh = 22;
              const bx = badgePt.x - bw * 0.5;
              const by = badgePt.y - bh * 0.5;

              ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
              ctx.strokeStyle = pal.main;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.roundRect(bx, by, bw, bh, 6);
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = '#f8fafc';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, badgePt.x, badgePt.y + 0.5);
            }
          }

          ctx.restore();
        }

        animId = requestAnimationFrame(renderFallbackFrame);
      };

      renderFallbackFrame();

      const ro = new ResizeObserver(syncSize);
      ro.observe(container);
      window.addEventListener('resize', syncSize);

      return () => {
        disposed = true;
        cancelAnimationFrame(animId);
        ro.disconnect();
        window.removeEventListener('resize', syncSize);
      };
    };

    // 1. Acquire WebGL context on a single canvas without EVER calling loseContext()
    const glCanvas = document.createElement('canvas');
    let glContext: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      glContext = (glCanvas.getContext('webgl2', {
        antialias: true,
        powerPreference: 'high-performance',
        alpha: false,
      }) ||
        glCanvas.getContext('webgl', {
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        })) as WebGLRenderingContext | WebGL2RenderingContext | null;
    } catch {
      glContext = null;
    }

    if (!glContext) {
      return startCanvas2DFallback();
    }

    const isSoftwareGl = (() => {
      try {
        const ext = glContext.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glContext.RENDERER;
        const gpu = String(glContext.getParameter(param));
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Scene, Camera & Renderer (wrapped in try/catch for total safety)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: glCanvas,
        context: glContext as WebGLRenderingContext,
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      return startCanvas2DFallback();
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1526);
    scene.fog = new THREE.FogExp2(0x0d1526, 0.0085);

    const width = container.clientWidth || 1024;
    const height = container.clientHeight || 540;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 260);
    camera.position.set(-2.4, 5.4, 13.8);
    camera.lookAt(1.8, 0.85, -0.4);

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    // 3. Studio PBR Environment Map
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      // fallback
    }

    // 4. Balanced Warm/Cool Studio & Outdoor Speedway Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xbae6fd, 0x1e293b, 1.35);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(22, 36, 26);
    sunLight.castShadow = !isSoftwareGl;
    if (sunLight.shadow) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 1;
      sunLight.shadow.camera.far = 110;
      sunLight.shadow.camera.left = -28;
      sunLight.shadow.camera.right = 28;
      sunLight.shadow.camera.top = 20;
      sunLight.shadow.camera.bottom = -20;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);
    scene.add(sunLight.target);

    // 5. Build Speedway Environment
    const trackGroup = new THREE.Group();
    scene.add(trackGroup);

    // Extended outdoor terrain ground plane (turf/coastal dusk ground)
    const groundGeo = new THREE.PlaneGeometry(VISUAL_TRACK_LENGTH + 200, 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f2922,
      roughness: 0.92,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(VISUAL_TRACK_LENGTH / 2 - 30, -0.04, 0);
    trackGroup.add(groundMesh);

    // Asphalt Runway with procedural grain texture
    const asphaltTex = createAsphaltTexture(maxAnisotropy);
    const roadGeo = new THREE.PlaneGeometry(VISUAL_TRACK_LENGTH + 80, 15.6);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: asphaltTex,
      roughness: 0.72,
      metalness: 0.12,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(VISUAL_TRACK_LENGTH / 2 - 20, 0, 0);
    roadMesh.receiveShadow = !isSoftwareGl;
    trackGroup.add(roadMesh);

    // Continuous solid white edge lines
    const edgeLineGeo = new THREE.PlaneGeometry(VISUAL_TRACK_LENGTH + 80, 0.18);
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const leftEdgeLine = new THREE.Mesh(edgeLineGeo, whiteLineMat);
    leftEdgeLine.rotation.x = -Math.PI / 2;
    leftEdgeLine.position.set(VISUAL_TRACK_LENGTH / 2 - 20, 0.015, -6.9);
    trackGroup.add(leftEdgeLine);

    const rightEdgeLine = new THREE.Mesh(edgeLineGeo, whiteLineMat);
    rightEdgeLine.rotation.x = -Math.PI / 2;
    rightEdgeLine.position.set(VISUAL_TRACK_LENGTH / 2 - 20, 0.015, 6.9);
    trackGroup.add(rightEdgeLine);

    // Checkered Start Line Strip at X = 2.4 (just in front of the starting grid noses)
    const checkeredTex = createCheckeredTexture(maxAnisotropy);
    const startLineGeo = new THREE.PlaneGeometry(1.4, 13.6);
    const startLineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: checkeredTex,
      roughness: 0.5,
    });
    const startLineMesh = new THREE.Mesh(startLineGeo, startLineMat);
    startLineMesh.rotation.x = -Math.PI / 2;
    startLineMesh.position.set(2.4, 0.02, 0);
    trackGroup.add(startLineMesh);

    // Finish Line Strip
    const finishLineMesh = startLineMesh.clone();
    finishLineMesh.position.set(
      PHYSICS_CONSTANTS.TRACK_TOTAL_DISTANCE * DISTANCE_TO_WORLD_SCALE,
      0.02,
      0
    );
    trackGroup.add(finishLineMesh);

    // Starting Grid Box Markings for all 4 lanes
    const gridBoxMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const gridFrontGeo = new THREE.PlaneGeometry(0.14, 2.2);
    const gridSideGeo = new THREE.PlaneGeometry(1.2, 0.12);
    for (let i = 0; i < 4; i++) {
      const z = LANE_Z[i];
      const frontBar = new THREE.Mesh(gridFrontGeo, gridBoxMat);
      frontBar.rotation.x = -Math.PI / 2;
      frontBar.position.set(2.1, 0.018, z);
      trackGroup.add(frontBar);

      const leftWing = new THREE.Mesh(gridSideGeo, gridBoxMat);
      leftWing.rotation.x = -Math.PI / 2;
      leftWing.position.set(1.55, 0.018, z - 1.05);
      trackGroup.add(leftWing);

      const rightWing = new THREE.Mesh(gridSideGeo, gridBoxMat);
      rightWing.rotation.x = -Math.PI / 2;
      rightWing.position.set(1.55, 0.018, z + 1.05);
      trackGroup.add(rightWing);
    }

    // Instanced Lane Divider Dashes (3 dividers between 4 lanes)
    const dividerZs = [-3.4, 0.0, 3.4];
    const dashStep = 4.0;
    const dashesPerLine = Math.floor((VISUAL_TRACK_LENGTH + 40) / dashStep);
    const dashGeo = new THREE.PlaneGeometry(1.8, 0.14);
    dashGeo.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const dashInstanced = new THREE.InstancedMesh(
      dashGeo,
      dashMat,
      dashesPerLine * dividerZs.length
    );
    const dummy = new THREE.Object3D();
    let dashIdx = 0;
    for (const z of dividerZs) {
      for (let i = 0; i < dashesPerLine; i++) {
        dummy.position.set(-20 + i * dashStep, 0.018, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dashInstanced.setMatrixAt(dashIdx++, dummy.matrix);
      }
    }
    dashInstanced.instanceMatrix.needsUpdate = true;
    dashInstanced.frustumCulled = false;
    trackGroup.add(dashInstanced);

    // Instanced FIA Red & White Rumble Strips / Kerbs
    const curbStep = 2.0;
    const curbCountPerSide = Math.floor((VISUAL_TRACK_LENGTH + 40) / curbStep);
    const curbGeo = new THREE.BoxGeometry(1.92, 0.16, 0.75);
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.1,
    });
    const curbInstanced = new THREE.InstancedMesh(
      curbGeo,
      curbMat,
      curbCountPerSide * 2
    );
    const redColor = new THREE.Color(0xdc2626);
    const whiteColor = new THREE.Color(0xf8fafc);
    let cIdx = 0;
    for (let i = 0; i < curbCountPerSide; i++) {
      const x = -20 + i * curbStep;
      const col = i % 2 === 0 ? redColor : whiteColor;

      dummy.position.set(x, 0.08, -7.45);
      dummy.updateMatrix();
      curbInstanced.setMatrixAt(cIdx, dummy.matrix);
      curbInstanced.setColorAt(cIdx, col);
      cIdx++;

      dummy.position.set(x, 0.08, 7.45);
      dummy.updateMatrix();
      curbInstanced.setMatrixAt(cIdx, dummy.matrix);
      curbInstanced.setColorAt(cIdx, col);
      cIdx++;
    }
    curbInstanced.instanceMatrix.needsUpdate = true;
    if (curbInstanced.instanceColor) curbInstanced.instanceColor.needsUpdate = true;
    curbInstanced.frustumCulled = false;
    trackGroup.add(curbInstanced);

    // Metallic Armco Crash Barriers & Reflector Strips
    const barrierGeo = new THREE.BoxGeometry(VISUAL_TRACK_LENGTH + 80, 0.75, 0.25);
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.75,
      roughness: 0.3,
    });
    const barrierNorth = new THREE.Mesh(barrierGeo, barrierMat);
    barrierNorth.position.set(VISUAL_TRACK_LENGTH / 2 - 20, 0.45, -8.2);
    trackGroup.add(barrierNorth);

    const barrierSouth = new THREE.Mesh(barrierGeo, barrierMat);
    barrierSouth.position.set(VISUAL_TRACK_LENGTH / 2 - 20, 0.45, 8.2);
    trackGroup.add(barrierSouth);

    // Overhead Starting Grid Gantry with Race Lights
    const createGantry = (posX: number, isFinish: boolean) => {
      const gantry = new THREE.Group();
      gantry.position.set(posX, 0, 0);

      const pillarGeo = new THREE.BoxGeometry(0.65, 6.8, 0.65);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.25,
      });

      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(0, 3.4, -8.3);
      gantry.add(leftPillar);

      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(0, 3.4, 8.3);
      gantry.add(rightPillar);

      // Overhead truss beam
      const beamGeo = new THREE.BoxGeometry(1.1, 1.25, 17.4);
      const beamMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.7,
        roughness: 0.3,
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(0, 6.2, 0);
      gantry.add(beam);

      // Accent LED strip on gantry
      const ledStripGeo = new THREE.BoxGeometry(1.16, 0.16, 15.8);
      const ledStripMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0x10b981 : 0xf59e0b,
      });
      const ledStrip = new THREE.Mesh(ledStripGeo, ledStripMat);
      ledStrip.position.set(0, 5.65, 0);
      gantry.add(ledStrip);

      // 5 Starting Light Pods
      const podGeo = new THREE.BoxGeometry(0.35, 0.75, 0.55);
      const bulbGeo = new THREE.CircleGeometry(0.16, 16);
      bulbGeo.rotateY(-Math.PI / 2);
      const bulbMat = new THREE.MeshBasicMaterial({
        color: isFinish ? 0x34d399 : 0xef4444,
      });

      for (let i = -2; i <= 2; i++) {
        const pod = new THREE.Mesh(podGeo, pillarMat);
        pod.position.set(-0.55, 5.2, i * 1.4);
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(-0.19, 0, 0);
        pod.add(bulb);
        gantry.add(pod);
      }

      return gantry;
    };

    trackGroup.add(createGantry(3.2, false));
    trackGroup.add(
      createGantry(PHYSICS_CONSTANTS.TRACK_TOTAL_DISTANCE * DISTANCE_TO_WORLD_SCALE, true)
    );

    // Distant Mountain Silhouettes & Trackside Scenery (Trees & Grandstands)
    const mountainGeo = new THREE.ConeGeometry(28, 32, 5);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x162238,
      roughness: 0.9,
      metalness: 0.05,
    });
    for (let x = -30; x < VISUAL_TRACK_LENGTH; x += 65) {
      const m = new THREE.Mesh(mountainGeo, mountainMat);
      const scale = 0.8 + (Math.sin(x) * 0.5 + 0.5) * 0.9;
      m.scale.set(scale * 1.4, scale, scale);
      m.position.set(x, 12 * scale - 2, -52 - (x % 20));
      trackGroup.add(m);
    }

    // Trackside Pine / Cypress Trees and Floodlight Towers
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 2.6, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    const canopyGeo = new THREE.ConeGeometry(1.75, 4.2, 8);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0d5c46, roughness: 0.75 });

    for (let x = -12; x < VISUAL_TRACK_LENGTH; x += 18) {
      const tree = new THREE.Group();
      tree.position.set(x, 0, -12.5 - (Math.abs(x * 7) % 6));
      const s = 0.85 + ((x * 13) % 35) / 100;
      tree.scale.setScalar(s);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.3;
      tree.add(trunk);

      const c1 = new THREE.Mesh(canopyGeo, canopyMat);
      c1.position.y = 3.6;
      tree.add(c1);

      const c2 = new THREE.Mesh(canopyGeo, canopyMat);
      c2.position.y = 5.2;
      c2.scale.setScalar(0.74);
      tree.add(c2);

      trackGroup.add(tree);
    }

    // Trackside Floodlight Poles every 45m
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 9.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.25,
    });
    const lampHeadGeo = new THREE.BoxGeometry(0.9, 0.25, 1.4);
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (let x = 0; x < VISUAL_TRACK_LENGTH; x += 40) {
      const pole = new THREE.Group();
      pole.position.set(x, 0, -9.2);
      const shaft = new THREE.Mesh(poleGeo, poleMat);
      shaft.position.y = 4.75;
      pole.add(shaft);

      const head = new THREE.Mesh(lampHeadGeo, lampGlowMat);
      head.position.set(0, 9.5, 0.6);
      head.rotation.x = 0.35;
      pole.add(head);
      trackGroup.add(pole);
    }

    // 6. Build 4 Realistic Multi-Part 3D Sports / GT Racing Cars
    const contactShadowTex = createContactShadowTexture();

    // Shared Extruded Aerodynamic GT Lower Bodywork (up to the beltline)
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-2.18, 0.22); // Rear lower diffuser edge
    bodyShape.lineTo(2.15, 0.18);  // Front lower splitter edge
    bodyShape.lineTo(2.30, 0.36);  // Sharp aerodynamic nose tip
    bodyShape.lineTo(1.98, 0.58);  // Front hood leading edge
    bodyShape.lineTo(0.95, 0.74);  // Base of windshield / cowl
    bodyShape.lineTo(-1.62, 0.78); // Beltline along side doors to rear deck
    bodyShape.lineTo(-2.15, 0.74); // Rear tail fascia top
    bodyShape.lineTo(-2.24, 0.38); // Rear bumper lower
    bodyShape.closePath();

    const bodyExtrudeGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 1.54,
      bevelEnabled: true,
      bevelThickness: 0.11,
      bevelSize: 0.09,
      bevelSegments: 3,
      steps: 1,
    });
    // Center along Z axis
    bodyExtrudeGeo.translate(0, 0, -0.77);
    bodyExtrudeGeo.computeVertexNormals();

    // Cabin Greenhouse Glass Geometry (rises cleanly above the beltline for windshield, side windows & rear fastback glass)
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(0.92, 0.72);  // Windshield base
    cabinShape.lineTo(0.24, 1.20);  // Windshield top / front roof header
    cabinShape.lineTo(-0.68, 1.17); // Rear roof header
    cabinShape.lineTo(-1.58, 0.75); // Fastback rear glass base
    cabinShape.closePath();

    const cabinExtrudeGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.32,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 3,
      steps: 1,
    });
    cabinExtrudeGeo.translate(0, 0, -0.66);
    cabinExtrudeGeo.computeVertexNormals();

    // Shared Materials for Carbon Fiber, Glass, Chrome, Tyres & Lights
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.42,
      metalness: 0.35,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.15,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.95,
      roughness: 0.12,
    });

    const alloyRimMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
    });

    const tyreMat = new THREE.MeshStandardMaterial({
      color: 0x171923,
      roughness: 0.85,
      metalness: 0.08,
    });

    const brakeDiscMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.35,
    });

    const headlightGlowMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const taillightGlowMat = new THREE.MeshBasicMaterial({ color: 0xff1e42 });

    interface CarVisualPackage {
      rootGroup: THREE.Group;
      chassisGroup: THREE.Group;
      wheelGroups: THREE.Group[];
      flameMesh: THREE.Mesh;
      laneIndex: number;
      racerId: string;
    }

    const carPackages: CarVisualPackage[] = [];

    const createRealisticSportsCar = (
      laneIdx: number,
      paintHex: string,
      stripeHex: string,
      racerId: string,
      racerLabel: string
    ): CarVisualPackage => {
      const rootGroup = new THREE.Group();
      const chassisGroup = new THREE.Group();
      rootGroup.add(chassisGroup);

      const paintColor = new THREE.Color(paintHex);
      const bodyPaintMat = new THREE.MeshPhysicalMaterial({
        color: paintColor,
        metalness: 0.62,
        roughness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
      });

      const stripeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(stripeHex),
        roughness: 0.3,
        metalness: 0.2,
      });

      const caliperMat = new THREE.MeshStandardMaterial({
        color: paintColor,
        roughness: 0.3,
        metalness: 0.5,
      });

      // 1. Contact Shadow Disc on the road (moves with rootGroup)
      const shadowPlaneGeo = new THREE.PlaneGeometry(5.2, 2.5);
      const shadowPlaneMat = new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      shadowMesh.rotation.x = -Math.PI / 2;
      shadowMesh.position.set(0, 0.025, 0);
      rootGroup.add(shadowMesh);

      // 2. Sculpted Main Aerodynamic GT Bodywork
      const mainBody = new THREE.Mesh(bodyExtrudeGeo, bodyPaintMat);
      mainBody.castShadow = !isSoftwareGl;
      mainBody.receiveShadow = !isSoftwareGl;
      chassisGroup.add(mainBody);

      // 3. Tinted Greenhouse Cabin (Windshield, Side Windows, Rear Glass)
      const cabinMesh = new THREE.Mesh(cabinExtrudeGeo, glassMat);
      cabinMesh.castShadow = !isSoftwareGl;
      chassisGroup.add(cabinMesh);

      // Roof Painted Panel Cap & Center Livery Stripe
      const roofCapGeo = new THREE.BoxGeometry(0.92, 0.05, 1.26);
      const roofCap = new THREE.Mesh(roofCapGeo, bodyPaintMat);
      roofCap.position.set(-0.22, 1.22, 0);
      chassisGroup.add(roofCap);

      const roofStripeGeo = new THREE.BoxGeometry(0.94, 0.055, 0.30);
      const roofStripe = new THREE.Mesh(roofStripeGeo, stripeMat);
      roofStripe.position.set(-0.22, 1.225, 0);
      chassisGroup.add(roofStripe);

      const hoodStripeGeo = new THREE.BoxGeometry(1.18, 0.03, 0.34);
      const hoodStripe = new THREE.Mesh(hoodStripeGeo, stripeMat);
      hoodStripe.position.set(1.48, 0.69, 0);
      hoodStripe.rotation.z = -0.14;
      chassisGroup.add(hoodStripe);

      // 4. Sculpted Widebody Wheel Arch Fenders (Front & Rear)
      const archGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.32, 18, 1, false, 0, Math.PI);
      archGeo.rotateX(Math.PI / 2);
      const archPositions = [
        { x: 1.32, z: 0.78 },
        { x: 1.32, z: -0.78 },
        { x: -1.32, z: 0.78 },
        { x: -1.32, z: -0.78 },
      ];
      for (const pos of archPositions) {
        const arch = new THREE.Mesh(archGeo, bodyPaintMat);
        arch.position.set(pos.x, 0.44, pos.z);
        chassisGroup.add(arch);
      }

      // 5. Front Carbon Splitter Lip, Canards & Grille Intake
      const splitterGeo = new THREE.BoxGeometry(0.68, 0.075, 1.86);
      const splitter = new THREE.Mesh(splitterGeo, carbonMat);
      splitter.position.set(2.14, 0.16, 0);
      chassisGroup.add(splitter);

      const canardGeo = new THREE.BoxGeometry(0.32, 0.04, 0.16);
      for (const side of [-1, 1]) {
        const canard = new THREE.Mesh(canardGeo, carbonMat);
        canard.position.set(2.08, 0.28, side * 0.88);
        canard.rotation.z = -0.22;
        chassisGroup.add(canard);
      }

      const grilleGeo = new THREE.BoxGeometry(0.14, 0.24, 1.28);
      const grille = new THREE.Mesh(grilleGeo, carbonMat);
      grille.position.set(2.26, 0.32, 0);
      chassisGroup.add(grille);

      // 6. Aerodynamic Carbon Side Skirts, Accent Trim & Door Air Intakes
      const skirtGeo = new THREE.BoxGeometry(1.76, 0.1, 1.84);
      const skirt = new THREE.Mesh(skirtGeo, carbonMat);
      skirt.position.set(0, 0.18, 0);
      chassisGroup.add(skirt);

      const skirtAccentGeo = new THREE.BoxGeometry(1.62, 0.035, 1.87);
      const skirtAccent = new THREE.Mesh(skirtAccentGeo, stripeMat);
      skirtAccent.position.set(0, 0.22, 0);
      chassisGroup.add(skirtAccent);

      const sideScoopGeo = new THREE.BoxGeometry(0.65, 0.28, 0.12);
      const scoopL = new THREE.Mesh(sideScoopGeo, carbonMat);
      scoopL.position.set(-0.35, 0.52, 0.84);
      chassisGroup.add(scoopL);
      const scoopR = new THREE.Mesh(sideScoopGeo, carbonMat);
      scoopR.position.set(-0.35, 0.52, -0.84);
      chassisGroup.add(scoopR);

      // 7. Side-View Racing Mirrors on Stalks + Roof Shark-Fin Aero Stabilizer
      const mirrorHousingGeo = new THREE.BoxGeometry(0.22, 0.12, 0.18);
      const mirrorStalkGeo = new THREE.BoxGeometry(0.08, 0.14, 0.12);
      for (const side of [-1, 1]) {
        const stalk = new THREE.Mesh(mirrorStalkGeo, carbonMat);
        stalk.position.set(0.65, 0.78, side * 0.82);
        chassisGroup.add(stalk);

        const housing = new THREE.Mesh(mirrorHousingGeo, bodyPaintMat);
        housing.position.set(0.62, 0.85, side * 0.92);
        chassisGroup.add(housing);
      }

      const sharkFinGeo = new THREE.BoxGeometry(0.95, 0.22, 0.04);
      const sharkFin = new THREE.Mesh(sharkFinGeo, carbonMat);
      sharkFin.position.set(-1.32, 1.08, 0);
      sharkFin.rotation.z = 0.16;
      chassisGroup.add(sharkFin);

      // 8. Projector LED Headlights, DRL Signatures & Full-Width LED Taillight Bar
      const hlGeo = new THREE.BoxGeometry(0.24, 0.11, 0.36);
      const drlGeo = new THREE.BoxGeometry(0.28, 0.035, 0.38);
      for (const side of [-1, 1]) {
        const hl = new THREE.Mesh(hlGeo, headlightGlowMat);
        hl.position.set(2.12, 0.49, side * 0.58);
        hl.rotation.z = -0.15;
        chassisGroup.add(hl);

        const drl = new THREE.Mesh(drlGeo, stripeMat);
        drl.position.set(2.08, 0.55, side * 0.58);
        drl.rotation.z = -0.15;
        chassisGroup.add(drl);
      }

      const tailBarGeo = new THREE.BoxGeometry(0.1, 0.12, 1.56);
      const tailBar = new THREE.Mesh(tailBarGeo, taillightGlowMat);
      tailBar.position.set(-2.22, 0.62, 0);
      chassisGroup.add(tailBar);

      // 9. Rear Diffuser & Dual Chrome Exhaust Pipes + Nitro Flame Cone
      const diffuserGeo = new THREE.BoxGeometry(0.45, 0.22, 1.58);
      const diffuser = new THREE.Mesh(diffuserGeo, carbonMat);
      diffuser.position.set(-2.12, 0.25, 0);
      chassisGroup.add(diffuser);

      const exhaustPipeGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.28, 12);
      exhaustPipeGeo.rotateZ(Math.PI / 2);
      for (const side of [-0.36, 0.36]) {
        const pipe = new THREE.Mesh(exhaustPipeGeo, chromeMat);
        pipe.position.set(-2.28, 0.3, side);
        chassisGroup.add(pipe);
      }

      const flameGeo = new THREE.ConeGeometry(0.14, 0.75, 10);
      flameGeo.rotateZ(Math.PI / 2);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      flameMesh.position.set(-2.65, 0.3, 0);
      chassisGroup.add(flameMesh);

      // 10. Multi-Element Swan-Neck GT Rear Wing
      const wingBladeGeo = new THREE.BoxGeometry(0.42, 0.06, 1.82);
      const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMat);
      wingBlade.position.set(-2.05, 1.16, 0);
      wingBlade.rotation.z = 0.12;
      chassisGroup.add(wingBlade);

      const endplateGeo = new THREE.BoxGeometry(0.48, 0.28, 0.04);
      for (const side of [-0.91, 0.91]) {
        const plate = new THREE.Mesh(endplateGeo, bodyPaintMat);
        plate.position.set(-2.05, 1.14, side);
        chassisGroup.add(plate);
      }

      const pylonGeo = new THREE.BoxGeometry(0.18, 0.42, 0.05);
      for (const side of [-0.45, 0.45]) {
        const pylon = new THREE.Mesh(pylonGeo, carbonMat);
        pylon.position.set(-1.95, 0.94, side);
        pylon.rotation.z = -0.18;
        chassisGroup.add(pylon);
      }

      // 11. 4 Realistic Racing Wheels (Tyre + Multi-Spoke Alloy Rim + Brake Rotor + Caliper)
      const wheelGroups: THREE.Group[] = [];
      const tyreOuterGeo = new THREE.CylinderGeometry(0.43, 0.43, 0.34, 24);
      tyreOuterGeo.rotateX(Math.PI / 2);

      const rimOuterGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.35, 18);
      rimOuterGeo.rotateX(Math.PI / 2);

      const hubCapGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.37, 12);
      hubCapGeo.rotateX(Math.PI / 2);

      const spokeGeo = new THREE.BoxGeometry(0.54, 0.055, 0.36);

      const rotorGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16);
      rotorGeo.rotateX(Math.PI / 2);

      const caliperGeo = new THREE.BoxGeometry(0.12, 0.18, 0.14);

      const wheelCoords = [
        { x: 1.32, z: 0.86 },
        { x: 1.32, z: -0.86 },
        { x: -1.32, z: 0.86 },
        { x: -1.32, z: -0.86 },
      ];

      for (const wc of wheelCoords) {
        // Non-rotating knuckle holds brake caliper
        const knuckle = new THREE.Group();
        knuckle.position.set(wc.x, 0.43, wc.z);
        const caliper = new THREE.Mesh(caliperGeo, caliperMat);
        caliper.position.set(-0.14, 0.06, wc.z > 0 ? 0.06 : -0.06);
        knuckle.add(caliper);
        rootGroup.add(knuckle);

        // Rotating wheel assembly
        const wheel = new THREE.Group();
        wheel.position.set(wc.x, 0.43, wc.z);

        const tyre = new THREE.Mesh(tyreOuterGeo, tyreMat);
        tyre.castShadow = !isSoftwareGl;
        wheel.add(tyre);

        const rotor = new THREE.Mesh(rotorGeo, brakeDiscMat);
        wheel.add(rotor);

        const rimRing = new THREE.Mesh(rimOuterGeo, carbonMat);
        wheel.add(rimRing);

        const hub = new THREE.Mesh(hubCapGeo, caliperMat);
        wheel.add(hub);

        // 5 metallic alloy spokes so rotation is clearly visible
        for (let s = 0; s < 5; s++) {
          const spoke = new THREE.Mesh(spokeGeo, alloyRimMat);
          spoke.rotation.z = (s * Math.PI) / 5;
          wheel.add(spoke);
        }

        rootGroup.add(wheel);
        wheelGroups.push(wheel);
      }

      rootGroup.scale.setScalar(1.07);
      rootGroup.position.set(0, 0, LANE_Z[laneIdx]);
      scene.add(rootGroup);

      // Floating Username Badge Sprite above the car roof
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 256;
      badgeCanvas.height = 64;
      const bCtx = badgeCanvas.getContext('2d')!;
      bCtx.fillStyle = 'rgba(15, 23, 42, 0.86)';
      bCtx.beginPath();
      bCtx.roundRect(8, 8, 240, 48, 12);
      bCtx.fill();
      bCtx.lineWidth = 3;
      bCtx.strokeStyle = paintHex;
      bCtx.stroke();

      bCtx.fillStyle = '#f8fafc';
      bCtx.font = 'bold 24px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(racerLabel, 128, 33);

      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      badgeTex.colorSpace = THREE.SRGBColorSpace;
      const badgeMat = new THREE.SpriteMaterial({
        map: badgeTex,
        transparent: true,
        depthTest: false,
      });
      const badgeSprite = new THREE.Sprite(badgeMat);
      badgeSprite.position.set(-0.1, 1.85, 0);
      badgeSprite.scale.set(2.1, 0.52, 1);
      rootGroup.add(badgeSprite);

      return {
        rootGroup,
        chassisGroup,
        wheelGroups,
        flameMesh,
        laneIndex: laneIdx,
        racerId,
      };
    };

    const initialRacers = racersRef.current;
    for (let i = 0; i < 4; i++) {
      const r = initialRacers[i] || { id: `racer_${i}`, lane: i, name: `Racer ${i + 1}`, isSelf: i === 0 };
      const pal = carPaintPalettes[i];
      const label = r.isSelf ? `${r.name} (YOU)` : r.name;
      const pkg = createRealisticSportsCar(r.lane ?? i, pal.main, pal.stripe, r.id, label);
      carPackages.push(pkg);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Delta-Time Render & Physics Loop
    let frameId = 0;
    let lastTime = performance.now();
    let elapsedTotal = 0;
    let lastReactSyncTime = 0;
    let isDisposed = false;
    let fallbackCleanup: (() => void) | null = null;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (isDisposed || fallbackCleanup) return;
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
      fallbackCleanup = startCanvas2DFallback();
    };
    glCanvas.addEventListener('webglcontextlost', handleContextLost, false);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isDisposed || fallbackCleanup) return;
        const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : null;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 70);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed || fallbackCleanup) return;
      const now = performance.now();
      const rawDt = Math.min((now - lastTime) / 1000, 0.5);
      const dt = rawDt;
      lastTime = now;

      const currentPhase = phaseRef.current;
      const currentRacers = racersRef.current;
      let playerWorldX = 0;

      if (isReplayRef.current) {
        elapsedTotal += dt;
        // Replay playback mode: smoothly damp toward recorded racer progress
        carPackages.forEach((pkg, idx) => {
          const racer = currentRacers.find((r) => r.id === pkg.racerId) || currentRacers[idx];
          if (!racer) return;
          const targetWorldX =
            (racer.progress / 100) *
            PHYSICS_CONSTANTS.TRACK_TOTAL_DISTANCE *
            DISTANCE_TO_WORLD_SCALE;
          pkg.rootGroup.position.x = THREE.MathUtils.damp(
            pkg.rootGroup.position.x,
            targetWorldX,
            6.0,
            dt
          );
          const visualSpeed = Math.max(0, (racer.wpm / 60) * 18);
          pkg.wheelGroups.forEach((w) => {
            w.rotation.z -= (visualSpeed / PHYSICS_CONSTANTS.WHEEL_RADIUS) * dt;
          });
          if (racer.isSelf || idx === playerLane) {
            playerWorldX = pkg.rootGroup.position.x;
          }
        });
      } else {
        // Sub-step physics in <= 50ms increments for deterministic real-time accuracy across all frame rates
        let remainingDt = rawDt;
        let nextStates = physicsStatesRef.current;
        while (remainingDt > 0.0001) {
          const stepDt = Math.min(remainingDt, 0.05);
          elapsedTotal += stepDt;
          nextStates = nextStates.map((state) =>
            stepCarPhysics(state, stepDt, currentPhase, elapsedTotal)
          );
          remainingDt -= stepDt;
        }
        physicsStatesRef.current = nextStates;

        carPackages.forEach((pkg, idx) => {
          const st = nextStates[idx];
          if (!st) return;

          const worldX = st.distance * DISTANCE_TO_WORLD_SCALE;
          pkg.rootGroup.position.x = worldX;
          pkg.chassisGroup.position.y = st.suspensionY;
          pkg.chassisGroup.rotation.z = st.chassisPitch;

          // Rotate all 4 wheels according to actual integrated wheelAngle
          pkg.wheelGroups.forEach((w) => {
            w.rotation.z = -st.wheelAngle;
          });

          // Nitro exhaust glow intensity when accelerating above base speed
          const boostRatio = Math.max(
            0,
            (st.currentSpeed - PHYSICS_CONSTANTS.BASE_SPEED) /
              (PHYSICS_CONSTANTS.MAX_SPEED - PHYSICS_CONSTANTS.BASE_SPEED)
          );
          const flameMat = pkg.flameMesh.material as THREE.MeshBasicMaterial;
          if (currentPhase === 'racing' && boostRatio > 0.08) {
            flameMat.opacity = Math.min(0.85, boostRatio * 0.95);
            const flicker = 0.85 + Math.sin(elapsedTotal * 35 + idx) * 0.2;
            pkg.flameMesh.scale.set(
              (0.6 + boostRatio * 1.1) * flicker,
              1,
              0.8 + boostRatio * 0.4
            );
          } else {
            flameMat.opacity = 0;
          }

          if (st.isSelf || idx === playerLane) {
            playerWorldX = worldX;
          }
        });

        // Throttle physics -> React state sync to ~10Hz so HUD & rankings stay accurate without 60Hz React re-renders
        if (onPhysicsUpdateRef.current && now - lastReactSyncTime > 100) {
          lastReactSyncTime = now;
          onPhysicsUpdateRef.current(nextStates);
        }
      }

      // Camera Framing:
      // - On Home Screen ('idle'), cinematic side-view framing all 4 cars at the starting grid
      // - On Race Screen ('countdown' / 'racing'), smooth side-view tracking camera
      const isPortrait = camera.aspect < 1;
      const portraitExtraZ = isPortrait ? (1 - camera.aspect) * 15.5 : 0;
      const portraitExtraY = isPortrait ? (1 - camera.aspect) * 3.2 : 0;

      if (currentPhase === 'idle') {
        const swayX = Math.sin(elapsedTotal * 0.45) * 0.35;
        const swayY = Math.cos(elapsedTotal * 0.35) * 0.1;
        _camTargetPos.set(-2.4 + swayX, 5.4 + portraitExtraY + swayY, 13.8 + portraitExtraZ);
        _camLookAt.set(isPortrait ? 0.3 : 1.8, 0.85, -0.4);
      } else {
        // Active race side-view perspective (slightly closer so all 4 lanes & cars are prominent)
        _camTargetPos.set(playerWorldX - 2.0, 4.95 + portraitExtraY, 13.3 + portraitExtraZ);
        _camLookAt.set(playerWorldX + (isPortrait ? 1.2 : 2.5), 0.85, -0.25);
      }

      camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 4.2, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 4.2, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 4.2, dt);
      camera.lookAt(_camLookAt);

      // Keep directional shadow frustum centered around the player car
      sunLight.position.x = playerWorldX + 22;
      sunLight.target.position.x = playerWorldX + 4;
      sunLight.target.updateMatrixWorld();

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    // 8. ResizeObserver & window resize handling
    const handleResize = () => {
      if (!container || isDisposed || fallbackCleanup) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      glCanvas.removeEventListener('webglcontextlost', handleContextLost);
      if (fallbackCleanup) {
        fallbackCleanup();
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) {
        clearTimeout(frameId);
      } else {
        cancelAnimationFrame(frameId);
      }
      renderer.dispose();
    };
  }, [playerLane]);

  return (
    <div
      className={`relative w-full h-full select-none overflow-hidden bg-slate-950 ${
        fullViewport ? '' : 'rounded-xl border border-slate-800 shadow-2xl'
      }`}
    >
      {/* Isolated WebGL Canvas Mount Container */}
      <div ref={mountRef} className="w-full h-full" data-testid="racing-track-3d" />

      {/* Show live racer standings strip during active race or replay (hidden on clean home screen) */}
      {phase !== 'idle' && (
        <div className="absolute bottom-2 left-2.5 right-2.5 sm:bottom-3 sm:left-4 sm:right-4 flex items-center justify-between text-[11px] sm:text-xs pointer-events-none z-10">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-3 bg-slate-950/90 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg border border-slate-800">
            {racers.map((r) => {
              const rankLabel =
                r.rank === 1 ? '1st' : r.rank === 2 ? '2nd' : r.rank === 3 ? '3rd' : '4th';
              return (
                <div key={r.id} className="flex items-center space-x-1 sm:space-x-1.5">
                  <span
                    className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="font-semibold text-slate-100">
                    {r.name} {r.isSelf && '(You)'}
                  </span>
                  <span
                    className="font-mono-racing text-amber-400 text-[10px] sm:text-[11px] font-bold"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {rankLabel} · {Math.round(r.progress)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
