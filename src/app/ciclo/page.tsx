// src/app/ciclo/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { addSessaoCiclo, restoreHoraUm } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { CicloTable } from '@/components/CicloTable';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


export const dynamic = 'force-dynamic';

export default async function CicloPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: sessoes, error } = await supabase
    .from('sessoes_estudo')
    .select('*, disciplina:disciplina_id(nome)')
    .eq('user_id', session.user.id)
    .order('hora_no_ciclo', { ascending: true });

  const { data: disciplinas } = await supabase.from('disciplinas').select('*');

  if (error) {
    console.error("Erro ao buscar sessões do ciclo:", error);
  }

  const sessoesConcluidas = sessoes?.filter(s => s.concluido).length || 0;
  const totalSessoes = sessoes?.length || 0;
  const progresso = totalSessoes > 0 ? (sessoesConcluidas / totalSessoes) * 100 : 0;

  return (
    <div>
      <header className="text-left mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
          <p className="text-gray-400">Seu painel de controle de sessões de estudo.</p>
        </div>
        <form action={restoreHoraUm}>
          <Button type="submit" variant="outline" size="sm">Restaurar Hora 1 (se sumiu)</Button>
        </form>
      </header>
      
      {/* SEÇÃO DE PROGRESSO DO CICLO - REINSERIDA */}
      <div className="card bg-gray-800 p-6 rounded-lg mb-6">
        <h3 className="font-bold text-lg mb-2">Progresso do Ciclo</h3>
        <Progress value={progresso} className="w-full" />
        <p className="text-right text-sm text-gray-400 mt-2">{sessoesConcluidas} de {totalSessoes} sessões concluídas</p>
      </div>

      {/* SEÇÃO DO TUTORIAL DO CICLO - REINSERIDA */}
      <div className="card bg-gray-800 p-6 rounded-lg mb-6">
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
            <AccordionContent className="text-gray-400 space-y-2">
              <p><span className="font-bold text-white">Análise de Tempo (Referência: 26/06/2025):</span> Prova: 05 de Outubro de 2025. Semanas Disponíveis: ~15 semanas. Total de Horas Líquidas: 15 semanas x 37.5h = ~560 horas de estudo. É tempo mais do que suficiente. Confie no processo.</p>
              <div>
                <p className="font-bold text-white">As 3 Fases do Estudo:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li><span className="font-semibold">FASE 1: A Fundação (18 de Junho a 22 de Julho - 5 semanas)</span><br/>Objetivo: Dominar os fundamentos das matérias de maior peso.</li>
                  <li><span className="font-semibold">FASE 2: A Expansão e Inclusão (23 de Julho a 31 de Agosto - ~6 semanas)</span><br/>Objetivo: Introduzir gradualmente as matérias restantes.</li>
                  <li><span className="font-semibold">FASE 3: Refinamento e Ataque Final (01 de Setembro até a Prova - ~5 semanas)</span><br/>Objetivo: Focar em questões, revisão e simulados.</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      
      {/* TÍTULO DO PAINEL DE CONTROLE - REINSERIDO */}
      <h2 className="text-2xl font-bold mb-4">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
      <p className="text-gray-400 mb-4">Foco: Construir a base para os cargos de Especialista (HFA), Analista (MGI) e Analista (INSS).</p>

      <div className="overflow-x-auto card bg-gray-800 p-2 rounded-lg">
        <CicloTable sessoes={sessoes || []} disciplinas={disciplinas || []} />
      </div>

      {/* BOTÃO DE ADICIONAR SESSÃO - REINSERIDO */}
      <div className="mt-6 flex justify-center">
        <form action={addSessaoCiclo}>
          <Button type="submit">
            + Adicionar Sessão ao Ciclo
          </Button>
        </form>
      </div>
    </div>
  );
}