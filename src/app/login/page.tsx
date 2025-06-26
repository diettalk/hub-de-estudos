// src/app/login/page.tsx
'use client';

// 1. MUDANÇA IMPORTANTE: Agora importamos diretamente do pacote principal do Supabase
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button'; // Reutilizando nosso botão bonito

export default function LoginPage() {
  // 2. Criamos o cliente Supabase da forma mais direta possível
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async () => {
    // 3. A função de login continua exatamente a mesma
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="text-center p-8 bg-gray-800 rounded-xl shadow-2xl">
        <h1 className="text-4xl font-black mb-2">HUB Hélio</h1>
        <p className="text-gray-400 mb-8">Faça o login para começar</p>
        <Button onClick={handleLogin} size="lg">
          <i className="fab fa-github mr-3"></i>
          Entrar com GitHub
        </Button>
      </div>
    </div>
  );
}