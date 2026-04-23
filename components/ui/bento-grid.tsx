"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PostMeta } from "@/lib/posts";
import { ArrowUpRight, Calendar, Tag } from "lucide-react";

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" as const },
  }),
};

function PostCard({ post, index }: { post: PostMeta; index: number }) {
  const isWide = index % 5 === 0 || index % 5 === 3;
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={cardVariants}
      className={cn(
        "group relative col-span-1 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-xl",
        isWide ? "sm:col-span-2" : "sm:col-span-1"
      )}
    >
      {post.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnail}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity duration-500 group-hover:opacity-30"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      )}

      <Link href={`/posts/${post.slug}/`} className="relative z-10 flex h-full flex-col justify-between p-6 min-h-[200px]">
        <div>
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                <Tag className="size-3" />
                {tag}
              </span>
            ))}
          </div>
          <h3 className="text-xl font-bold leading-tight tracking-tight group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          {post.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.description}</p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {post.date}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Read post <ArrowUpRight className="size-3" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

export function BentoGrid({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p className="text-lg font-medium">No posts yet.</p>
        <p className="text-sm mt-1">Run <code className="font-mono bg-muted px-1 rounded">node scripts/embed-project.mjs</code> to add your first project.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
      {posts.map((post, i) => (
        <PostCard key={post.slug} post={post} index={i} />
      ))}
    </div>
  );
}
