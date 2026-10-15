"use client";

import { useEffect, useState } from "react";

export type Palette = { ac: string; coral: string; ink: string; card: string; card2: string; line: string; bg: string };

const DEFAULT: Palette = { ac: "#B6F24A", coral: "#FF8A78", ink: "#ECEBFA", card: "#181A30", card2: "#20233F", line: "#343862", bg: "#0F1020" };

function read(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ac: get("--ac", DEFAULT.ac), coral: get("--coral", DEFAULT.coral), ink: get("--ink", DEFAULT.ink),
    card: get("--card", DEFAULT.card), card2: get("--card2", DEFAULT.card2), line: get("--line", DEFAULT.line), bg: get("--bg", DEFAULT.bg),
  };
}

/** Live colours from the CSS tokens, so 3D scenes follow the theme and accent switcher. */
export function useThemeColors(): Palette {
  const [palette, setPalette] = useState<Palette>(DEFAULT);
  useEffect(() => {
    const update = () => setPalette(read());
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "data-theme"] });
    return () => mo.disconnect();
  }, []);
  return palette;
}
