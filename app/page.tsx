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
                Main Hub
              </p>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
                Interactive
                <br />
                <span className="text-primary">Project Blog</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Embedded projects, animated demos, and deep-dives — all in one place.
              </p>
            </div>
          }
        >
          <Card className="w-full h-full bg-black/[0.96] relative overflow-hidden border-0">
            <SpotlightStatic className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
            <div className="flex h-full">
              <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
                <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                  Interactive 3D
                </h2>
                <p className="mt-3 text-neutral-300 max-w-xs text-sm leading-relaxed">
                  Bring your UI to life with beautiful 3D scenes and immersive animations.
                </p>
              </div>
              <div className="flex-1 relative">
                <SplineScene
                  scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                  className="w-full h-full"
                />
              </div>
            </div>
          </Card>
        </ContainerScroll>
      </section>

      {/* Bento Grid of posts */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">All Posts</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              {posts.length} project{posts.length !== 1 ? "s" : ""} embedded
            </p>
          </div>
        </div>
        <BentoGrid posts={posts} />
      </section>
    </>
  );
}
