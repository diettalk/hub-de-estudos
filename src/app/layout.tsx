// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { MainSidebar } from '@/components/MainSidebar'
import { Toaster } from 'sonner'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { PageTransition } from '@/components/PageTransition'

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

// 1. DEFINIR UM TIPO SIMPLES PARA O PERFIL PARA MANTER O CÓDIGO ORGANIZADO
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

  // 2. BUSCAR OS DADOS DO PERFIL SE O USUÁRIO ESTIVER LOGADO
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
            {/* 3. PASSAR OS DADOS DO PERFIL (profile) COMO PROP PARA A SIDEBAR */}
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