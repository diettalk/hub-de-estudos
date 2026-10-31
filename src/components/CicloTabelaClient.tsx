'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  deleteSessaoCiclo,
  deleteSessoesEmMassa,
  toggleFinalizarSessao,
} from '@/app/actions';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
  limparTagPlano,
} from '@/lib/plano-ativo';
import { PlanejamentoWizardModal } from './PlanejamentoWizardModal';
import { type SessaoEstudo, type Node as DisciplinaNode } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RotateCcw,
  BarChart2,
  Wand2,
  Edit3,
  MoreVertical,
  Copy,
  Trash2,
  Plus,
  Search,
  FileText,
  Archive,
  ArchiveRestore,
  Sparkles,
  FolderTree,
  ChevronDown,
  ArrowUpRight,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SLICE_COLORS = [
  '#f472b6',
  '#60a5fa',
  '#4ade80',
  '#c084fc',
  '#94a3b8',
  '#fde047',
  '#2dd4bf',
  '#fb923c',
];

const DIAS_SEMANA_NOMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

function extrairMinutosBloco(diario: string | null): number {
  if (diario) {
    const matchPlan = diario.match(/\[MIN:(\d+)\]/);
    if (matchPlan) return parseInt(matchPlan[1], 10) || 45;
    const matchTime = diario.match(/⏱️\s*(\d{1,2}):(\d{2})/);
    if (matchTime) {
      return (parseInt(matchTime[1], 10) || 0) * 60 + (parseInt(matchTime[2], 10) || 0);
    }
  }
  return 45;
}

function formatarMinutosHoras(min: number): string {
  if (min <= 0) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m}min`;
}

function limparNotasDiario(diario: string | null): string {
  if (!diario) return '';
  return diario
    .replace(/\[PLANO:\d+\]\s*\|?\s*/g, '')
    .replace(/\[MIN:\d+\]\s*\|?\s*/g, '')
    .replace(/\[DIA:[^\]]+\]\s*\|?\s*/g, '')
    .trim();
}

function extrairDiaQuadroSemanal(diario: string | null): string | null {
  if (!diario) return null;
  const m = diario.match(/\[DIA:([^\]]+)\]/);
  return m ? m[1] : null;
}

interface CicloTabelaClientProps {
  sessoesIniciais: SessaoEstudo[];
  disciplinaTree: DisciplinaNode[];
}

export function CicloTabelaClient({
  sessoesIniciais,
  disciplinaTree,
}: CicloTabelaClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { planoAtivo } = usePlanoAtivo();
  const [isPending, startTransition] = useTransition();

  const [sessoes, setSessoes] = useState<SessaoEstudo[]>(sessoesIniciais);
  const [isEditingCycle, setIsEditingCycle] = useState(false);
  const [sugerirTopicosAuto, setSugerirTopicosAuto] = useState(true);
  const [ciclosCompletos, setCiclosCompletos] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'ativos' | 'restantes' | 'concluidos' | 'zeradas'>('ativos');
  const [groupBy, setGroupBy] = useState<'sequencia' | 'materia' | 'dia'>('sequencia');
  const [searchQuery, setSearchQuery] = useState('');

  // Revisões Inteligentes até a Prova (Sem cair no limbo após 30 dias!)
  const [modoRevisao, setModoRevisao] = useState<'ate_prova' | 'personalizado'>('ate_prova');
  const [intervalosPersonalizados, setIntervalosPersonalizados] = useState<number[]>([
    1, 7, 15, 30, 60, 90,
  ]);

  useEffect(() => {
    setSessoes(sessoesIniciais);
  }, [sessoesIniciais]);

  const storageKeyCiclos = `hub_ciclos_completos_${planoAtivo?.id || 'all'}`;
  useEffect(() => {
    const saved = localStorage.getItem(storageKeyCiclos);
    setCiclosCompletos(saved ? parseInt(saved, 10) || 0 : 0);
  }, [storageKeyCiclos]);

  const sessoesDoPlano = useMemo(
    () => sessoes.filter((s) => sessaoPertenceAoPlano(s, planoAtivo)),
    [sessoes, planoAtivo]
  );

  const disciplinasDoPlano = useMemo(() => {
    if (planoAtivo && planoAtivo.disciplinaIds.length > 0) {
      return disciplinaTree.filter((d) => planoAtivo.disciplinaIds.includes(Number(d.id)));
    }
    return disciplinaTree;
  }, [disciplinaTree, planoAtivo]);

  const sessoesCicloAtivo = useMemo(
    () => sessoesDoPlano.filter((s) => !s.materia_finalizada),
    [sessoesDoPlano]
  );
  const sessoesZeradas = useMemo(
    () => sessoesDoPlano.filter((s) => s.materia_finalizada),
    [sessoesDoPlano]
  );

  const dadosCiclo = useMemo(() => {
    let minutosTotais = 0;
    let minutosConcluidos = 0;
    const mapaMaterias: Record<
      string,
      { nome: string; minutosPlanejados: number; minutosConcluidos: number; cor: string }
    > = {};

    sessoesCicloAtivo.forEach((s) => {
      const m = extrairMinutosBloco(s.diario_de_bordo);
      minutosTotais += m;
      if (s.concluida) minutosConcluidos += m;

      const nome = s.materia_nome?.trim() || 'Disciplina não definida';
      if (!mapaMaterias[nome]) {
        const corIdx = Object.keys(mapaMaterias).length % SLICE_COLORS.length;
        mapaMaterias[nome] = {
          nome,
          minutosPlanejados: 0,
          minutosConcluidos: 0,
          cor: SLICE_COLORS[corIdx],
        };
      }
      mapaMaterias[nome].minutosPlanejados += m;
      if (s.concluida) mapaMaterias[nome].minutosConcluidos += m;
    });

    const percProgresso =
      minutosTotais > 0 ? Math.round((minutosConcluidos / minutosTotais) * 100) : 0;

    return {
      minutosTotais,
      minutosConcluidos,
      percProgresso,
      fatias: Object.values(mapaMaterias),
    };
  }, [sessoesCicloAtivo]);

  const itensExibidos = useMemo(() => {
    let base: SessaoEstudo[] = [];
    if (statusFilter === 'zeradas') base = sessoesZeradas;
    else if (statusFilter === 'restantes') base = sessoesCicloAtivo.filter((s) => !s.concluida);
    else if (statusFilter === 'concluidos') base = sessoesCicloAtivo.filter((s) => s.concluida);
    else base = sessoesCicloAtivo;

    const ordenada = [...base].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    if (!searchQuery.trim()) return ordenada;
    const q = searchQuery.toLowerCase();
    return ordenada.filter(
      (s) =>
        s.materia_nome?.toLowerCase().includes(q) ||
        s.foco_sugerido?.toLowerCase().includes(q) ||
        s.diario_de_bordo?.toLowerCase().includes(q)
    );
  }, [sessoesCicloAtivo, sessoesZeradas, statusFilter, searchQuery]);

  const gruposRenderizados = useMemo(() => {
    if (groupBy === 'sequencia') {
      return [{ titulo: 'Sequência dos Estudos', itens: itensExibidos }];
    }
    if (groupBy === 'materia') {
      const g: Record<string, SessaoEstudo[]> = {};
      itensExibidos.forEach((s) => {
        const k = s.materia_nome?.trim() || 'Sem Disciplina';
        if (!g[k]) g[k] = [];
        g[k].push(s);
      });
      return Object.entries(g).map(([titulo, itens]) => ({ titulo, itens }));
    }
    const gDia: Record<string, SessaoEstudo[]> = {};
    itensExibidos.forEach((s, idx) => {
      const diaSalvo =
        extrairDiaQuadroSemanal(s.diario_de_bordo) ||
        DIAS_SEMANA_NOMES[idx % DIAS_SEMANA_NOMES.length];
      if (!gDia[diaSalvo]) gDia[diaSalvo] = [];
      gDia[diaSalvo].push(s);
    });
    return Object.entries(gDia).map(([titulo, itens]) => ({ titulo, itens }));
  }, [itensExibidos, groupBy]);

  const agendarRevisoesInteligentes = async (sessao: SessaoEstudo, dataEstudoISO: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const baseDate = new Date(dataEstudoISO + 'T12:00:00Z');
    const dataProvaStr = planoAtivo?.data_prova ? planoAtivo.data_prova.split('T')[0] : null;
    const dataProvaDate = dataProvaStr ? new Date(dataProvaStr + 'T12:00:00Z') : null;

    const diasIntervalo =
      modoRevisao === 'ate_prova'
        ? [
            { dias: 1, label: '24h' },
            { dias: 7, label: '7d' },
            { dias: 15, label: '15d' },
            { dias: 30, label: '30d' },
            { dias: 60, label: '60d' },
            { dias: 90, label: '90d' },
          ]
        : intervalosPersonalizados.map((d) => ({ dias: d, label: d === 1 ? '24h' : `${d}d` }));

    const novasRevisoes: any[] = [];
    const focoComPlano = planoAtivo
      ? `[PLANO:${planoAtivo.id}] ${limparTagPlano(sessao.foco_sugerido) || 'Revisão do Ciclo'}`
      : limparTagPlano(sessao.foco_sugerido) || 'Revisão do Ciclo';

    diasIntervalo.forEach(({ dias, label }) => {
      const dRev = new Date(baseDate);
      dRev.setDate(baseDate.getDate() + dias);
      if (!dataProvaDate || dRev < dataProvaDate) {
        novasRevisoes.push({
          user_id: user.id,
          ciclo_sessao_id: sessao.id,
          data_revisao: dRev.toISOString().split('T')[0],
          tipo_revisao: label,
          concluida: false,
          materia_nome: sessao.materia_nome || 'Disciplina',
          foco_sugerido: focoComPlano,
        });
      }
    });

    if (modoRevisao === 'ate_prova' && dataProvaDate) {
      const revFinal = new Date(dataProvaDate);
      revFinal.setDate(dataProvaDate.getDate() - 7);
      if (revFinal > baseDate) {
        novasRevisoes.push({
          user_id: user.id,
          ciclo_sessao_id: sessao.id,
          data_revisao: revFinal.toISOString().split('T')[0],
          tipo_revisao: 'Reta Final',
          concluida: false,
          materia_nome: sessao.materia_nome || 'Disciplina',
          foco_sugerido: `${focoComPlano} (Revisão Pré-Prova)`,
        });
      }
    }

    if (novasRevisoes.length > 0) {
      await supabase.from('revisoes').insert(novasRevisoes);
    }
  };

  const handleToggleConcluirBloco = async (sessao: SessaoEstudo) => {
    const novoStatus = !sessao.concluida;
    const hojeISO = new Date().toISOString().split('T')[0];
    const dataFinal = sessao.data_estudo ? sessao.data_estudo.split('T')[0] : hojeISO;

    setSessoes((prev) =>
      prev.map((s) =>
        s.id === sessao.id ? { ...s, concluida: novoStatus, data_estudo: dataFinal } : s
      )
    );

    startTransition(async () => {
      await supabase
        .from('ciclo_sessoes')
        .update({ concluida: novoStatus, data_estudo: dataFinal })
        .eq('id', sessao.id);

      if (novoStatus) {
        await agendarRevisoesInteligentes(sessao, dataFinal);
        toast.success('Bloco concluído e revisões agendadas!');
      } else {
        await supabase.from('revisoes').delete().eq('ciclo_sessao_id', sessao.id).eq('concluida', false);
        toast.info('Bloco reaberto.');
      }
      router.refresh();
    });
  };

  const handleToggleZerarMateria = (sessao: SessaoEstudo) => {
    const novoZerada = !sessao.materia_finalizada;
    setSessoes((prev) =>
      prev.map((s) => (s.id === sessao.id ? { ...s, materia_finalizada: novoZerada } : s))
    );
    startTransition(async () => {
      await toggleFinalizarSessao(sessao.id, novoZerada);
      toast.success(
        novoZerada ? 'Matéria arquivada em Zeradas!' : 'Matéria restaurada para o ciclo!'
      );
      router.refresh();
    });
  };

  const handleUpdateBloco = async (
    sessao: SessaoEstudo,
    updates: {
      disciplina_id?: number | null;
      materia_nome?: string;
      minutos?: number;
      foco_sugerido?: string;
      notasDiario?: string;
      data_estudo?: string;
    }
  ) => {
    const mins = updates.minutos ?? extrairMinutosBloco(sessao.diario_de_bordo);
    const notas = updates.notasDiario ?? limparNotasDiario(sessao.diario_de_bordo);
    const diaTag = extrairDiaQuadroSemanal(sessao.diario_de_bordo);

    const partesDiario: string[] = [];
    if (planoAtivo) partesDiario.push(`[PLANO:${planoAtivo.id}]`);
    partesDiario.push(`[MIN:${mins}]`);
    if (diaTag) partesDiario.push(`[DIA:${diaTag}]`);
    if (notas) partesDiario.push(notas);

    const novoDiario = partesDiario.join(' | ');
    const novoFoco =
      updates.foco_sugerido !== undefined ? updates.foco_sugerido : sessao.foco_sugerido;
    const novaMateria =
      updates.materia_nome !== undefined ? updates.materia_nome : sessao.materia_nome;
    const novoDiscId =
      updates.disciplina_id !== undefined ? updates.disciplina_id : sessao.disciplina_id;
    const novaData =
      updates.data_estudo !== undefined ? updates.data_estudo : sessao.data_estudo;

    setSessoes((prev) =>
      prev.map((s) =>
        s.id === sessao.id
          ? {
              ...s,
              disciplina_id: novoDiscId,
              materia_nome: novaMateria,
              foco_sugerido: novoFoco,
              diario_de_bordo: novoDiario,
              data_estudo: novaData,
            }
          : s
      )
    );

    await supabase
      .from('ciclo_sessoes')
      .update({
        disciplina_id: novoDiscId,
        materia_nome: novaMateria,
        foco_sugerido: novoFoco,
        diario_de_bordo: novoDiario,
        data_estudo: novaData,
      })
      .eq('id', sessao.id);
  };

  const handleDuplicarBloco = (sessao: SessaoEstudo) => {
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const maxOrdem =
        sessoesDoPlano.length > 0 ? Math.max(...sessoesDoPlano.map((s) => s.ordem || 0)) : 0;

      const { data: duplicada, error } = await supabase
        .from('ciclo_sessoes')
        .insert({
          user_id: user.id,
          ordem: maxOrdem + 1,
          disciplina_id: sessao.disciplina_id,
          materia_nome: sessao.materia_nome,
          foco_sugerido: sessao.foco_sugerido,
          diario_de_bordo: sessao.diario_de_bordo,
          concluida: false,
          materia_finalizada: false,
        })
        .select('*')
        .single();

      if (!error && duplicada) {
        setSessoes((prev) => [...prev, duplicada as SessaoEstudo]);
        toast.success('Disciplina duplicada na sequência!');
        router.refresh();
      }
    });
  };

  const handleAdicionarBlocoManual = () => {
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const maxOrdem =
        sessoesDoPlano.length > 0 ? Math.max(...sessoesDoPlano.map((s) => s.ordem || 0)) : 0;
      const discPadrao = disciplinasDoPlano[0] || null;

      const partesDiario: string[] = [];
      if (planoAtivo) partesDiario.push(`[PLANO:${planoAtivo.id}]`);
      partesDiario.push('[MIN:45]');

      const { data: nova, error } = await supabase
        .from('ciclo_sessoes')
        .insert({
          user_id: user.id,
          ordem: maxOrdem + 1,
          disciplina_id: discPadrao ? Number(discPadrao.id) : null,
          materia_nome: discPadrao ? discPadrao.title : '',
          foco_sugerido: '',
          diario_de_bordo: partesDiario.join(' | '),
          concluida: false,
          materia_finalizada: false,
        })
        .select('*')
        .single();

      if (!error && nova) {
        setSessoes((prev) => [...prev, nova as SessaoEstudo]);
        toast.success('Disciplina adicionada à sequência!');
        router.refresh();
      }
    });
  };

  const handleRecomecarCiclo = () => {
    if (!confirm('Deseja concluir esta volta e recomeçar o ciclo do início?')) return;
    startTransition(async () => {
      const idsAtivos = sessoesCicloAtivo.map((s) => s.id);
      if (idsAtivos.length > 0) {
        await supabase
          .from('ciclo_sessoes')
          .update({ concluida: false })
          .in('id', idsAtivos);
      }

      const novoTotal = ciclosCompletos + 1;
      setCiclosCompletos(novoTotal);
      localStorage.setItem(storageKeyCiclos, String(novoTotal));
      setSessoes((prev) =>
        prev.map((s) => (idsAtivos.includes(s.id) ? { ...s, concluida: false } : s))
      );
      toast.success(`Ciclo #${novoTotal} registrado!`);
      router.refresh();
    });
  };

  const handleExcluirPlanejamento = () => {
    if (!confirm('Tem certeza que deseja excluir todos os blocos deste planejamento?')) return;
    startTransition(async () => {
      const ids = sessoesDoPlano.map((s) => s.id);
      if (ids.length > 0) {
        await deleteSessoesEmMassa(ids);
        setSessoes((prev) => prev.filter((s) => !ids.includes(s.id)));
        toast.success('Planejamento excluído.');
      }
    });
  };

  const renderDonutChart = () => {
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    if (dadosCiclo.fatias.length === 0 || dadosCiclo.minutosTotais === 0) {
      return (
        <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="22"
              className="text-secondary"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold text-foreground">0%</span>
            <span className="text-[11px] text-muted-foreground">0min / 0h</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-52 h-52 mx-auto flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
          {dadosCiclo.fatias.map((fatia, idx) => {
            const pct = fatia.minutosPlanejados / dadosCiclo.minutosTotais;
            const strokeDasharray = `${Math.max(1, pct * circumference - 3)} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += pct;

            return (
              <circle
                key={idx}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={fatia.cor}
                strokeWidth="22"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-500 hover:opacity-85"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="text-2xl font-extrabold text-foreground">
            {dadosCiclo.percProgresso}%
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            {formatarMinutosHoras(dadosCiclo.minutosConcluidos)} /{' '}
            {formatarMinutosHoras(dadosCiclo.minutosTotais)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Planejamento
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Organize sua rotina de estudos por ciclo contínuo ou quadro semanal
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-xs font-semibold gap-1.5 rounded-xl">
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  Revisões: {modoRevisao === 'ate_prova' ? 'Até a Prova (Sem Limbo)' : 'Personalizado'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-3 bg-card border-border shadow-xl text-xs" align="end">
              <h4 className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Regra de Agendamento de Revisões
              </h4>
              <div className="space-y-2 pt-1">
                <label
                  onClick={() => setModoRevisao('ate_prova')}
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                    modoRevisao === 'ate_prova'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border hover:bg-secondary/40'
                  )}
                >
                  <input
                    type="radio"
                    checked={modoRevisao === 'ate_prova'}
                    onChange={() => setModoRevisao('ate_prova')}
                    className="mt-1 accent-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-foreground block">
                      Automático Estendido até a Prova
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Agenda 24h, 7d, 15d, 30d, 60d, 90d + Reta Final 7 dias antes da prova.
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setModoRevisao('personalizado')}
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                    modoRevisao === 'personalizado'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-border hover:bg-secondary/40'
                  )}
                >
                  <input
                    type="radio"
                    checked={modoRevisao === 'personalizado'}
                    onChange={() => setModoRevisao('personalizado')}
                    className="mt-1 accent-emerald-500"
                  />
                  <div className="w-full space-y-2">
                    <span className="font-bold text-foreground block">
                      Eu escolho os dias de revisão
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 7, 15, 30, 45, 60, 90, 120].map((dia) => {
                        const ativo = intervalosPersonalizados.includes(dia);
                        return (
                          <button
                            key={dia}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModoRevisao('personalizado');
                              setIntervalosPersonalizados((prev) =>
                                prev.includes(dia)
                                  ? prev.filter((d) => d !== dia)
                                  : [...prev, dia].sort((a, b) => a - b)
                              );
                            }}
                            className={cn(
                              'px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
                              ativo
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-secondary text-muted-foreground border-border'
                            )}
                          >
                            {dia === 1 ? '24h' : `${dia}d`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </label>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            onClick={() => window.dispatchEvent(new CustomEvent('open-registro-estudo'))}
            className="h-9 px-4 text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Estudo</span>
          </Button>
        </div>
      </div>

      {/* GRID PRINCIPAL DO PLANEJAMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-5">
          {/* 2 CARDS DE TOPO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ciclos Completos
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <RotateCcw className="w-4 h-4" />
                </div>
              </div>
              <span className="text-3xl font-extrabold text-foreground my-2 block">
                {ciclosCompletos}
              </span>
              <span className="text-xs text-muted-foreground">
                desde o início do planejamento
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Progresso do Ciclo
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <BarChart2 className="w-4 h-4" />
                </div>
              </div>
              <div className="my-2 space-y-2">
                <span className="text-3xl font-extrabold text-foreground block">
                  {dadosCiclo.percProgresso}%
                </span>
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${dadosCiclo.percProgresso}%` }}
                  />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatarMinutosHoras(dadosCiclo.minutosConcluidos)} de{' '}
                {formatarMinutosHoras(dadosCiclo.minutosTotais)}
              </span>
            </div>
          </div>

          {/* PAINEL: SEQUÊNCIA DOS ESTUDOS */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Sequência dos Estudos
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant={isEditingCycle ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditingCycle(!isEditingCycle)}
                  className={cn(
                    'h-8 px-3 text-xs font-bold gap-1.5 rounded-xl',
                    isEditingCycle && 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  )}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingCycle ? 'Concluir edição' : 'Editar ciclo'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWizardOpen(true)}
                  className="h-8 px-3 text-xs font-bold gap-1.5 rounded-xl"
                >
                  <Wand2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Replanejar</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-1.5 text-xs">
                    <div
                      onClick={() => setSugerirTopicosAuto(!sugerirTopicosAuto)}
                      className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-secondary cursor-pointer"
                    >
                      <span className="font-medium">Sugerir tópicos automaticamente</span>
                      <div
                        className={cn(
                          'w-8 h-4 rounded-full transition-colors p-0.5',
                          sugerirTopicosAuto ? 'bg-emerald-500' : 'bg-secondary'
                        )}
                      >
                        <div
                          className={cn(
                            'w-3 h-3 rounded-full bg-white transition-transform',
                            sugerirTopicosAuto ? 'translate-x-4' : 'translate-x-0'
                          )}
                        />
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleRecomecarCiclo}
                      className="cursor-pointer flex items-center justify-between py-2 px-2.5"
                    >
                      <span>Recomeçar ciclo</span>
                      <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleExcluirPlanejamento}
                      className="cursor-pointer flex items-center justify-between py-2 px-2.5 text-rose-400 focus:text-rose-400"
                    >
                      <span>Excluir planejamento</span>
                      <Trash2 className="w-3.5 h-3.5" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* BARRA DE FILTROS + AGRUPAMENTO + BUSCA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-border/60">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { id: 'ativos', label: `Todos (${sessoesCicloAtivo.length})` },
                  {
                    id: 'restantes',
                    label: `Restantes (${sessoesCicloAtivo.filter((s) => !s.concluida).length})`,
                  },
                  {
                    id: 'concluidos',
                    label: `Concluídos (${sessoesCicloAtivo.filter((s) => s.concluida).length})`,
                  },
                  { id: 'zeradas', label: `Zeradas / Arquivadas (${sessoesZeradas.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id as any)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap',
                      statusFilter === f.id
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-[11px] gap-1 rounded-xl">
                      <FolderTree className="w-3 h-3 text-emerald-500" />
                      <span>
                        {groupBy === 'sequencia'
                          ? 'Ordem do Ciclo'
                          : groupBy === 'materia'
                          ? 'Por Matéria'
                          : 'Quadro Semanal'}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="text-xs">
                    <DropdownMenuItem onClick={() => setGroupBy('sequencia')}>
                      Sequência do Ciclo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGroupBy('materia')}>
                      Agrupar por Matéria
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGroupBy('dia')}>
                      Quadro Semanal (Seg a Dom)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="relative flex-1 sm:w-44">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar..."
                    className="h-8 pl-8 text-xs bg-secondary/30 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* LISTA DE BLOCOS DA SEQUÊNCIA */}
            <div className="space-y-4 pt-1">
              {gruposRenderizados.map((grupo) => (
                <div key={grupo.titulo} className="space-y-2.5">
                  {groupBy !== 'sequencia' && (
                    <div className="px-3 py-1.5 rounded-xl bg-secondary/50 border border-border/60 text-xs font-bold text-foreground flex items-center justify-between">
                      <span>{grupo.titulo}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {grupo.itens.length} blocos
                      </Badge>
                    </div>
                  )}

                  {grupo.itens.length > 0 ? (
                    grupo.itens.map((sessao, idx) => {
                      const mins = extrairMinutosBloco(sessao.diario_de_bordo);
                      const notas = limparNotasDiario(sessao.diario_de_bordo);
                      const fatiaCor =
                        dadosCiclo.fatias.find((f) => f.nome === sessao.materia_nome)?.cor ||
                        SLICE_COLORS[idx % SLICE_COLORS.length];

                      return (
                        <div
                          key={sessao.id}
                          className={cn(
                            'p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                            sessao.concluida
                              ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                              : 'bg-secondary/20 border-border hover:border-border/80'
                          )}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="pt-1 flex items-center gap-2">
                              <Checkbox
                                checked={sessao.concluida}
                                onCheckedChange={() => handleToggleConcluirBloco(sessao)}
                                title="Marcar bloco como concluído e agendar revisões"
                                className="h-4 w-4 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                              />
                            </div>

                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: fatiaCor }}
                                />
                                {isEditingCycle ? (
                                  <select
                                    value={sessao.disciplina_id || ''}
                                    onChange={(e) => {
                                      const idNum = e.target.value ? Number(e.target.value) : null;
                                      const discObj = disciplinasDoPlano.find(
                                        (d) => Number(d.id) === idNum
                                      );
                                      handleUpdateBloco(sessao, {
                                        disciplina_id: idNum,
                                        materia_nome: discObj ? discObj.title : '',
                                      });
                                    }}
                                    className="h-9 flex-1 px-3 rounded-xl bg-background border border-border text-xs font-bold text-foreground"
                                  >
                                    <option value="">Selecione a disciplina...</option>
                                    {disciplinasDoPlano.map((d) => (
                                      <option key={d.id} value={d.id}>
                                        {d.title}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span
                                    className={cn(
                                      'text-xs sm:text-sm font-bold text-foreground truncate',
                                      sessao.concluida && 'line-through text-muted-foreground'
                                    )}
                                  >
                                    {sessao.materia_nome || 'Disciplina não selecionada'}
                                  </span>
                                )}

                                {sessao.disciplina_id && (
                                  <Link
                                    href={`/disciplinas?page=${sessao.disciplina_id}`}
                                    title="Abrir caderno da disciplina"
                                    className="text-muted-foreground hover:text-emerald-400"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </Link>
                                )}
                              </div>

                              <input
                                type="text"
                                defaultValue={limparTagPlano(sessao.foco_sugerido)}
                                onBlur={(e) =>
                                  handleUpdateBloco(sessao, { foco_sugerido: e.target.value })
                                }
                                placeholder="Tópico / Foco sugerido desta sessão..."
                                className="w-full bg-transparent text-xs text-muted-foreground focus:text-foreground focus:outline-none border-b border-transparent focus:border-emerald-500/50 pb-0.5"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center flex-shrink-0">
                            <div className="flex items-center gap-1 bg-background border border-border rounded-xl px-2.5 h-8">
                              <input
                                type="number"
                                min={10}
                                max={240}
                                step={5}
                                defaultValue={mins}
                                onBlur={(e) =>
                                  handleUpdateBloco(sessao, {
                                    minutos: Math.max(10, parseInt(e.target.value, 10) || 45),
                                  })
                                }
                                className="w-10 text-center text-xs font-bold bg-transparent focus:outline-none"
                                title="Minutos planejados para este bloco"
                              />
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                min
                              </span>
                            </div>

                            <input
                              type="date"
                              value={sessao.data_estudo ? sessao.data_estudo.split('T')[0] : ''}
                              onChange={(e) =>
                                handleUpdateBloco(sessao, { data_estudo: e.target.value })
                              }
                              className="h-8 px-2 rounded-xl bg-background border border-border text-[11px] text-muted-foreground hover:text-foreground"
                              title="Data do estudo"
                            />

                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'h-8 px-2.5 rounded-xl border text-xs flex items-center gap-1 transition-colors',
                                    notas
                                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
                                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                                  )}
                                  title="Diário de Bordo da sessão"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">
                                    {notas ? 'Diário' : 'Anotar'}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-3.5 space-y-2 bg-card border-border shadow-xl" align="end">
                                <span className="text-xs font-bold flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                  Diário de Bordo — {sessao.materia_nome}
                                </span>
                                <textarea
                                  rows={4}
                                  defaultValue={notas}
                                  onBlur={(e) =>
                                    handleUpdateBloco(sessao, { notasDiario: e.target.value })
                                  }
                                  placeholder="Onde parei, página do PDF, pontos importantes..."
                                  className="w-full rounded-xl border border-border bg-secondary/30 p-2.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </PopoverContent>
                            </Popover>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleZerarMateria(sessao)}
                              className={cn(
                                'h-8 w-8 rounded-full border border-border',
                                sessao.materia_finalizada
                                  ? 'text-indigo-400 bg-indigo-500/10'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                              title={
                                sessao.materia_finalizada
                                  ? 'Restaurar matéria para o ciclo ativo'
                                  : 'Zerar / Arquivar matéria'
                              }
                            >
                              {sessao.materia_finalizada ? (
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicarBloco(sessao)}
                              className="h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-foreground"
                              title="Duplicar disciplina na sequência"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                startTransition(async () => {
                                  await deleteSessaoCiclo(sessao.id);
                                  setSessoes((prev) => prev.filter((s) => s.id !== sessao.id));
                                  toast.success('Bloco removido.');
                                });
                              }}
                              className="h-8 w-8 rounded-full border border-border text-muted-foreground hover:text-destructive"
                              title="Excluir bloco"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-secondary/10 space-y-3">
                      <p className="text-sm font-bold text-foreground">
                        Nenhum bloco nesta visualização.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setWizardOpen(true)}
                          className="h-9 px-4 text-xs font-bold bg-emerald-500 text-white rounded-xl gap-1.5"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Gerar Planejamento Automático</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAdicionarBlocoManual}
                          className="h-9 px-4 text-xs font-bold rounded-xl gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Montar do Zero (+ Bloco)</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdicionarBlocoManual}
                disabled={isPending}
                className="w-full h-10 rounded-xl border-dashed border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Disciplina à Sequência</span>
              </Button>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: GRÁFICO DE DISTRIBUIÇÃO DO CICLO */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6 sticky top-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Distribuição do Ciclo
          </span>

          {renderDonutChart()}

          <div className="space-y-2.5 pt-2 border-t border-border/60">
            {dadosCiclo.fatias.length > 0 ? (
              dadosCiclo.fatias.map((fatia) => (
                <div
                  key={fatia.nome}
                  className="flex items-center justify-between gap-3 text-xs py-1"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: fatia.cor }}
                    />
                    <span className="font-medium text-foreground truncate">
                      {fatia.nome}
                    </span>
                  </div>
                  <span className="font-mono text-muted-foreground whitespace-nowrap text-[11px]">
                    {formatarMinutosHoras(fatia.minutosConcluidos)} /{' '}
                    <strong className="text-foreground">
                      {formatarMinutosHoras(fatia.minutosPlanejados)}
                    </strong>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Adicione disciplinas ao ciclo para visualizar a proporção de tempo.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ASSISTENTE DE 4 ETAPAS */}
      <PlanejamentoWizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        disciplinasDoPlano={disciplinasDoPlano}
        sessoesCicloAtivo={sessoesCicloAtivo}
        planoAtivo={planoAtivo}
        sugerirTopicosAuto={sugerirTopicosAuto}
        onCreated={(novos, idsRemovidos, formatoEscolhido) => {
          setSessoes((prev) => [
            ...prev.filter((s) => !idsRemovidos.includes(s.id)),
            ...novos,
          ]);
          setGroupBy(formatoEscolhido === 'quadro' ? 'dia' : 'sequencia');
        }}
      />
    </div>
  );
}