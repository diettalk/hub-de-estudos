import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CadernoErrosClient } from '@/components/CadernoErrosClient';
import { type CadernoErro, type Node } from '@/lib/types';
import { buildTree } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CadernoErrosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [errosResult, paginasResult] = await Promise.all([
    supabase
      .from('caderno_erros')
      .select('id, disciplina_id, disciplina_nome, assunto, banca, ano, enunciado, o_que_errei, motivo, aprendizado, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('paginas')
      .select('id, title, parent_id, emoji')
      .eq('user_id', user.id)
      .order('title'),
  ]);

  if (errosResult.error || paginasResult.error) {
    console.error('Erro ao carregar o Caderno de Erros:', errosResult.error || paginasResult.error);
    return <p className="p-8">Ocorreu um erro ao carregar o seu Caderno de Erros.</p>;
  }

  const erros = (errosResult.data || []) as CadernoErro[];
  const disciplinaNodes = (paginasResult.data || []).map((pagina) => ({
    ...pagina,
    children: [],
  })) as Node[];
  const disciplinaTree = buildTree(disciplinaNodes);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Caderno de Erros</h1>
        <p className="text-muted-foreground">Transforme cada questão errada em uma oportunidade de aprender.</p>
      </div>
      <CadernoErrosClient erros={erros} disciplinaTree={disciplinaTree} />
    </div>
  );
}
