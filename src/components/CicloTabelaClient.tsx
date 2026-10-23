'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { toast } from 'sonner';
import { addSessaoCiclo, deleteSessoesEmMassa } from '@/app/actions';
import { type SessaoEstudo, type Node as DisciplinaNode } from '@/lib/types';
import { CicloTableRow } from '@/components/CicloTableRow';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  LayoutGrid,
  TableProperties,
  FolderTree,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type GroupByType = 'none' | 'materia' | 'status';

interface CicloTabelaClientProps {
  sessoesIniciais: SessaoEstudo[];
  disciplinaTree: DisciplinaNode[];
}

export function CicloTabelaClient({
  sessoesIniciais,
  disciplinaTree,
}: CicloTabelaClientProps) {
  const [sessoes, setSessoes] = useState(sessoesIniciais);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Modo de exibição: 'table' (Tabela Compacta) vs 'blocks' (Blocos/Cards Touch)
  const [viewMode, setViewMode] = useState<'table' | 'blocks'>('blocks');

  // Tipo de agrupamento: 'none' (Individual) | 'materia' (Por Disciplina) | 'status' (Pendentes/Concluídas)
  const [groupBy, setGroupBy] = useState<GroupByType>('none');

  // Controle de grupos recolhidos
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setSessoes(sessoesIniciais);
  }, [sessoesIniciais]);

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const filteredSessoes = useMemo(() => {
    if (!searchQuery.trim()) return sessoes;
    const query = searchQuery.toLowerCase();
    return sessoes.filter(
      (s) =>
        s.materia_nome?.toLowerCase().includes(query) ||
        s.foco_sugerido?.toLowerCase().includes(query)
    );
  }, [sessoes, searchQuery]);

  // Agrupamento dos itens
  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: 'Todas as Sessões', key: 'all', items: filteredSessoes }];
    }

    if (groupBy === 'materia') {
      const groups: Record<string, SessaoEstudo[]> = {};
      for (const s of filteredSessoes) {
        const key = s.materia_nome?.trim() || 'Sem Matéria';
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      }
      return Object.entries(groups).map(([title, items]) => ({
        title,
        key: title,
        items,
      }));
    }

    if (groupBy === 'status') {
      const pendentes = filteredSessoes.filter((s) => !s.concluida);
      const concluidas = filteredSessoes.filter((s) => s.concluida);
      const res = [];
      if (pendentes.length > 0) res.push({ title: 'Pendentes', key: 'pendentes', items: pendentes });
      if (concluidas.length > 0) res.push({ title: 'Concluídas', key: 'concluidas', items: concluidas });
      return res;
    }

    return [{ title: 'Todas as Sessões', key: 'all', items: filteredSessoes }];
  }, [filteredSessoes, groupBy]);

  const totalConcluidas = sessoes.filter((s) => s.concluida).length;
  const totalPendentes = sessoes.length - totalConcluidas;

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSessoes.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;

    if (window.confirm(`Deseja excluir as ${selectedIds.length} sessões selecionadas?`)) {
      startTransition(async () => {
        const result = await deleteSessoesEmMassa(selectedIds);
        if (result?.error) {
          toast.error(`Falha ao excluir: ${result.error}`);
        } else {
          setSessoes((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
          setSelectedIds([]);
          toast.success(`${selectedIds.length} sessões excluídas.`);
        }
      });
    }
  };

  const handleRowDeleted = (deletedId: number) => {
    setSessoes((prev) => prev.filter((s) => s.id !== deletedId));
    setSelectedIds((prev) => prev.filter((id) => id !== deletedId));
  };

  const isAllSelected =
    filteredSessoes.length > 0 && selectedIds.length === filteredSessoes.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < filteredSessoes.length;

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR DE CONTROLES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border shadow-xs">
        {/* Contadores */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>{sessoes.length} Total</span>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{totalConcluidas} Concluídas</span>
          </Badge>
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{totalPendentes} Restantes</span>
          </Badge>
        </div>

        {/* Alternador de Modo + Agrupador + Busca + Criar Sessão */}
        <div className="flex items-center gap-2">
          {/* Alternador Tabela Compacta vs Blocos */}
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-secondary/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('blocks')}
              className={cn(
                'h-7 px-2.5 text-xs gap-1.5 rounded-md transition-all',
                viewMode === 'blocks' && 'bg-background shadow-xs font-bold text-primary'
              )}
              title="Modo Blocos (Ideal para Tablet S10 FE e Notebook)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Blocos</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                'h-7 px-2.5 text-xs gap-1.5 rounded-md transition-all',
                viewMode === 'table' && 'bg-background shadow-xs font-bold text-primary'
              )}
              title="Tabela Compacta (Sem rolagem horizontal)"
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabela Compacta</span>
            </Button>
          </div>

          {/* Menu de Agrupamento */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1.5 border-border">
                <FolderTree className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">
                  {groupBy === 'none' ? 'Sem Grupo' : groupBy === 'materia' ? 'Por Matéria' : 'Por Status'}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuLabel>Agrupar Blocos Por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGroupBy('none')} className={cn(groupBy === 'none' && 'font-bold text-primary')}>
                Individual (Sem Grupo)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('materia')} className={cn(groupBy === 'materia' && 'font-bold text-primary')}>
                Por Matéria / Disciplina
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('status')} className={cn(groupBy === 'status' && 'font-bold text-primary')}>
                Por Status (Pendentes / Concluídas)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Campo de Busca */}
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-background/80"
            />
          </div>

          {/* Botão Nova Sessão */}
          <form action={addSessaoCiclo}>
            <Button type="submit" size="sm" disabled={isPending} className="h-8 gap-1 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Sessão</span>
            </Button>
          </form>
        </div>
      </div>

      {/* BARRA DE AÇÃO EM MASSA */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-xs animate-in fade-in">
          <span className="font-semibold text-destructive">
            {selectedIds.length} {selectedIds.length === 1 ? 'sessão selecionada' : 'sessões selecionadas'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])} className="h-7 text-xs">
              Desmarcar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={isPending} className="h-7 text-xs gap-1">
              <Trash2 className="w-3 h-3" /> Excluir
            </Button>
          </div>
        </div>
      )}

      {/* RENDERIZAÇÃO DOS GRUPOS (EM BLOCOS OU EM TABELA COMPACTA) */}
      <div className="space-y-6">
        {groupedData.map((group) => {
          const isCollapsed = collapsedGroups[group.key] || false;
          const groupConcluidas = group.items.filter((s) => s.concluida).length;

          return (
            <div key={group.key} className="space-y-3">
              {/* CABEÇALHO DO GRUPO (Se o agrupamento estiver ativo) */}
              {groupBy !== 'none' && (
                <div
                  onClick={() => toggleGroupCollapse(group.key)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/80 cursor-pointer select-none hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                    <h3 className="font-bold text-xs uppercase tracking-wide text-foreground">
                      {group.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold bg-background">
                      {group.items.length} {group.items.length === 1 ? 'bloco' : 'blocos'}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {groupConcluidas}/{group.items.length} OK
                    </Badge>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DO GRUPO */}
              {!isCollapsed && (
                <>
                  {viewMode === 'blocks' ? (
                    /* MODO BLOCOS / CARDS TOUCH */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {group.items.length > 0 ? (
                        group.items.map((sessao) => (
                          <CicloTableRow
                            key={sessao.id}
                            sessao={sessao}
                            disciplinaTree={disciplinaTree}
                            isSelected={selectedIds.includes(sessao.id)}
                            onToggleSelect={handleToggleSelect}
                            onDeleted={handleRowDeleted}
                            isBlockMode
                          />
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground p-4">Nenhum bloco neste grupo.</p>
                      )}
                    </div>
                  ) : (
                    /* MODO TABELA COMPACTA (100% visível sem scroll lateral) */
                    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-foreground whitespace-nowrap">
                          <thead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/50 border-b border-border">
                            <tr>
                              <th className="p-2.5 w-8 text-center">
                                <Checkbox
                                  checked={isAllSelected}
                                  onCheckedChange={handleToggleSelectAll}
                                  disabled={isPending}
                                />
                              </th>
                              <th className="p-2.5 w-24 text-center">Bloco / Status</th>
                              <th className="p-2.5 min-w-[220px]">Matéria & Foco</th>
                              <th className="p-2.5 w-28 text-center">Questões</th>
                              <th className="p-2.5 w-28 text-center">Data Estudo</th>
                              <th className="p-2.5 w-36 text-center">Revisões (24h/7d/30d)</th>
                              <th className="p-2.5 w-28 text-center">Diário de Bordo</th>
                              <th className="p-2.5 w-8 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {group.items.map((sessao) => (
                              <CicloTableRow
                                key={sessao.id}
                                sessao={sessao}
                                disciplinaTree={disciplinaTree}
                                isSelected={selectedIds.includes(sessao.id)}
                                onToggleSelect={handleToggleSelect}
                                onDeleted={handleRowDeleted}
                                isBlockMode={false}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}