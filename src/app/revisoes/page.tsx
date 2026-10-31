import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RevisoesClient } from '@/components/RevisoesClient';
import { type Revisao, type SessaoEstudo } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function RevisoesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: revisoes, error } = await supabase
    .from('revisoes')
    .select('*')
    .eq('user_id', user.id)
    .order('data_revisao', { ascending: true });

  const { data: sessoes } = await supabase
    .from('ciclo_sessoes')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao buscar revisões:', error);
  }

  return (
    <div className="space-y-6">
      <RevisoesClient
        todasRevisoes={(revisoes as Revisao[]) || []}
        todasSessoes={(sessoes as SessaoEstudo[]) || []}
      />
    </div>
  );
}