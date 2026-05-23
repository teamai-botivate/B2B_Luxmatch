import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@luxematch/ui', '@luxematch/types', '@luxematch/config'],
};

export default nextConfig;
