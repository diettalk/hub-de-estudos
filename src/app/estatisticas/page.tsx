import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EstatisticasClient } from '@/components/EstatisticasClient';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EstatisticasPage() {
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
      .order('data_estudo', { ascending: true }),
    supabase
      .from('paginas')
      .select('id, title, parent_id')
      .eq('user_id', user.id),
  ]);

  return (
    <div className="space-y-6">
      <EstatisticasClient
        todasSessoes={(sessoesRes.data as SessaoEstudo[]) || []}
        disciplinas={(paginasRes.data as Disciplina[]) || []}
      />
    </div>
  );
}
