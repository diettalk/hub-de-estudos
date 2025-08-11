// src/app/login/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Mail } from 'lucide-react'; // Usaremos Mail para o Google como exemplo

export default function LoginPage() {
  const supabase = createClientComponentClient();

  const handleSignIn = async (provider: 'github' | 'google') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <Card className="w-[350px]">
        <CardHeader className="text-center">
          <CardTitle>HUB de Estudos</CardTitle>
          <CardDescription>Faça o login para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <Button variant="outline" onClick={() => handleSignIn('github')}>
              <Github className="mr-2 h-4 w-4" />
              Entrar com GitHub
            </Button>
            <Button variant="outline" onClick={() => handleSignIn('google')}>
              <Mail className="mr-2 h-4 w-4" />
              Entrar com Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}