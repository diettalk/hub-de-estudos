'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
// VERIFIQUE: Garanta que todas estas funções estão exportadas em @/app/actions.ts
import { toggleConclusaoSessao, updateDatasSessaoEstudo, updateSessaoEstudo, deleteSessaoCiclo, toggleFinalizarSessao } from '@/app/actions';
import { type SessaoEstudo, type Disciplina, type Node as DisciplinaNode } from '@/lib/types';
import { useDebounce } from '@/lib/hooks';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { DisciplinaCombobox } from './DisciplinaCombobox';
// CORREÇÃO: Certifique-se que o caminho está correto e o componente é exportado em AutoResizeTextarea.tsx
import { AutoResizeTextarea } from './AutoResizeTextarea'; 
import { Input } from '@/components/ui/input'; 

interface CicloTableRowProps {
  sessao: SessaoEstudo;
  disciplinaTree: DisciplinaNode[];
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
}

export function CicloTableRow({
  sessao,
  disciplinaTree,
  isSelected,
  onToggleSelect,
}: CicloTableRowProps) {
  const [isPending, startTransition] = useTransition();
  const [rowData, setRowData] = useState(sessao);

  useEffect(() => {
    setRowData(sessao);
  }, [sessao]);

  const handleInputChange = (
    field: keyof SessaoEstudo,
    value: string | number | null
  ) => {
    setRowData((prev) => ({ ...prev, [field]: value }));
  };

  const debouncedRowData = useDebounce(rowData, 1500);

  useEffect(() => {
    // Evita salvar se os dados debounced forem os mesmos que a prop original
    if (JSON.stringify(debouncedRowData) !== JSON.stringify(sessao)) { 
      const {
        id,
        foco_sugerido,
        diario_de_bordo,
        questoes_acertos,
        questoes_total,
      } = debouncedRowData;
      // Garante que só salva se o componente não estiver sendo desmontado ou em pending
      if(!isPending) { 
        startTransition(() =>
          updateSessaoEstudo({
            id,
            foco_sugerido,
            diario_de_bordo,
            questoes_acertos,
            questoes_total,
          })
        );
      }
    }
  // Adiciona isPending como dependência para evitar chamadas enquanto uma transição está ativa
  }, [debouncedRowData, sessao, isPending]); 

  const handleSelectDisciplina = (disciplina: Disciplina | null) => {
    startTransition(async () => {
      const result = await updateSessaoEstudo({
        id: sessao.id,
        disciplina_id: disciplina ? disciplina.id : null,
        materia_nome: disciplina ? disciplina.title : '',
      });
      if (result?.error) toast.error(`Falha ao salvar: ${result.error}`);
      else
        toast.success(
          `Matéria atualizada para "${disciplina ? disciplina.title : 'Nenhuma'}"!`
        );
    });
  };

  const handleToggleConclusao = (checked: boolean | 'indeterminate') => {
    // Garante que só chama a action se não for indeterminado
    if (typeof checked === 'boolean') {
      startTransition(async () => {
        const result = await toggleConclusaoSessao(sessao.id, checked);
        if (result?.error) toast.error(result.error);
        else
          toast.success(
            checked ? 'Estudo concluído! Revisões agendadas.' : 'Estudo revertido.'
          );
      });
    }
  };

  const handleDateChange = (
    campo: 'data_estudo' | 'data_revisao_1' | 'data_revisao_2' | 'data_revisao_3',
    novaData: string
  ) => {
    startTransition(async () => {
      const result = await updateDatasSessaoEstudo(sessao.id, campo, novaData);
      if (result?.error) toast.error(result.error);
      else toast.success('Data atualizada com sucesso!');
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSessaoCiclo(sessao.id);
      toast.success('Sessão deletada.');
      // A UI será atualizada pelo CicloTabelaClient que remove a sessão do estado
    });
  };

  const handleToggleFinalizada = (checked: boolean | 'indeterminate') => {
     if (typeof checked === 'boolean') {
        startTransition(async () => {
          // Passa o estado booleano diretamente
          await toggleFinalizarSessao(sessao.id, checked); 
          toast.success('Status de finalização alterado.');
        });
     }
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      // Cria a data considerando UTC para evitar problemas de timezone no input date
      const date = new Date(dateString);
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = date.getUTCDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const acertos = Number(rowData.questoes_acertos) || 0;
  const total = Number(rowData.questoes_total) || 0;
  const percAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0;

  return (
    <tr 
      className={`border-b border-border ${isSelected ? 'bg-blue-900/50' : 'hover:bg-secondary/50'}`}
      data-state={isSelected ? 'selected' : undefined}
    >
      <td className="p-3 text-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(sessao.id)}
          aria-label={`Selecionar linha ${sessao.ordem}`}
          disabled={isPending}
        />
      </td>
      <td className="p-3 text-center">
        <Checkbox
          checked={rowData.concluida}
          onCheckedChange={handleToggleConclusao}
          disabled={isPending}
        />
      </td>
      <td className="p-3 text-center">
        <Checkbox
          checked={rowData.materia_finalizada}
          onCheckedChange={handleToggleFinalizada} // Corrigido
        />
      </td>
      <td className="p-3 font-mono text-center">
        {rowData.ordem.toString().padStart(2, '0')}
      </td>

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
            // CORREÇÃO: Removido legacyBehavior e <a> interno
            <Link
              href={`/disciplinas?page=${rowData.disciplina_id}`}
              target="_blank" 
              rel="noopener noreferrer" 
              title="Abrir disciplina em nova aba"
              className="flex-shrink-0" // Adicionado para manter o layout
            >
              <Button variant="ghost" size="icon" disabled={isPending} asChild={false}> {/* asChild=false para Link não passar props para Button */}
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            </Link>
          )}
        </div>
      </td>

      <td className="p-2">
        {/* Garanta que AutoResizeTextarea está sendo importado corretamente */}
        <AutoResizeTextarea
          value={rowData.foco_sugerido || ''}
          onChange={(e) => handleInputChange('foco_sugerido', e.target.value)}
          className="bg-input text-sm"
          disabled={isPending}
        />
      </td>
      <td className="p-2">
        <AutoResizeTextarea
          value={rowData.diario_de_bordo || ''}
          onChange={(e) => handleInputChange('diario_de_bordo', e.target.value)}
          placeholder="Suas anotações..."
          className="bg-input text-sm"
          disabled={isPending}
        />
      </td>
      
      <td className="p-2">
        <div className="flex items-center gap-1">
          <Input type="number" value={rowData.questoes_acertos ?? ''} onChange={(e) => handleInputChange('questoes_acertos', e.target.value === '' ? null : e.target.valueAsNumber)} className="bg-input h-8 w-16" placeholder="C" />
          <span className="text-muted-foreground">/</span>
          <Input type="number" value={rowData.questoes_total ?? ''} onChange={(e) => handleInputChange('questoes_total', e.target.value === '' ? null : e.target.valueAsNumber)} className="bg-input h-8 w-16" placeholder="T" />
          {total > 0 && <span className="text-xs text-muted-foreground ml-2">{percAcerto}%</span>}
        </div>
      </td>
      <td className="p-2"><Input type="date" value={formatDateForInput(rowData.data_estudo)} onChange={(e) => handleDateChange('data_estudo', e.target.value)} className="bg-input h-8" /></td>
      
      <td className="p-2"><Input type="date" value={formatDateForInput(rowData.data_revisao_1)} onChange={(e) => handleDateChange('data_revisao_1', e.target.value)} className="bg-input h-8" /></td>
      <td className="p-2"><Input type="date" value={formatDateForInput(rowData.data_revisao_2)} onChange={(e) => handleDateChange('data_revisao_2', e.target.value)} className="bg-input h-8" /></td>
      <td className="p-2"><Input type="date" value={formatDateForInput(rowData.data_revisao_3)} onChange={(e) => handleDateChange('data_revisao_3', e.target.value)} className="bg-input h-8" /></td>

      <td className="p-3 text-center">
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

