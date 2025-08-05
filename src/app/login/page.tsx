// src/app/login/page.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
// 1. IMPORTAR ÍCONES PARA OS BOTÕES
import { FaGithub, FaGoogle } from 'react-icons/fa';

export default function LoginPage() {
  const supabase = createClientComponentClient();

  // Função para o login com GitHub
  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  // 2. NOVA FUNÇÃO PARA O LOGIN COM GOOGLE
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      {/* 3. AJUSTE DE ESTILO: removi bg-gray-800 para usar as cores do tema */}
      <div className="bg-card border p-8 rounded-lg text-center shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">HUB de Estudos</h1>
        <p className="text-muted-foreground mb-6">Faça o login para começar</p>
        
        {/* 4. BOTÕES ATUALIZADOS COM ÍCONES E EM UMA ESTRUTURA FLEXÍVEL */}
        <div className="space-y-4 flex flex-col">
          <Button onClick={handleGitHubLogin} variant="outline" className="w-full">
            <FaGithub className="mr-2 h-5 w-5" />
            Entrar com GitHub
          </Button>
          <Button onClick={handleGoogleLogin} variant="outline" className="w-full">
            <FaGoogle className="mr-2 h-5 w-5" />
            Entrar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}