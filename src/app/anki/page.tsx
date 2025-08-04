// src/app/anki/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AnkiGeneratorClient } from '@/components/AnkiGeneratorClient';

export const dynamic = 'force-dynamic';

export default async function AnkiPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Gerador de Flashcards (Anki) com IA</h1>
        <p className="text-muted-foreground">Cole o seu material de estudo e deixe a IA criar os flashcards para si.</p>
      </div>
      
      <AnkiGeneratorClient />
    </div>
  );
}
