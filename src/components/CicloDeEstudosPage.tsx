// src/components/CicloDeEstudosPage.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { updateSessaoEstudo } from '@/app/actions';

export function CicloDeEstudosPage() {
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSessoes = async () => {
      const { data } = await supabase.from('sessoes_estudo').select('*, disciplinas(nome, emoji)').order('hora_no_ciclo');
      setSessoes(data || []);
      setLoading(false);
    };
    getSessoes();
  }, []);

  const handleUpdate = (formData: FormData) => {
    startTransition(() => { updateSessaoEstudo(formData); });
  };
  
  const completedCount = sessoes.filter(s => s.concluido).length;
  const totalCount = sessoes.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) return <div>Carregando...</div>;
  
  const comandoEvolucao = `Olá, David!\n\nConcluí a Fase 1 do nosso Ciclo de Estudos. Quero evoluir para a Fase [PREENCHA: 2 para Expansão ou 3 para Ataque Final]...\n... (resto do seu texto completo)`;

  return (
    <div className="space-y-8">
      {/* SEÇÕES DE TEXTO RESTAURADAS */}
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
        <h2 className="text-lg font-semibold mb-2">Progresso do Ciclo</h2>
        <div className="w-full bg-gray-700 rounded-full h-6"><div className="bg-blue-600 h-6 text-xs font-medium text-blue-100 text-center p-1 leading-none rounded-full" style={{ width: `${percentage}%` }}>{percentage}%</div></div>
      </div>
      
      <details className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer">
        <summary className="font-semibold text-lg">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</summary>
        <div className="mt-4 text-gray-400 space-y-4 prose prose-invert max-w-none">
            <p>David, este não é um cronograma fixo, é um sistema vivo...</p>
            {/* COLE O RESTO DO SEU TEXTO DO TUTORIAL AQUI */}
        </div>
      </details>

      {/* SEÇÃO DA TABELA DO CICLO */}
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle - 38 Horas)</h2>
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
                  <th className="p-3 min-w-[200px]">Questões (A/T)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sessoes.map((sessao) => (
                  <tr key={sessao.id} className={sessao.concluido ? 'bg-green-900/30' : 'hover:bg-gray-700/50'}>
                    <td className="p-3 text-center"><input type="checkbox" name="concluido" defaultChecked={sessao.concluido} onChange={(e) => { const f = new FormData(); f.append('id', String(sessao.id)); f.append('concluido', String(e.target.checked)); handleUpdate(f); }} disabled={isPending} className="h-5 w-5"/></td>
                    <td className="p-3 font-bold">{sessao.hora_no_ciclo}</td>
                    <td className="p-3"><span className="bg-blue-900 text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full">{sessao.disciplinas?.nome}</span></td>
                    <td className="p-3">{sessao.foco}</td>
                    <td className="p-3"><textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} onBlur={(e) => { const f = new FormData(); f.append('id', String(sessao.id)); f.append('diario_de_bordo', e.target.value); handleUpdate(f); }} disabled={isPending} rows={1} className="w-full bg-gray-700/50 p-1 rounded-md text-xs border-gray-600"></textarea></td>
                    <td className="p-3"><div className="flex items-center gap-1"><input type="number" name="questoes_acertos" defaultValue={sessao.questoes_acertos || ''} onBlur={(e) => { const f = new FormData(); f.append('id', String(sessao.id)); f.append('questoes_acertos', e.target.value); handleUpdate(f); }} disabled={isPending} className="w-14 bg-gray-700/50 p-1 rounded-md text-xs" placeholder="A" /><span>/</span><input type="number" name="questoes_total" defaultValue={sessao.questoes_total || ''} onBlur={(e) => { const f = new FormData(); f.append('id', String(sessao.id)); f.append('questoes_total', e.target.value); handleUpdate(f); }} disabled={isPending} className="w-14 bg-gray-700/50 p-1 rounded-md text-xs" placeholder="T" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
       </div>

      {/* SEÇÃO DA LEGENDA E COMANDO DE EVOLUÇÃO */}
       <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
         <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
         <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {/* Cole a sua lista de legendas aqui */}
         </ul>
       </div>
       <details className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer">
        <summary className="font-semibold">Comando para Evolução do Ciclo (Para uso futuro)</summary>
        <div className="mt-4 text-gray-400 space-y-2 prose prose-invert max-w-none">
            <pre className="bg-gray-900 p-4 rounded-md text-xs whitespace-pre-wrap">{comandoEvolucao}</pre>
        </div>
      </details>
    </div>
  );
}