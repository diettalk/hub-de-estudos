import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/documentos', destination: '/caderno-erros', permanent: false },
      { source: '/biblioteca', destination: '/caderno-erros', permanent: false },
    ];
  },

  // Libera os domínios externos para carregamento de imagens
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'etifeomaorcxzsxosxlz.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

export default nextConfig;