export const PROFILE = {
  name: "Amodh Nadiger",
  role: "Software Engineer",
  city: "Bengaluru",
  github: "https://github.com/Amodh2022",
  githubUser: "Amodh2022",
  email: "amodh.dvg890@gmail.com",
  linkedin: "",
};

export type Quest = {
  id: string;
  num: string;
  title: string;
  blurb: string;
  problem: string;
  build: string;
  loot: string;
  stack: string[];
  repo: string;
  demo?: string;
};

export const QUESTS: Quest[] = [
  {
    id: "q1",
    num: "01",
    title: "fitgrid_table",
    blurb: "A Flutter data grid that paints cells instead of building widgets: 1M rows render in about 42ms on the first frame.",
    problem: "Flutter data tables make you hard-code column widths and build a widget per cell, which gets slow on big data.",
    build: "Columns are sized from their content, and cells are painted by a custom RenderObject instead of being built as widgets.",
    loot: "1M rows render in about 42ms on the first frame. Benchmarked from 1,000 rows up, with a live demo and a write-up on choosing a Flutter data table.",
    stack: ["Dart", "Flutter", "RenderObject", "Vercel"],
    repo: "https://github.com/Amodh2022/fitgrid",
    demo: "https://fitgrid-e734.vercel.app/demo/",
  },
  {
    id: "q2",
    num: "02",
    title: "local_first_sync",
    blurb: "A local-first sync framework for Dart and Flutter with no runtime dependencies.",
    problem: "Apps that need to work offline end up with ad-hoc queues that lose writes and tangle ordering.",
    build: "Writes land locally at once and sync in the background, with dependency-ordered operations, temp-id to server-id rewriting and pluggable conflict resolution.",
    loot: "A crash-safe queue, opt-in pull-sync, and a built-in Sync Inspector for debugging. Works with any state management.",
    stack: ["Dart", "Flutter", "Offline-first", "Sync"],
    repo: "https://github.com/Amodh2022/local_first_sync",
  },
  {
    id: "q3",
    num: "03",
    title: "Sue Me",
    blurb: "An AI party game where a group chat files cases, a jury votes and a comedy judge rules.",
    problem: "Group chats are full of harmless disagreements that nobody ever settles properly.",
    build: "Every case is a live group chat: plaintiff, accused and jury talk in it, then an LLM-powered Judge Byte rules, and may overrule the jury.",
    loot: "A full-stack game with a Flutter client, a backend and a Docker + Caddy production setup.",
    stack: ["Dart", "Flutter", "LLM", "Docker", "Caddy"],
    repo: "https://github.com/Amodh2022/group_court_room",
  },
  {
    id: "q4",
    num: "04",
    title: "flutter-bridge-mcp",
    blurb: "An MCP server that lets AI coding agents (Claude Code, Gemini) map a screen tap to the exact Dart file and line.",
    problem: "Coding agents can edit Flutter code but cannot see or touch the running app.",
    build: "A Python MCP server that taps, types, captures screenshots and logs, maps what is on screen back to the Dart source that built it, then hot-reloads and verifies the fix.",
    loot: "Closes the loop between an agent's edit and the real device.",
    stack: ["Python", "MCP", "Flutter", "Claude Code", "Gemini"],
    repo: "https://github.com/Amodh2022/flutter-bridge-mcp",
  },
];

export type Role = {
  org: string;
  short: string;
  title: string;
  period: string;
  summary: string;
  highlights?: string[];
  stack?: string[];
};

export const EXPERIENCE: Role[] = [
  {
    org: "Meril",
    short: "Meril",
    title: "SDE-1",
    period: "Sep 2025 - Present",
    summary: "Building the Flutter hospital app used for outpatient and inpatient care, from the appointment queue to the operating theatre.",
    highlights: [
      "Shipped outpatient flows: appointment queue, pre-consultation and template-driven initial assessments.",
      "Built inpatient modules: new admissions, ward and bed board, patient journey, doctors' and nurses' notes, and the OT module.",
      "Integrated a Bluetooth vitals monitor (HC03) with native BLE so vitals flow straight into the patient record.",
      "Added voice dictation for clinical notes, one engine reused across many form fields.",
      "Introduced a light/dark theming system and moved the codebase from setState to Cubit-based state management.",
    ],
    stack: ["Flutter", "Dart", "BLoC / Cubit", "REST APIs", "Native BLE", "Kotlin"],
  },
  {
    org: "Miles Education",
    short: "Miles",
    title: "Flutter Developer",
    period: "Mar 2025 - Aug 2025",
    summary: "Flutter developer on production mobile apps for Android and iOS.",
  },
  {
    org: "Agathsya Technologies Pvt Ltd",
    short: "Agathsya",
    title: "Associate Software Engineer",
    period: "Feb 2024 - Feb 2025",
    summary: "Started my career building Flutter apps, taking them from first commit to Play Store and App Store release.",
  },
  {
    org: "Dimension64 Consulting Private Limited",
    short: "Dimension64",
    title: "Software Developer",
    period: "Mar 2023 - Feb 2024",
    summary: "My first role as a software developer, in Bengaluru.",
  },
];

export const SKILLS: { name: string; note: string }[] = [
  { name: "Flutter & Dart", note: "Production apps from first commit to release" },
  { name: "iOS & Android", note: "Shipped to the Play Store and App Store" },
  { name: "Kotlin & native", note: "Native Android and BLE bridges for Flutter" },
  { name: "State management", note: "BLoC, Riverpod, Provider and GetX" },
  { name: "Firebase & REST", note: "Production APIs, auth and real-time data" },
  { name: "Offline-first", note: "Isolates, background work and local_first_sync" },
  { name: "AI & LLM", note: "Language-model features in real apps" },
  { name: "MCP & agents", note: "Tooling for Claude Code and Gemini" },
  { name: "Python & TypeScript", note: "MCP servers and this Next.js portfolio" },
];

/** Labels carried by the rotating ring around the hero sprite. */
export const ORBIT = ["Flutter", "Dart", "iOS", "Android", "Kotlin", "AI", "LLM", "MCP", "Firebase", "Python"];
export const ORBIT_AI = new Set(["AI", "LLM", "MCP"]);

export const AI_LAB: { title: string; text: string; link?: { label: string; href: string } }[] = [
  {
    title: "LLM integrations",
    text: "Language-model features built into real apps. In Sue Me, an LLM plays Judge Byte: it reads both sides, hears the jury and hands down the verdict.",
    link: { label: "See Sue Me", href: "https://github.com/Amodh2022/group_court_room" },
  },
  {
    title: "MCP servers",
    text: "flutter-bridge-mcp gives AI coding agents eyes and hands on a real device: tap, type, read logs, then map what's on screen to the exact Dart file and line.",
    link: { label: "See flutter-bridge-mcp", href: "https://github.com/Amodh2022/flutter-bridge-mcp" },
  },
  {
    title: "Agent-assisted building",
    text: "Claude Code and Gemini are part of my daily workflow. The agent edits, hot-reloads and verifies the fix on the running app instead of guessing.",
  },
];

export type Repo = { name: string; description: string | null; language: string | null; url: string; stars: number };

/** Interview take-home assignments aren't portfolio projects. */
export const isAssignment = (name: string) => /assignment|^paywize_task/i.test(name);

export const FALLBACK_REPOS: Repo[] = [
  "fitgrid", "group_court_room", "local_first_sync", "flutter-bridge-mcp", "askaide", "Portfolio", "tasker", "news_app",
].map((name) => ({ name, description: null, language: null, url: `https://github.com/Amodh2022/${name}`, stars: 0 }));
