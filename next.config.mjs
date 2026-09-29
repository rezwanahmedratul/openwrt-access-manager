/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for self-hosted container environments (Docker),
  // while allowing Vercel to optimize serverless builds natively.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  experimental: {
    serverComponentsExternalPackages: ['ioredis'],
  },
};

export default nextConfig;
