export const PROFILE = {
  name: "Amodh Nadiger",
  role: "Flutter Developer",
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
    title: "fitgrid",
    blurb: "A Flutter data grid that measures its content instead of making you guess column widths.",
    problem: "Flutter data tables make you hard-code column widths and build a widget per cell, which gets slow on big data.",
    build: "Columns are sized from their content, and cells are painted by a custom RenderObject instead of being built as widgets.",
    loot: "Benchmarked from 1,000 up to 100,000 rows, with a live demo and a write-up on choosing a Flutter data table.",
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
    blurb: "An MCP server that lets an AI agent drive an Android device and read what a Flutter app is doing.",
    problem: "Coding agents can edit Flutter code but cannot see or touch the running app.",
    build: "A Python MCP server that taps, types, captures screenshots and logs, and maps what is on screen back to the Dart source that built it.",
    loot: "Closes the loop between an agent's edit and the real device.",
    stack: ["Python", "MCP", "Flutter", "Android"],
    repo: "https://github.com/Amodh2022/flutter-bridge-mcp",
  },
];

export const SKILLS: { name: string; note: string }[] = [
  { name: "Flutter", note: "Cross-platform apps, custom RenderObjects, hospital apps" },
  { name: "Dart", note: "Packages like fitgrid and local_first_sync" },
  { name: "BLoC / Cubit", note: "Per-feature state, no setState" },
  { name: "Python", note: "flutter-bridge-mcp" },
  { name: "TypeScript / Next.js", note: "This portfolio" },
  { name: "Docker", note: "Sue Me production deploys" },
];

export type Repo = { name: string; description: string | null; language: string | null; url: string; stars: number };

export const FALLBACK_REPOS: Repo[] = [
  "fitgrid", "group_court_room", "local_first_sync", "flutter-bridge-mcp", "askaide", "ostrum_assignment",
  "3f-assignment", "nowAppsAssignment", "atria_assignment", "Portfolio", "paywize_task_2", "paywize_task_1",
  "tasker", "news_app",
].map((name) => ({ name, description: null, language: null, url: `https://github.com/Amodh2022/${name}`, stars: 0 }));
