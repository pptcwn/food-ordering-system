/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async rewrites() {
    const apiTarget =
      process.env.INTERNAL_API_URL ||
      process.env.API_URL ||
      (process.env.NODE_ENV === 'production' ? 'http://api:4000' : 'http://localhost:4000');

    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
