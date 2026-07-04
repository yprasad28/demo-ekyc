/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js", "bcryptjs", "pg"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent server-only modules from being bundled on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
