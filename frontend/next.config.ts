import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for nginx / Cloud Run bundled images. In dev, dynamic
  // /repos/:owner/:repo/issues URLs work without pre-generated params.
  ...(process.env.NEXT_OUTPUT === "export" ||
  (process.env.NODE_ENV === "production" && process.env.NEXT_OUTPUT !== "standalone")
    ? { output: "export" as const }
    : {}),
};

export default nextConfig;
