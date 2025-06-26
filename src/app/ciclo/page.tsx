// src/components/CicloTableRow.tsx
'use client';
import { useTransition } from 'react';
import { updateSessaoEstudo, deleteSessaoCiclo } from '@/app/actions';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo, disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (formData: FormData) => {
    formData.append('id', String(sessao.id));
    formData.append('isMateriaFinalizada', String(sessao.materia_finalizada));
    startTransition(() => {
      updateSessaoEstudo(formData);
    });
  };
  
  const handleDelete = () => {
    if(window.confirm('Tem certeza que quer excluir esta linha do ciclo?')) {
        startTransition(() => {
            deleteSessaoCiclo(sessao.id);
        });
    }
  }

  const acertos = sessao.questoes_acertos || 0;
  const total = sessao.questoes_total || 0;
  const aproveitamento = total > 0 ? Math.round((acertos / total) * 100) : 0;
  
  return (
    <tr className={sessao.materia_finalizada ? 'bg-purple-900/30 opacity-40' : sessao.concluido ? 'bg-green-900/30' : 'hover:bg-gray-700/50'}>
      <td className="p-2 text-center"><input type="checkbox" name="concluido" defaultChecked={sessao.concluido} onChange={(e) => { const f = new FormData(); f.append('concluido', String(e.target.checked)); f.append('data_estudo_was_null', String(sessao.data_estudo === null)); handleUpdate(f); }} disabled={isPending} className="h-5 w-5"/></td>
      <td className="p-2 text-center"><input type="checkbox" name="materia_finalizada" defaultChecked={sessao.materia_finalizada} onChange={(e) => { const f = new FormData(); f.append('materia_finalizada', String(e.target.checked)); handleUpdate(f); }} disabled={isPending} className="h-5 w-5"/></td>
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
      <td className="p-3"><Input type="date" name="data_estudo" defaultValue={sessao.data_estudo || ''} onChange={(e) => { const f = new FormData(); f.append('data_estudo', e.target.value); handleUpdate(f); }} className="w-full bg-gray-700/50 p-1 rounded-md"/></td>
      <td className="p-3"><div className="flex items-center justify-center gap-2"><Input type="date" name="data_revisao_1" defaultValue={sessao.data_revisao_1 || ''} onChange={(e) => { const f = new FormData(); f.append('data_revisao_1', e.target.value); handleUpdate(f);}}/><input type="checkbox" name="r1_concluida" defaultChecked={sessao.r1_concluida} onChange={(e) => { const f = new FormData(); f.append('r1_concluida', String(e.target.checked)); handleUpdate(f);}}/></div></td>
      <td className="p-3"><div className="flex items-center justify-center gap-2"><Input type="date" name="data_revisao_2" defaultValue={sessao.data_revisao_2 || ''} onChange={(e) => { const f = new FormData(); f.append('data_revisao_2', e.target.value); handleUpdate(f);}}/><input type="checkbox" name="r2_concluida" defaultChecked={sessao.r2_concluida} onChange={(e) => { const f = new FormData(); f.append('r2_concluida', String(e.target.checked)); handleUpdate(f);}}/></div></td>
      <td className="p-3"><div className="flex items-center justify-center gap-2"><Input type="date" name="data_revisao_3" defaultValue={sessao.data_revisao_3 || ''} onChange={(e) => { const f = new FormData(); f.append('data_revisao_3', e.target.value); handleUpdate(f);}}/><input type="checkbox" name="r3_concluida" defaultChecked={sessao.r3_concluida} onChange={(e) => { const f = new FormData(); f.append('r3_concluida', String(e.target.checked)); handleUpdate(f);}}/></div></td>
      <td className="p-2"><Button onClick={handleDelete} variant="ghost" size="icon" className="h-6 w-6"><i className="fas fa-trash-alt text-xs text-red-500"></i></Button></td>
    </tr>
  );
}