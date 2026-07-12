import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/domain', '@repo/db', '@repo/test-fixtures', '@repo/ui'],
};

export default nextConfig;
