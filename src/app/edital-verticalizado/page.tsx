import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EditalVerticalizadoClient } from '@/components/EditalVerticalizadoClient';
import { buildTree } from '@/lib/utils';
import { type Node, type SessaoEstudo } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditalVerticalizadoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [paginasRes, sessoesRes] = await Promise.all([
    supabase
      .from('paginas')
      .select('id, title, parent_id, emoji, description')
      .eq('user_id', user.id)
      .order('id', { ascending: true }),
    supabase
      .from('ciclo_sessoes')
      .select('*')
      .eq('user_id', user.id)
      .eq('concluida', true),
  ]);

  const rawNodes = (paginasRes.data || []).map((p) => ({
    ...p,
    children: [],
  })) as Node[];
  const disciplinaTree = buildTree(rawNodes);

  return (
    <div className="space-y-6">
      <EditalVerticalizadoClient
        disciplinaTree={disciplinaTree}
        sessoesConcluidas={(sessoesRes.data as SessaoEstudo[]) || []}
      />
    </div>
  );
}