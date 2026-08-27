/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@capabilio/ui', '@capabilio/types'],
  async rewrites() {
    return [
      { source: '/aura', destination: '/dashboard' },
      { source: '/skillstudio', destination: '/skill-studio' },
      { source: '/my-tasks', destination: '/tasks' },
    ];
  },
};

export default nextConfig;
