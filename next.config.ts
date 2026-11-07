import type { NextConfig } from "next";

/* ── Deployment modes ──────────────────────────────────────────────────
 * Default (no env):      standalone build → the published space
 *                        (shiftkar.space-z.ai, Node server + notes API).
 * GitHub Pages build:    NEXT_EXPORT=1  → fully static `out/` folder.
 *   - NEXT_PUBLIC_BASE_PATH="/<repo>"  for project pages (repo ≠ user.github.io)
 *   - NEXT_PUBLIC_BASE_PATH=""         for user/org sites (user.github.io)
 * Client code inlines NEXT_PUBLIC_* at build time; the workflow sets them. */
const isStaticExport = process.env.NEXT_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  ...(basePath ? { basePath } : {}),
  /* GitHub Pages needs clean-URL directories (page/ → page/index.html)
   * and unoptimized images; export output lands in the standard out/ dir. */
  ...(isStaticExport ? { trailingSlash: true, images: { unoptimized: true } } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  /* the dev-tools badge floats over the UI (looks like an app bug) */
  devIndicators: false,
};

export default nextConfig;
