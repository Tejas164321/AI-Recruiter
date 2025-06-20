
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
    ],
  },
  allowedDevOrigins: [
    'http://6000-firebase-studio-1750043732710.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev',
    'http://9000-firebase-studio-1750043732710.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev',
    // It's good practice to also allow the standard localhost ports if you ever run it locally outside Studio
    'http://localhost:3000', // Default Next.js port
    'http://localhost:9002', // The port mentioned in your logs for local
  ],
};

export default nextConfig;
