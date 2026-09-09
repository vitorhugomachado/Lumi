import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Voice needs the server-side ephemeral-token route. Do not export this branch.
  trailingSlash: true,
};

export default nextConfig;
