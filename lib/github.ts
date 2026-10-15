import { FALLBACK_REPOS, PROFILE, isAssignment, type Repo } from "./data";

export async function getRepos(): Promise<Repo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${PROFILE.githubUser}/repos?per_page=100&sort=updated`,
      { next: { revalidate: 3600 }, headers: { Accept: "application/vnd.github+json" } },
    );
    if (!res.ok) return FALLBACK_REPOS;
    const data = (await res.json()) as Array<{
      name: string; description: string | null; language: string | null;
      html_url: string; stargazers_count: number; fork: boolean;
    }>;
    const repos = data
      .filter((r) => !r.fork && !isAssignment(r.name))
      .map((r) => ({ name: r.name, description: r.description, language: r.language, url: r.html_url, stars: r.stargazers_count }));
    return repos.length ? repos : FALLBACK_REPOS;
  } catch {
    return FALLBACK_REPOS;
  }
}
