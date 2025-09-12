import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { MainSidebar } from '@/components/MainSidebar'
import { Toaster } from 'sonner'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PageTransition } from '@/components/PageTransition'
import { CommandPalette } from '@/components/CommandPalette'
import { getAllSearchableItems } from './actions'
// NOVO: Importação do Player de Música
import { MusicPlayer } from '@/components/MusicPlayer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HUB Hélio',
  description: 'Sua Plataforma Centralizada para a Aprovação',
}

function LayoutClientManager({ children }: { children: React.ReactNode }) {
  'use client' 
  
  return (
    <PageTransition>
      {children}
    </PageTransition>
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
  let commandPaletteItems = [];

  if (user) {
    const [profileResult, itemsResult] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single(),
        getAllSearchableItems()
    ]);
    
    profile = profileResult.data;
    commandPaletteItems = itemsResult;
  }

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {user && <CommandPalette initialItems={commandPaletteItems} />}
          {/* NOVO: Renderiza o Player de Música se o usuário estiver logado */}
          {user && <MusicPlayer />}
          
          <div className="flex h-screen bg-background text-foreground">
            {user && <MainSidebar user={user} profile={profile} />}
            <main className="flex-1 flex flex-col overflow-y-auto">
              <LayoutClientManager>
                {children}
              </LayoutClientManager>
            </main>
          </div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}

