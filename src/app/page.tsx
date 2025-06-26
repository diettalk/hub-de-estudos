// src/app/ciclo/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { addSessaoCiclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { CicloTableRow } from '@/components/CicloTableRow';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';

export default function CicloPage() {
  const [sessoes, setSessoes] = useState<SessaoEstudo[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, startAddingTransition] = useTransition();
  const supabase = createClientComponentClient();

  const getCicloData = async () => {
    const sessoesPromise = supabase.from('sessoes_estudo').select(`*, disciplinas (id, nome, emoji)`).order('hora_no_ciclo');
    const disciplinasPromise = supabase.from('disciplinas').select('*').order('nome');
    const [{ data: sessoesData }, { data: disciplinasData }] = await Promise.all([sessoesPromise, disciplinasPromise]);
    setSessoes(sessoesData as SessaoEstudo[] || []);
    setDisciplinas(disciplinasData || []);
    setLoading(false);
  };

  useEffect(() => {
    getCicloData();
  }, [supabase]);

  if(loading) return <div>Carregando...</div>

  const comandoEvolucao = `Olá, David! Concluí a Fase 1...`;
  
  return (
    <div className="space-y-6">
      <ProgressoCicloCard sessoes={sessoes} />
      
      {/* ... Seus textos do tutorial e legenda aqui ... */}
      
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700 mt-4">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase bg-gray-800">
              <tr>
                <th className="p-3">OK</th>
                <th className="p-3">Finalizada</th>
                <th className="p-3">Hora</th>
                <th className="p-3">Matéria</th>
                <th className="p-3 min-w-[350px]">Foco Sugerido</th>
                <th className="p-3 min-w-[250px]">Diário de Bordo</th>
                <th className="p-3 min-w-[200px]">Questões</th>
                <th className="p-3 min-w-[150px]">Data Estudo</th>
                <th className="text-center p-3">R1 (24h)</th>
                <th className="text-center p-3">R7 (7d)</th>
                <th className="text-center p-3">R30 (30d)</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {sessoes.map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={() => startAddingTransition(() => addSessaoCiclo())} variant="outline" size="sm" disabled={isAdding}>
            {isAdding ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
          </Button>
        </div>
      </div>
    </div>
  );
}