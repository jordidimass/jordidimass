/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  images: {
    // Must stay in sync with GALLERY_WIDTHS in src/lib/galleryLoader.ts and the
    // LADDER in cloudflare/derive.mjs — Next only asks the loader for these.
    deviceSizes: [640, 828, 1280, 1920, 2560, 3200],
    imageSizes: [256, 384],
    remotePatterns: [
      { hostname: 'utfs.io' },
      { hostname: 'gallery-worker.jordidimass.workers.dev' },
      { hostname: '*.workers.dev' },
    ],
  },
  experimental: {
    optimizePackageImports: ['@mui/icons-material', 'lucide-react', 'motion', '@react-three/drei'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
