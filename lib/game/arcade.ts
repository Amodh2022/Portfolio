/** Arcade cabinet: game ids and the score that counts as "cleared" (worth XP + the badge). */
export const ARCADE = [
  { id: "dash", title: "Dart Dash", goal: 300, blurb: "Endless runner. Jump bugs, duck bats, grab coins." },
  { id: "blast", title: "Bug Blaster", goal: 400, blurb: "Hold the line against waves of falling bugs." },
  { id: "match", title: "Stack Match", goal: 600, blurb: "Flip cards, pair the tech stack in as few moves as you can." },
] as const;
export type ArcadeId = (typeof ARCADE)[number]["id"];
