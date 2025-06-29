// src/app/ciclo/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { addSessaoCiclo, deleteSessaoCiclo, restoreHoraUm } from '@/app/actions'; // Adicionado restoreHoraUm
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProgressoCicloCard } from '@/components/ProgressoCicloCard';
import { CicloTableRow } from '@/components/CicloTableRow';

export default function CicloPage() {
  const [sessoes, setSessoes] = useState<SessaoEstudo[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  // Usamos useCallback para evitar que a função seja recriada em cada render
  const getCicloData = useCallback(async () => {
    const { data: sessoesData } = await supabase.from('sessoes_estudo').select(`*, disciplina:disciplinas(id, nome)`).order('hora_no_ciclo');
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

  if (loading) return <div className="text-center p-12">Carregando dados do ciclo...</div>;
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div /> {/* Espaçador */}
        <form action={() => startTransition(() => restoreHoraUm())}>
          <Button type="submit" variant="outline" size="sm" disabled={isPending}>Restaurar Hora 1 (se necessário)</Button>
        </form>
      </div>

      <ProgressoCicloCard sessoes={sessoes} />
      
      <details className="card p-6 bg-gray-800/50">
        <summary className="font-semibold text-lg cursor-pointer">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</summary>
        <div className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
            {/* Seus textos explicativos podem vir aqui */}
            <p>Este é o seu guia para navegar pelas fases do estudo...</p>
        </div>
      </details>
      
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