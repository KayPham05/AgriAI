import type { NextConfig } from 'next';

const apiProxyTarget = (process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5034').replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  agentRules: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiProxyTarget}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
