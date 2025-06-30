// src/app/ciclo/page.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { seedFase1Ciclo, addSessaoCiclo } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTableRow } from '@/components/CicloTableRow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { type SessaoEstudo, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CicloPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // LÓGICA DE CRIAÇÃO AUTOMÁTICA
  let { data: sessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');

  if (!sessoes || sessoes.length === 0) {
    await seedFase1Ciclo();
    const { data: novasSessoes } = await supabase.from('ciclo_sessoes').select(`*`).eq('user_id', session.user.id).order('ordem');
    sessoes = novasSessoes;
  }

  const { data: disciplinas } = await supabase.from('paginas').select('id, nome:title, emoji').order('title');

  const comandoEvolucao = `Olá, David! Concluí a Fase 1 do nosso Ciclo de Estudos... (seu texto completo aqui)`;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>

      <ProgressoCicloCard sessoes={sessoes || []} />

      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
          <AccordionContent className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
            <div>
              <h5 className="font-semibold text-white">Análise de Tempo (Referência: 18/06/2025)</h5>
              <p>Prova: 05 de Outubro de 2025.<br/>Semanas Disponíveis: ~15 semanas.<br/>Total de Horas Líquidas: 15 semanas x 37.5h = ~560 horas de estudo. É tempo mais do que suficiente. Confie no processo.</p>
            </div>
            <div>
              <h5 className="font-semibold text-white">As 3 Fases do Estudo:</h5>
              <ol className="list-decimal list-inside space-y-2">
                <li><strong>FASE 1: A Fundação (18 de Junho a 22 de Julho - 5 semanas)</strong><br/>Objetivo: Dominar os fundamentos das matérias de maior peso.</li>
                <li><strong>FASE 2: A Expansão e Inclusão (23 de Julho a 31 de Agosto - ~6 semanas)</strong><br/>Objetivo: Introduzir gradualmente as matérias restantes.</li>
                <li><strong>FASE 3: Refinamento e Ataque Final (01 de Setembro até a Prova - ~5 semanas)</strong><br/>Objetivo: Focar em questões, revisão e simulados.</li>
              </ol>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-gray-400 mt-1">Foco: Construir a base para os cargos de Especialista (HFA), Analista (MGI) e Analista (INSS).</p>
        
        <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                  <th className="p-3">Ações</th>
                  <th className="p-3">Finalizada</th>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Matéria</th>
                  <th className="p-3 min-w-[350px]">Foco Sugerido</th>
                  <th className="p-3 min-w-[250px]">Diário de Bordo</th>
                  <th className="p-3 min-w-[200px]">Questões</th>
                  <th className="p-3 min-w-[150px]">Concluído em</th>
                  <th className="text-center p-3">R1 (24h)</th>
                  <th className="text-center p-3">R7 (7d)</th>
                  <th className="text-center p-3">R30 (30d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {(sessoes || []).map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao as SessaoEstudo} disciplinas={disciplinas as Disciplina[] || []} />)}
              </tbody>
            </table>
          </div>
          <div className="p-2 flex justify-center border-t border-gray-700">
            <form action={addSessaoCiclo}>
              <Button type="submit" variant="ghost" size="sm">+ Adicionar Linha ao Ciclo</Button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <li><strong>LP:</strong> Língua Portuguesa</li>
            <li><strong>RLM:</strong> Raciocínio Lógico-Quantitativo</li>
            {/* ... sua lista completa de legendas ... */}
        </ul>
      </div>

      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold">Comando para Evolução do Ciclo (Para uso futuro)</AccordionTrigger>
          <AccordionContent>
            <pre className="mt-4 bg-gray-900 p-4 rounded-md text-xs whitespace-pre-wrap font-mono">{comandoEvolucao}</pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
