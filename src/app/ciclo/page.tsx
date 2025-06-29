// src/app/ciclo/page.tsx
'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { addSessaoCiclo, restoreHoraUm } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTableRow } from '@/components/CicloTableRow';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function CicloPage() {
  const [sessoes, setSessoes] = useState<SessaoEstudo[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  const getCicloData = useCallback(async () => {
    const { data: sessoesData } = await supabase.from('sessoes_estudo').select(`*`).order('hora_no_ciclo');
    const { data: disciplinasData } = await supabase.from('disciplinas').select('*').order('nome');
    
    setSessoes((sessoesData as SessaoEstudo[]) || []);
    setDisciplinas(disciplinasData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    getCicloData();
    const channel = supabase.channel('realtime-ciclo-page').on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes_estudo' }, getCicloData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [getCicloData, supabase]);

  const comandoEvolucao = `Olá, David! Concluí a Fase 1 do nosso Ciclo de Estudos. Quero evoluir para a **Fase [PREENCHA: 2 para Expansão ou 3 para Ataque Final]**.

Abaixo estão os dados do meu desempenho para você analisar e criar o novo ciclo:

**1. DIÁRIO DE BORDO (RESUMO):**
* **Matérias com 100% dos tópicos da Fase 1 estudados:** [Liste aqui as matérias que você finalizou os tópicos previstos na Fase 1. Ex: LP, RLM, G.GOV.]
* **Matérias com estudo em andamento:** [Liste as matérias e em qual tópico você está. Ex: P.PUB - estou em 50% de Modelos de Análise.]

**2. DADOS DA REVISÃO FAROL (ANKI OU MANUAL):**
* **TOP 3 Matérias com mais cartões 🔴 VERMELHOS (maiores dificuldades):**
    1.  [Nome da Matéria 1]
    2.  [Nome da Matéria 2]
    3.  [Nome da Matéria 3]
* **TOP 3 Matérias com mais cartões 🟢 VERDES (maiores facilidades):**
    1.  [Nome da Matéria 1]
    2.  [Nome da Matéria 2]
    3.  [Nome da Matéria 3]

**3. PERCEPÇÃO PESSOAL:**
* **Matéria que me sinto MAIS CONFIANTE:** [Sua resposta]
* **Matéria que sinto MAIS DIFICULDADE:** [Sua resposta]
* **Observações adicionais:** [Qualquer outra informação que julgue relevante]

Com base nestes dados, por favor, gere o **"Ciclo de Estudos - Fase [2 ou 3]"**, introduzindo as novas matérias do nosso Guia Estratégico e ajustando a frequência das matérias da Fase 1`;

  if (loading) return <div className="text-center p-12">Carregando dados do ciclo...</div>;
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
        <form action={() => startTransition(() => restoreHoraUm())}>
          <Button type="submit" variant="outline" size="sm" disabled={isPending}>Restaurar Hora 1</Button>
        </form>
      </div>

      <ProgressoCicloCard sessoes={sessoes} />
      
      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
          <AccordionContent className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
              <h4 className="font-bold text-white">Tutorial de Evolução do Ciclo</h4>
              <p>Este é o seu guia para navegar pelas fases do estudo, garantindo uma cobertura completa e revisões estratégicas até o dia da prova.</p>
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
                  <th className="p-3">OK</th>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Matéria</th>
                  <th className="p-3 min-w-[350px]">Foco Sugerido</th>
                  <th className="p-3 min-w-[250px]">Diário de Bordo</th>
                  <th className="p-3 min-w-[200px]">Questões</th>
                  <th className="p-3 min-w-[150px]">Data Estudo</th>
                  <th className="text-center p-3">R1</th>
                  <th className="text-center p-3">R7</th>
                  <th className="text-center p-3">R30</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessoes.map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
              </tbody>
            </table>
          </div>
          <div className="p-2 flex justify-center border-t border-gray-700">
            <Button onClick={() => startTransition(() => addSessaoCiclo())} variant="ghost" size="sm" disabled={isPending}>
              {isPending ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
            </Button>
          </div>
        </div>
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