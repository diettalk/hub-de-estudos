'use client';

import { useState, useTransition, useEffect, useRef, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  toggleConclusaoSessao,
  updateDatasSessaoEstudo,
  updateSessaoEstudo,
  deleteSessaoCiclo,
  toggleFinalizarSessao,
} from '@/app/actions';
import { type SessaoEstudo, type Disciplina, type Node as DisciplinaNode } from '@/lib/types';
import { useDebounce } from '@/lib/hooks';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  ArrowUpRight,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { DisciplinaCombobox } from './DisciplinaCombobox';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CicloTableRowProps {
  sessao: SessaoEstudo;
  disciplinaTree: DisciplinaNode[];
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onDeleted?: (id: number) => void;
  isBlockMode?: boolean;
}

export function CicloTableRow({
  sessao,
  disciplinaTree,
  isSelected,
  onToggleSelect,
  onDeleted,
  isBlockMode = false,
}: CicloTableRowProps) {
  const [isPending, startTransition] = useTransition();
  const [rowData, setRowData] = useState(sessao);
  const lastSavedDataRef = useRef(sessao);

  useEffect(() => {
    setRowData(sessao);
    lastSavedDataRef.current = sessao;
  }, [sessao]);

  const handleInputChange = (field: keyof SessaoEstudo, value: string | number | null) => {
    setRowData((prev) => ({ ...prev, [field]: value }));
  };

  const debouncedRowData = useDebounce(rowData, 1200);

  useEffect(() => {
    const hasChanged =
      debouncedRowData.foco_sugerido !== lastSavedDataRef.current.foco_sugerido ||
      debouncedRowData.diario_de_bordo !== lastSavedDataRef.current.diario_de_bordo ||
      debouncedRowData.questoes_acertos !== lastSavedDataRef.current.questoes_acertos ||
      debouncedRowData.questoes_total !== lastSavedDataRef.current.questoes_total;

    if (hasChanged) {
      lastSavedDataRef.current = debouncedRowData;
      startTransition(async () => {
        await updateSessaoEstudo({
          id: debouncedRowData.id,
          foco_sugerido: debouncedRowData.foco_sugerido,
          diario_de_bordo: debouncedRowData.diario_de_bordo,
          questoes_acertos: debouncedRowData.questoes_acertos,
          questoes_total: debouncedRowData.questoes_total,
        });
      });
    }
  }, [debouncedRowData]);

  const handleSelectDisciplina = (disciplina: Disciplina | null) => {
    startTransition(async () => {
      const result = await updateSessaoEstudo({
        id: sessao.id,
        disciplina_id: disciplina ? disciplina.id : null,
        materia_nome: disciplina ? disciplina.title : '',
      });
      if (result?.error) toast.error(`Falha: ${result.error}`);
      else toast.success(`Matéria: "${disciplina ? disciplina.title : 'Nenhuma'}"`);
    });
  };

  const handleToggleConclusao = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setRowData((prev) => ({ ...prev, concluida: checked }));
      startTransition(async () => {
        const result = await toggleConclusaoSessao(sessao.id, checked);
        if (result?.error) {
          toast.error(result.error);
          setRowData((prev) => ({ ...prev, concluida: !checked }));
        } else {
          toast.success(checked ? 'Sessão concluída! Revisões agendadas.' : 'Sessão reaberta.');
        }
      });
    }
  };

  const handleToggleFinalizada = (checked: boolean | 'indeterminate') => {
    if (typeof checked === 'boolean') {
      setRowData((prev) => ({ ...prev, materia_finalizada: checked }));
      startTransition(async () => {
        const result = await toggleFinalizarSessao(sessao.id, checked);
        if (result?.error) {
          toast.error(result.error);
          setRowData((prev) => ({ ...prev, materia_finalizada: !checked }));
        }
      });
    }
  };

  const handleDateChange = (
    campo: 'data_estudo' | 'data_revisao_1' | 'data_revisao_2' | 'data_revisao_3',
    novaData: string
  ) => {
    setRowData((prev) => ({ ...prev, [campo]: novaData }));
    startTransition(async () => {
      await updateDatasSessaoEstudo(sessao.id, campo, novaData);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSessaoCiclo(sessao.id);
      onDeleted?.(sessao.id);
      toast.success('Sessão deletada.');
    });
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getUTCFullYear();
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = date.getUTCDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return '--/--';
    try {
      const date = new Date(dateString);
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    } catch {
      return '--/--';
    }
  };

  const acertos = Number(rowData.questoes_acertos) || 0;
  const total = Number(rowData.questoes_total) || 0;
  const percAcerto = total > 0 ? Math.round((acertos / total) * 100) : null;

  // -------------------------------------------------------------
  // 1. MODO BLOCO (CARD COMPACTO OTIMIZADO PARA TABLET & NOTEBOOK)
  // -------------------------------------------------------------
  if (isBlockMode) {
    return (
      <div
        className={cn(
          'flex flex-col rounded-2xl border p-3.5 transition-all duration-200 bg-card shadow-xs relative',
          isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]' : 'border-border',
          rowData.concluida && 'bg-emerald-500/[0.02] border-emerald-500/30'
        )}
      >
        {/* TOPO: Bloco # + Checkboxes de Status */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(sessao.id)}
              aria-label="Selecionar bloco"
            />
            <span className="px-2 py-0.5 rounded-lg bg-secondary font-mono font-bold text-xs text-muted-foreground">
              Bloco #{rowData.ordem.toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Checkbox OK */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
              <Checkbox
                checked={rowData.concluida}
                onCheckedChange={handleToggleConclusao}
                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <span className={cn('text-xs font-semibold', rowData.concluida ? 'text-emerald-500' : 'text-muted-foreground')}>
                {rowData.concluida ? 'Concluída' : 'OK'}
              </span>
            </label>

            {/* Checkbox Zerada */}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
              <Checkbox
                checked={rowData.materia_finalizada}
                onCheckedChange={handleToggleFinalizada}
                className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
              />
              <span className={cn('text-xs font-medium', rowData.materia_finalizada ? 'text-indigo-400' : 'text-muted-foreground/80')}>
                Zerada
              </span>
            </label>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Excluir bloco"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* MEIO: Matéria e Foco */}
        <div className="my-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <DisciplinaCombobox
                disciplinaTree={disciplinaTree}
                value={rowData.disciplina_id}
                onSelect={handleSelectDisciplina}
                disabled={isPending}
                className="h-8 text-xs bg-background/80"
              />
            </div>
            {rowData.disciplina_id && (
              <Link
                href={`/disciplinas?page=${rowData.disciplina_id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir anotações em nova guia"
              >
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            )}
          </div>

          <AutoResizeTextarea
            value={rowData.foco_sugerido || ''}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('foco_sugerido', e.target.value)}
            placeholder="Foco: Ex: Art. 5º CF, Teoria da Culpa..."
            className="w-full bg-secondary/30 border-border/50 text-xs rounded-xl p-2 min-h-[30px]"
          />
        </div>

        {/* BARRA DE RENDIMENTO & DIÁRIO DE BORDO */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-secondary/40 border border-border/50 text-xs">
          {/* Questões */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground font-medium">Q:</span>
            <Input
              type="number"
              min={0}
              value={rowData.questoes_acertos ?? ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('questoes_acertos', e.target.value === '' ? null : e.target.valueAsNumber)
              }
              className="h-6 w-11 text-center text-xs font-semibold bg-background p-0"
              placeholder="C"
              title="Acertos"
            />
            <span className="text-muted-foreground text-xs">/</span>
            <Input
              type="number"
              min={0}
              value={rowData.questoes_total ?? ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('questoes_total', e.target.value === '' ? null : e.target.valueAsNumber)
              }
              className="h-6 w-11 text-center text-xs bg-background p-0"
              placeholder="T"
              title="Total Feito"
            />
            {percAcerto !== null && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] px-1 py-0 h-5 font-bold ml-1',
                  percAcerto >= 80
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : percAcerto >= 60
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                )}
              >
                {percAcerto}%
              </Badge>
            )}
          </div>

          {/* Diário de Bordo Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1 py-1 px-2 rounded-lg border text-xs transition-colors',
                  rowData.diario_de_bordo
                    ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                )}
              >
                <FileText className="w-3 h-3" />
                <span className="text-[11px]">{rowData.diario_de_bordo ? 'Notas' : 'Anotar'}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3 space-y-2 bg-card border-border shadow-xl" align="end">
              <div className="flex items-center justify-between border-b pb-1.5 border-border">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Diário de Bordo #{rowData.ordem.toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] text-muted-foreground">Auto-salvamento</span>
              </div>
              <AutoResizeTextarea
                value={rowData.diario_de_bordo || ''}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('diario_de_bordo', e.target.value)}
                placeholder="Anotações e erros desta sessão..."
                className="w-full bg-secondary/30 border-border/60 text-xs rounded-xl p-2.5 min-h-[90px]"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* RODAPÉ: Datas em Linha Compacta */}
        <div className="mt-2.5 pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">Estudo:</span>
            <Input
              type="date"
              value={formatDateForInput(rowData.data_estudo)}
              onChange={(e) => handleDateChange('data_estudo', e.target.value)}
              className="h-6 text-xs bg-background/80"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">R1 (24h):</span>
            <Input
              type="date"
              value={formatDateForInput(rowData.data_revisao_1)}
              onChange={(e) => handleDateChange('data_revisao_1', e.target.value)}
              className="h-6 text-xs bg-background/80"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">R7 (7d):</span>
            <Input
              type="date"
              value={formatDateForInput(rowData.data_revisao_2)}
              onChange={(e) => handleDateChange('data_revisao_2', e.target.value)}
              className="h-6 text-xs bg-background/80"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">R30 (30d):</span>
            <Input
              type="date"
              value={formatDateForInput(rowData.data_revisao_3)}
              onChange={(e) => handleDateChange('data_revisao_3', e.target.value)}
              className="h-6 text-xs bg-background/80"
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. MODO TABELA COMPACTA (CABE 100% NO NOTEBOOK E TABLET)
  // -------------------------------------------------------------
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors text-xs group',
        isSelected ? 'bg-primary/10' : rowData.concluida ? 'bg-emerald-500/[0.03]' : 'hover:bg-muted/40'
      )}
    >
      <td className="p-2 text-center w-8">
        <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect(sessao.id)} />
      </td>

      <td className="p-2 w-24">
        <div className="flex flex-col gap-1 items-center justify-center">
          <span className="font-mono font-bold text-[10px] text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded-md">
            #{rowData.ordem.toString().padStart(2, '0')}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <label className="flex items-center gap-1 cursor-pointer" title="Marcar Estudo Concluído">
              <Checkbox
                checked={rowData.concluida}
                onCheckedChange={handleToggleConclusao}
                className="h-3.5 w-3.5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              />
              <span className="text-[10px] text-muted-foreground font-medium">OK</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer" title="Matéria Zerada">
              <Checkbox
                checked={rowData.materia_finalizada}
                onCheckedChange={handleToggleFinalizada}
                className="h-3.5 w-3.5 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
              />
              <span className="text-[10px] text-muted-foreground font-medium">Zerada</span>
            </label>
          </div>
        </div>
      </td>

      <td className="p-2 min-w-[220px] max-w-[280px]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <DisciplinaCombobox
                disciplinaTree={disciplinaTree}
                value={rowData.disciplina_id}
                onSelect={handleSelectDisciplina}
                disabled={isPending}
                className="h-7 text-xs bg-background/80"
              />
            </div>
            {rowData.disciplina_id && (
              <Link href={`/disciplinas?page=${rowData.disciplina_id}`} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>

          <AutoResizeTextarea
            value={rowData.foco_sugerido || ''}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('foco_sugerido', e.target.value)}
            placeholder="Foco da sessão..."
            className="w-full bg-secondary/30 border-border/50 text-[11px] rounded-md p-1 min-h-[26px] leading-tight"
          />
        </div>
      </td>

      <td className="p-2 w-28 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-1">
            <Input
              type="number"
              min={0}
              value={rowData.questoes_acertos ?? ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('questoes_acertos', e.target.value === '' ? null : e.target.valueAsNumber)
              }
              className="h-6 w-11 text-center text-xs font-semibold bg-background p-0"
              placeholder="C"
            />
            <span className="text-muted-foreground text-xs">/</span>
            <Input
              type="number"
              min={0}
              value={rowData.questoes_total ?? ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                handleInputChange('questoes_total', e.target.value === '' ? null : e.target.valueAsNumber)
              }
              className="h-6 w-11 text-center text-xs bg-background p-0"
              placeholder="T"
            />
          </div>

          {percAcerto !== null && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1 py-0 h-4 font-bold leading-none',
                percAcerto >= 80
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : percAcerto >= 60
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              {percAcerto}%
            </Badge>
          )}
        </div>
      </td>

      <td className="p-2 w-28 text-center">
        <Input
          type="date"
          value={formatDateForInput(rowData.data_estudo)}
          onChange={(e) => handleDateChange('data_estudo', e.target.value)}
          className="h-7 text-xs bg-background/80 p-1 text-center"
        />
      </td>

      <td className="p-2 w-36 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-1 p-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-[11px] font-mono transition-colors"
              title="Editar datas de revisão (R1, R7, R30)"
            >
              <span className="text-muted-foreground font-sans text-[10px]">R:</span>
              <span className="font-semibold text-foreground">{formatShortDate(rowData.data_revisao_1)}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground">{formatShortDate(rowData.data_revisao_2)}</span>
              <Calendar className="w-3 h-3 text-muted-foreground ml-0.5 flex-shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-2.5 text-xs bg-card border-border shadow-xl" align="center">
            <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Revisões Espaçadas
            </span>
            <div className="space-y-2 pt-1">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">R1 (24 Horas):</span>
                <Input
                  type="date"
                  value={formatDateForInput(rowData.data_revisao_1)}
                  onChange={(e) => handleDateChange('data_revisao_1', e.target.value)}
                  className="h-7 text-xs bg-background"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">R7 (7 Dias):</span>
                <Input
                  type="date"
                  value={formatDateForInput(rowData.data_revisao_2)}
                  onChange={(e) => handleDateChange('data_revisao_2', e.target.value)}
                  className="h-7 text-xs bg-background"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block mb-0.5">R30 (30 Dias):</span>
                <Input
                  type="date"
                  value={formatDateForInput(rowData.data_revisao_3)}
                  onChange={(e) => handleDateChange('data_revisao_3', e.target.value)}
                  className="h-7 text-xs bg-background"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </td>

      <td className="p-2 w-28 text-center">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg border text-xs transition-colors',
                rowData.diario_de_bordo
                  ? 'border-primary/40 bg-primary/10 text-primary font-semibold'
                  : 'border-border bg-secondary/20 text-muted-foreground hover:bg-secondary'
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate max-w-[65px] text-[11px]">
                {rowData.diario_de_bordo ? 'Ver notas' : 'Anotar'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 space-y-2 bg-card border-border shadow-xl" align="end">
            <div className="flex items-center justify-between border-b pb-1.5 border-border">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Diário de Bordo #{rowData.ordem.toString().padStart(2, '0')}
              </span>
              <span className="text-[10px] text-muted-foreground">Auto-salvamento</span>
            </div>
            <AutoResizeTextarea
              value={rowData.diario_de_bordo || ''}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleInputChange('diario_de_bordo', e.target.value)}
              placeholder="Digite aqui anotações e erros desta sessão..."
              className="w-full bg-secondary/30 border-border/60 text-xs rounded-xl p-2.5 min-h-[90px]"
            />
          </PopoverContent>
        </Popover>
      </td>

      <td className="p-2 text-center w-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </td>
    </tr>
  );
}