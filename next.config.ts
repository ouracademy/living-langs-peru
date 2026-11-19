import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pinned to this folder. Left to inference, a git worktree checked out
    // inside the repo (two pnpm-lock.yaml files) takes the outer repo as root
    // and resolves *its* src/ — a build that silently mixes two branches.
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/diccionario",
        // Not permanent: the default language may change.
        destination: "/diccionario/ashaninka",
        permanent: false,
      },
      {
        source: "/juegos/completar-palabras",
        // Same reasoning: Asháninka is the only playable language today, not
        // a permanent default.
        destination: "/juegos/completar-palabras/ashaninka",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
