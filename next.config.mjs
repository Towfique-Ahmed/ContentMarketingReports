/** @type {import('next').NextConfig} */
const nextConfig = {
  // Run with `next start` (xCloud/PM2 default). No `output: standalone` — it
  // conflicts with `next start` and adds a memory-heavy trace step to the build.
  // better-sqlite3 is a native module — keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // scripts/deploy-xcloud.sh builds into a scratch dir and promotes it only on
  // success, so an OOM-killed build can't leave a half-written .next that
  // crash-loops `next start` (the recurring 502 on small hosts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  eslint: { ignoreDuringBuilds: true },
  // Type-check runs in CI / `npm run typecheck`; skip it during the production
  // build so low-RAM hosts don't OOM running tsc alongside the compiler.
  typescript: { ignoreBuildErrors: true },
  // Lower peak memory during compilation — important on small instances where
  // `next build` was getting OOM-killed (SIGKILL).
  experimental: { webpackMemoryOptimizations: true },
  productionBrowserSourceMaps: false,
  async rewrites() {
    // OAuth discovery lives at well-known paths; map them to the API routes
    // (Next's file router won't serve a literal ".well-known" folder).
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/oauth/protected-resource" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/oauth/protected-resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth/authorization-server" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/oauth/authorization-server" },
    ];
  },
};

export default nextConfig;
