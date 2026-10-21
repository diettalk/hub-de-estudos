// src/app/auth/callback/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    
    // A troca do código pela sessão estabelece o cookie de login
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Após criar a sessão, redireciona o usuário para a página principal (Dashboard)
  return NextResponse.redirect(requestUrl.origin);
}