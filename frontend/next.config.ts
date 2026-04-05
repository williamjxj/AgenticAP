import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev: allow Playwright and browsers using 127.0.0.1 so HMR/hydration is not blocked (Next 16 warning).
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
