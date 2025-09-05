
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
   env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER: process.env.GOOGLE_PROJECT_NUMBER,
    NEXT_PUBLIC_GOOGLE_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_REDIRECT_URI: process.env.NODE_ENV === 'production'
      ? 'https://studioveo.vercel.app/api/auth/google/callback'
      : 'http://localhost:9002/api/auth/google/callback',
  },
};

export default nextConfig;
