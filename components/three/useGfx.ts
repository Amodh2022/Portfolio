"use client";

import { useEffect, useState } from "react";

export type Gfx = { enabled: boolean; low: boolean };

/** Decides whether to render WebGL scenes, and whether to use the cheaper settings. */
export function useGfx(): Gfx {
  const [gfx, setGfx] = useState<Gfx>({ enabled: false, low: false });
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") ?? c.getContext("webgl");
      webgl = !!gl;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl = false;
    }
    const low = (navigator.hardwareConcurrency || 8) <= 4 || window.innerWidth < 720;
    setGfx({ enabled: !reduced && webgl, low });
  }, []);
  return gfx;
}
