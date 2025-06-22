
import type {NextConfig} from 'next';

/**
 * @type {import('next').NextConfig}
 * The configuration for the Next.js application.
 * This object allows customization of Next.js's behavior.
 */
const nextConfig: NextConfig = {
  /* config options here */

  // TypeScript configuration
  typescript: {
    // Allows the project to build even if there are TypeScript errors.
    // Useful for rapid prototyping, but should ideally be set to `false` for production builds.
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    // Allows the project to build even if there are ESLint errors or warnings.
    // Good for development speed, but linting should be checked before merging to production.
    ignoreDuringBuilds: true,
  },

  // Image optimization configuration
  images: {
    // Defines a list of allowed hostnames for optimized images using the next/image component.
    // This is a security measure to prevent loading images from unapproved sources.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // Allow placeholder images from placehold.co
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Development server configuration
  allowedDevOrigins: [
    // These origins are allowed to connect to the Next.js development server.
    // This is a security feature, especially important in cloud development environments.
    'http://6000-firebase-studio-1750043732710.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev',
    'http://9000-firebase-studio-1750043732710.cluster-bg6uurscprhn6qxr6xwtrhvkf6.cloudworkstations.dev',
    // It's good practice to also allow the standard localhost ports for local development outside of cloud environments.
    'http://localhost:3000', // Default Next.js port
    'http://localhost:9002', // Another common port that might be used locally
  ],
};

export default nextConfig;
