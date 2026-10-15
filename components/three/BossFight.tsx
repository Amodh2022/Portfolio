"use client";

import { Edges } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { emitBurst } from "@/lib/fx";
import { BOSS_HP, LIVES, WAVE_SECONDS, hit, multiplier, nearest, newGame, start, step, type Game, type Phase } from "@/lib/game/bugSquash";
import type { Sfx } from "@/lib/sound";
import GameCanvas from "./GameCanvas";
import { useThemeColors, type Palette } from "./useThemeColors";

type Hud = { phase: Phase; t: number; score: number; combo: number; mult: number; lives: number; bossHp: number; bossOn: boolean };
type Props = { low: boolean; best: number; onSfx: (k: Sfx, amount?: number) => void; onEnd: (won: boolean, score: number) => void };

const POOL = 26;
const snapshot = (g: Game): Hud => ({ phase: g.phase, t: g.t, score: g.score, combo: g.combo, mult: multiplier(g), lives: g.lives, bossHp: g.bossHp, bossOn: g.bossSpawned });

function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const dist = Math.max(9, 5.8 / (Math.tan((40 * Math.PI) / 360) * aspect));
    camera.position.set(0, dist * 0.78, dist * 0.62);
    camera.lookAt(0, 0, 0.1);
  }, [camera, size]);
  return null;
}

function Floor({ p }: { p: Palette }) {
  const m = useRef<THREE.InstancedMesh>(null);
  const cols = 12;
  const rows = 8;
  useEffect(() => {
    const mesh = m.current;
    if (!mesh) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    const base = new THREE.Color(p.card2);
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < cols; k++) {
        const i = r * cols + k;
        d.position.set((k - cols / 2 + 0.5) * 0.86, -0.1, (r - rows / 2 + 0.5) * 0.86);
        d.scale.set(0.82, 0.2, 0.82);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
        mesh.setColorAt(i, c.set((r + k) % 2 ? p.card2 : p.line).lerp(base, 0.5));
      }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [p]);
  return (
    <instancedMesh ref={m} args={[undefined, undefined, cols * rows]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshToonMaterial />
    </instancedMesh>
  );
}

function Core({ p, game }: { p: Palette; game: MutableRefObject<Game> }) {
  const body = useRef<THREE.MeshToonMaterial>(null);
  const grp = useRef<THREE.Group>(null);
  const ok = useMemo(() => new THREE.Color(p.line), [p]);
  const bad = useMemo(() => new THREE.Color(p.coral), [p]);
  useFrame((s) => {
    const f = game.current.flash;
    body.current?.color.copy(ok).lerp(bad, Math.min(1, f * 3));
    if (grp.current) grp.current.position.x = f > 0 ? Math.sin(s.clock.elapsedTime * 60) * 0.06 : 0;
  });
  return (
    <group ref={grp}>
      <mesh position-y={0.55}>
        <boxGeometry args={[0.8, 1.1, 0.8]} />
        <meshToonMaterial ref={body} color={p.line} />
        <Edges color={p.ink} />
      </mesh>
      {[0.25, 0.55, 0.85].map((y, i) => (
        <mesh key={y} position={[0, y, 0.41]}>
          <boxGeometry args={[0.5, 0.08, 0.03]} />
          <meshBasicMaterial color={i === 1 ? p.coral : p.ac} />
        </mesh>
      ))}
    </group>
  );
}

function BugModel({ p, onRef, onDown }: { p: Palette; onRef: (g: THREE.Group | null) => void; onDown: (e: { clientX: number; clientY: number; stopPropagation: () => void }) => void }) {
  return (
    <group ref={onRef} visible={false} position-y={-100} onPointerDown={onDown}>
      <mesh position-y={0.22}>
        <boxGeometry args={[0.56, 0.26, 0.44]} />
        <meshToonMaterial color={p.coral} />
        <Edges color={p.ink} />
      </mesh>
      <mesh position={[0, 0.22, 0.36]}>
        <boxGeometry args={[0.3, 0.22, 0.24]} />
        <meshToonMaterial color={p.coral} />
        <Edges color={p.ink} />
      </mesh>
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.49]}>
          <boxGeometry args={[0.07, 0.07, 0.03]} />
          <meshBasicMaterial color="#0F1020" />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) =>
        [-0.12, 0.02, 0.16].map((z) => (
          <mesh key={`${side}${z}`} name="leg" position={[side * 0.36, 0.1, z]}>
            <boxGeometry args={[0.32, 0.05, 0.05]} />
            <meshBasicMaterial color={p.ink} />
          </mesh>
        )),
      )}
      {/* generous invisible hit target so bugs are easy to tap */}
      <mesh position-y={0.25}>
        <sphereGeometry args={[0.62, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

type SceneProps = {
  p: Palette;
  game: MutableRefObject<Game>;
  paused: MutableRefObject<boolean>;
  onHud: (h: Hud) => void;
  onHit: (r: ReturnType<typeof hit>, x: number, y: number) => void;
  onEnd: (won: boolean, score: number) => void;
};

function Scene({ p, game, paused, onHud, onHit, onEnd }: SceneProps) {
  const slots = useRef<(THREE.Group | null)[]>(Array(POOL).fill(null));
  const boss = useRef<THREE.Group | null>(null);
  const slotIds = useRef<number[]>(Array(POOL).fill(-1));
  const bossId = useRef(-1);
  const hudT = useRef(0);
  const lastPhase = useRef<Phase>("idle");

  const down = (idOf: () => number) => (e: { clientX: number; clientY: number; stopPropagation: () => void }) => {
    e.stopPropagation();
    const r = hit(game.current, idOf());
    if (r !== "miss") onHit(r, e.clientX, e.clientY);
  };

  useFrame((s, dt) => {
    const g = game.current;
    if (!paused.current) step(g, Math.min(dt, 0.05));
    const t = s.clock.elapsedTime;

    let mi = 0;
    const hide = (grp: THREE.Group | null) => {
      if (!grp) return;
      grp.visible = false;
      grp.position.y = -100;
    };
    slots.current.forEach(hide);
    hide(boss.current);
    slotIds.current.fill(-1);
    for (const b of g.bugs) {
      const grp = b.boss ? boss.current : slots.current[mi];
      if (!b.boss) {
        if (mi >= POOL) continue;
        slotIds.current[mi++] = b.id;
      } else bossId.current = b.id;
      if (!grp) continue;
      grp.visible = true;
      grp.position.set(b.x, 0, b.z);
      grp.rotation.y = Math.atan2(-b.x, -b.z);
      grp.scale.setScalar((b.boss ? 2.3 : 1.3) * (b.hurt > 0 ? 1.18 : 1));
      const legs = (grp.userData.legs ??= grp.children.filter((c) => c.name === "leg")) as THREE.Object3D[];
      legs.forEach((l, k) => (l.rotation.y = Math.sin(t * 14 + k * 1.3) * 0.5));
    }

    hudT.current += dt;
    if (hudT.current > 0.1 || g.phase !== lastPhase.current) {
      hudT.current = 0;
      onHud(snapshot(g));
    }
    if (g.phase !== lastPhase.current) {
      const was = lastPhase.current;
      lastPhase.current = g.phase;
      if (was === "run" && (g.phase === "won" || g.phase === "lost")) onEnd(g.phase === "won", g.score);
    }
  });

  return (
    <>
      <FitCamera />
      <ambientLight intensity={1.15} />
      <directionalLight position={[3, 7, 4]} intensity={1.5} />
      <Floor p={p} />
      <Core p={p} game={game} />
      {Array.from({ length: POOL }, (_, i) => (
        <BugModel key={i} p={p} onRef={(g) => (slots.current[i] = g)} onDown={down(() => slotIds.current[i])} />
      ))}
      <group scale={1}>
        <BugModel p={p} onRef={(g) => (boss.current = g)} onDown={down(() => bossId.current)} />
      </group>
    </>
  );
}

export default function BossFight({ low, best, onSfx, onEnd }: Props) {
  const p = useThemeColors();
  const game = useRef<Game>(newGame());
  const paused = useRef(false);
  const visible = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<Hud>(() => snapshot(game.current));
  const [isPaused, setIsPaused] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const begin = useCallback(() => {
    start(game.current);
    paused.current = false;
    setIsPaused(false);
    onSfx("click");
  }, [onSfx]);

  const togglePause = () => {
    paused.current = !paused.current;
    setIsPaused(paused.current);
  };

  const onHit = useCallback(
    (r: ReturnType<typeof hit>, x: number, y: number) => {
      const g = game.current;
      onSfx(r === "boss-kill" ? "win" : "hit", g.combo);
      const colors = [p.ac, p.coral, "#ffffff"];
      emitBurst({ x, y, count: r === "boss-kill" ? 80 : r === "kill" ? 14 : 5, colors, power: r === "boss-kill" ? 1.5 : 0.7 });
    },
    [onSfx, p],
  );

  const handleEnd = useCallback(
    (won: boolean, score: number) => {
      onSfx(won ? "win" : "lose");
      if (won) emitBurst({ x: window.innerWidth / 2, y: window.innerHeight / 2, count: 90, colors: [p.ac, p.coral, "#ffffff"], power: 1.4 });
      onEnd(won, score);
    },
    [onSfx, onEnd, p],
  );

  // keyboard: Space squashes the bug nearest the server (only while the arena is on screen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !visible.current || game.current.phase !== "run" || paused.current) return;
      if ((e.target as HTMLElement | null)?.closest("button,input,textarea,select,a")) return;
      e.preventDefault();
      const b = nearest(game.current);
      if (!b) return;
      const r = hit(game.current, b.id);
      if (r !== "miss") onHit(r, window.innerWidth / 2, window.innerHeight / 2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHit]);

  if (lost) return <p className="arena-note">The 3D arena lost its graphics context. Reload the page to play.</p>;

  const running = hud.phase === "run";
  const timeLeft = Math.max(0, Math.ceil(WAVE_SECONDS - hud.t));
  return (
    <div ref={wrap} className="arena">
      <GameCanvas low={low} className="arena-canvas" camera={{ position: [0, 8, 6], fov: 40 }} onLost={() => setLost(true)}>
        <Scene p={p} game={game} paused={paused} onHud={setHud} onHit={onHit} onEnd={handleEnd} />
      </GameCanvas>

      <div className="arena-hud">
        <div className="hud-box">
          <span className="pixel" style={{ fontSize: 28, lineHeight: 1 }}>{hud.score}</span>
          <span style={{ fontSize: 12, color: "var(--mute)" }}>BEST {Math.max(best, hud.phase === "won" || hud.phase === "lost" ? hud.score : 0)}</span>
          {hud.combo >= 2 && <span className="combo" key={hud.combo}>x{hud.mult} COMBO {hud.combo}</span>}
        </div>
        <div className="hud-box mid">
          {hud.bossOn ? (
            <>
              <span className="pixel" style={{ fontSize: 14, letterSpacing: ".15em", color: "var(--coral)" }}>LEGACY BUG</span>
              <div className="bossbar" role="progressbar" aria-label="Boss health" aria-valuemin={0} aria-valuemax={BOSS_HP} aria-valuenow={hud.bossHp}>
                <div style={{ width: `${(hud.bossHp / BOSS_HP) * 100}%` }} />
              </div>
            </>
          ) : (
            <span className="pixel" style={{ fontSize: 14, letterSpacing: ".12em" }}>{running ? `BOSS IN ${timeLeft}s` : "SERVER DEFENSE"}</span>
          )}
        </div>
        <div className="hud-box right" aria-label={`${hud.lives} of ${LIVES} lives left`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <span key={i} className="heart" style={{ background: i < hud.lives ? "var(--coral)" : "var(--line)" }} />
          ))}
        </div>
      </div>

      {running && (
        <button type="button" className="arena-pause" onClick={togglePause}>{isPaused ? "Resume" : "Pause"}</button>
      )}

      {(hud.phase !== "run" || isPaused) && (
        <div className="arena-over" role="status">
          <div className="arena-card">
            {isPaused && running ? (
              <>
                <h3 className="pixel">Paused</h3>
                <button type="button" className="cta" onClick={togglePause}>Resume</button>
              </>
            ) : (
              <>
                <h3 className="pixel">{hud.phase === "won" ? "Boss defeated!" : hud.phase === "lost" ? "Server down" : "Bug Squash"}</h3>
                <p>
                  {hud.phase === "won"
                    ? `The Legacy Bug is toast. Final score ${hud.score}.`
                    : hud.phase === "lost"
                      ? `Too many bugs reached the core. Score ${hud.score}.`
                      : "Bugs are swarming the server. Squash them, then take down the Legacy Bug."}
                </p>
                <button type="button" className="cta" onClick={begin}>{hud.phase === "idle" ? "Start" : "Play again"}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
