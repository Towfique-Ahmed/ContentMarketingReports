/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server output for Docker/VPS deploys.
  output: "standalone",
  // better-sqlite3 is a native module — keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
