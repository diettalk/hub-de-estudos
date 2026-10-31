'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateRevisaoStatus } from '@/app/actions';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
  revisaoPertenceAoPlano,
  limparTagPlano,
} from '@/lib/plano-ativo';
import { type Revisao, type SessaoEstudo } from '@/lib/types';
import {
  startOfToday,
  isBefore,
  isToday,
  isWithinInterval,
  addDays,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CalendarCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Play,
  Check,
  RotateCcw,
  Calendar,
  Sparkles,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RevisoesClientProps {
  todasRevisoes: Revisao[];
  todasSessoes: SessaoEstudo[];
}

type TabId = 'hoje' | 'atrasadas' | 'proximos' | 'concluidas' | 'todas';

export function RevisoesClient({ todasRevisoes, todasSessoes }: RevisoesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  const [activeTab, setActiveTab] = useState<TabId>('hoje');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtra sessões e revisões exclusivamente para o Plano Ativo
  const sessoesDoPlano = useMemo(
    () => todasSessoes.filter((s) => sessaoPertenceAoPlano(s, planoAtivo)),
    [todasSessoes, planoAtivo]
  );

  const revisoesDoPlano = useMemo(
    () =>
      todasRevisoes.filter((r) =>
        revisaoPertenceAoPlano(r, planoAtivo, sessoesDoPlano)
      ),
    [todasRevisoes, planoAtivo, sessoesDoPlano]
  );

  // Classificação por data (Hoje, Atrasadas, Próximos 7 Dias, Concluídas)
  const { atrasadas, paraHoje, proximos7Dias, concluidas, pendentesTotal } = useMemo(() => {
    const hoje = startOfToday();
    const fim7Dias = addDays(hoje, 7);

    const conc: Revisao[] = [];
    const atr: Revisao[] = [];
    const hj: Revisao[] = [];
    const prox: Revisao[] = [];
    const pend: Revisao[] = [];

    revisoesDoPlano.forEach((r) => {
      if (r.concluida) {
        conc.push(r);
        return;
      }
      pend.push(r);
      try {
        const dataRev = parseISO(r.data_revisao);
        if (isToday(dataRev)) {
          hj.push(r);
        } else if (isBefore(dataRev, hoje)) {
          atr.push(r);
        } else if (isWithinInterval(dataRev, { start: addDays(hoje, 1), end: fim7Dias })) {
          prox.push(r);
        }
      } catch {
        // Se data inválida, ignora
      }
    });

    return {
      atrasadas: atr,
      paraHoje: hj,
      proximos7Dias: prox,
      concluidas: conc,
      pendentesTotal: pend,
    };
  }, [revisoesDoPlano]);

  const listaDaAba = useMemo(() => {
    let base: Revisao[] = [];
    if (activeTab === 'hoje') base = paraHoje;
    else if (activeTab === 'atrasadas') base = atrasadas;
    else if (activeTab === 'proximos') base = proximos7Dias;
    else if (activeTab === 'concluidas') base = concluidas;
    else base = pendentesTotal;

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (r) =>
        r.materia_nome?.toLowerCase().includes(q) ||
        r.foco_sugerido?.toLowerCase().includes(q) ||
        r.tipo_revisao?.toLowerCase().includes(q)
    );
  }, [activeTab, paraHoje, atrasadas, proximos7Dias, concluidas, pendentesTotal, searchQuery]);

  const handleToggleStatus = (revisao: Revisao) => {
    const novoStatus = !revisao.concluida;
    startTransition(async () => {
      const res = await updateRevisaoStatus(revisao.id, novoStatus);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(novoStatus ? 'Revisão concluída com sucesso!' : 'Revisão reaberta.');
        router.refresh();
      }
    });
  };

  const handleIniciarRevisao = (revisao: Revisao) => {
    window.dispatchEvent(
      new CustomEvent('open-registro-estudo', {
        detail: {
          materiaNome: revisao.materia_nome,
          topico: limparTagPlano(revisao.foco_sugerido),
          tempoFormatado: '00:25:00',
        },
      })
    );
  };

  const taxaCumprimento =
    revisoesDoPlano.length > 0
      ? Math.round((concluidas.length / revisoesDoPlano.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO PAINEL DE REVISÕES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Revisões
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Controle suas revisões espaçadas de 24 horas, 7 dias e 30 dias
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-registro-estudo'))}
          className="self-start sm:self-auto h-9 px-4 text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Revisão</span>
        </Button>
      </div>

      {/* 4 CARDS DE RESUMO RÁPIDO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveTab('hoje')}
          className={cn(
            'p-4 rounded-2xl bg-card border transition-all cursor-pointer',
            activeTab === 'hoje' ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-border hover:border-border/80'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">Para Hoje</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground block mt-2">
            {paraHoje.length}
          </span>
          <span className="text-[11px] text-muted-foreground">programadas para o dia</span>
        </div>

        <div
          onClick={() => setActiveTab('atrasadas')}
          className={cn(
            'p-4 rounded-2xl bg-card border transition-all cursor-pointer',
            activeTab === 'atrasadas' ? 'border-rose-500 ring-1 ring-rose-500/30' : 'border-border hover:border-border/80'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">Atrasadas</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span
            className={cn(
              'text-3xl font-extrabold block mt-2',
              atrasadas.length > 0 ? 'text-rose-500' : 'text-foreground'
            )}
          >
            {atrasadas.length}
          </span>
          <span className="text-[11px] text-muted-foreground">acumuladas de dias anteriores</span>
        </div>

        <div
          onClick={() => setActiveTab('proximos')}
          className={cn(
            'p-4 rounded-2xl bg-card border transition-all cursor-pointer',
            activeTab === 'proximos' ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-border hover:border-border/80'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">Próximos 7 Dias</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground block mt-2">
            {proximos7Dias.length}
          </span>
          <span className="text-[11px] text-muted-foreground">previstas na semana</span>
        </div>

        <div
          onClick={() => setActiveTab('concluidas')}
          className={cn(
            'p-4 rounded-2xl bg-card border transition-all cursor-pointer',
            activeTab === 'concluidas' ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-border hover:border-border/80'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">Concluídas</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-emerald-500">{concluidas.length}</span>
            <span className="text-xs text-muted-foreground font-semibold">({taxaCumprimento}%)</span>
          </div>
          <span className="text-[11px] text-muted-foreground">revisões finalizadas no plano</span>
        </div>
      </div>

      {/* BARRA DE ABAS E FILTRO DE BUSCA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'hoje', label: 'Para Hoje', count: paraHoje.length },
            { id: 'atrasadas', label: 'Atrasadas', count: atrasadas.length },
            { id: 'proximos', label: 'Próximos 7 Dias', count: proximos7Dias.length },
            { id: 'todas', label: 'Todas Pendentes', count: pendentesTotal.length },
            { id: 'concluidas', label: 'Concluídas', count: concluidas.length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabId)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar matéria ou foco..."
            className="h-8 pl-8 text-xs bg-background/80 rounded-xl"
          />
        </div>
      </div>

      {/* LISTA DE REVISÕES */}
      <div className="space-y-2.5">
        {listaDaAba.length > 0 ? (
          listaDaAba.map((rev) => {
            const hoje = startOfToday();
            const dataRev = parseISO(rev.data_revisao);
            const diffDias = differenceInCalendarDays(dataRev, hoje);
            const isLate = !rev.concluida && diffDias < 0;

            return (
              <div
                key={rev.id}
                className={cn(
                  'p-4 rounded-2xl bg-card border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs',
                  rev.concluida
                    ? 'border-emerald-500/30 bg-emerald-500/[0.02] opacity-80'
                    : isLate
                    ? 'border-rose-500/40 bg-rose-500/[0.02]'
                    : 'border-border hover:border-emerald-500/40'
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0 mt-0.5 border',
                      rev.concluida
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isLate
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    )}
                  >
                    {rev.tipo_revisao?.toUpperCase() || 'REV'}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          'text-sm font-bold text-foreground truncate',
                          rev.concluida && 'line-through text-muted-foreground'
                        )}
                      >
                        {rev.materia_nome || 'Disciplina'}
                      </h3>

                      {isLate && (
                        <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-[10px]">
                          Atrasada há {Math.abs(diffDias)} {Math.abs(diffDias) === 1 ? 'dia' : 'dias'}
                        </Badge>
                      )}
                      {!rev.concluida && diffDias === 0 && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Para Hoje
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {limparTagPlano(rev.foco_sugerido) || 'Revisão geral do tópico estudado'}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Data programada:{' '}
                        <strong className="text-foreground">
                          {new Date(rev.data_revisao + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {!rev.concluida && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIniciarRevisao(rev)}
                      className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl"
                    >
                      <Play className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                      <span>Estudar / Registrar</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant={rev.concluida ? 'secondary' : 'default'}
                    disabled={isPending}
                    onClick={() => handleToggleStatus(rev)}
                    className={cn(
                      'h-9 px-4 text-xs font-bold gap-1.5 rounded-xl',
                      !rev.concluida && 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    )}
                  >
                    {rev.concluida ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reabrir</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Concluir</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-14 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-2">
            <RotateCcw className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">Tudo em dia nesta categoria!</p>
            <p className="text-xs text-muted-foreground">
              {planoAtivo
                ? `Nenhuma revisão encontrada para o plano ${planoAtivo.nome}.`
                : 'Nenhuma revisão encontrada para este filtro.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}