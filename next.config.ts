import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Fail the build on type errors rather than shipping broken TypeScript.
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
