// src/app/ciclo/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { updateSessaoEstudo, addSessaoCiclo, deleteSessaoCiclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Componente para uma única linha da tabela, para otimizar e isolar a lógica
function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo, disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (formData: FormData) => {
    formData.append('id', String(sessao.id));
    formData.append('isMateriaFinalizada', String(sessao.materia_finalizada));
    startTransition(() => {
      updateSessaoEstudo(formData);
    });
  };
  
  const acertos = sessao.questoes_acertos || 0;
  const total = sessao.questoes_total || 0;
  const aproveitamento = total > 0 ? Math.round((acertos / total) * 100) : 0;
  
  return (
   <tr key={sessao.id} className="border-b border-gray-700 hover:bg-gray-800/50">
  <td className="p-3 text-center">
    <input type="checkbox" defaultChecked={sessao.concluida} />
  </td>
  <td className="p-3 text-center">{sessao.finalizada}</td>
  <td className="p-3 text-center">{sessao.hora}</td>
  <td className="p-3">{sessao.materia}</td>
  <td className="p-3">{sessao.foco_sugerido}</td>
  <td className="p-3">
    <Textarea defaultValue={sessao.diario_de_bordo || ''} className="bg-gray-700 h-10"/>
  </td>
  <td className="p-3">{sessao.questoes}</td>
  <td className="p-3 text-center">
    <input type="date" defaultValue={sessao.data_estudo || ''} className="bg-gray-700"/>
  </td>
  <td className="p-3 text-center">{sessao.r1 ? new Date(sessao.r1 + 'T03:00:00').toLocaleDateString('pt-BR') : '-'}</td>
  <td className="p-3 text-center">{sessao.r7 ? new Date(sessao.r7 + 'T03:00:00').toLocaleDateString('pt-BR') : '-'}</td>
  <td className="p-3 text-center">{sessao.r30 ? new Date(sessao.r30 + 'T03:00:00').toLocaleDateString('pt-BR') : '-'}</td>
  
  {/* CORREÇÃO AQUI: Adicionando a coluna e o botão de exclusão de volta */}
  <td className="p-3 text-center">
    <form action={deleteSessaoCiclo}>
        <input type="hidden" name="id" value={sessao.id} />
        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8">
            <i className="fas fa-times text-xs text-red-500"></i>
        </Button>
    </form>
  </td>
</tr>
  );
}

export default function CicloDeEstudosPage() {
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
  
  if (loading) return <div>Carregando...</div>;

  const comandoEvolucao = `Olá, David! Concluí a Fase 1 do nosso Ciclo de Estudos. ...`;

  return (
    <div className="space-y-8">
      {/* ... SEU PROGRESSO E TEXTOS AQUI ... */}
      <details className="card p-6 bg-gray-800/50">
        <summary className="font-semibold text-lg cursor-pointer">O Ciclo de Estudos da Aprovação: Da Fundação à Maestria</summary>
        <div className="mt-4 prose prose-invert max-w-none text-gray-400 space-y-4">
          <h4 className="font-bold text-white">Tutorial de Evolução do Ciclo</h4>
          <div>
            <h5 className="font-semibold text-white">Análise de Tempo (Referência: 26/06/2025)</h5>
            <p>Prova: 05 de Outubro de 2025.<br/>Semanas Disponíveis: ~15 semanas.<br/>Total de Horas Líquidas: 15 semanas x 37.5h = ~560 horas de estudo. É tempo mais do que suficiente. Confie no processo.</p>
          </div>
          <div>
            <h5 className="font-semibold text-white">As 3 Fases do Estudo:</h5>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>FASE 1: A Fundação (18 de Junho a 22 de Julho - 5 semanas)</strong><br/>Objetivo: Dominar os fundamentos das matérias de maior peso.</li>
              <li><strong>FASE 2: A Expansão e Inclusão (23 de Julho a 31 de Agosto - ~6 semanas)</strong><br/>Objetivo: Introduzir gradualmente as matérias restantes.</li>
              <li><strong>FASE 3: Refinamento e Ataque Final (01 de Setembro até a Prova - ~5 semanas)</strong><br/>Objetivo: Focar em questões, revisão e simulados.</li>
            </ol>
          </div>
        </div>
      </details>
      
      <div>
        <h2 className="text-2xl font-bold">Ciclo de Estudos - FASE 1 (Painel de Controle)</h2>
        <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700 mt-4">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase bg-gray-800">
              <tr>
                <th className="p-3">OK</th><th className="p-3">Finalizada</th><th className="p-3">Hora</th>
                <th className="p-3">Matéria</th><th className="p-3 min-w-[350px]">Foco Sugerido</th>
                <th className="p-3 min-w-[250px]">Diário de Bordo</th><th className="p-3 min-w-[200px]">Questões</th>
                <th className="p-3 min-w-[150px]">Data Estudo</th><th className="text-center p-3">R1</th><th className="text-center p-3">R7</th><th className="text-center p-3">R30</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sessoes.map((sessao) => <CicloTableRow key={sessao.id} sessao={sessao} disciplinas={disciplinas} />)}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center mt-4">
          <Button onClick={() => startAddingTransition(() => addSessaoCiclo())} variant="outline" size="sm" disabled={isAdding}>{isAdding ? 'Adicionando...' : '+ Adicionar Linha'}</Button>
        </div>
      </div>
      
      <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-sm">
        <h3 className="font-bold mb-2">Legenda de Matérias (Siglas)</h3>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <li><strong>LP:</strong> Língua Portuguesa</li><li><strong>RLM:</strong> Raciocínio Lógico</li>
            <li><strong>G.GOV:</strong> Gestão Governamental</li><li><strong>P.PUB:</strong> Políticas Públicas</li>
            <li><strong>SAÚDE/SOCIAL:</strong> Saúde e Desenvolvimento Social</li><li><strong>DH:</strong> Direitos Humanos</li>
            <li><strong>PESQUISA:</strong> Pesquisa e Avaliação</li><li><strong>ADM.PÚB:</strong> Adm. Pública e Finanças</li>
        </ul>
      </div>

      <details className="p-6 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer">
        <summary className="font-semibold">Comando para Evolução do Ciclo (Para uso futuro)</summary>
        <pre className="mt-4 bg-gray-900 p-4 rounded-md text-xs whitespace-pre-wrap">{comandoEvolucao}</pre>
      </details>
    </div>
  );
}