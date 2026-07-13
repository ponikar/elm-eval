import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  transpilePackages: ['@repo/domain', '@repo/db', '@repo/test-fixtures', '@repo/ui'],
  outputFileTracingIncludes: {
    '/api/trpc/[trpc]': ['../../packages/db/drizzle/**/*'],
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
