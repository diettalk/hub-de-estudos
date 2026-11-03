import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SimuladosClient } from '@/components/SimuladosClient';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SimuladosPage() {
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
      .order('data_estudo', { ascending: false }),
    supabase
      .from('paginas')
      .select('id, title, parent_id')
      .eq('user_id', user.id)
      .is('parent_id', null)
      .order('title', { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <SimuladosClient
        sessoesIniciais={(sessoesRes.data as SessaoEstudo[]) || []}
        disciplinasRaiz={(paginasRes.data as Disciplina[]) || []}
      />
    </div>
  );
}
