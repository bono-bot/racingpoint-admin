import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  // Pin outputFileTracingRoot to app dir so standalone build has flat structure.
  // Without this, Next.js auto-detects monorepo root and embeds build-machine
  // absolute paths — causing static file 404s when deployed elsewhere.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
