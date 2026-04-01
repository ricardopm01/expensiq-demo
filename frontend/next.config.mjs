/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      {
        // /api/auth/* is handled by NextAuth internally — must NOT be proxied
        source: '/api/v1/:path*',
        destination: `${apiHost}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
