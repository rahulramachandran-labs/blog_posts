import fs from "fs";
import path from "path";

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  thumbnail?: string;
  splineScene?: string;
}

const postsDir = path.join(process.cwd(), "posts");

export function getPosts(): PostMeta[] {
  if (!fs.existsSync(postsDir)) return [];

  return fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const metaPath = path.join(postsDir, d.name, "metadata.json");
      const base: PostMeta = {
        slug: d.name,
        title: d.name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "",
        date: new Date().toISOString().split("T")[0],
        tags: [],
      };
      if (!fs.existsSync(metaPath)) return base;
      try {
        const raw = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        return { ...base, ...raw, slug: d.name };
      } catch {
        return base;
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): PostMeta | null {
  const all = getPosts();
  return all.find((p) => p.slug === slug) ?? null;
}
