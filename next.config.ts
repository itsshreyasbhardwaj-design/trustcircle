import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const config: NextConfig = {
  // node:sqlite is a built-in; keep it external so the bundler never tries to inline it.
  serverExternalPackages: ['node:sqlite'],
  experimental: {
    serverActions: {
      // Next rejects a Server Action whose Origin does not match the Host. Some local
      // tooling (preview panes, sandboxed iframes) sends `Origin: null`, which would
      // otherwise 500 the request. Listed explicitly rather than disabling the check.
      allowedOrigins: ['localhost:3100', '127.0.0.1:3100', 'null'],
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          {
            // No remote origins: everything (OCR/QR workers included) is served from self.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'wasm-unsafe-eval' is for the OCR engine's WebAssembly module.
              // 'unsafe-eval' is added in development ONLY, because Next's Fast
              // Refresh runtime evaluates strings; without it the dev server serves
              // pages that never hydrate. It is never present in a production build.
              `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} blob:`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data:",
              "font-src 'self'",
              "connect-src 'self' blob:",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'none'",
              "form-action 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default config;
