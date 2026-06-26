import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
const basePath = configuredBasePath !== undefined ? configuredBasePath : (isGithubPages ? "/read" : "");

const nextConfig: NextConfig = {
  ...(isGithubPages ? { output: "export" as const } : {}),
  trailingSlash: isGithubPages,
  basePath,
  images: isGithubPages ? { unoptimized: true } : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
