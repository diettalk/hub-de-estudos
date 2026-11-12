'use client';

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { addLembrete, deleteLembrete, updateRevisaoStatus } from '@/app/actions';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
  revisaoPertenceAoPlano,
  limparTagPlano,
  getHojeBrasilISO,
} from '@/lib/plano-ativo';
import { type Lembrete, type Revisao, type SessaoEstudo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  Target,
  Clock,
  Edit,
  X,
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

function extrairMinutosSessao(diario: string | null): number {
  if (diario) {
    const matchTime = diario.match(/⏱️\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (matchTime) {
      return (
        (parseInt(matchTime[1], 10) || 0) * 60 +
        (parseInt(matchTime[2], 10) || 0) +
        Math.round((parseInt(matchTime[3] || '0', 10) || 0) / 60)
      );
    }
    const matchMin = diario.match(/\[MIN:(\d+)\]/);
    if (matchMin) return parseInt(matchMin[1], 10) || 45;
  }
  return 45;
}

function formatarHoras(min: number): string {
  if (min <= 0) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}min` : ''}` : `${m}min`;
}

export function CalendarioClient({
  lembretes = [],
  revisoes: initialRevisoes = [],
}: CalendarioClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  const todayISO = getHojeBrasilISO(0);
  const [anoInit, mesInit] = todayISO.split('-').map(Number);

  const [currentMonth, setCurrentMonth] = useState((mesInit || 1) - 1);
  const [currentYear, setCurrentYear] = useState(anoInit || new Date().getFullYear());
  const [selectedDateISO, setSelectedDateISO] = useState(todayISO);

  const [revisoesList, setRevisoesList] = useState<Revisao[]>(initialRevisoes);
  const [sessoesEstudadas, setSessoesEstudadas] = useState<SessaoEstudo[]>([]);

  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaCor, setNovaCor] = useState('#10b981');

  // Reagendar data de revisão direto no calendário
  const [reagendandoRevId, setReagendandoRevId] = useState<number | null>(null);
  const [novaDataRev, setNovaDataRev] = useState('');

  useEffect(() => {
    setRevisoesList(initialRevisoes);
  }, [initialRevisoes]);

  // Busca também os estudos concluídos para mostrar o histórico de cada dia no calendário!
  useEffect(() => {
    async function loadSessoes() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('ciclo_sessoes')
        .select('*')
        .eq('user_id', user.id)
        .eq('concluida', true);
      if (data) setSessoesEstudadas(data as SessaoEstudo[]);
    }
    loadSessoes();
  }, [supabase]);

  const sessoesDoPlano = useMemo(
    () => sessoesEstudadas.filter((s) => sessaoPertenceAoPlano(s, planoAtivo)),
    [sessoesEstudadas, planoAtivo]
  );

  const revisoesDoPlano = useMemo(() => {
    const filtradas = revisoesList.filter((r) =>
      revisaoPertenceAoPlano(r, planoAtivo, sessoesDoPlano)
    );
    const vistas = new Set<string>();
    return filtradas.filter((r) => {
      const k = `${r.data_revisao}__${(r.materia_nome || '').toLowerCase()}__${limparTagPlano(
        r.foco_sugerido
      ).toLowerCase()}`;
      if (vistas.has(k)) return false;
      vistas.add(k);
      return true;
    });
  }, [revisoesList, planoAtivo, sessoesDoPlano]);

  const dataProvaISO = planoAtivo?.data_prova
    ? planoAtivo.data_prova.split('T')[0]
    : null;

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

  const eventosPorData = useMemo(() => {
    const mapa: Record<
      string,
      { lembretes: Lembrete[]; revisoes: Revisao[]; estudos: SessaoEstudo[] }
    > = {};

    const garantir = (iso: string) => {
      if (!mapa[iso]) mapa[iso] = { lembretes: [], revisoes: [], estudos: [] };
    };

    lembretes.forEach((l) => {
      const iso = l.data ? l.data.split('T')[0] : '';
      if (!iso) return;
      garantir(iso);
      mapa[iso].lembretes.push(l);
    });

    revisoesDoPlano.forEach((r) => {
      const iso = r.data_revisao ? r.data_revisao.split('T')[0] : '';
      if (!iso) return;
      garantir(iso);
      mapa[iso].revisoes.push(r);
    });

    sessoesDoPlano.forEach((s) => {
      const diario = s.diario_de_bordo || '';
      if (diario.includes('[MIN:') && !diario.includes('[HISTORICO]')) return;
      const iso = s.data_estudo ? s.data_estudo.split('T')[0] : '';
      if (!iso) return;
      garantir(iso);
      mapa[iso].estudos.push(s);
    });

    return mapa;
  }, [lembretes, revisoesDoPlano, sessoesDoPlano]);

  const eventosDoDiaSelecionado = eventosPorData[selectedDateISO] || {
    lembretes: [],
    revisoes: [],
    estudos: [],
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
    const novo = !rev.concluida;
    setRevisoesList((prev) =>
      prev.map((r) => (r.id === rev.id ? { ...r, concluida: novo } : r))
    );
    startTransition(async () => {
      await updateRevisaoStatus(rev.id, novo);
      toast.success(novo ? 'Revisão concluída!' : 'Revisão reaberta.');
      router.refresh();
    });
  };

  const handleSalvarNovaDataRevisao = (revId: number) => {
    if (!novaDataRev) return;
    startTransition(async () => {
      const { error } = await supabase
        .from('revisoes')
        .update({ data_revisao: novaDataRev })
        .eq('id', revId);

      if (!error) {
        setRevisoesList((prev) =>
          prev.map((r) => (r.id === revId ? { ...r, data_revisao: novaDataRev } : r))
        );
        setReagendandoRevId(null);
        toast.success('Data da revisão alterada!');
        router.refresh();
      }
    });
  };

  const handleDeleteRevisao = (revId: number) => {
    if (!confirm('Deseja excluir esta revisão do calendário?')) return;
    startTransition(async () => {
      await supabase.from('revisoes').delete().eq('id', revId);
      setRevisoesList((prev) => prev.filter((r) => r.id !== revId));
      toast.success('Revisão removida.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Calendário Integrado
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Visão completa de Estudos Realizados, Revisões, Lembretes e Data da Prova
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Estudos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Revisões
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Lembretes
          </span>
          {dataProvaISO && (
            <span className="flex items-center gap-1.5 font-bold text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Prova
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* GRADE MENSAL (7 COLS) */}
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
                  const [y, m] = todayISO.split('-').map(Number);
                  setCurrentMonth(m - 1);
                  setCurrentYear(y);
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
                return <div key={`empty-${idx}`} className="h-20 rounded-xl bg-transparent" />;
              }

              const ev = eventosPorData[cel.dateISO];
              const qtdEstudos = ev?.estudos.length || 0;
              const qtdRevisoes = ev?.revisoes.length || 0;
              const qtdLembretes = ev?.lembretes.length || 0;
              const isDiaProva = dataProvaISO === cel.dateISO;
              const isSelected = cel.dateISO === selectedDateISO;
              const isTodayDate = cel.dateISO === todayISO;

              return (
                <button
                  key={cel.dateISO}
                  type="button"
                  onClick={() => setSelectedDateISO(cel.dateISO!)}
                  className={cn(
                    'h-20 p-2 rounded-xl border text-left flex flex-col justify-between transition-all overflow-hidden',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                      : isDiaProva
                      ? 'border-rose-500/60 bg-rose-500/10'
                      : 'border-border/60 bg-secondary/20 hover:bg-secondary/50',
                    isTodayDate && !isSelected && 'border-emerald-500/60'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={cn(
                        'text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center',
                        isTodayDate
                          ? 'bg-emerald-500 text-white'
                          : isDiaProva
                          ? 'bg-rose-500 text-white'
                          : 'text-foreground'
                      )}
                    >
                      {cel.dia}
                    </span>
                    {isDiaProva && (
                      <span className="text-[9px] font-extrabold text-rose-400 uppercase">
                        🎯 Prova
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {qtdEstudos > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                        {qtdEstudos} est
                      </span>
                    )}
                    {qtdRevisoes > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-bold">
                        {qtdRevisoes} rev
                      </span>
                    )}
                    {qtdLembretes > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                        {qtdLembretes} lemb
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* AGENDA DO DIA SELECIONADO (5 COLS) */}
        <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                Detalhes do Dia
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

          {dataProvaISO === selectedDateISO && planoAtivo && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center gap-3 text-xs">
              <Target className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-rose-300 block">
                  🎯 GRANDE DIA DA PROVA!
                </span>
                <span className="text-foreground font-semibold">{planoAtivo.nome}</span>
              </div>
            </div>
          )}

          {/* 1. ESTUDOS REALIZADOS NESTE DIA (HISTÓRICO) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
              Estudos Realizados ({eventosDoDiaSelecionado.estudos.length})
            </span>
            {eventosDoDiaSelecionado.estudos.length > 0 ? (
              eventosDoDiaSelecionado.estudos.map((est) => {
                const mins = extrairMinutosSessao(est.diario_de_bordo);
                return (
                  <div
                    key={est.id}
                    className="p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/25 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-foreground block truncate">
                        {est.materia_nome}
                      </span>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        {limparTagPlano(est.foco_sugerido)}
                      </span>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                      {formatarHoras(mins)}
                    </Badge>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-1">
                Nenhum estudo registrado nesta data.
              </p>
            )}
          </div>

          {/* 2. REVISÕES DO DIA (COM CONCLUIR, MUDAR DATA E EXCLUIR) */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">
              Revisões Agendadas ({eventosDoDiaSelecionado.revisoes.length})
            </span>
            {eventosDoDiaSelecionado.revisoes.length > 0 ? (
              eventosDoDiaSelecionado.revisoes.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
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

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant={rev.concluida ? 'secondary' : 'default'}
                        onClick={() => handleToggleRevisao(rev)}
                        className={cn(
                          'h-7 px-2 text-[11px] font-bold rounded-lg',
                          !rev.concluida && 'bg-emerald-500 text-white'
                        )}
                        title={rev.concluida ? 'Reabrir revisão' : 'Concluir revisão'}
                      >
                        {rev.concluida ? (
                          <RotateCcw className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setReagendandoRevId(reagendandoRevId === rev.id ? null : rev.id);
                          setNovaDataRev(rev.data_revisao.split('T')[0]);
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Alterar data desta revisão"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRevisao(rev.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Excluir revisão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {reagendandoRevId === rev.id && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Input
                        type="date"
                        value={novaDataRev}
                        onChange={(e) => setNovaDataRev(e.target.value)}
                        className="h-8 text-xs bg-background rounded-lg flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSalvarNovaDataRevisao(rev.id)}
                        className="h-8 px-3 text-xs font-bold bg-emerald-500 text-white rounded-lg"
                      >
                        Mover Data
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-1">
                Nenhuma revisão programada para esta data.
              </p>
            )}
          </div>

          {/* 3. LEMBRETES DO DIA */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
              Lembretes ({eventosDoDiaSelecionado.lembretes.length})
            </span>

            <form onSubmit={handleCreateLembrete} className="flex items-center gap-2">
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Novo lembrete para esta data..."
                className="h-9 text-xs bg-secondary/30 rounded-xl flex-1"
              />
              <input
                type="color"
                value={novaCor}
                onChange={(e) => setNovaCor(e.target.value)}
                className="w-8 h-8 rounded-lg bg-transparent border-none cursor-pointer"
                title="Cor"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !novoTitulo.trim()}
                className="h-9 px-3 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            {eventosDoDiaSelecionado.lembretes.map((lemb) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarioClient;