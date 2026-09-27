import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite ships WebAssembly and must be loaded by Node at runtime, not bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  // `npm run build` type-checks the project's own sources first (tsconfig.typecheck.json).
  // Next's built-in pass also reads .next/dev/types, which a running `next dev` rewrites
  // mid-build, so it is skipped rather than failing on half-written generated files.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
