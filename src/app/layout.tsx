import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { MainSidebar } from '@/components/MainSidebar'
import { Toaster } from 'sonner'
import { createClient } from '@/lib/supabase/server'
import { LayoutClientManager } from '@/components/LayoutClientManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HUB Hélio',
  description: 'Sua Plataforma Centralizada para a Aprovação',
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
  const supabase = await createClient();
  
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