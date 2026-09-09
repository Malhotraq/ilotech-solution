/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone = hasil build ringan, cocok untuk Docker
  output: 'standalone',
};

module.exports = nextConfig;
