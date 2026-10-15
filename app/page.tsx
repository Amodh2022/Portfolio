import Portfolio from "@/components/Portfolio";
import { getRepos } from "@/lib/github";

export default async function Home() {
  const repos = await getRepos();
  return <Portfolio repos={repos} />;
}
