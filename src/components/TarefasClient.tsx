'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addTarefa, toggleTarefa, deleteTarefa } from '@/app/actions';
import { usePlanoAtivo, limparTagPlano } from '@/lib/plano-ativo';
import { type Tarefa } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ListTodo,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TarefasClientProps {
  tarefas?: Tarefa[];
  initialTarefas?: Tarefa[];
  [key: string]: any;
}

export function TarefasClient({
  tarefas: propTarefas,
  initialTarefas,
}: TarefasClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  const listaBase = propTarefas || initialTarefas || [];

  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaData, setNovaData] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'pendentes' | 'concluidas' | 'todas'>('pendentes');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtra tarefas do Plano Ativo (ou sem tag de outro plano)
  const tarefasDoPlano = useMemo(() => {
    if (!planoAtivo) return listaBase;
    return listaBase.filter((t) => {
      const match = (t.title || '').match(/\[PLANO:(\d+)\]/);
      if (match) return parseInt(match[1], 10) === planoAtivo.id;
      return true;
    });
  }, [listaBase, planoAtivo]);

  const tarefasFiltradas = useMemo(() => {
    return tarefasDoPlano.filter((t) => {
      if (filtroStatus === 'pendentes' && t.completed) return false;
      if (filtroStatus === 'concluidas' && !t.completed) return false;
      if (!searchQuery.trim()) return true;
      return limparTagPlano(t.title)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    });
  }, [tarefasDoPlano, filtroStatus, searchQuery]);

  const totalPendentes = tarefasDoPlano.filter((t) => !t.completed).length;
  const totalConcluidas = tarefasDoPlano.filter((t) => t.completed).length;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    const formData = new FormData();
    const tituloFinal = planoAtivo
      ? `[PLANO:${planoAtivo.id}] ${novoTitulo.trim()}`
      : novoTitulo.trim();

    formData.append('title', tituloFinal);
    if (novaData) formData.append('due_date', novaData);

    startTransition(async () => {
      await addTarefa(formData);
      toast.success('Tarefa adicionada!');
      setNovoTitulo('');
      setNovaData('');
      router.refresh();
    });
  };

  const handleToggle = (t: Tarefa) => {
    startTransition(async () => {
      await toggleTarefa(t.id, t.completed);
      router.refresh();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteTarefa(id);
      toast.success('Tarefa removida.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Tarefas & Checklist
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Organize pendências administrativas, inscrições, simulados e metas rápidas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-xs font-bold gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{totalPendentes} Pendentes</span>
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 text-xs font-bold gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{totalConcluidas} Concluídas</span>
          </Badge>
        </div>
      </div>

      {/* FORMULÁRIO RÁPIDO PARA ADICIONAR TAREFA */}
      <form
        onSubmit={handleAdd}
        className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row items-center gap-3"
      >
        <Input
          value={novoTitulo}
          onChange={(e) => setNovoTitulo(e.target.value)}
          placeholder="Adicionar nova tarefa (Ex.: Baixar provas anteriores da banca, pagar inscrição...)"
          className="h-10 text-xs bg-secondary/30 rounded-xl flex-1 w-full"
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="date"
            value={novaData}
            onChange={(e) => setNovaData(e.target.value)}
            className="h-10 w-40 text-xs bg-secondary/30 rounded-xl"
            title="Prazo / Data limite (opcional)"
          />
          <Button
            type="submit"
            disabled={isPending || !novoTitulo.trim()}
            className="h-10 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </Button>
        </div>
      </form>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl bg-card border border-border text-xs">
          {[
            { id: 'pendentes', label: `Pendentes (${totalPendentes})` },
            { id: 'concluidas', label: `Concluídas (${totalConcluidas})` },
            { id: 'todas', label: `Todas (${tarefasDoPlano.length})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltroStatus(f.id as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                filtroStatus === f.id
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar tarefa..."
            className="h-9 pl-8 text-xs bg-card rounded-xl"
          />
        </div>
      </div>

      {/* LISTA DE TAREFAS */}
      <div className="space-y-2.5">
        {tarefasFiltradas.length > 0 ? (
          tarefasFiltradas.map((t) => (
            <div
              key={t.id}
              className={cn(
                'p-4 rounded-2xl bg-card border transition-all flex items-center justify-between gap-4 shadow-2xs group',
                t.completed
                  ? 'border-emerald-500/30 bg-emerald-500/[0.02] opacity-75'
                  : 'border-border hover:border-emerald-500/40'
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Checkbox
                  checked={t.completed}
                  onCheckedChange={() => handleToggle(t)}
                  disabled={isPending}
                  className="h-4 w-4 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                />
                <div className="min-w-0">
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-bold text-foreground block truncate',
                      t.completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {limparTagPlano(t.title)}
                  </span>
                  {t.due_date && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      Prazo: {new Date(t.due_date + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(t.id)}
                disabled={isPending}
                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100"
                title="Excluir tarefa"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="py-14 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-2">
            <ListTodo className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">Nenhuma tarefa nesta lista.</p>
            <p className="text-xs text-muted-foreground">
              Use o campo acima para anotar qualquer pendência da sua preparação!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TarefasClient;