// src/components/CicloTableRow.tsx
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { updateSessaoEstudo, deleteSessaoCiclo, concluirSessaoEstudo } from '@/app/actions';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';

export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo; disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();
  const [rowData, setRowData] = useState(sessao);

  // Sincroniza o estado interno se a prop do servidor mudar
  useEffect(() => {
    setRowData(sessao);
  }, [sessao]);

  const handleFieldChange = (field: keyof SessaoEstudo, value: any) => {
    setRowData(prev => ({ ...prev, [field]: value }));
  };

  // Efeito de AUTO-SAVE com "debounce"
  useEffect(() => {
    // Não salva se os dados forem idênticos aos que vieram do servidor
    if (JSON.stringify(rowData) === JSON.stringify(sessao)) return;

    const handler = setTimeout(() => {
      startTransition(() => updateSessaoEstudo(rowData));
    }, 1500); // Salva 1.5 segundos após a última alteração

    return () => clearTimeout(handler);
  }, [rowData, sessao]);
  
  const percAcerto = rowData.questoes_total && rowData.questoes_acertos ? Math.round((rowData.questoes_acertos / rowData.questoes_total) * 100) : 0;

  return (
    <tr className={`border-b border-gray-700 ${rowData.materia_finalizada ? 'bg-black/20 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`}>
      <td className="p-2 text-center align-middle">
        <Checkbox // O CHECKBOX OK
          checked={rowData.concluida}
          disabled={rowData.concluida || isPending}
          onCheckedChange={() => {
            if (!rowData.concluida) {
              startTransition(() => concluirSessaoEstudo(rowData.id));
            }
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
          <Input type="number" value={rowData.questoes_acertos || ''} onChange={(e) => handleFieldChange('questoes_acertos', e.target.value)} className="bg-gray-700 w-16" placeholder="C" />
          <span className="text-gray-400">/</span>
          <Input type="number" value={rowData.questoes_total || ''} onChange={(e) => handleFieldChange('questoes_total', e.target.value)} className="bg-gray-700 w-16" placeholder="T" />
        </div>
        {rowData.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
      </td>
      <td className="p-2 align-middle"><Input type="date" value={rowData.data_estudo || ''} onChange={(e) => handleFieldChange('data_estudo', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input type="date" value={rowData.data_revisao_1 || ''} onChange={(e) => handleFieldChange('data_revisao_1', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input type="date" value={rowData.data_revisao_2 || ''} onChange={(e) => handleFieldChange('data_revisao_2', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input type="date" value={rowData.data_revisao_3 || ''} onChange={(e) => handleFieldChange('data_revisao_3', e.target.value)} className="bg-gray-700" /></td>
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