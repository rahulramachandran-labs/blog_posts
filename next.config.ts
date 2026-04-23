import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // GitHub Pages serves from /blog_posts/ — strip in local dev
  basePath: isProd ? "/blog_posts" : "",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
