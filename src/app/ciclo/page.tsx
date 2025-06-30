// src/app/ciclo/page.tsx

'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { addSessaoCiclo, seedFase1Ciclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTable } from '@/components/CicloTable';
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>
        {sessoes.length === 0 && (
          <form action={() => startTransition(async () => {
              const result = await seedFase1Ciclo();
              if(result?.message) alert(result.message);
            })}>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? 'Criando...' : 'CRIAR CICLO FASE 1 (38 Horas)'}
            </Button>
          </form>
        )}
      </div>

      <ProgressoCicloCard sessoes={sessoes} />
      
      {/* SEÇÃO DO TUTORIAL DO CICLO - RESTAURADA */}
      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
          <AccordionContent className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
              <h4 className="font-bold text-white">Tutorial de Evolução do Ciclo</h4>
              <div>
                <h5 className="font-semibold text-white">Análise de Tempo (Referência: 29/06/2025)</h5>
                <p>Prova: 05 de Outubro de 2025.<br/>Semanas Disponíveis: ~15 semanas.<br/>Total de Horas Líquidas: 15 semanas x 37.5h = ~560 horas de estudo. É tempo mais do que suficiente. Confie no processo.</p>
              </div>
              <div>
                <h5 className="font-semibold text-white">As 3 Fases do Estudo:</h5>
                <ol className="list-decimal list-inside space-y-2">
                  <li><strong>FASE 1: A Fundação</strong><br/>Objetivo: Dominar os fundamentos das matérias de maior peso para os seus cargos alvo (HFA, MGI, INSS), que são Gestão, Políticas Públicas, Português, RLM e o básico de Saúde/Social.</li>
                  <li><strong>FASE 2: A Expansão e Inclusão</strong><br/>Objetivo: Introduzir gradualmente as matérias restantes do nosso "Guia de Estudos Estratégico".</li>
                  <li><strong>FASE 3: Refinamento e Ataque Final</strong><br/>Objetivo: Parar de aprender conteúdo novo e focar em lapidar o conhecimento, ganhar velocidade e dominar a banca FGV.</li>
                </ol>
              </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-gray-400 mt-1">Foco: Construir a base para os cargos de Especialista (HFA), Analista (MGI) e Analista (INSS).</p>
        
        {/* A TABELA COMPLETA É CHAMADA AQUI */}
        <CicloTable sessoes={sessoes} disciplinas={disciplinas} />
      </div>
      
      {/* SEÇÃO DE LEGENDA DE MATÉRIAS - RESTAURADA */}
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <li><strong>LP:</strong> Língua Portuguesa</li>
            <li><strong>RLM:</strong> Raciocínio Lógico-Quantitativo</li>
            <li><strong>G.GOV:</strong> Gestão Governamental</li>
            <li><strong>P.PUB:</strong> Políticas Públicas</li>
            <li><strong>SAÚDE/SOCIAL:</strong> Saúde e Dev. Social</li>
            <li><strong>DH:</strong> Direitos Humanos</li>
            <li><strong>PESQUISA:</strong> Pesquisa e Avaliação</li>
            <li><strong>ADM.PÚB:</strong> Adm. Pública e Finanças</li>
        </ul>
      </div>

      {/* SEÇÃO DE COMANDO DE EVOLUÇÃO - RESTAURADA */}
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