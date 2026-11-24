/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.EXPORT === 'true' ? { output: 'export' } : {}),
  typescript: {
    ignoreBuildErrors: true,
  },
  devIndicators: false,
};

module.exports = nextConfig;
