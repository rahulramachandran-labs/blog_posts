"use client";
import { Suspense, lazy } from "react";
import type { PostMeta } from "@/lib/posts";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import Link from "next/link";

// Dynamic import — each post's index.tsx is loaded on demand
// The path must be resolvable at build time so we use a map generated
// from the posts directory. New posts added by embed-project trigger
// a new build which regenerates this client via generateStaticParams.
const postModules: Record<string, React.LazyExoticComponent<() => React.ReactElement>> = {
  welcome: lazy(() => import("@/posts/welcome/index")),
  // embed-project appends entries here automatically
};

function FallbackView({ slug }: { slug: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-4">
      <p className="text-lg font-medium">No render component found for &quot;{slug}&quot;</p>
      <p className="text-sm">
        Make sure <code className="font-mono bg-muted px-1 rounded">posts/{slug}/index.tsx</code> exports a default component
        and is registered in <code className="font-mono bg-muted px-1 rounded">app/posts/[slug]/post-client.tsx</code>.
      </p>
    </div>
  );
}

export function PostClient({ slug, post }: { slug: string; post: PostMeta }) {
  const PostComponent = postModules[slug];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Post header */}
      <div className="mx-auto max-w-4xl px-6 pt-10 pb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to hub
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight">{post.title}</h1>
        {post.description && (
          <p className="mt-2 text-lg text-muted-foreground">{post.description}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {post.date}
          </span>
          {post.tags.map((t) => (
            <span key={t} className="flex items-center gap-1">
              <Tag className="size-3" />
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t" />

      {/* Post content */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        {PostComponent ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24">
                <span className="loader" />
              </div>
            }
          >
            <PostComponent />
          </Suspense>
        ) : (
          <FallbackView slug={slug} />
        )}
      </div>
    </motion.div>
  );
}
