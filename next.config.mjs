/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for self-hosted container environments (Docker),
  // while allowing Vercel to optimize serverless builds natively.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  experimental: {
    serverComponentsExternalPackages: ['ioredis'],
  },
  async rewrites() {
    return [
      { source: '/history', destination: '/?tab=history' },
      { source: '/groups', destination: '/?tab=groups' },
      { source: '/account', destination: '/?tab=account' },
      { source: '/settings', destination: '/?tab=settings' },
    ];
  },
};

export default nextConfig;
