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

  useEffect(() => {
    const getCicloData = async () => {
      setLoading(true);
      const sessoesPromise = supabase.from('sessoes_estudo').select(`*, disciplina:disciplina_id(id, nome, emoji)`).order('hora_no_ciclo');
      const disciplinasPromise = supabase.from('disciplinas').select('*').order('nome');
      const [{ data: sessoesData }, { data: disciplinasData }] = await Promise.all([sessoesPromise, disciplinasPromise]);

      const sessoesComDisciplina = (sessoesData || []).map(s => ({ ...s, disciplinas: s.disciplina }));
      setSessoes(sessoesComDisciplina);
      setDisciplinas(disciplinasData || []);
      setLoading(false);
    };
    getCicloData();
  }, [supabase]);

  if (loading) return <div>Carregando Ciclo de Estudos...</div>;

  const comandoEvolucao = `Olá, David! Concluí a Fase 1 do nosso Ciclo de Estudos... (e o resto do seu texto completo aqui)`;

  return (
    <div className="space-y-8">
      <ProgressoCicloCard sessoes={sessoes} />

      <details className="card p-6 bg-gray-800/50">
        <summary className="font-semibold text-lg cursor-pointer">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</summary>
        <div className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
          <h4 className="font-bold text-white">Tutorial de Evolução do Ciclo</h4>
          <div>... (Seu texto completo do Tutorial aqui)</div>
        </div>
      </details>
      
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <div className="bg-gray-800/50 rounded-lg shadow-lg overflow-hidden border border-gray-700 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                <tr>
                  <th className="p-3">OK</th><th className="p-3">Finalizada</th><th className="p-3">Hora</th>
                  <th className="p-3">Matéria</th><th className="p-3 min-w-[350px]">Foco Sugerido</th>
                  <th className="p-3 min-w-[250px]">Diário de Bordo</th><th className="p-3 min-w-[200px]">Questões</th>
                  <th className="p-3 min-w-[150px]">Data Estudo</th><th className="text-center p-3">R1</th>
                  <th className="text-center p-3">R7</th><th className="text-center p-3">R30</th><th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessoes.map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
              </tbody>
            </table>
          </div>
          <div className="p-2 flex justify-center border-t border-gray-700">
            <Button onClick={() => startAddingTransition(() => addSessaoCiclo())} variant="ghost" size="sm" disabled={isAdding}>
              {isAdding ? 'Adicionando...' : '+ Adicionar Linha ao Ciclo'}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <div>... (Sua legenda completa aqui)</div>
      </div>

      <details className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer">
        <summary className="font-semibold">Comando para Evolução do Ciclo (Para uso futuro)</summary>
        <pre className="mt-4 bg-gray-900 p-4 rounded-md text-xs whitespace-pre-wrap">{comandoEvolucao}</pre>
      </details>
    </div>
  );
}