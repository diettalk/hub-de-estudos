// src/app/page.tsx - VERSÃO DE TESTE FINAL PARA ISOLAR O ERRO

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // A lógica de proteção da rota continua a mesma.
  if (!session) {
    redirect('/login');
  }

  // TESTE: Em vez de buscar dados e renderizar componentes complexos,
  // vamos apenas retornar um JSX simples para ver se a página carrega.
  return (
    <div>
      <h1 className="text-3xl font-bold text-green-400">
        Dashboard Carregado com Sucesso!
      </h1>
      <p>A sessão do usuário foi validada corretamente.</p>
    </div>
  );
}