import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@luxematch/ar-engine',
    '@luxematch/cloudinary',
    '@luxematch/config',
    '@luxematch/db',
    '@luxematch/embeddings',
    '@luxematch/intelligence',
    '@luxematch/qdrant',
    '@luxematch/tenant',
    '@luxematch/types',
    '@luxematch/ui',
  ],
};

export default nextConfig;
