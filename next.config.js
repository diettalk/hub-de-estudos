/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        // O seu hostname do Supabase foi inserido aqui
        hostname: 'etifeomaorcxzsxosxlz.supabase.co', 
      },
    ],
  },
};

module.exports = nextConfig;