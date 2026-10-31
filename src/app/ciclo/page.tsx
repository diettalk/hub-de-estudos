import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CicloTabelaClient } from '@/components/CicloTabelaClient';
import { buildTree } from '@/lib/utils';
import { type SessaoEstudo, type Node } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CicloPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [sessoesRes, paginasRes] = await Promise.all([
    supabase
      .from('ciclo_sessoes')
      .select('*')
      .eq('user_id', user.id)
      .order('ordem', { ascending: true }),
    supabase
      .from('paginas')
      .select('id, title, parent_id, emoji')
      .eq('user_id', user.id)
      .order('title', { ascending: true }),
  ]);

  const sessoes = (sessoesRes.data as SessaoEstudo[]) || [];
  const rawNodes = (paginasRes.data || []).map((p) => ({
    ...p,
    children: [],
  })) as Node[];
  const disciplinaTree = buildTree(rawNodes);

  return (
    <CicloTabelaClient
      sessoesIniciais={sessoes}
      disciplinaTree={disciplinaTree}
    />
  );
}