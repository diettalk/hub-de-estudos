// src/app/auth/callback/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  console.log('CALLBACK ROTA: Recebido código do GitHub, tentando trocar por sessão.');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('CALLBACK ROTA ERROR: Erro ao trocar código pela sessão:', error);
      // Redireciona para uma página de erro se a troca falhar
      return NextResponse.redirect(new URL('/login?error=Authentication%20Failed', request.url));
    }
  }

  console.log('CALLBACK ROTA: Sessão trocada com SUCESSO. Redirecionando para o Dashboard.');
  
  // Força a revalidação do cache da página principal
  revalidatePath('/', 'layout');

  // Redireciona para a página principal (Dashboard)
  return NextResponse.redirect(new URL('/', request.url));
}