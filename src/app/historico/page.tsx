import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { HistoricoClient } from '@/components/HistoricoClient';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HistoricoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [sessoesRes, paginasRes] = await Promise.all([
    supabase
      .from('ciclo_sessoes')
      .select('*')
      .eq('user_id', user.id)
      .eq('concluida', true)
      .order('data_estudo', { ascending: false })
      .order('id', { ascending: false }),
    supabase
      .from('paginas')
      .select('id, title, parent_id, emoji')
      .eq('user_id', user.id)
      .order('title', { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <HistoricoClient
        sessoesIniciais={(sessoesRes.data as SessaoEstudo[]) || []}
        disciplinas={(paginasRes.data as Disciplina[]) || []}
      />
    </div>
  );
}