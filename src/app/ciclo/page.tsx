import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { seedFase1Ciclo } from '@/app/actions';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
// REMOVIDO: import { CicloTableRow } from '@/components/CicloTableRow';
// REMOVIDO: import { addSessaoCiclo } from '@/app/actions';
// REMOVIDO: import { Button } from '@/components/ui/button';
import { type SessaoEstudo, type Disciplina, type Node } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
// NOVO: Importa o componente cliente da tabela
import { CicloTabelaClient } from '@/components/CicloTabelaClient';

export const dynamic = 'force-dynamic';

// A função buildTree permanece a mesma
const buildTree = (disciplinas: Disciplina[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    
    disciplinas.forEach(d => {
        map.set(d.id, { ...d, children: [] });
    });

    disciplinas.forEach(d => {
        const node = map.get(d.id);
        if (node) {
            if (d.parent_id && map.has(d.parent_id)) {
                const parent = map.get(d.parent_id)!;
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });
    return roots;
};

export default async function CicloPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let { data: sessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', user.id).order('ordem');
  
  if (!sessoes || sessoes.length === 0) {
    await seedFase1Ciclo();
    const { data: novasSessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', user.id).order('ordem');
    sessoes = novasSessoes;
  }
  
  const { data: disciplinas } = await supabase.from('paginas').select('*').order('title');
  const legendaDefault = `LP: Língua Portuguesa\nRLM: Raciocínio Lógico\nG.GOV: Gestão Governamental\nP.PUB: Políticas Públicas`;

  const disciplinaTree = buildTree((disciplinas as Disciplina[]) || []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
      <ProgressoCicloCard sessoes={sessoes || []} />
      
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-muted-foreground mt-1">Foco: Construir a base...</p>
        
        {/* MODIFICADO: Renderiza o novo componente cliente da tabela */}
        <CicloTabelaClient 
          sessoesIniciais={sessoes as SessaoEstudo[] || []}
          disciplinaTree={disciplinaTree}
        />
        
      </div>
      
      <div className="bg-card p-6 rounded-lg border">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <Textarea 
          placeholder="Edite sua legenda aqui..." 
          defaultValue={legendaDefault}
          className="bg-input text-sm"
          rows={5}
        />
      </div>
    </div>
  );
}
