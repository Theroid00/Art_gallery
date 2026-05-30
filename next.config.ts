import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Art_gallery",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
