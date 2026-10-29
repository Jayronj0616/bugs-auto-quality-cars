import type { NextConfig } from 'next'

/**
 * Remote image hosts.
 *
 * The Supabase project host is derived from the environment rather than
 * hard-coded, so the same config works for local (`127.0.0.1:54321`), staging
 * and production projects. `images.unsplash.com` is only here for the
 * development seed photography and can be removed once real inventory photos
 * are uploaded.
 */
function supabasePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) return []

  try {
    const { protocol, hostname, port } = new URL(url)
    return [
      {
        protocol: protocol.replace(':', '') as 'http' | 'https',
        hostname,
        port: port || undefined,
        pathname: '/storage/v1/object/public/**',
      },
    ]
  } catch {
    return []
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      ...supabasePattern(),
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'img.youtube.com', pathname: '/**' },
    ],
    // Photos are served as pre-resized copies straight from Supabase (see
    // src/lib/image-variants.ts) rather than through Vercel's optimizer, whose
    // free monthly allowance the sold archive alone used up.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [375, 430, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [96, 128, 192, 256, 384],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
