import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server actions from forwarded requests (proxy environment)
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'auth-members-sync.preview.emergentagent.com',
        'auth-members-sync.cluster-5.preview.emergentcf.cloud',
        'user-profile-debug-4.preview.emergentagent.com',
        'user-profile-debug-4.cluster-0.preview.emergentcf.cloud',
        '*.preview.emergentagent.com',
        '*.preview.emergentcf.cloud',
        '*.cluster-0.preview.emergentcf.cloud',
        '*.cluster-5.preview.emergentcf.cloud',
      ],
    },
  },
  // Allow dev origins for cross-origin requests
  allowedDevOrigins: [
    'localhost:3000',
    '*.preview.emergentagent.com',
    '*.preview.emergentcf.cloud',
    '*.cluster-0.preview.emergentcf.cloud',
    '*.cluster-5.preview.emergentcf.cloud',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
    ],
    // Optimize images for better performance and lower memory usage
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ['image/webp'],
  },
};

export default nextConfig;
