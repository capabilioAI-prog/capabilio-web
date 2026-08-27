/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@capabilio/db',
    '@capabilio/ai',
    '@capabilio/evaluation',
    '@capabilio/types',
    '@capabilio/workspaces',
  ],
  experimental: {
    serverComponentsExternalPackages: ['postgres'],
  },
};

export default nextConfig;
