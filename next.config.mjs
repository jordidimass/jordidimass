/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: 'utfs.io' }],
  },
  experimental: {
    optimizePackageImports: ['@mui/icons-material', 'lucide-react', 'motion'],
  },
};

export default nextConfig;
