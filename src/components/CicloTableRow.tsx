// src/components/CicloTableRow.tsx
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
// MODIFICAÇÃO: Renomeamos a action para ser mais clara e vamos criá-la no próximo passo.
import { updateSessaoEstudo, deleteSessaoCiclo, toggleConclusaoSessao } from '@/app/actions'; 
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner'; // Adicionado para feedback ao usuário

export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo; disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();
  const [rowData, setRowData] = useState(sessao);

  useEffect(() => {
    setRowData(sessao);
  }, [sessao]);

  const handleFieldChange = (field: keyof SessaoEstudo, value: any) => {
    setRowData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (JSON.stringify(rowData) === JSON.stringify(sessao)) return;
    const handler = setTimeout(() => {
      startTransition(() => updateSessaoEstudo(rowData));
    }, 1500);
    return () => clearTimeout(handler);
  }, [rowData, sessao]);

  // MODIFICAÇÃO: Criamos uma função dedicada para o checkbox
  const handleToggleConclusao = (checked: boolean) => {
    startTransition(async () => {
      // Chamamos a nova Server Action, passando o ID e o novo estado (marcado ou desmarcado)
      const result = await toggleConclusaoSessao(rowData.id, checked);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(checked ? 'Estudo concluído! Revisões agendadas.' : 'Conclusão revertida.');
      }
    });
  };

  const percAcerto = rowData.questoes_total && rowData.questoes_acertos ? Math.round((rowData.questoes_acertos / rowData.questoes_total) * 100) : 0;

  // MODIFICAÇÃO: A data de estudo agora é formatada para exibição
  const displayDate = (dateString: string | null) => {
    if (!dateString) return '';
    // Garante que a data seja interpretada corretamente, sem problemas de fuso horário
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${year}-${month}-${day}`;
  };

  return (
    <tr className={`border-b border-gray-700 ${rowData.materia_finalizada ? 'bg-black/20 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`}>
      <td className="p-2 text-center align-middle">
        {/* ***** MODIFICAÇÃO PRINCIPAL NO CHECKBOX ***** */}
        <Checkbox
          checked={rowData.concluida}
          disabled={isPending} // Apenas desabilita durante a transição
          onCheckedChange={(checked) => {
            // O 'checked' aqui pode ser um booleano ou 'indeterminate'. Garantimos que seja booleano.
            handleToggleConclusao(!!checked);

          }}
        />
      </td>
      <td className="p-2 text-center align-middle">{rowData.ordem}</td>
      <td className="p-2 align-middle">
        <Select
          value={String(rowData.disciplina_id || '')}
          onValueChange={(value) => handleFieldChange('disciplina_id', Number(value))}
        >
          <SelectTrigger className="bg-gray-700 w-[180px]"><SelectValue placeholder="Vincular Matéria" /></SelectTrigger>
          <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.emoji} {d.nome}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-2 align-middle"><Input value={rowData.foco_sugerido || ''} onChange={(e) => handleFieldChange('foco_sugerido', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Textarea value={rowData.diario_de_bordo || ''} onChange={(e) => handleFieldChange('diario_de_bordo', e.target.value)} rows={1} className="bg-gray-700" /></td>
      <td className="p-2 align-middle text-center">
        <div className="flex items-center gap-1 justify-center">
          <Input type="number" value={rowData.questoes_acertos || ''} onChange={(e) => handleFieldChange('questoes_acertos', e.target.valueAsNumber)} className="bg-gray-700 w-16" placeholder="C" />
          <span className="text-gray-400">/</span>
          <Input type="number" value={rowData.questoes_total || ''} onChange={(e) => handleFieldChange('questoes_total', e.target.valueAsNumber)} className="bg-gray-700 w-16" placeholder="T" />
        </div>
        {rowData.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
      </td>
      {/* ***** MODIFICAÇÃO PRINCIPAL NAS DATAS ***** */}
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_estudo)} readOnly className="bg-gray-800 border-gray-600 text-gray-400" /></td>
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_revisao_1)} readOnly className="bg-gray-800 border-gray-600 text-gray-400" /></td>
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_revisao_2)} readOnly className="bg-gray-800 border-gray-600 text-gray-400" /></td>
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_revisao_3)} readOnly className="bg-gray-800 border-gray-600 text-gray-400" /></td>
      <td className="p-2 text-center align-middle">
        <Checkbox
          checked={rowData.materia_finalizada}
          onCheckedChange={(checked) => handleFieldChange('materia_finalizada', !!checked)}
        />
      </td>
      <td className="p-2 text-center align-middle">
        <form action={(formData) => startTransition(() => deleteSessaoCiclo(formData))}>
          <input type="hidden" name="id" value={rowData.id} />
          <Button type="submit" variant="ghost" size="icon" title="Excluir Linha" disabled={isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </form>
      </td>
    </tr>
  );
}