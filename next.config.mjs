/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // /dashboard ya no existe: la entrada al panel es /busqueda.
    return [{ source: '/dashboard', destination: '/busqueda', permanent: false }]
  },
}

export default nextConfig
