import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The foundation also has a static preview; normal builds retain the Next server.
  output: process.env.LUMI_STATIC_EXPORT === "1" ? "export" : undefined,
  trailingSlash: true,
};

export default nextConfig;
