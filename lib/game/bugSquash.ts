/** Pure game logic for the boss fight. No React, no three.js: easy to simulate and test. */

export const ARENA = { x: 4.2, z: 2.6 };
export const LIVES = 3;
export const WAVE_SECONDS = 20;
export const BOSS_HP = 14;
export const TIMEOUT_SECONDS = 55;
const CORE_R = 0.55;
const BOSS_CORE_R = 1.0;

export type Bug = { id: number; x: number; z: number; hp: number; boss: boolean; speed: number; wobble: number; hurt: number };
export type Phase = "idle" | "run" | "won" | "lost";
export type Game = {
  phase: Phase; t: number; bugs: Bug[]; score: number; combo: number; comboT: number; lives: number;
  squashed: number; nextId: number; spawnT: number; bossSpawned: boolean; bossHp: number; flash: number;
};
export type HitResult = "miss" | "hit" | "kill" | "boss-kill";
type Rng = () => number;

export const newGame = (): Game => ({
  phase: "idle", t: 0, bugs: [], score: 0, combo: 0, comboT: 0, lives: LIVES,
  squashed: 0, nextId: 1, spawnT: 0.6, bossSpawned: false, bossHp: BOSS_HP, flash: 0,
});

export const start = (g: Game) => Object.assign(g, newGame(), { phase: "run" as Phase });

export const multiplier = (g: Game) => 1 + Math.floor(g.combo / 4);

function spawnBug(g: Game, rng: Rng, boss = false) {
  let x: number;
  let z: number;
  if (boss) {
    x = -ARENA.x;
    z = -ARENA.z * 0.8;
  } else if (rng() < 0.65) {
    x = (rng() < 0.5 ? -1 : 1) * ARENA.x;
    z = (rng() * 2 - 1) * ARENA.z;
  } else {
    x = (rng() * 2 - 1) * ARENA.x;
    z = (rng() < 0.5 ? -1 : 1) * ARENA.z;
  }
  g.bugs.push({
    id: g.nextId++, x, z, boss, hp: boss ? BOSS_HP : 1, hurt: 0, wobble: rng() * 6.28,
    speed: boss ? 0.42 : (0.75 + Math.min(g.t, 30) * 0.02) * (0.85 + rng() * 0.35),
  });
}

/** Advance the game by dt seconds. Mutates g. */
export function step(g: Game, dt: number, rng: Rng = Math.random) {
  if (g.phase !== "run") return;
  g.t += dt;
  g.flash = Math.max(0, g.flash - dt);
  g.comboT -= dt;
  if (g.comboT <= 0) g.combo = 0;

  if (!g.bossSpawned && g.t >= WAVE_SECONDS) {
    g.bossSpawned = true;
    spawnBug(g, rng, true);
  }
  g.spawnT -= dt;
  if (g.spawnT <= 0) {
    spawnBug(g, rng);
    const interval = Math.max(0.42, 1.15 - g.t * 0.035);
    g.spawnT = interval * (g.bossSpawned ? 1.9 : 1);
  }

  for (let i = g.bugs.length - 1; i >= 0; i--) {
    const b = g.bugs[i];
    b.hurt = Math.max(0, b.hurt - dt);
    const d = Math.hypot(b.x, b.z) || 1;
    const px = -b.z / d;
    const pz = b.x / d;
    const sway = Math.sin(g.t * 5 + b.wobble) * 0.55;
    b.x += (-b.x / d * b.speed + px * sway) * dt;
    b.z += (-b.z / d * b.speed + pz * sway) * dt;
    if (Math.hypot(b.x, b.z) < (b.boss ? BOSS_CORE_R : CORE_R)) {
      g.bugs.splice(i, 1);
      g.combo = 0;
      g.flash = 0.35;
      g.lives = b.boss ? 0 : g.lives - 1;
    }
  }

  if (g.lives <= 0) g.phase = "lost";
  else if (g.bossSpawned && !g.bugs.some((b) => b.boss)) {
    g.score += 100 + g.lives * 50;
    g.phase = "won";
  } else if (g.t > WAVE_SECONDS + TIMEOUT_SECONDS) g.phase = "lost";
}

/** Squash a bug. Bosses take several hits. */
export function hit(g: Game, id: number): HitResult {
  if (g.phase !== "run") return "miss";
  const i = g.bugs.findIndex((b) => b.id === id);
  if (i < 0) return "miss";
  const b = g.bugs[i];
  b.hp -= 1;
  g.comboT = 1.6;
  if (b.boss) g.bossHp = Math.max(0, b.hp);
  if (b.hp > 0) {
    b.hurt = 0.18;
    g.score += 5;
    return "hit";
  }
  g.bugs.splice(i, 1);
  g.combo += 1;
  g.squashed += 1;
  g.score += (b.boss ? 150 : 10) * multiplier(g);
  return b.boss ? "boss-kill" : "kill";
}

/** The bug closest to the core, for keyboard players. */
export const nearest = (g: Game): Bug | undefined =>
  g.bugs.reduce<Bug | undefined>((best, b) => (!best || Math.hypot(b.x, b.z) < Math.hypot(best.x, best.z) ? b : best), undefined);
