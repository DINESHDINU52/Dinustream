import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Self-hosted media server: disable the image optimizer entirely.
  // Jellyfin artwork is served same-origin at /jellyfin/Items/.../Images/...
  // (anonymous) and next/image cannot proxy relative paths. Plain <img> is
  // correct here and saves the single OCPU from resizing work.
  images: {
    unoptimized: true,
  },

  // systemd runs `node .next/standalone/server.js` (see deploy/scripts/build-web.sh).
  output: 'standalone',
};

export default nextConfig;
