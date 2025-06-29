// src/app/ciclo/page.tsx

'use client';

// CORREÇÃO: Adicionamos o 'useCallback' à lista de importações do React.
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

  // CORREÇÃO: Envolvemos a função getCicloData com o useCallback para otimização
  // e para garantir que o useEffect funcione corretamente.
  const getCicloData = useCallback(async () => {
    setLoading(true);
    const sessoesPromise = supabase.from('sessoes_estudo').select(`*, disciplina:disciplinas(id, nome)`).order('hora_no_ciclo');
    const disciplinasPromise = supabase.from('disciplinas').select('*').order('nome');
    
    const [{ data: sessoesData }, { data: disciplinasData }] = await Promise.all([sessoesPromise, disciplinasPromise]);
    
    setSessoes((sessoesData as SessaoEstudo[]) || []);
    setDisciplinas(disciplinasData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    getCicloData();
    const channel = supabase.channel('realtime-ciclo-page').on('postgres_changes', { event: '*', schema: 'public', table: 'sessoes_estudo' }, getCicloData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [getCicloData, supabase]);

  if (loading) {
    return <div className="text-center p-12">Carregando dados do ciclo...</div>;
  }
  
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
    </div>
  );
}