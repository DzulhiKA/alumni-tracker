/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // Izinkan <img> tag dari domain external tanpa blokir
  experimental: {},
}
module.exports = nextConfig
