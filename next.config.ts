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
    ];
  },
};

export default nextConfig;
