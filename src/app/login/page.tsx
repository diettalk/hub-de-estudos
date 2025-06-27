// src/app/login/page.tsx

'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const supabase = createClientComponentClient();

  const handleLogin = async () => {
    // CORREÇÃO AQUI: Adicionamos a opção 'redirectTo' para garantir
    // que o Supabase saiba exatamente para onde enviar o usuário
    // após a autorização do GitHub. Isso torna o processo mais robusto.
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-gray-800 p-8 rounded-lg text-center shadow-lg">
        <h1 className="text-2xl font-bold mb-2">HUB Hélio</h1>
        <p className="text-gray-400 mb-6">Faça o login para começar</p>
        <Button onClick={handleLogin}>
          Entrar com GitHub
        </Button>
      </div>
    </div>
  );
}