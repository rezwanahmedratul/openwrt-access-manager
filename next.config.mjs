/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for self-hosted container environments (Docker),
  // while allowing Vercel to optimize serverless builds natively.
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
  serverExternalPackages: ['ioredis'],
  async rewrites() {
    return [
      { source: '/users', destination: '/?tab=users' },
      { source: '/history', destination: '/?tab=history' },
      { source: '/groups', destination: '/?tab=groups' },
      { source: '/account', destination: '/?tab=account' },
      { source: '/settings', destination: '/?tab=settings' },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
