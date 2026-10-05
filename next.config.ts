import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/events": ["./data/events.json"],
    "/posts": ["./data/facebook-posts.json"],
    "/admin": ["./data/events.json", "./data/facebook-posts.json"],
    "/api/admin/events": ["./data/events.json"],
    "/api/admin/facebook-posts": ["./data/facebook-posts.json"],
    "/api/facebook-post-image/[id]": ["./data/facebook-posts.json"],
  },
  async headers() {
    return [
      {
        source: "/admin",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
