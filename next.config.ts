import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
