import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PGlite ships WebAssembly and must be loaded by Node at runtime, not bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
