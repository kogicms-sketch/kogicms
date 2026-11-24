/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  devIndicators: false,
};

module.exports = nextConfig;
