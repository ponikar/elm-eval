import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@neondatabase/serverless'],
  transpilePackages: ['@repo/domain', '@repo/db', '@repo/test-fixtures', '@repo/ui'],
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
