"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

/** A pixel-style label (filled box, thick border, centred text) as a texture for a sprite. */
export function labelTexture(label: string, bg: string, fg: string, border: string, family: string, w = 256, h = 80) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(4, 4, w - 8, h - 8);
  g.lineWidth = 6;
  g.strokeStyle = border;
  g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = fg;
  g.font = `700 ${Math.round(h * 0.42)}px ${family}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(label, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
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
