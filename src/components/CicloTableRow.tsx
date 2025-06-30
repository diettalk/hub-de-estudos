// src/components/CicloTableRow.tsx (VERSÃO FINAL E CORRIGIDA)
'use client';

import { useState, useEffect, useTransition } from 'react';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
// CORREÇÃO: Importamos a nova ação para o checkbox "Finalizada"
import { updateSessaoEstudo, deleteSessaoCiclo, toggleConclusaoSessao, updateDatasSessaoEstudo, toggleFinalizarSessao } from '@/app/actions';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function CicloTableRow({ sessao, disciplinas }: { sessao: SessaoEstudo; disciplinas: Disciplina[] }) {
  const [isPending, startTransition] = useTransition();
  const [rowData, setRowData] = useState(sessao);

  useEffect(() => {
    setRowData(sessao);
  }, [sessao]);

  const handleInputChange = (field: keyof SessaoEstudo, value: any) => {
    setRowData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleDisciplinaChange = (disciplinaId: string) => {
    const idAsNumber = Number(disciplinaId);
    const disciplinaSelecionada = disciplinas.find(d => d.id === idAsNumber);
    setRowData(prev => ({ ...prev, disciplina_id: idAsNumber, materia_nome: disciplinaSelecionada?.nome || null }));
  };

  useEffect(() => {
    // O auto-save agora ignora o campo 'materia_finalizada' para não conflitar com a ação direta
    const { materia_finalizada, ...restOfRowData } = rowData;
    const { materia_finalizada: _, ...restOfSessao } = sessao;

    if (JSON.stringify(restOfRowData) === JSON.stringify(restOfSessao)) return;
    
    const handler = setTimeout(() => {
      startTransition(() => updateSessaoEstudo(rowData));
    }, 1500);
    return () => clearTimeout(handler);
  }, [rowData, sessao]);

  const handleToggleConclusao = (checked: boolean) => {
    startTransition(async () => {
      const result = await toggleConclusaoSessao(rowData.id, checked);
      if (result?.error) toast.error(result.error);
      else toast.success(checked ? 'Estudo concluído! Revisões agendadas.' : 'Conclusão revertida.');
    });
  };

  const handleDateChange = (campo: 'data_estudo' | 'data_revisao_1' | 'data_revisao_2' | 'data_revisao_3', valor: string) => {
    if (!valor) return;
    startTransition(async () => {
      const result = await updateDatasSessaoEstudo(rowData.id, campo, valor);
      if (result?.error) toast.error(`Erro ao salvar data: ${result.error}`);
      else toast.success("Datas atualizadas com sucesso!");
    });
  };

  // NOVA FUNÇÃO: Lida com o clique no checkbox "Finalizada"
  const handleToggleFinalizada = (checked: boolean) => {
    startTransition(async () => {
      const result = await toggleFinalizarSessao(rowData.id, checked);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(checked ? "Matéria finalizada e revisões canceladas." : "Matéria reativada.");
      }
    });
  };

  const percAcerto = rowData.questoes_total && rowData.questoes_acertos ? Math.round((rowData.questoes_acertos / rowData.questoes_total) * 100) : 0;

  const displayDate = (dateString: string | null) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };

  return (
    <tr className={`border-b border-gray-700 ${rowData.materia_finalizada ? 'bg-black/20 text-gray-500 line-through' : ''} ${isPending ? 'opacity-50' : ''}`}>
      <td className="p-2 text-center align-middle">
        <Checkbox checked={rowData.concluida} disabled={isPending || rowData.materia_finalizada} onCheckedChange={handleToggleConclusao} />
      </td>
      <td className="p-2 text-center align-middle">{rowData.ordem}</td>
      <td className="p-2 align-middle">
        <Select value={String(rowData.disciplina_id || '')} onValueChange={handleDisciplinaChange}>
          <SelectTrigger className="bg-gray-700 w-[180px]">
            <SelectValue placeholder="Vincular Matéria">{rowData.materia_nome || "Vincular Matéria"}</SelectValue>
          </SelectTrigger>
          <SelectContent>{disciplinas.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.emoji} {d.nome}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-2 align-middle"><Input value={rowData.foco_sugerido || ''} onChange={(e) => handleInputChange('foco_sugerido', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Textarea value={rowData.diario_de_bordo || ''} onChange={(e) => handleInputChange('diario_de_bordo', e.target.value)} rows={1} className="bg-gray-700" /></td>
      <td className="p-2 align-middle text-center">
        <div className="flex items-center gap-1 justify-center">
          <Input type="number" value={rowData.questoes_acertos || ''} onChange={(e) => handleInputChange('questoes_acertos', e.target.valueAsNumber)} className="bg-gray-700 w-16" placeholder="C" />
          <span className="text-gray-400">/</span>
          <Input type="number" value={rowData.questoes_total || ''} onChange={(e) => handleInputChange('questoes_total', e.target.valueAsNumber)} className="bg-gray-700 w-16" placeholder="T" />
        </div>
        {rowData.questoes_total ? <span className="text-xs mt-1 block">{percAcerto}%</span> : null}
      </td>
      
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_estudo)} disabled={!rowData.concluida || isPending} onChange={(e) => handleDateChange('data_estudo', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_revisao_1)} disabled={!rowData.concluida || isPending} onChange={(e) => handleDateChange('data_revisao_1', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_revisao_2)} disabled={!rowData.concluida || isPending} onChange={(e) => handleDateChange('data_revisao_2', e.target.value)} className="bg-gray-700" /></td>
      <td className="p-2 align-middle"><Input type="date" value={displayDate(rowData.data_revisao_3)} disabled={!rowData.concluida || isPending} onChange={(e) => handleDateChange('data_revisao_3', e.target.value)} className="bg-gray-700" /></td>
      
      <td className="p-2 text-center align-middle">
        {/* CORREÇÃO: Este checkbox agora chama a nova função dedicada */}
        <Checkbox checked={rowData.materia_finalizada} onCheckedChange={(checked) => handleToggleFinalizada(!!checked)} />
      </td>
      <td className="p-2 text-center align-middle">
        <form action={async (formData) => {
            startTransition(async () => {
                const id = Number(formData.get('id'));
                if (!isNaN(id)) await deleteSessaoCiclo(id);
            });
        }}>
          <input type="hidden" name="id" value={rowData.id} />
          <Button type="submit" variant="ghost" size="icon" title="Excluir Linha" disabled={isPending}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </form>
      </td>
    </tr>
  );
}