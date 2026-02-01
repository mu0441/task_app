/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,

  async rewrites() {
    // ローカル開発のときだけ /api を Go API(8080) に転送
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://api:8080/api/:path*",
        },
        {
          source: "/health",
          destination: "http://api:8080/health",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
