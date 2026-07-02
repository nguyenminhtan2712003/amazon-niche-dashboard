/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
    ],
  },
  // DuckDB là native node module — Next.js không bundle, require ở runtime
  experimental: {
    serverComponentsExternalPackages: ["duckdb"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Đánh dấu duckdb là external — Next.js sẽ require() ở runtime
      config.externals = [...(config.externals || []), "duckdb"];
    }
    // Bỏ qua các file non-JS (HTML, py, md...) trong node_modules native packages
    config.module.rules.push({
      test: /\.(html|md|py)$/,
      include: /node_modules/,
      type: "asset/resource",
      generator: { emit: false },
    });
    return config;
  },
};
export default nextConfig;
