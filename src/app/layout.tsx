// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider' // Importa o nosso novo provider
import { MainSidebar } from '@/components/MainSidebar'
import { Toaster } from 'sonner'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { type Profile } from '@/lib/types'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HUB Hélio',
  description: 'Sua Plataforma Centralizada para a Aprovação',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  let profile: Profile | null = null;
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
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex h-screen bg-background text-foreground">
            {user && <MainSidebar user={user} profile={profile} />}
            <main className="flex-1 flex flex-col overflow-y-auto">
              {children}
            </main>
          </div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}