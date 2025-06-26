// src/app/layout.tsx
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'HUB Hélio - Estudos',
  description: 'Sua Plataforma Centralizada para a Aprovação',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning={true}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={GeistSans.className}>
        <div className="bg-background text-foreground min-h-screen">
          <div className="container mx-auto">
            <Header />
            <Navbar />
            <main className="p-4 md:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}