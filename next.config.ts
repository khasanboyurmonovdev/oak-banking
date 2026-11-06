import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Static CSP (no per-request nonces, so pages can stay statically rendered).
// 'unsafe-inline' is still needed: script-src for the inline bootstrap and
// RSC payload scripts Next.js injects (they only carry nonces when a proxy
// sets a per-request nonce), style-src for inline style attributes from
// Radix and Recharts. 'unsafe-eval' and ws: are dev-only (React debugging
// and hot reload). No upgrade-insecure-requests or HSTS: the demo is served
// over plain HTTP.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  // cacheComponents/partialPrefetching are intentionally off: every page reads a
  // per-visitor session cookie, so component caching would add no benefit.
  poweredByHeader: false,
  // Tailwind v4 runs through its Turbopack loader (there is no PostCSS config).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
