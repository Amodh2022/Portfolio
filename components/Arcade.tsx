"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ORBIT } from "@/lib/data";
import { ARCADE, type ArcadeId } from "@/lib/game/arcade";
import type { Sfx } from "@/lib/sound";

type Pal = { ac: string; coral: string; teal: string; ink: string; bg: string; card: string; line: string; mute: string };
type Input = { keys: Set<string>; px: number; tap: boolean; swipeDown: boolean };
type Base = { score: number; over: boolean };
type Sim<G extends Base> = {
  w: number;
  h: number;
  create: () => G;
  update: (g: G, dt: number, i: Input, sfx: (k: Sfx) => void) => void;
  draw: (c: CanvasRenderingContext2D, g: G, p: Pal) => void;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const hit = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const px = (c: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) => {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

function palette(): Pal {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return { ac: v("--ac", "#B6F24A"), coral: v("--coral", "#FF8A78"), teal: v("--teal", "#5FE3D0"), ink: v("--ink", "#ECEBFA"), bg: v("--bg2", "#0B0C19"), card: v("--card", "#181A30"), line: v("--line", "#343862"), mute: v("--mute", "#A9ACD6") };
}

function backdrop(c: CanvasRenderingContext2D, w: number, h: number, p: Pal, t: number, speed: number) {
  c.fillStyle = p.bg;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 28; i++) {
    const x = (((i * 97) % w) - t * speed * (0.1 + (i % 3) * 0.08) + w * 4) % w;
    px(c, p.line, x, (i * 53) % (h - 60), 2 + (i % 2) * 2, 2 + (i % 2) * 2);
  }
}

/* ---------- Dart Dash ---------- */
type Obs = { x: number; y: number; w: number; h: number; fly: boolean };
type Coin = { x: number; y: number; w: number; h: number };
type Dash = Base & { t: number; dist: number; coins: number; y: number; vy: number; duck: boolean; speed: number; obs: Obs[]; pickups: Coin[]; spawn: number };
const DW = 640, DH = 240, GROUND = 190;

const dash: Sim<Dash> = {
  w: DW,
  h: DH,
  create: () => ({ score: 0, over: false, t: 0, dist: 0, coins: 0, y: 0, vy: 0, duck: false, speed: 230, obs: [], pickups: [], spawn: 0.8 }),
  update(g, dt, i, sfx) {
    g.t += dt;
    g.speed = Math.min(520, 230 + g.t * 8);
    g.dist += g.speed * dt;
    const onGround = g.y <= 0;
    if ((i.keys.has("ArrowUp") || i.keys.has(" ") || i.keys.has("w") || i.tap) && onGround) {
      g.vy = 560;
      sfx("click");
    }
    i.tap = false;
    g.duck = onGround && (i.keys.has("ArrowDown") || i.keys.has("s") || i.swipeDown);
    if (!onGround && (i.keys.has("ArrowDown") || i.swipeDown)) g.vy -= 2400 * dt;
    g.vy -= 1500 * dt;
    g.y = Math.max(0, g.y + g.vy * dt);
    if (g.y === 0 && g.vy < 0) g.vy = 0;
    g.spawn -= dt;
    if (g.spawn <= 0) {
      g.spawn = rnd(0.75, 1.5) * (230 / g.speed) + 0.35;
      const r = Math.random();
      if (r < 0.28 && g.t > 6) g.obs.push({ x: DW + 20, y: GROUND - 36, w: 30, h: 16, fly: true });
      else if (r < 0.5) g.obs.push({ x: DW + 20, y: GROUND - 44, w: 24, h: 44, fly: false });
      else g.obs.push({ x: DW + 20, y: GROUND - 28, w: 30, h: 28, fly: false });
      if (Math.random() < 0.55) g.pickups.push({ x: DW + 120, y: GROUND - rnd(50, 110), w: 14, h: 14 });
    }
    const me = { x: 70, y: GROUND - g.y - (g.duck ? 20 : 36), w: 26, h: g.duck ? 20 : 36 };
    for (const o of g.obs) {
      o.x -= g.speed * dt;
      if (hit(me, { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 4 })) {
        g.over = true;
        sfx("lose");
      }
    }
    for (const c of g.pickups) {
      c.x -= g.speed * dt;
      if (hit(me, c)) {
        c.x = -99;
        g.coins++;
        sfx("hit");
      }
    }
    g.obs = g.obs.filter((o) => o.x > -50);
    g.pickups = g.pickups.filter((c) => c.x > -20);
    g.score = Math.floor(g.dist / 12) + g.coins * 5;
  },
  draw(c, g, p) {
    backdrop(c, DW, DH, p, g.dist / g.speed || 0, g.speed);
    px(c, p.line, 0, GROUND, DW, 3);
    for (let x = -((g.dist) % 40); x < DW; x += 40) px(c, p.line, x, GROUND + 14, 18, 3);
    for (const k of g.pickups) {
      px(c, p.ink, k.x, k.y, k.w, k.h);
      px(c, p.ac, k.x + 3, k.y + 3, k.w - 6, k.h - 6);
    }
    for (const o of g.obs) {
      if (o.fly) {
        const f = Math.floor(g.t * 10) % 2;
        px(c, p.teal, o.x, o.y + 4, o.w, 8);
        px(c, p.teal, o.x + 4, o.y + (f ? 0 : 10), 8, 6);
        px(c, p.teal, o.x + 18, o.y + (f ? 0 : 10), 8, 6);
        px(c, p.bg, o.x + 20, o.y + 6, 4, 4);
      } else {
        px(c, p.coral, o.x, o.y + 6, o.w, o.h - 10);
        px(c, p.coral, o.x + 4, o.y, o.w - 8, 8);
        px(c, p.bg, o.x + 6, o.y + 10, 5, 5);
        px(c, p.bg, o.x + o.w - 11, o.y + 10, 5, 5);
        const f = Math.floor(g.t * 12) % 2;
        px(c, p.coral, o.x - 3, o.y + o.h - 4 + (f ? 0 : 2), 4, 4);
        px(c, p.coral, o.x + o.w - 1, o.y + o.h - 4 + (f ? 2 : 0), 4, 4);
      }
    }
    const h = g.duck ? 20 : 36;
    const y = GROUND - g.y - h;
    const step = g.y <= 0 && Math.floor(g.t * 14) % 2;
    px(c, p.ac, 70, y + 10, 26, h - 14);
    px(c, p.ink, 66, y, 34, Math.min(18, h - 6));
    px(c, p.bg, 76, y + 5, 5, 5);
    px(c, p.bg, 88, y + 5, 5, 5);
    px(c, p.coral, 82, y - 6, 4, 6);
    px(c, p.ink, 70, y + h - 4 + (step ? -3 : 0), 8, 4);
    px(c, p.ink, 88, y + h - 4 + (step ? 0 : -3), 8, 4);
  },
};

/* ---------- Bug Blaster ---------- */
type Foe = { x: number; y: number; alive: boolean; row: number };
type Shot = { x: number; y: number };
type Blast = Base & { t: number; x: number; lives: number; foes: Foe[]; dir: number; bullets: Shot[]; evil: Shot[]; fire: number; ecd: number; wave: number; inv: number };
const BW = 640, BH = 360, COLS = 9, ROWS = 4;

function wave(n: number): Foe[] {
  const f: Foe[] = [];
  for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) f.push({ x: 70 + k * 46, y: 40 + r * 32 + Math.min(n - 1, 3) * 6, alive: true, row: r });
  return f;
}

const blast: Sim<Blast> = {
  w: BW,
  h: BH,
  create: () => ({ score: 0, over: false, t: 0, x: BW / 2, lives: 3, foes: wave(1), dir: 1, bullets: [], evil: [], fire: 0, ecd: 1.2, wave: 1, inv: 0 }),
  update(g, dt, i, sfx) {
    g.t += dt;
    g.inv = Math.max(0, g.inv - dt);
    const L = i.keys.has("ArrowLeft") || i.keys.has("a");
    const R = i.keys.has("ArrowRight") || i.keys.has("d");
    if (L || R) {
      g.x += ((R ? 1 : 0) - (L ? 1 : 0)) * 340 * dt;
      i.px = -1;
    } else if (i.px >= 0) g.x += (i.px - g.x) * Math.min(1, dt * 14);
    g.x = Math.max(20, Math.min(BW - 20, g.x));
    g.fire -= dt;
    if (g.fire <= 0) {
      g.fire = 0.28;
      g.bullets.push({ x: g.x, y: BH - 44 });
      sfx("step");
    }
    const alive = g.foes.filter((f) => f.alive);
    if (!alive.length) {
      g.wave++;
      g.foes = wave(g.wave);
      g.dir = 1;
      g.bullets = [];
      g.evil = [];
      g.score += 50;
      sfx("win");
      return;
    }
    const v = (34 + g.wave * 12 + (1 - alive.length / g.foes.length) * 90) * g.dir;
    const minX = Math.min(...alive.map((f) => f.x));
    const maxX = Math.max(...alive.map((f) => f.x));
    const edge = (g.dir > 0 && maxX > BW - 36) || (g.dir < 0 && minX < 36);
    for (const f of alive) {
      if (edge) f.y += 14;
      else f.x += v * dt;
      if (f.y > BH - 74) {
        g.over = true;
        sfx("lose");
      }
    }
    if (edge) g.dir *= -1;
    g.ecd -= dt;
    if (g.ecd <= 0) {
      g.ecd = Math.max(0.4, 1.2 - g.wave * 0.1) * rnd(0.6, 1.2);
      const s = alive[Math.floor(Math.random() * alive.length)];
      g.evil.push({ x: s.x, y: s.y + 14 });
    }
    for (const b of g.bullets) {
      b.y -= 480 * dt;
      for (const f of alive) {
        if (f.alive && b.y > 0 && hit({ x: b.x - 2, y: b.y, w: 4, h: 10 }, { x: f.x - 14, y: f.y, w: 28, h: 20 })) {
          f.alive = false;
          b.y = -99;
          g.score += 10 * g.wave;
          sfx("hit");
        }
      }
    }
    for (const e of g.evil) {
      e.y += (150 + g.wave * 14) * dt;
      if (!g.inv && hit({ x: e.x - 3, y: e.y, w: 6, h: 10 }, { x: g.x - 16, y: BH - 38, w: 32, h: 22 })) {
        e.y = BH + 99;
        g.lives--;
        g.inv = 1.4;
        sfx("lose");
        if (g.lives <= 0) g.over = true;
      }
    }
    g.bullets = g.bullets.filter((b) => b.y > -20);
    g.evil = g.evil.filter((e) => e.y < BH + 20);
  },
  draw(c, g, p) {
    backdrop(c, BW, BH, p, g.t, 10);
    for (const f of g.foes) {
      if (!f.alive) continue;
      const col = f.row === 0 ? p.teal : f.row % 2 ? p.coral : p.ac;
      const fl = Math.floor(g.t * 3) % 2;
      px(c, col, f.x - 12, f.y + 4, 24, 12);
      px(c, col, f.x - 8, f.y, 16, 6);
      px(c, p.bg, f.x - 7, f.y + 7, 4, 4);
      px(c, p.bg, f.x + 3, f.y + 7, 4, 4);
      px(c, col, f.x - 14, f.y + 14 + fl * 3, 4, 5);
      px(c, col, f.x + 10, f.y + 14 + (1 - fl) * 3, 4, 5);
    }
    for (const b of g.bullets) px(c, p.ac, b.x - 2, b.y, 4, 10);
    for (const e of g.evil) px(c, p.coral, e.x - 3, e.y, 6, 10);
    if (!g.inv || Math.floor(g.t * 14) % 2) {
      px(c, p.ink, g.x - 16, BH - 30, 32, 14);
      px(c, p.ac, g.x - 10, BH - 38, 20, 10);
      px(c, p.coral, g.x - 3, BH - 46, 6, 8);
    }
    for (let i = 0; i < g.lives; i++) px(c, p.coral, 14 + i * 18, BH - 18, 12, 8);
    c.fillStyle = p.mute;
    c.font = "14px monospace";
    c.textAlign = "right";
    c.fillText(`WAVE ${g.wave}`, BW - 12, BH - 12);
  },
};

/* ---------- canvas host ---------- */
function CanvasGame<G extends Base>({ sim, id, goal, best, onSfx, onEnd }: { sim: Sim<G>; id: ArcadeId; goal: number; best: number; onSfx: (k: Sfx) => void; onEnd: (id: ArcadeId, score: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef<G>(sim.create());
  const input = useRef<Input>({ keys: new Set(), px: -1, tap: false, swipeDown: false });
  const [phase, setPhase] = useState<"idle" | "run" | "over">("idle");
  const [hud, setHud] = useState(0);
  const [last, setLast] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const visible = useRef(false);

  const begin = useCallback(() => {
    g.current = sim.create();
    input.current = { keys: new Set(), px: -1, tap: false, swipeDown: false };
    setPhase("run");
    wrap.current?.focus({ preventScroll: true });
  }, [sim]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const canvas = cv.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let pal = palette();
    const fit = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const cssW = canvas.clientWidth;
      const ratio = (cssW * dpr) / sim.w;
      canvas.width = Math.round(sim.w * ratio);
      canvas.height = Math.round(sim.h * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    let raf = 0;
    let prev = performance.now();
    let hudT = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (now - prev) / 1000);
      prev = now;
      if (!visible.current && phaseRef.current !== "idle") return;
      const gm = g.current;
      if (phaseRef.current === "run") {
        sim.update(gm, dt, input.current, onSfx);
        hudT += dt;
        if (hudT > 0.1) {
          hudT = 0;
          setHud(gm.score);
        }
        if (gm.over) {
          setHud(gm.score);
          setLast(gm.score);
          setPhase("over");
          onEnd(id, gm.score);
        }
      }
      sim.draw(ctx, gm, pal);
    };
    raf = requestAnimationFrame(loop);
    const mo = new MutationObserver(() => (pal = palette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [sim, id, onSfx, onEnd]);

  const down = useRef<{ x: number; y: number } | null>(null);
  const toLogical = (e: React.PointerEvent) => {
    const r = cv.current!.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * sim.w;
  };

  return (
    <div
      ref={wrap}
      className="arena arcade-screen"
      tabIndex={0}
      onKeyDown={(e) => {
        if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
        if (phaseRef.current !== "run" && (e.key === " " || e.key === "Enter")) return begin();
        input.current.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      }}
      onKeyUp={(e) => input.current.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)}
      onBlur={() => input.current.keys.clear()}
      style={{ aspectRatio: `${sim.w} / ${sim.h}`, height: "auto" }}
    >
      <canvas
        ref={cv}
        className="arcade-canvas"
        onPointerDown={(e) => {
          wrap.current?.focus({ preventScroll: true });
          down.current = { x: e.clientX, y: e.clientY };
          input.current.px = toLogical(e);
          if (phaseRef.current === "run") input.current.tap = true;
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse" || down.current) input.current.px = toLogical(e);
          if (down.current && e.clientY - down.current.y > 28) input.current.swipeDown = true;
        }}
        onPointerUp={() => {
          down.current = null;
          input.current.swipeDown = false;
        }}
        onPointerLeave={() => {
          input.current.swipeDown = false;
          if (id === "blast") input.current.px = -1;
        }}
      />
      <div className="arena-hud" aria-live="off">
        <div className="hud-box"><span className="pixel">{hud}</span><span style={{ fontSize: 12, color: "var(--mute)" }}>SCORE</span></div>
        <div className="hud-box mid"><span style={{ fontSize: 12, color: "var(--mute)" }}>GOAL {goal}</span></div>
        <div className="hud-box right"><span style={{ fontSize: 12, color: "var(--mute)" }}>BEST {Math.max(best, last)}</span></div>
      </div>
      {phase !== "run" && (
        <div className="arena-over">
          <div className="arena-card">
            <h3 className="pixel">{phase === "idle" ? "Ready?" : last >= goal ? "Cleared!" : "Game over"}</h3>
            {phase === "over" && <p>Score {last}. {last >= goal ? "Goal beaten." : `Reach ${goal} to clear it.`}</p>}
            <button type="button" className="cta" onClick={begin}>{phase === "idle" ? "Start" : "Play again"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Stack Match (DOM) ---------- */
function Match({ goal, best, onSfx, onEnd }: { goal: number; best: number; onSfx: (k: Sfx) => void; onEnd: (id: ArcadeId, score: number) => void }) {
  const mk = useCallback(() => {
    const labels = [...ORBIT].sort(() => Math.random() - 0.5).slice(0, 8);
    return [...labels, ...labels].sort(() => Math.random() - 0.5).map((l, i) => ({ id: i, l }));
  }, []);
  const [deck, setDeck] = useState<{ id: number; l: string }[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const lock = useRef(false);
  useEffect(() => setDeck(mk()), [mk]);
  const reset = () => {
    setDeck(mk());
    setOpen([]);
    setDone(new Set());
    setMoves(0);
    setScore(null);
    lock.current = false;
  };
  const flip = (i: number) => {
    if (lock.current || open.includes(i) || done.has(i) || score !== null) return;
    onSfx("click");
    const o = [...open, i];
    setOpen(o);
    if (o.length < 2) return;
    const m = moves + 1;
    setMoves(m);
    lock.current = true;
    const ok = deck[o[0]].l === deck[o[1]].l;
    setTimeout(() => {
      lock.current = false;
      setOpen([]);
      if (!ok) return;
      onSfx("hit");
      const d = new Set(done);
      o.forEach((x) => d.add(x));
      setDone(d);
      if (d.size === deck.length) {
        const sc = Math.max(100, 1000 - (m - 8) * 50);
        setScore(sc);
        onSfx(sc >= goal ? "win" : "lose");
        onEnd("match", sc);
      }
    }, ok ? 280 : 700);
  };
  return (
    <div className="arena match" style={{ height: "auto", padding: 20 }}>
      <div className="match-top">
        <span className="pixel">MOVES {moves}</span>
        <span style={{ fontSize: 13, color: "var(--mute)" }}>GOAL {goal} (about 16 moves or fewer) · BEST {best}</span>
        <button type="button" className="arena-pause" style={{ position: "static" }} onClick={reset}>Shuffle</button>
      </div>
      <div className="match-grid">
        {deck.map((c, i) => {
          const up = open.includes(i) || done.has(i);
          return (
            <button key={c.id} type="button" className={`mcard${up ? " up" : ""}${done.has(i) ? " ok" : ""}`} aria-label={up ? c.l : "Hidden card"} onClick={() => flip(i)}>
              {up ? c.l : "?"}
            </button>
          );
        })}
      </div>
      {score !== null && (
        <div className="arena-over">
          <div className="arena-card">
            <h3 className="pixel">{score >= goal ? "Cleared!" : "Done"}</h3>
            <p>Score {score} in {moves} moves.</p>
            <button type="button" className="cta" onClick={reset}>Play again</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- cabinet ---------- */
export default function Arcade({ best, onSfx, onEnd }: { best: Record<string, number>; onSfx: (k: Sfx) => void; onEnd: (id: ArcadeId, score: number) => void }) {
  const [tab, setTab] = useState<ArcadeId>("dash");
  const cur = useMemo(() => ARCADE.find((a) => a.id === tab)!, [tab]);
  return (
    <div>
      <div className="arcade-tabs" role="tablist" aria-label="Arcade games">
        {ARCADE.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={tab === a.id} className={`arcade-tab${tab === a.id ? " on" : ""}`} onClick={() => setTab(a.id)}>
            <span className="pixel">{a.title}</span>
            <span>{(best[a.id] ?? 0) >= a.goal ? "✓ cleared" : `best ${best[a.id] ?? 0}`}</span>
          </button>
        ))}
      </div>
      <p className="arena-note" style={{ margin: "0 0 12px" }}>{cur.blurb}</p>
      {tab === "dash" && <CanvasGame key="dash" sim={dash} id="dash" goal={cur.goal} best={best.dash ?? 0} onSfx={onSfx} onEnd={onEnd} />}
      {tab === "blast" && <CanvasGame key="blast" sim={blast} id="blast" goal={cur.goal} best={best.blast ?? 0} onSfx={onSfx} onEnd={onEnd} />}
      {tab === "match" && <Match key="match" goal={cur.goal} best={best.match ?? 0} onSfx={onSfx} onEnd={onEnd} />}
      <p className="arena-note">
        {tab === "dash" && <>Keys: <kbd>Space</kbd>/<kbd>↑</kbd> jump, <kbd>↓</kbd> duck. Touch: tap to jump, swipe down to duck.</>}
        {tab === "blast" && <>Keys: <kbd>←</kbd> <kbd>→</kbd> or move the mouse or finger. Your ship fires automatically.</>}
        {tab === "match" && <>Click two cards to flip them. Clear a game for +25 XP.</>}
      </p>
    </div>
  );
}
