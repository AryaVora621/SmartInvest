import type {NextConfig} from 'next';
import path from 'path';

// The AI engine uses fs paths derived from its own __dirname (secret store, disk cache).
// Under Turbopack the engine can get bundled, which rewrites __dirname and breaks those
// paths. next.config runs in the server process before any route loads, so pin both paths
// to absolute, writable locations here (env still wins if explicitly set). This makes the
// secret store and the research cache work in dev, build, and `next start` alike.
process.env.SECRETS_PATH ||= path.join(process.cwd(), '.secrets.json');
process.env.AI_CACHE_DIR ||= path.join(process.cwd(), '.cache');

const nextConfig: NextConfig = {
  /* config options here */
  // Prefer running the engine as a real Node require (production honors this); the env
  // pins above are the belt-and-suspenders that also cover Turbopack dev.
  serverExternalPackages: ['@smartinvest/ai-engine'],
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
};

export default nextConfig;
