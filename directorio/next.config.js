/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Las fotos viven en Supabase Storage (URLs absolutas).
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
}
module.exports = nextConfig
