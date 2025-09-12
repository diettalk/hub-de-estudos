import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { MainSidebar } from '@/components/MainSidebar'
import { Toaster } from 'sonner'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PageTransition } from '@/components/PageTransition'
// NOVO: Importações para a Paleta de Comandos
import { CommandPalette } from '@/components/CommandPalette'
import { getAllSearchableItems } from './actions'


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
  // NOVO: Variável para guardar os itens da paleta
  let commandPaletteItems = [];

  if (user) {
    // Busca o perfil e os itens da paleta em paralelo para otimizar o carregamento
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
          {/* NOVO: Renderiza a Paleta de Comandos */}
          {user && <CommandPalette initialItems={commandPaletteItems} />}
          
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
