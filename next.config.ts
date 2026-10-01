/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${(process.env.CHANGPAY_ADMIN_API_URL || 'https://changpay.cloud/api/admin').replace(/\/$/, '')}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig