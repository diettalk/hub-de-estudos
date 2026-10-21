import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignora erros do ESLint durante o deploy
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Ignora erros de tipagem do TypeScript durante o deploy
  typescript: {
    ignoreBuildErrors: true,
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