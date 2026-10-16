"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

/** A pixel-style label (filled box, thick border, centred text) as a texture for a sprite. */
export function labelTexture(label: string, bg: string, fg: string, border: string, family: string, w = 512, h = 160) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  const b = Math.round(h * 0.05);
  g.fillRect(b, b, w - 2 * b, h - 2 * b);
  g.lineWidth = b * 1.5;
  g.strokeStyle = border;
  g.strokeRect(b, b, w - 2 * b, h - 2 * b);
  g.fillStyle = fg;
  g.font = `700 ${Math.round(h * 0.42)}px ${family}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The pixel font family set by next/font on <html>, once it has loaded. */
export function usePixelFont() {
  const [family, setFamily] = useState("monospace");
  useEffect(() => {
    const read = () => {
      const f = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim();
      if (f) setFamily(f);
    };
    read();
    void document.fonts?.ready.then(read);
  }, []);
  return family;
}
