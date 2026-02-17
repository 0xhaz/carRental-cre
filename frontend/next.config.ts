import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "di-uploads-pod15.dealerinspire.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.completecar.ie",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
