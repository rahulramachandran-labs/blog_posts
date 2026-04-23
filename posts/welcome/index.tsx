"use client";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { Shield, Zap, Package } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Folder-Based Posts",
    body: "Every subfolder in /posts becomes a standalone blog entry. Drop in an index.tsx and metadata.json and you're live.",
  },
  {
    icon: Zap,
    title: "Animated Bento Grid",
    body: "The home page scans /posts at build time and renders each as an animated card using framer-motion.",
  },
  {
    icon: Shield,
    title: "embed-project CLI",
    body: "Run node scripts/embed-project.mjs to migrate any external project into a new post — import paths fixed automatically.",
  },
];

export default function WelcomePost() {
  return (
    <div className="space-y-12">
      {/* Spline-style hero card */}
      <Card className="w-full min-h-[300px] bg-black/[0.96] relative overflow-hidden">
        <Spotlight className="from-purple-200 via-purple-100 to-purple-50" size={300} />
        <CardContent className="relative z-10 flex flex-col items-center justify-center min-h-[300px] text-center gap-4 pt-6">
          <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Hello, Main Hub
          </h2>
          <p className="text-neutral-300 max-w-lg text-sm leading-relaxed">
            This is your first embedded post. Edit{" "}
            <code className="font-mono bg-white/10 px-1 rounded">posts/welcome/index.tsx</code> to
            customise it, or run the embed-project CLI to import a real project.
          </p>
        </CardContent>
      </Card>

      {/* Feature cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          >
            <Card className="h-full">
              <CardContent className="pt-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="size-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
