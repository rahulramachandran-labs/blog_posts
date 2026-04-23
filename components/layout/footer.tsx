import { GitFork } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-8 mt-16">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Main Hub</span>
        <a
          href="https://github.com/rahulramachandran-labs/blog_posts"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <GitFork className="size-4" />
          Source
        </a>
      </div>
    </footer>
  );
}
