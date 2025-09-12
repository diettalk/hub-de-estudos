import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { MainSidebar } from '@/components/MainSidebar'
import { Toaster } from 'sonner'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PageTransition } from '@/components/PageTransition'
// NOVO: Importa o player de música
import { MusicPlayer } from '@/components/MusicPlayer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HUB Hélio',
  description: 'Sua Plataforma Centralizada para a Aprovação',
}

// O LayoutClientManager agora irá conter o player, garantindo que ele só renderize no cliente.
function LayoutClientManager({ children, user }: { children: React.ReactNode, user: any }) {
  'use client' 
  
  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* O Player é renderizado aqui, dentro do Client Component */}
      {user && <MusicPlayer />}
      
      <main className="flex-1 overflow-y-auto">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
} | null;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile = null;
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
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <div className="flex h-screen bg-background text-foreground">
            {user && <MainSidebar user={user} profile={profile} />}
            
            {/* O LayoutClientManager agora envolve o conteúdo principal */}
            <LayoutClientManager user={user}>
              {children}
            </LayoutClientManager>

          </div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}

