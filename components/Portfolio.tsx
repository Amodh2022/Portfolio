"use client";

import { useEffect, useReducer, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { EXPERIENCE, PROFILE, QUESTS, SKILLS, type Repo } from "@/lib/data";
import { play } from "@/lib/sound";
import ContactForm from "./ContactForm";
import { ACCENTS, useSettings } from "./useSettings";

const MAX_XP = 200;
const TITLES = ["Rookie", "Apprentice", "Journeyman", "Specialist", "Veteran", "Legend"];
const COIN_DEFS = [
  { id: "c1", left: "4%", top: "64%" },
  { id: "c2", left: "47%", top: "8%" },
  { id: "c3", left: "91%", top: "70%" },
];
const MOTES = [
  { left: "8%", top: 520, coral: false, delay: 0 },
  { left: "22%", top: 640, coral: true, delay: 1.8 },
  { left: "47%", top: 560, coral: false, delay: 3.1 },
  { left: "63%", top: 690, coral: true, delay: 4.4 },
  { left: "81%", top: 540, coral: false, delay: 2.4 },
  { left: "93%", top: 660, coral: true, delay: 5.2 },
];
const MARQUEE_A = [PROFILE.role, "Open to work", "Build", "Ship", "Repeat"];
const MARQUEE_B = [PROFILE.name, "Player 1", "Level up", PROFILE.city];

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const SAVE_KEY = "pf-progress-v1";

const levelOf = (xp: number) => Math.min(6, Math.floor(xp / 40) + 1);

type State = {
  xp: number; cleared: Record<string, true>; active: string | null; skills: Record<string, number>;
  hits: number; coins: Record<string, true>; secret: boolean; gain: number; gainN: number; lvlN: number; lvlTo: number;
};
type Saved = Pick<State, "xp" | "cleared" | "skills" | "hits" | "coins" | "secret">;
type Action =
  | { type: "quest"; id: string }
  | { type: "skill"; id: string }
  | { type: "coin"; id: string }
  | { type: "poke" }
  | { type: "secret" }
  | { type: "load"; data: Saved }
  | { type: "reset" };

const initial: State = { xp: 0, cleared: {}, active: null, skills: {}, hits: 0, coins: {}, secret: false, gain: 0, gainN: 0, lvlN: 0, lvlTo: 1 };

function award(s: State, n: number): State {
  const xp = Math.min(MAX_XP, s.xp + n);
  const after = levelOf(xp);
  const up = after > levelOf(s.xp);
  return { ...s, xp, gain: n, gainN: s.gainN + 1, lvlN: up ? s.lvlN + 1 : s.lvlN, lvlTo: up ? after : s.lvlTo };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "quest": {
      const next = { ...s, active: s.active === a.id ? null : a.id };
      return s.cleared[a.id] ? next : award({ ...next, cleared: { ...s.cleared, [a.id]: true } }, 30);
    }
    case "skill": {
      const lv = s.skills[a.id] ?? 0;
      return lv >= 3 ? s : award({ ...s, skills: { ...s.skills, [a.id]: lv + 1 } }, 15);
    }
    case "coin":
      return s.coins[a.id] ? s : award({ ...s, coins: { ...s.coins, [a.id]: true } }, 5);
    case "secret":
      return s.secret ? s : award({ ...s, secret: true }, 20);
    case "load":
      return { ...initial, ...a.data };
    case "reset":
      return initial;
    case "poke": {
      const hits = s.hits + 1;
      return hits === 5 ? award({ ...s, hits }, 5) : { ...s, hits };
    }
  }
}

function loadSaved(): Saved | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null") as Partial<Saved> | null;
    if (!raw || typeof raw.xp !== "number") return null;
    const flags = (o: unknown) => (o && typeof o === "object" ? (o as Record<string, true>) : {});
    return {
      xp: Math.max(0, Math.min(MAX_XP, Math.round(raw.xp))),
      cleared: flags(raw.cleared),
      skills: Object.fromEntries(Object.entries(raw.skills ?? {}).map(([k, v]) => [k, Math.max(0, Math.min(3, Number(v) || 0))])),
      hits: Math.max(0, Number(raw.hits) || 0),
      coins: flags(raw.coins),
      secret: raw.secret === true,
    };
  } catch {
    return null;
  }
}

export default function Portfolio({ repos }: { repos: Repo[] }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const pageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { settings, toggleSound, toggleTheme, setAccent, cycleAccent } = useSettings();
  const soundOn = settings.sound;
  const [saveReady, setSaveReady] = useState(false);
  const konami = useRef(0);
  const seen = useRef({ gain: 0, lvl: 0, secret: false });

  // restore saved progress once, after hydration
  useEffect(() => {
    const saved = loadSaved();
    if (saved) dispatch({ type: "load", data: saved });
    setSaveReady(true);
  }, []);
  useEffect(() => {
    if (!saveReady) return;
    const { xp, cleared, skills, hits, coins, secret } = s;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ xp, cleared, skills, hits, coins, secret }));
    } catch {
      /* storage blocked: progress just won't persist */
    }
  }, [s, saveReady]);

  // sound effects for XP, level-ups and the secret
  useEffect(() => {
    const g = s.gainN !== seen.current.gain;
    const l = s.lvlN !== seen.current.lvl;
    const sec = s.secret && !seen.current.secret;
    seen.current = { gain: s.gainN, lvl: s.lvlN, secret: s.secret };
    if (!soundOn) return;
    if (sec) play("secret");
    else if (l && s.lvlN > 0) play("level");
    else if (g && s.gainN > 0) play("xp", s.gain);
  }, [s.gainN, s.lvlN, s.gain, s.secret, soundOn]);

  // konami code + single-key shortcuts (M sound, T theme, A accent)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input,textarea,select,[contenteditable]")) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konami.current = k === KONAMI[konami.current] ? konami.current + 1 : k === KONAMI[0] ? 1 : 0;
      if (konami.current === KONAMI.length) {
        konami.current = 0;
        dispatch({ type: "secret" });
      } else if (k === "m") toggleSound();
      else if (k === "t") toggleTheme();
      else if (k === "a") cycleAccent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSound, toggleTheme, cycleAccent]);

  const lvl = levelOf(s.xp);
  const skillLv = SKILLS.map((_, i) => s.skills["s" + i] ?? 0);
  const clearedCount = Object.keys(s.cleared).length;
  const badges = [
    { name: "First Blood", desc: "Open your first quest.", done: clearedCount >= 1 },
    { name: "Log Cleared", desc: `Open all ${QUESTS.length} quests.`, done: clearedCount >= QUESTS.length },
    { name: "Specialist", desc: "Max out any one skill.", done: skillLv.some((l) => l >= 3) },
    { name: "Well Rounded", desc: "Put at least one level in every skill.", done: skillLv.every((l) => l >= 1) },
    { name: "Bug Squasher", desc: `Poke the robot five times (${Math.min(s.hits, 5)}/5).`, done: s.hits >= 5 },
    { name: "Coin Collector", desc: "Grab all three coins floating in the hero.", done: Object.keys(s.coins).length >= 3 },
    { name: "Legend", desc: "Reach 200 XP and level 6.", done: s.xp >= MAX_XP },
    { name: "Konami Code", desc: "Up, up, down, down, left, right, left, right, B, A.", hint: "Some codes are older than the web.", done: s.secret },
  ];
  const badgesDone = badges.filter((b) => b.done).length;

  // Pointer position goes straight to CSS variables so moving the mouse never re-renders React.
  const aim = (e: MouseEvent<HTMLDivElement>) => {
    const el = pageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${Math.round(e.clientX - r.left)}px`);
    el.style.setProperty("--my", `${Math.round(e.clientY - r.top)}px`);
    el.style.setProperty("--pox", `${Math.round(50 + (e.clientX / window.innerWidth - 0.5) * 30)}%`);
    el.style.setProperty("--poy", `${Math.round(50 + (e.clientY / window.innerHeight - 0.5) * 30)}%`);
  };
  const tilt = (e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const tx = Math.round(-y * 160) / 10;
    const ty = Math.round(x * 180) / 10;
    card.style.setProperty("--tx", `${tx}deg`);
    card.style.setProperty("--ty", `${ty}deg`);
    card.style.setProperty("--sx", `${Math.round(8 - ty * 0.7)}px`);
    card.style.setProperty("--sy", `${Math.round(8 + tx * 0.7)}px`);
  };
  const untilt = () => {
    const card = cardRef.current;
    if (!card) return;
    ["--tx", "--ty", "--sx", "--sy"].forEach((p) => card.style.removeProperty(p));
  };

  return (
    <div ref={pageRef} className="page" onMouseMove={aim}>
      <Boot />
      <div
        aria-hidden
        className="spot"
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, mixBlendMode: "screen",
          background: "radial-gradient(circle 380px at var(--mx) var(--my), color-mix(in srgb, var(--ac) 14%, transparent), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="cursor-d"
        style={{ position: "absolute", left: 0, top: 0, width: 34, height: 34, margin: "-17px 0 0 -17px", border: "2px solid var(--ac)",
          pointerEvents: "none", zIndex: 20, mixBlendMode: "difference", transition: "transform .12s ease-out",
          transform: "translate(var(--mx), var(--my)) rotate(45deg)" }}
      />

      <header className="hud">
        <div className="hud-in">
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span className="pixel lvl">LV {lvl}</span>
            <span className="ttl">{TITLES[lvl - 1]}</span>
          </div>
          <div style={{ flex: "1 1 220px", minWidth: 160, display: "flex", alignItems: "center", gap: 12 }}>
            <div className="bar" role="progressbar" aria-label="Experience" aria-valuemin={0} aria-valuemax={MAX_XP} aria-valuenow={s.xp}>
              <div className="xpfill" style={{ width: `${Math.round((s.xp / MAX_XP) * 100)}%` }} />
            </div>
            <span style={{ fontSize: 13, color: "var(--mute)", minWidth: 76, textAlign: "right" }}>{s.xp} / {MAX_XP} XP</span>
          </div>
          <div style={{ minWidth: 84, height: 28, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            {s.gainN > 0 && <span key={s.gainN} className="gain">+{s.gain} XP</span>}
          </div>
          <div className="tools" role="group" aria-label="Display settings">
            <button type="button" className="tool" aria-pressed={soundOn} aria-label="Sound effects" title="Sound (M)"
              onClick={() => { if (!soundOn) play("click"); toggleSound(); }}>
              <svg viewBox="0 0 24 24" aria-hidden><path d="M3 9h4l5-4v14l-5-4H3z" />{soundOn ? <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" /> : <path d="M16 9l5 6M21 9l-5 6" />}</svg>
            </button>
            <button type="button" className="tool" aria-label={`Switch to ${settings.theme === "dark" ? "light" : "dark"} theme`} title="Theme (T)" onClick={toggleTheme}>
              <svg viewBox="0 0 24 24" aria-hidden>{settings.theme === "dark" ? <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /> : <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />}</svg>
            </button>
            {ACCENTS.map((a) => (
              <button key={a.id} type="button" className="swatch" style={{ "--sw": a.hex } as CSSProperties}
                aria-label={`${a.label} accent`} aria-pressed={settings.accent === a.hex} title="Accent (A)" onClick={() => setAccent(a.hex)} />
            ))}
          </div>
        </div>
        {s.lvlN > 0 && (
          <div className="levelup" aria-live="polite">
            <div key={s.lvlN}>
              {Array.from({ length: 14 }, (_, i) => (
                <span key={i} className="burst" style={{ background: i % 2 ? "var(--coral)" : "var(--ac)", "--a": `${Math.round((i * 360) / 14)}deg` } as CSSProperties} />
              ))}
              <div className="lvbox pixel">
                <div style={{ fontSize: 14, letterSpacing: ".2em" }}>LEVEL UP</div>
                <div style={{ fontSize: 34 }}>LV {s.lvlTo} {TITLES[s.lvlTo - 1]}</div>
              </div>
            </div>
          </div>
        )}
      </header>

      <Backdrop />
      {MOTES.map((m, i) => (
        <span key={i} className="mote" aria-hidden style={{ left: m.left, top: m.top, background: m.coral ? "var(--coral)" : "var(--ac)", animationDelay: `${m.delay}s` }} />
      ))}

      {/* HERO */}
      <section className="wrap hero">
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <p className="rise" style={{ margin: 0, fontSize: 14, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--coral)" }}>
            Player 1 ready<span className="cursor"> _</span>
          </p>
          <div className="sway">
            <h1 className="pixel rise d1">Hi, I&apos;m <span className="glitch">{PROFILE.name}</span>.</h1>
          </div>
          <p className="rise d2" style={{ margin: 0, fontSize: 18, maxWidth: 520, color: "var(--ink2)", textWrap: "pretty" }}>
            {PROFILE.role} with 3.5+ years shipping Flutter apps to the Play Store and App Store, now building AI tooling for developers. This page is a game: open quests, level up skills, and unlock every badge. Everything you touch earns XP.
          </p>
          <div className="rise d3" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <a className="cta" href="#quests">Press start</a>
            <a className="cta dark" href={PROFILE.github} target="_blank" rel="noreferrer" style={{ boxShadow: "5px 5px 0 var(--line)" }}>GitHub</a>
          </div>
        </div>

        <div className="rise d2" style={{ perspective: 1100 }} onMouseMove={tilt} onMouseLeave={untilt}>
          <div className="card" ref={cardRef}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--mute)" }}>
              <span>Player card</span>
              <span style={{ color: "var(--coral)" }}>{badgesDone} / {badges.length} badges</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <button type="button" onClick={() => { if (soundOn) play("click"); dispatch({ type: "poke" }); }} aria-label="Player sprite. Poke it for a surprise"
                style={{ background: "none", border: 0, padding: 8, cursor: "pointer", minWidth: 44, minHeight: 44 }}>
                <div className="bob">
                  <div key={s.hits} style={{ animation: s.hits ? "jolt .5s ease-out" : "none" }}>
                    <div className="scene" aria-hidden>
                      <div className="orbit">
                        <div className="ring" />
                        <span className="shard" style={{ left: 92, top: -8 }} />
                        <span className="shard" style={{ left: -8, top: 92, background: "var(--ac)" }} />
                        <span className="shard" style={{ left: 92, top: 192 }} />
                        <span className="shard" style={{ left: 192, top: 92, background: "var(--ac)" }} />
                      </div>
                      <div className="cube">
                        <div className="face f1"><span className="eyes"><i /><i /></span><span className="mouth" /></div>
                        <div className="face f2">&lt;/&gt;</div>
                        <div className="face f3">{"{ }"}</div>
                        <div className="face f4">01</div>
                        <div className="face f5">++</div>
                        <div className="face f6">[ ]</div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
            <dl style={{ margin: 0, display: "grid", gap: 10, fontSize: 15 }}>
              <div className="row"><dt style={{ color: "var(--mute)" }}>Class</dt><dd style={{ margin: 0, textAlign: "right" }}>{PROFILE.role}</dd></div>
              <div className="row"><dt style={{ color: "var(--mute)" }}>Base</dt><dd style={{ margin: 0, textAlign: "right" }}>{PROFILE.city}</dd></div>
              <div className="row"><dt style={{ color: "var(--mute)" }}>Status</dt><dd style={{ margin: 0, textAlign: "right", color: "var(--act)" }}>Open to Flutter, SDE-2 &amp; Mobile + AI roles</dd></div>
            </dl>
          </div>
        </div>

        {COIN_DEFS.filter((c) => !s.coins[c.id]).map((c) => (
          <button key={c.id} className="coinbtn bob" type="button" aria-label="Collect coin, plus 5 XP"
            style={{ left: c.left, top: c.top }} onClick={() => dispatch({ type: "coin", id: c.id })}>
            <span className="coin">XP</span>
          </button>
        ))}
      </section>

      {/* MARQUEE */}
      <div aria-hidden style={{ position: "relative", padding: "56px 0 88px", overflow: "hidden" }}>
        <div style={{ transform: "rotate(-3deg) scale(1.08)", background: "var(--ac)", color: "var(--on-ac)", borderTop: "2px solid var(--ink)", borderBottom: "2px solid var(--ink)", padding: "12px 0", marginBottom: 28 }}>
          <Marquee words={MARQUEE_A} />
        </div>
        <div style={{ transform: "rotate(2deg) scale(1.08)", background: "var(--bg2)", borderTop: "2px solid var(--line)", borderBottom: "2px solid var(--line)", padding: "10px 0" }}>
          <Marquee words={MARQUEE_B} className="rev outline" />
        </div>
      </div>

      {/* QUESTS */}
      <section id="quests" className="wrap s-bot" style={{ paddingTop: 56 }}>
        <div className="sec-head">
          <h2 className="pixel sec">Quest log</h2>
          <p>Open a quest to read the story. First clear: +30 XP.</p>
        </div>
        <div className="rv" style={{ display: "grid", gap: 24 }}>
          {QUESTS.map((q) => {
            const open = s.active === q.id;
            const done = !!s.cleared[q.id];
            return (
              <article key={q.id} className="quest tilt" style={{ borderColor: open ? "var(--ac)" : "var(--line)" }}>
                <button type="button" className="quest-btn" aria-expanded={open} onClick={() => dispatch({ type: "quest", id: q.id })}>
                  <span className="pixel" style={{ fontSize: 40, lineHeight: 1, color: "var(--coral)", minWidth: 64 }}>{q.num}</span>
                  <span style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span className="pixel" style={{ fontSize: 28, lineHeight: 1.15 }}>{q.title}</span>
                    <span style={{ fontSize: 15, color: "var(--ink2)", textWrap: "pretty" }}>{q.blurb}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>
                    <span style={{ padding: "4px 10px", background: done ? "var(--ac)" : "var(--card2)", color: done ? "var(--on-ac)" : "var(--ink)" }}>{done ? "Cleared" : "+30 XP"}</span>
                    <span style={{ color: "var(--act)", minWidth: 52, textAlign: "right" }}>{open ? "Close" : "Open"}</span>
                  </span>
                </button>
                {open && (
                  <div className="open" style={{ borderTop: "2px dashed var(--line)", padding: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 28 }}>
                    <div style={{ display: "grid", gap: 18 }}>
                      {([["The problem", q.problem], ["The build", q.build], ["The loot", q.loot]] as const).map(([k, v]) => (
                        <div key={k} style={{ display: "grid", gap: 2 }}>
                          <span className="eyebrow">{k}</span>
                          <span style={{ textWrap: "pretty" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                      <span className="eyebrow">Gear used</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {q.stack.map((t) => <span key={t} className="chipx">{t}</span>)}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 24px" }}>
                        <a className="link" href={q.repo} target="_blank" rel="noreferrer">View source &rarr;</a>
                        {q.demo && <a className="link" href={q.demo} target="_blank" rel="noreferrer">Live demo &rarr;</a>}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* EXPERIENCE */}
      <section id="experience" className="wrap" style={{ paddingTop: 0, paddingBottom: 96 }}>
        <div className="sec-head">
          <h2 className="pixel sec">Campaign map</h2>
          <p>Where I&apos;ve played so far.</p>
        </div>
        <ol className="rv timeline">
          {EXPERIENCE.map((r, i) => (
            <li key={r.org + r.period} className="stage">
              <span className="node pixel" aria-hidden>{String(i + 1).padStart(2, "0")}</span>
              <article className="quest tilt" style={{ padding: "24px 28px", display: "grid", gap: 18 }}>
                <header style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "4px 24px" }}>
                  <div>
                    <h3 className="pixel" style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>{r.title}</h3>
                    <p style={{ margin: 0, color: "var(--act)", fontWeight: 600 }}>{r.org}</p>
                  </div>
                  <span className="eyebrow">{r.period}</span>
                </header>
                <p style={{ margin: 0, color: "var(--ink2)", textWrap: "pretty" }}>{r.summary}</p>
                {r.highlights && (
                  <ul className="loot">
                    {r.highlights.map((h) => <li key={h}>{h}</li>)}
                  </ul>
                )}
                {r.stack && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {r.stack.map((t) => <span key={t} className="chipx">{t}</span>)}
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>
      </section>

      {/* SKILLS */}
      <section style={{ position: "relative", background: "var(--bg2)", borderTop: "2px solid var(--line)", borderBottom: "2px solid var(--line)" }}>
        <div className="wrap s-top s-bot">
          <div className="sec-head">
            <h2 className="pixel sec">Skill tree</h2>
            <p>Click a skill to level it up. Each level: +15 XP, three levels max.</p>
          </div>
          <div className="rv grid3">
            {SKILLS.map((sk, i) => {
              const lv = skillLv[i];
              const tags = ["Unranked", "Novice", "Adept", "Master"];
              return (
                <button key={sk.name} type="button" className="skill press" onClick={() => dispatch({ type: "skill", id: "s" + i })}
                  aria-label={`${sk.name}, ${tags[lv]}, level ${lv} of 3. ${lv < 3 ? "Activate to level up." : "Maxed out."}`}
                  style={{ border: `2px solid ${lv === 3 ? "var(--ac)" : "var(--line)"}` }}>
                  <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                    <span className="pixel" style={{ fontSize: 24, lineHeight: 1.1 }}>{sk.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: ".08em", color: lv === 3 ? "var(--act)" : "var(--mute)" }}>{lv === 3 ? "MAX" : `LV ${lv}/3`}</span>
                  </span>
                  <span style={{ display: "flex", gap: 6 }}>
                    {[0, 1, 2].map((n) => (
                      <span key={n} className="pip" style={{ background: n < lv ? "var(--ac)" : "var(--card2)", animation: n < lv ? "pip .6s cubic-bezier(.2,.8,.2,1)" : "none" }} />
                    ))}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--mute)" }}>{lv === 3 ? `Mastered. ${sk.note}` : lv === 0 ? "Click to unlock. +15 XP" : "Click to level up. +15 XP"}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* REPOS */}
      <section id="loot" className="wrap s-top">
        <div className="sec-head">
          <h2 className="pixel sec">Loot chest</h2>
          <p>Every public repo on <a href={PROFILE.github} target="_blank" rel="noreferrer" style={{ color: "var(--act)" }}>github.com/{PROFILE.githubUser}</a>.</p>
        </div>
        <div className="rv grid3">
          {repos.map((r) => (
            <a key={r.name} className="repo tilt" href={r.url} target="_blank" rel="noreferrer">
              <span className="pixel" style={{ fontSize: 20, lineHeight: 1.15, overflowWrap: "anywhere" }}>{r.name}</span>
              {r.description && <span style={{ fontSize: 14, color: "var(--ink2)" }}>{r.description}</span>}
              <span style={{ fontSize: 13, color: "var(--mute)", display: "flex", gap: 14 }}>
                {r.language && <span>{r.language}</span>}
                {r.stars > 0 && <span>&#9733; {r.stars}</span>}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* BADGES */}
      <section className="wrap s-top s-bot">
        <div className="sec-head">
          <h2 className="pixel sec">Badges</h2>
          <p>{badgesDone} of {badges.length} unlocked.</p>
        </div>
        <div className="rv grid3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))" }}>
          {badges.map((b, i) => (
            <div key={b.name} className="badge" style={{ border: `2px solid ${b.done ? "var(--ac)" : "var(--line)"}`, opacity: b.done ? 1 : 0.62, animation: b.done ? "unlock .7s ease-out" : "none" }}>
              <span className="pixel" style={{ flex: "none", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: b.done ? "var(--ac)" : "var(--card2)", color: b.done ? "var(--on-ac)" : "var(--mute)" }}>
                {b.done ? "✓" : i + 1}
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="pixel" style={{ fontSize: 22, lineHeight: 1.15 }}>{b.name}</span>
                <span style={{ fontSize: 14, color: "var(--ink2)", textWrap: "pretty" }}>{b.done ? b.desc : `Locked. ${"hint" in b && b.hint ? b.hint : b.desc}`}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section className="wrap s-bot">
        <div className="final tilt">
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase" }}>Final stage</p>
          <h2 className="pixel">Want to team up?</h2>
          <p style={{ margin: 0, fontSize: 18, maxWidth: 620, textWrap: "pretty" }}>
            I&apos;m open to Flutter Developer, Senior Mobile Engineer, SDE-2 and Mobile + AI roles in Bengaluru or remote. Send an invite and I&apos;ll get back to you.
          </p>
          {badgesDone === badges.length && <p className="open" style={{ margin: 0, fontWeight: 600 }}>Perfect run. You found every badge.</p>}
          <ContactForm email={PROFILE.email} />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 28px" }}>
            <a className="link" style={{ color: "inherit" }} href={PROFILE.github} target="_blank" rel="noreferrer">GitHub</a>
            {PROFILE.linkedin && <a className="link" style={{ color: "inherit" }} href={PROFILE.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
          </div>
        </div>
      </section>

      <footer className="wrap" style={{ paddingBottom: 56, display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px 24px", fontSize: 13, color: "var(--mute)" }}>
        <span>&copy; {new Date().getFullYear()} {PROFILE.name}</span>
        <span>
          Keys: M sound · T theme · A accent ·{" "}
          <button type="button" className="linkbtn" onClick={() => dispatch({ type: "reset" })}>Reset progress</button>
        </span>
      </footer>
    </div>
  );
}

function Boot() {
  return (
    <div className="boot" aria-hidden>
      <div style={{ width: "min(520px,86%)", color: "var(--act)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="type" style={{ "--w": "22ch", animationDelay: ".1s" } as CSSProperties}>&gt; booting portfolio.exe</div>
        <div className="type" style={{ "--w": "25ch", animationDelay: ".8s" } as CSSProperties}>&gt; loading quests ... OK</div>
        <div className="type" style={{ "--w": "28ch", animationDelay: "1.5s" } as CSSProperties}>&gt; spawning player 1 ... OK</div>
        <div style={{ height: 18, border: "2px solid var(--line)", marginTop: 14 }}><div className="bootbar" /></div>
      </div>
    </div>
  );
}

function Backdrop() {
  return (
    <>
      <div aria-hidden style={{ position: "absolute", left: 0, right: 0, top: 0, height: 900, overflow: "hidden", pointerEvents: "none" }}>
        <div className="floor" />
      </div>
      <div aria-hidden className="tunnel" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 900, overflow: "hidden", pointerEvents: "none", perspective: 900, perspectiveOrigin: "var(--pox) var(--poy)" }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transformStyle: "preserve-3d", animation: "fly 3s linear infinite" }}>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: -380, top: -380, width: 760, height: 760, transform: `translateZ(${-i * 160}px)` }}>
              <div style={{ width: "100%", height: "100%", border: "2px solid var(--ac)", opacity: Math.max(0.06, 0.38 - i * 0.04), animation: `tunspin ${26 + i * 4}s linear infinite ${i % 2 ? "reverse" : "normal"}` }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Marquee({ words, className = "" }: { words: string[]; className?: string }) {
  const set = (
    <div className="mset">
      {words.map((w, i) => (
        <span key={i} style={{ display: "contents" }}><span>{w}</span><span>&#9670;</span></span>
      ))}
    </div>
  );
  return <div className={`marq ${className}`}>{set}{set}</div>;
}
