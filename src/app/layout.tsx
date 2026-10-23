import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/server';
import { LayoutClientManager } from '@/components/LayoutClientManager';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'HUB de Estudos | Sua Plataforma Centralizada para a Aprovação',
  description: 'Gerencie disciplinas, ciclos de estudo, revisões espaçadas, caderno de erros e flashcards em um só lugar.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#13151b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export type ProfileData = {
  full_name: string | null;
  avatar_url: string | null;
} | null;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: ProfileData = null;
  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    profile = profileData;
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LayoutClientManager user={user} profile={profile}>
            {children}
          </LayoutClientManager>
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}