import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AnkiGeneratorClient } from '@/components/AnkiGeneratorClient';

export const dynamic = 'force-dynamic';

export default async function AnkiPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const [decksRes, paginasRes] = await Promise.all([
    supabase
      .from('anki_decks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('paginas')
      .select('id, title, parent_id, content')
      .eq('user_id', user.id)
      .order('title', { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <AnkiGeneratorClient
        initialDecks={decksRes.data || []}
        paginas={paginasRes.data || []}
      />
    </div>
  );
}