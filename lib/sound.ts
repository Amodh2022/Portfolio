export type Sfx = "xp" | "level" | "secret" | "click";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType = "square", vol = 0.04) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + at;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Tiny 8-bit sound effects. Only call after the visitor has opted in. */
export function play(kind: Sfx, amount = 0) {
  const c = audio();
  if (!c) return;
  switch (kind) {
    case "click":
      tone(c, 330, 0, 0.07);
      break;
    case "xp": {
      const base = 520 + Math.min(amount, 30) * 12;
      tone(c, base, 0, 0.08);
      tone(c, base * 1.5, 0.08, 0.12);
      break;
    }
    case "level":
      [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.09, 0.14));
      tone(c, 1047, 0.4, 0.4, "triangle", 0.05);
      break;
    case "secret":
      [392, 523, 659, 784, 988, 1175, 1319, 1568].forEach((f, i) => tone(c, f, i * 0.06, 0.1, "square", 0.035));
      break;
  }
}
