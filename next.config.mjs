/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    turbo: {
      enabled: true
    }
  }
};

export default nextConfig; 