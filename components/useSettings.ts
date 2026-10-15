"use client";

import { useCallback, useEffect, useState } from "react";

export const ACCENTS = [
  { id: "lime", label: "Lime", hex: "#B6F24A" },
  { id: "teal", label: "Teal", hex: "#5FE3D0" },
  { id: "yellow", label: "Yellow", hex: "#FFC857" },
  { id: "pink", label: "Pink", hex: "#FF9EC4" },
] as const;

export type Settings = { theme: "dark" | "light"; accent: string; sound: boolean };

const KEY = "pf-settings";
const DEFAULTS: Settings = { theme: "dark", accent: ACCENTS[0].hex, sound: false };

function read(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Settings>;
    return {
      theme: raw.theme === "light" ? "light" : "dark",
      accent: ACCENTS.some((a) => a.hex === raw.accent) ? (raw.accent as string) : DEFAULTS.accent,
      sound: raw.sound === true,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Theme, accent colour and sound preference, persisted in localStorage. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSettings(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (settings.theme === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    root.style.setProperty("--ac", settings.accent);
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* storage blocked: preferences just won't persist */
    }
  }, [settings, ready]);

  const toggleSound = useCallback(() => setSettings((s) => ({ ...s, sound: !s.sound })), []);
  const toggleTheme = useCallback(() => setSettings((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" })), []);
  const setAccent = useCallback((accent: string) => setSettings((s) => ({ ...s, accent })), []);
  const cycleAccent = useCallback(
    () =>
      setSettings((s) => {
        const i = ACCENTS.findIndex((a) => a.hex === s.accent);
        return { ...s, accent: ACCENTS[(i + 1) % ACCENTS.length].hex };
      }),
    [],
  );

  return { settings, toggleSound, toggleTheme, setAccent, cycleAccent };
}
