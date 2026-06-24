import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export is for the nginx production image only. In dev, dynamic
  // /repos/:owner/:repo/issues URLs must work without pre-generated params.
  ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
};

export default nextConfig;
