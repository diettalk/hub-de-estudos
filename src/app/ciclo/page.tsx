// src/app/ciclo/page.tsx
'use client';

import { useEffect, useState, useTransition, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { seedFase1Ciclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTable } from '@/components/CicloTable'; // Importa nossa nova tabela completa
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

  const comandoEvolucao = `Olá, David! Concluí a Fase 1...`; // (Seu texto completo aqui)

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
      
      <Accordion type="single" collapsible className="w-full card bg-gray-800/50 p-6 rounded-lg">
        <AccordionItem value="item-1">
          <AccordionTrigger className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</AccordionTrigger>
          <AccordionContent className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
              <h4 className="font-bold text-white">Tutorial de Evolução do Ciclo</h4>
              {/* Seus textos de tutorial aqui */}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <p className="text-gray-400 mt-1">Foco: Construir a base para os cargos...</p>
        
        {/* A nova tabela completa é chamada aqui */}
        <CicloTable sessoes={sessoes} disciplinas={disciplinas} />
      </div>
      
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        {/* Sua lista de legendas aqui */}
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