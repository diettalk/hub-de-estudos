'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addLembrete, deleteLembrete, updateRevisaoStatus } from '@/app/actions';
import { usePlanoAtivo, limparTagPlano } from '@/lib/plano-ativo';
import { type Lembrete, type Revisao } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Bell,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CalendarioClientProps {
  lembretes?: Lembrete[];
  revisoes?: Revisao[];
  [key: string]: any;
}

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarioClient({
  lembretes = [],
  revisoes = [],
}: CalendarioClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  const hoje = new Date();
  const [currentMonth, setCurrentMonth] = useState(hoje.getMonth());
  const [currentYear, setCurrentYear] = useState(hoje.getFullYear());
  const [selectedDateISO, setSelectedDateISO] = useState(
    () => new Date().toISOString().split('T')[0]
  );

  // Novo Lembrete
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCor, setNovaCor] = useState('#10b981');

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Gera os dias do mês para a grade do calendário
  const diasDoMesGrid = useMemo(() => {
    const primeiroDiaSemana = new Date(currentYear, currentMonth, 1).getDay();
    const totalDiasNoMes = new Date(currentYear, currentMonth + 1, 0).getDate();

    const celulas: { dia: number | null; dateISO: string | null }[] = [];
    for (let i = 0; i < primeiroDiaSemana; i++) {
      celulas.push({ dia: null, dateISO: null });
    }
    for (let d = 1; d <= totalDiasNoMes; d++) {
      const mStr = (currentMonth + 1).toString().padStart(2, '0');
      const dStr = d.toString().padStart(2, '0');
      celulas.push({ dia: d, dateISO: `${currentYear}-${mStr}-${dStr}` });
    }
    return celulas;
  }, [currentMonth, currentYear]);

  // Mapa rápido de eventos por data ISO
  const eventosPorData = useMemo(() => {
    const mapa: Record<string, { lembretes: Lembrete[]; revisoes: Revisao[] }> = {};

    lembretes.forEach((l) => {
      const iso = l.data ? l.data.split('T')[0] : '';
      if (!iso) return;
      if (!mapa[iso]) mapa[iso] = { lembretes: [], revisoes: [] };
      mapa[iso].lembretes.push(l);
    });

    revisoes.forEach((r) => {
      const iso = r.data_revisao ? r.data_revisao.split('T')[0] : '';
      if (!iso) return;
      if (!mapa[iso]) mapa[iso] = { lembretes: [], revisoes: [] };
      mapa[iso].revisoes.push(r);
    });

    return mapa;
  }, [lembretes, revisoes]);

  const eventosDoDiaSelecionado = eventosPorData[selectedDateISO] || {
    lembretes: [],
    revisoes: [],
  };

const handleCreateLembrete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.trim()) return;

    const formData = new FormData();
    formData.append('titulo', novoTitulo.trim());
    formData.append('data', selectedDateISO);
    formData.append('cor', novaCor);

    startTransition(async () => {
      const res = await addLembrete(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Lembrete adicionado ao calendário!');
        setNovoTitulo('');
        router.refresh();
      }
    });
  };
  
  const handleDeleteLembrete = (id: number) => {
    startTransition(async () => {
      await deleteLembrete(id);
      toast.success('Lembrete removido.');
      router.refresh();
    });
  };

  const handleToggleRevisao = (rev: Revisao) => {
    startTransition(async () => {
      await updateRevisaoStatus(rev.id, !rev.concluida);
      toast.success(!rev.concluida ? 'Revisão concluída!' : 'Revisão reaberta.');
      router.refresh();
    });
  };

  const todayISO = hoje.toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Calendário & Agenda
            </h1>
            {planoAtivo && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
                🎯 {planoAtivo.nome}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Acompanhe suas datas de provas, lembretes importantes e revisões agendadas
          </p>
        </div>
      </div>

      {/* GRID PRINCIPAL: CALENDÁRIO MENSAL (7 COLS) + AGENDA DO DIA (5 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CALENDÁRIO MENSAL */}
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-foreground">
              {MESES_NOMES[currentMonth]} de {currentYear}
            </h2>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-xl">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentMonth(hoje.getMonth());
                  setCurrentYear(hoje.getFullYear());
                  setSelectedDateISO(todayISO);
                }}
                className="h-8 px-3 text-xs font-bold rounded-xl"
              >
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-xl">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-1.5 text-[11px] font-bold uppercase text-muted-foreground">
                {d}
              </div>
            ))}

            {diasDoMesGrid.map((cel, idx) => {
              if (!cel.dia || !cel.dateISO) {
                return <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-xl bg-transparent" />;
              }

              const ev = eventosPorData[cel.dateISO];
              const qtdLembretes = ev?.lembretes.length || 0;
              const qtdRevisoes = ev?.revisoes.length || 0;
              const isSelected = cel.dateISO === selectedDateISO;
              const isTodayDate = cel.dateISO === todayISO;

              return (
                <button
                  key={cel.dateISO}
                  type="button"
                  onClick={() => setSelectedDateISO(cel.dateISO!)}
                  className={cn(
                    'h-16 sm:h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-all',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-border/60 bg-secondary/20 hover:bg-secondary/50',
                    isTodayDate && !isSelected && 'border-primary/60'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center',
                      isTodayDate ? 'bg-emerald-500 text-white' : 'text-foreground'
                    )}
                  >
                    {cel.dia}
                  </span>

                  <div className="flex flex-wrap items-center gap-1">
                    {qtdLembretes > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                        {qtdLembretes} lemb
                      </span>
                    )}
                    {qtdRevisoes > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-bold">
                        {qtdRevisoes} rev
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PAINEL LATERAL DO DIA SELECIONADO */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                Agenda do Dia
              </span>
              <h3 className="text-base font-extrabold text-foreground capitalize">
                {new Date(selectedDateISO + 'T12:00:00Z').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
            </div>
            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* CRIAR NOVO LEMBRETE NESTA DATA */}
          <form onSubmit={handleCreateLembrete} className="space-y-2.5">
            <label className="text-xs font-semibold text-foreground block">
              Adicionar Lembrete para esta data
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Ex.: Inscrição do concurso, Simulado..."
                className="h-9 text-xs bg-secondary/30 rounded-xl flex-1"
              />
              <input
                type="color"
                value={novaCor}
                onChange={(e) => setNovaCor(e.target.value)}
                className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                title="Cor do lembrete"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !novoTitulo.trim()}
                className="h-9 px-3 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* LISTA DE LEMBRETES DO DIA */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Lembretes ({eventosDoDiaSelecionado.lembretes.length})
            </span>
            {eventosDoDiaSelecionado.lembretes.length > 0 ? (
              eventosDoDiaSelecionado.lembretes.map((lemb) => (
                <div
                  key={lemb.id}
                  className="p-3 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lemb.cor || '#10b981' }}
                    />
                    <span className="font-semibold text-foreground truncate">{lemb.titulo}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteLembrete(lemb.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Nenhum lembrete para este dia.
              </p>
            )}
          </div>

          {/* LISTA DE REVISÕES DO DIA */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Revisões Agendadas ({eventosDoDiaSelecionado.revisoes.length})
            </span>
            {eventosDoDiaSelecionado.revisoes.length > 0 ? (
              eventosDoDiaSelecionado.revisoes.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl bg-secondary/30 border border-border/60 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {rev.tipo_revisao}
                      </Badge>
                      <span
                        className={cn(
                          'font-bold text-foreground truncate',
                          rev.concluida && 'line-through text-muted-foreground'
                        )}
                      >
                        {rev.materia_nome}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {limparTagPlano(rev.foco_sugerido)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={rev.concluida ? 'secondary' : 'default'}
                    onClick={() => handleToggleRevisao(rev)}
                    className={cn(
                      'h-7 px-2.5 text-[11px] font-bold rounded-lg',
                      !rev.concluida && 'bg-emerald-500 text-white'
                    )}
                  >
                    {rev.concluida ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Nenhuma revisão programada para esta data.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarioClient;