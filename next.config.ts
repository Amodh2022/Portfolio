import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // A stray lockfile in ~ makes Next guess the wrong workspace root.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
