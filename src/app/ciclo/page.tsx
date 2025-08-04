// src/app/ciclo/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { seedFase1Ciclo, addSessaoCiclo } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTableRow } from '@/components/CicloTableRow';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';

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
  
  const { data: disciplinas } = await supabase.from('paginas').select('id, nome:title, emoji').order('title');

  const legendaDefault = `LP: Língua Portuguesa\nRLM: Raciocínio Lógico\nG.GOV: Gestão Governamental\nP.PUB: Políticas Públicas`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
      <ProgressoCicloCard sessoes={sessoes || []} />
      
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-muted-foreground mt-1">Foco: Construir a base...</p>
        <div className="bg-card border rounded-lg shadow-lg overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                <tr>
                  <th className="p-3">OK</th>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Matéria</th>
                  <th className="p-3 min-w-[350px]">Foco Sugerido</th>
                  <th className="p-3 min-w-[250px]">Diário de Bordo</th>
                  <th className="p-3 min-w-[200px]">Questões</th>
                  <th className="p-3 min-w-[150px]">Data Estudo</th>
                  <th className="text-center p-3">R1 (24h)</th>
                  <th className="text-center p-3">R7 (7d)</th>
                  <th className="text-center p-3">R30 (30d)</th>
                  <th className="p-3">Finalizada</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(sessoes || []).map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao as SessaoEstudo} disciplinas={disciplinas as Disciplina[] || []} />)}
              </tbody>
            </table>
          </div>
          <div className="p-2 flex justify-center border-t border-border">
            <form action={addSessaoCiclo}>
              <Button type="submit" variant="ghost" size="sm">+ Adicionar Linha ao Ciclo</Button>
            </form>
          </div>
        </div>
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
