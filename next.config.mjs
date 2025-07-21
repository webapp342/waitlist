/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'pbs.twimg.com', // Twitter avatarları
      'cdn.discordapp.com', // Discord avatarları
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.trustwalletapp.com',
      },
      {
        protocol: 'https',
        hostname: 'tokens.pancakeswap.finance',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
      },
      {
        protocol: 'https',
        hostname: '**.trustwallet.com',
      },
      {
        protocol: 'https',
        hostname: 'bblip.io',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },

        ],
      },
      {
        source: '/logo.svg',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },
}

export default nextConfig
