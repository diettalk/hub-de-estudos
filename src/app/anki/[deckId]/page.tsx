// src/app/anki/[deckId]/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DeckViewClient } from '@/components/DeckViewClient';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

// CORREÇÃO 1: params agora é uma Promise
type PageProps = {
  params: Promise<{
    deckId: string;
  }>;
};

export default async function AnkiDeckPage({ params }: PageProps) {
  // CORREÇÃO 2: Await nos cookies
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // CORREÇÃO 3: Await no params antes de acessar o deckId
  const resolvedParams = await params;
  const deckId = Number(resolvedParams.deckId);

  const { data: deck, error } = await supabase
    .from('anki_decks')
    .select('*')
    .eq('id', deckId)
    .eq('user_id', user.id)
    .single();

  if (error || !deck) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Deck não encontrado</h1>
        <p className="text-muted-foreground">Este deck não existe ou não tem permissão para o ver.</p>
        <Link href="/anki" className="mt-4 inline-block text-primary hover:underline">
          Voltar para os seus decks
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-4">
        <Link href="/anki" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
          Voltar para todos os decks
        </Link>
      </div>
      <DeckViewClient deck={deck} />
    </div>
  );
}