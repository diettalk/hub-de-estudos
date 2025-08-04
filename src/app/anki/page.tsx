// src/app/anki/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AnkiGeneratorClient } from '@/components/AnkiGeneratorClient';
import { AnkiDecksList } from '@/components/AnkiDecksList';

export const dynamic = 'force-dynamic';

export default async function AnkiPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Busca os decks guardados do utilizador
  const { data: decks, error } = await supabase
    .from('anki_decks')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar decks:", error);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-12">
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Gerador de Flashcards (Anki) com IA</h1>
          <p className="text-muted-foreground">Cole o seu material de estudo e deixe a IA criar os flashcards para si.</p>
        </div>
        <AnkiGeneratorClient />
      </div>

      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Meus Decks Guardados</h2>
        <AnkiDecksList decks={decks || []} />
      </div>
    </div>
  );
}
