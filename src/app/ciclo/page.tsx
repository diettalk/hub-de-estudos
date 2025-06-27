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
    <tr className={sessao.materia_finalizada ? 'bg-purple-900/30 opacity-40' : sessao.concluido ? 'bg-green-900/30' : 'hover:bg-gray-700/50'}>
      <td className="p-2 text-center"><Checkbox name="concluido" defaultChecked={sessao.concluido} onCheckedChange={(checked) => { const f = new FormData(); f.append('concluido', String(checked)); f.append('data_estudo_was_null', String(sessao.data_estudo === null)); handleUpdate(f); }} disabled={isPending} /></td>
      <td className="p-2 text-center"><Checkbox name="materia_finalizada" defaultChecked={sessao.materia_finalizada} onCheckedChange={(c) => { const f = new FormData(); f.append('materia_finalizada', String(c)); handleUpdate(f); }} disabled={isPending} /></td>
      <td className="p-3 font-bold">{sessao.hora_no_ciclo}</td>
      <td className="p-3">
        <select name="disciplina_id" defaultValue={sessao.disciplinas?.id || ''} onChange={(e) => { const f = new FormData(); f.append('disciplina_id', e.target.value); handleUpdate(f); }} className="w-full bg-gray-700/50 p-1 rounded-md text-xs border-gray-600">
            <option value="">Selecione...</option>
            {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
      </td>
      <td className="p-3"><Textarea name="foco" defaultValue={sessao.foco} onBlur={(e) => { const f = new FormData(); f.append('foco', e.target.value); handleUpdate(f);}} disabled={isPending} rows={1} className="w-full bg-transparent p-1 rounded-md"/></td>
      <td className="p-3"><Textarea name="diario_de_bordo" defaultValue={sessao.diario_de_bordo || ''} onBlur={(e) => { const f = new FormData(); f.append('diario_de_bordo', e.target.value); handleUpdate(f); }} disabled={isPending} rows={1} className="w-full bg-gray-700/50 p-1 rounded-md"/></td>
      <td className="p-3"><div className="flex items-center gap-1"><Input type="number" name="questoes_acertos" defaultValue={sessao.questoes_acertos || ''} onBlur={(e) => { const f = new FormData(); f.append('questoes_acertos', e.target.value); handleUpdate(f); }} placeholder="A" className="w-14 bg-gray-700/50 p-1 rounded-md"/>/ <Input type="number" name="questoes_total" defaultValue={sessao.questoes_total || ''} onBlur={(e) => { const f = new FormData(); f.append('questoes_total', e.target.value); handleUpdate(f); }} placeholder="T" className="w-14 bg-gray-700/50 p-1 rounded-md"/><span className="w-10 text-center font-bold">{total > 0 ? `${aproveitamento}%` : '-'}</span></div></td>
      <td className="p-3"><Input type="date" name="data_estudo" defaultValue={sessao.data_estudo || ''} onBlur={(e) => { const f = new FormData(); f.append('data_estudo', e.target.value); handleUpdate(f); }} className="w-full bg-gray-700/50 p-1 rounded-md"/></td>
      <td className="p-3"><div className="flex items-center justify-center gap-2"><Input type="date" name="data_revisao_1" defaultValue={sessao.data_revisao_1 || ''} onBlur={(e) => { const f = new FormData(); f.append('data_revisao_1', e.target.value); handleUpdate(f);}}/><Checkbox name="r1_concluida" defaultChecked={sessao.r1_concluida} onCheckedChange={(c) => { const f = new FormData(); f.append('r1_concluida', String(c)); handleUpdate(f);}}/></div></td>
      <td className="p-3"><div className="flex items-center justify-center gap-2"><Input type="date" name="data_revisao_2" defaultValue={sessao.data_revisao_2 || ''} onBlur={(e) => { const f = new FormData(); f.append('data_revisao_2', e.target.value); handleUpdate(f);}}/><Checkbox name="r2_concluida" defaultChecked={sessao.r2_concluida} onCheckedChange={(c) => { const f = new FormData(); f.append('r2_concluida', String(c)); handleUpdate(f);}}/></div></td>
      <td className="p-3"><div className="flex items-center justify-center gap-2"><Input type="date" name="data_revisao_3" defaultValue={sessao.data_revisao_3 || ''} onBlur={(e) => { const f = new FormData(); f.append('data_revisao_3', e.target.value); handleUpdate(f);}}/><Checkbox name="r3_concluida" defaultChecked={sessao.r3_concluida} onCheckedChange={(c) => { const f = new FormData(); f.append('r3_concluida', String(c)); handleUpdate(f);}}/></div></td>
      <td className="p-2"><Button onClick={() => startTransition(() => deleteSessaoCiclo(sessao.id))} variant="ghost" size="icon" className="h-6 w-6"><i className="fas fa-trash-alt text-xs text-red-500"></i></Button></td>
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