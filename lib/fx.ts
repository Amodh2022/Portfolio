/** Tiny event bus so game events (XP, level-up, badges) can trigger 3D particle bursts without prop drilling. */
export type Burst = { x: number; y: number; count: number; colors: string[]; power?: number };

type Listener = (b: Burst) => void;
const listeners = new Set<Listener>();

export const onBurst = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const emitBurst = (b: Burst) => listeners.forEach((l) => l(b));

let pointer = { x: 0, y: 0 };
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", (e) => (pointer = { x: e.clientX, y: e.clientY }), { passive: true });
}
/** Where the visitor last pressed, in viewport pixels. Bursts from clicks start here. */
export const lastPointer = () => pointer;
