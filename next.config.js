/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  experimental: {
    agentUpgrade: 'security',
  },
};

module.exports = nextConfig;
