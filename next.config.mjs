/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // For pdf-parse v1: avoid debug harness in index.js
      'pdf-parse$': 'pdf-parse/lib/pdf-parse.js',
    };
    return config;
  },
};

export default nextConfig;
