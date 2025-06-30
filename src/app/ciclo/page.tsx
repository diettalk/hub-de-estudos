// src/app/ciclo/page.tsx
'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { addSessaoCiclo } from '@/app/actions';
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

  const comandoEvolucao = `Olá, David! Concluí a Fase 1 do nosso Ciclo de Estudos...`; // Seu texto completo

  if (loading) return <div className="text-center p-12">Carregando dados do ciclo...</div>;
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Ciclo de Estudos</h1>

      <ProgressoCicloCard sessoes={sessoes} />
      
      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
          <AccordionContent className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
              {/* Seus textos de tutorial aqui */}
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
                  <th className="p-3">Finalizada</th>
                  <th className="p-3">Hora</th>
                  <th className="p-3">Matéria</th>
                  <th className="p-3 min-w-[350px]">Foco Sugerido</th>
                  <th className="p-3 min-w-[250px]">Diário de Bordo</th>
                  <th className="p-3 min-w-[200px]">Questões</th>
                  <th className="p-3 min-w-[150px]">Data Estudo</th>
                  <th className="text-center p-3">R1</th>
                  <th className="text-center p-3">R7</th>
                  <th className="text-center p-3">R30</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessoes.map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
              </tbody>
            </table>
          </div>
          <div className="p-2 flex justify-center border-t border-gray-700">
            <form action={() => startTransition(() => addSessaoCiclo())}>
              <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
                {isPending ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
              </Button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <li><strong>LP:</strong> Língua Portuguesa</li><li><strong>RLM:</strong> Raciocínio Lógico-Quantitativo</li>
            <li><strong>G.GOV:</strong> Gestão Governamental</li><li><strong>P.PUB:</strong> Políticas Públicas</li>
            <li><strong>SAÚDE/SOCIAL:</strong> Saúde e Dev. Social</li><li><strong>DH:</strong> Direitos Humanos</li>
            <li><strong>PESQUISA:</strong> Pesquisa e Avaliação</li><li><strong>ADM.PÚB:</strong> Adm. Pública e Finanças</li>
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