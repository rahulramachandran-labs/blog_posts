import { getPosts } from "@/lib/posts";
import { BentoGrid } from "@/components/ui/bento-grid";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { SplineScene } from "@/components/ui/spline-scene";
import { SpotlightStatic } from "@/components/ui/spotlight";
import { Card } from "@/components/ui/card";

export default function Home() {
  const posts = getPosts();

  return (
    <>
      {/* Hero — ContainerScroll wrapping the Spline 3D card */}
      <section className="overflow-hidden">
        <ContainerScroll
          titleComponent={
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Rahul R — Labs
              </p>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
                Building
                <br />
                <span className="text-primary">AI-Powered Systems</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Engineering experiments in cloud, data, and AI — by a Senior Director of Software Engineering building in public.
              </p>
              <div className="flex flex-col items-center gap-1 pt-1">
                <p className="text-sm font-semibold text-foreground">Rahul R</p>
                <p className="text-xs text-muted-foreground">Senior Director of Software Engineering · Building AI-Powered Systems</p>
                <div className="flex items-center gap-4 mt-1 text-xs">
                  <a href="https://www.linkedin.com/in/rahulmenon91/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn ↗</a>
                  <a href="https://github.com/rahulramachandran-labs" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub ↗</a>
                  <a href="https://rahulramachandran-labs.github.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Portfolio ↗</a>
                </div>
              </div>
            </div>
          }
        >
          <Card className="w-full h-full bg-black/[0.96] relative overflow-hidden border-0">
            <SpotlightStatic className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </Card>
        </ContainerScroll>
      </section>

      {/* Bento Grid of posts */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">All Posts</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {posts.length} posts · more coming
            </p>
          </div>
        </div>
        <BentoGrid posts={posts} />

        <div className="mt-10 flex items-center justify-center gap-5 text-sm text-muted-foreground">
          <span>Stay updated →</span>
          <a href="https://github.com/rahulramachandran-labs" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Watch on GitHub ↗</a>
          <a href="https://www.linkedin.com/in/rahulmenon91/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Follow on LinkedIn ↗</a>
        </div>
      </section>
    </>
  );
}
