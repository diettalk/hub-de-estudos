'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { toggleConclusaoSessao, updateDatasSessaoEstudo, updateSessaoEstudo, deleteSessaoCiclo, toggleFinalizarSessao } from '@/app/actions';
import { type SessaoEstudo, type Disciplina, type Node as DisciplinaNode } from '@/lib/types';
import { useDebounce } from '@/lib/hooks';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { DisciplinaCombobox } from './DisciplinaCombobox';

interface CicloTableRowProps {
  sessao: SessaoEstudo;
  disciplinaTree: DisciplinaNode[];
}

export function CicloTableRow({ sessao, disciplinaTree }: CicloTableRowProps) {
  const [isPending, startTransition] = useTransition();
  const [rowData, setRowData] = useState(sessao);

  useEffect(() => {
    setRowData(sessao);
  }, [sessao]);

  const handleInputChange = (field: keyof SessaoEstudo, value: string | number | null) => {
    setRowData(prev => ({ ...prev, [field]: value }));
  };

  const debouncedRowData = useDebounce(rowData, 1500);

  useEffect(() => {
    if (JSON.stringify(debouncedRowData) !== JSON.stringify(sessao)) {
      const { id, foco_sugerido, diario_de_bordo, questoes_acertos, questoes_total } = debouncedRowData;
      startTransition(() => updateSessaoEstudo({ id, foco_sugerido, diario_de_bordo, questoes_acertos, questoes_total }));
    }
  }, [debouncedRowData, sessao]);
  
  const handleSelectDisciplina = (disciplina: Disciplina | null) => {
    startTransition(async () => {
      const result = await updateSessaoEstudo({
        id: sessao.id,
        disciplina_id: disciplina ? disciplina.id : null,
        materia_nome: disciplina ? disciplina.title : ''
      });
      if (result?.error) toast.error(`Falha ao salvar: ${result.error}`);
      else toast.success(`Matéria atualizada para "${disciplina ? disciplina.title : 'Nenhuma'}"!`);
    });
  };

  const handleToggleConclusao = (isCompleting: boolean) => {
    startTransition(async () => {
      const result = await toggleConclusaoSessao(sessao.id, isCompleting);
      if (result?.error) toast.error(result.error);
      else toast.success(isCompleting ? 'Estudo concluído! Revisões agendadas.' : 'Estudo revertido.');
    });
  };

  const handleDateChange = (campo: 'data_estudo' | 'data_revisao_1' | 'data_revisao_2' | 'data_revisao_3', novaData: string) => {
    startTransition(async () => {
        const result = await updateDatasSessaoEstudo(sessao.id, campo, novaData);
        if (result?.error) toast.error(result.error);
        else toast.success("Data atualizada com sucesso!");
    });
  };
  
  const handleDelete = () => {
    if(confirm(`Tem a certeza de que deseja deletar a sessão ${sessao.ordem}?`)) {
        startTransition(async () => {
            await deleteSessaoCiclo(sessao.id);
            toast.success("Sessão deletada.");
        });
    }
  }

  const handleToggleFinalizada = (checked: boolean) => {
    startTransition(async () => {
      await toggleFinalizarSessao(sessao.id, checked);
      toast.success("Status de finalização alterado.");
    });
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // CORREÇÃO: Cálculo da percentagem mais robusto
  const acertos = Number(rowData.questoes_acertos) || 0;
  const total = Number(rowData.questoes_total) || 0;
  const percAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0;

  return (
    <tr className="border-b border-border hover:bg-secondary/50">
      {/* CORREÇÃO: Ordem das células alterada */}
      <td className="p-3 text-center"><Checkbox checked={rowData.concluida} onCheckedChange={handleToggleConclusao} disabled={isPending} /></td>
      <td className="p-3 text-center"><Checkbox checked={rowData.materia_finalizada} onCheckedChange={(checked) => handleToggleFinalizada(!!checked)} /></td>
      <td className="p-3 font-mono text-center">{rowData.ordem.toString().padStart(2, '0')}</td>
      
      <td className="p-2 w-[300px]">
        <div className="flex items-center gap-1">
          <div className="flex-grow">
            <DisciplinaCombobox
                disciplinaTree={disciplinaTree}
                value={rowData.disciplina_id}
                onSelect={handleSelectDisciplina}
                disabled={isPending}
                className="bg-input"
            />
          </div>
          {rowData.disciplina_id && (
            <Link href={`/disciplinas?page=${rowData.disciplina_id}`} passHref legacyBehavior>
              <a target="_blank" rel="noopener noreferrer" title="Abrir disciplina em nova aba">
                <Button variant="ghost" size="icon" disabled={isPending} className="flex-shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </Button>
              </a>
            </Link>
          )}
        </div>
      </td>

      <td className="p-2"><Input value={rowData.foco_sugerido || ''} onChange={(e) => handleInputChange('foco_sugerido', e.target.value)} className="bg-input h-8" /></td>
      <td className="p-2"><Input value={rowData.diario_de_bordo || ''} onChange={(e) => handleInputChange('diario_de_bordo', e.target.value)} placeholder="Suas anotações..." className="bg-input h-8" /></td>
      <td className="p-2">
        <div className="flex items-center gap-1">
          <Input type="number" value={rowData.questoes_acertos || ''} onChange={(e) => handleInputChange('questoes_acertos', e.target.valueAsNumber)} className="bg-input h-8 w-16" placeholder="C" />
          <span className="text-muted-foreground">/</span>
          <Input type="number" value={rowData.questoes_total || ''} onChange={(e) => handleInputChange('questoes_total', e.target.valueAsNumber)} className="bg-input h-8 w-16" placeholder="T" />
          {total > 0 && <span className="text-xs text-muted-foreground ml-2">{percAcerto}%</span>}
        </div>
      </td>
      <td className="p-2"><Input type="date" defaultValue={formatDateForInput(rowData.data_estudo)} onChange={(e) => handleDateChange('data_estudo', e.target.value)} className="bg-input h-8" /></td>
      
      <td className="p-2"><Input type="date" defaultValue={formatDateForInput(rowData.data_revisao_1)} onChange={(e) => handleDateChange('data_revisao_1', e.target.value)} className="bg-input h-8" /></td>
      <td className="p-2"><Input type="date" defaultValue={formatDateForInput(rowData.data_revisao_2)} onChange={(e) => handleDateChange('data_revisao_2', e.target.value)} className="bg-input h-8" /></td>
      <td className="p-2"><Input type="date" defaultValue={formatDateForInput(rowData.data_revisao_3)} onChange={(e) => handleDateChange('data_revisao_3', e.target.value)} className="bg-input h-8" /></td>

      <td className="p-3 text-center"><Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
    </tr>
  );
}
