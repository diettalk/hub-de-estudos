// src/app/auth/callback/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORREÇÃO: Adicionamos 'export const dynamic = 'force-dynamic''
// para garantir que esta rota não seja cacheada estaticamente.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    // A troca do código pela sessão estabelece o cookie de login
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Após criar a sessão, redireciona o usuário para a página principal (Dashboard)
  return NextResponse.redirect(requestUrl.origin);
}