'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DashboardListItem } from '@/components/ui/DashboardListItem';
import { updateRevisaoStatus, toggleTarefa, toggleConclusaoSessao } from '@/app/actions';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
  revisaoPertenceAoPlano,
  limparTagPlano,
} from '@/lib/plano-ativo';
import {
  type SessaoEstudo,
  type Tarefa,
  type Revisao,
  type StudyGoal,
  type Lembrete,
} from '@/lib/types';
import {
  CalendarCheck,
  ArrowRight,
  RotateCcw,
  Sparkles,
  CheckCheck,
  Clock,
  Target,
  CheckSquare,
  Quote,
  Plus,
  Flame,
  ChevronLeft,
  ChevronRight,
  Play,
  MoreVertical,
  BookOpen,
  Scale,
  PenLine,
  Check,
  Settings,
  Bell,
  Hourglass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type DashboardData = {
  todasSessoes: SessaoEstudo[];
  tarefasPendentes: Tarefa[];
  revisoes: Revisao[];
  lembretes: Lembrete[];
  sessoesDeHoje: SessaoEstudo[];
  sessoesConcluidasTotal: number;
  revisoesDeHoje: Revisao[];
  studyGoals: StudyGoal[];
  userName?: string;
};

const MOTIVATIONAL_QUOTES = [
  { text: 'Que sua vontade de vencer supere seu medo de falhar.', author: 'Foco Total' },
  { text: 'Obstáculos são aquelas coisas assustadoras que você vê quando tira os olhos do seu objetivo.', author: 'Henry Ford' },
  { text: 'A disciplina é a ponte entre metas e conquistas.', author: 'Jim Rohn' },
  { text: 'Você não precisa ser brilhante para ser aprovado, você só precisa ser constante.', author: 'William Douglas' },
  { text: 'Não espere por circunstâncias ideais. Elas nunca chegam. Comece onde você está.', author: 'Sêneca' },
];

const DIAS_SEG_A_DOM = [
  { curto: 'SEG', completo: 'Segunda-feira' },
  { curto: 'TER', completo: 'Terça-feira' },
  { curto: 'QUA', completo: 'Quarta-feira' },
  { curto: 'QUI', completo: 'Quinta-feira' },
  { curto: 'SEX', completo: 'Sexta-feira' },
  { curto: 'SÁB', completo: 'Sábado' },
  { curto: 'DOM', completo: 'Domingo' },
];

function extrairMinutosSessao(diario: string | null): number {
  if (diario) {
    const match = diario.match(/⏱️\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const hrs = parseInt(match[1], 10) || 0;
      const mins = parseInt(match[2], 10) || 0;
      const secs = parseInt(match[3] || '0', 10) || 0;
      return hrs * 60 + mins + Math.round(secs / 60);
    }
  }
  return 50;
}

function formatarMinutos(min: number): string {
  if (min <= 0) return '0h00min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m.toString().padStart(2, '0')}min`;
}

function formatarMinutosCurto(min: number): string {
  if (min <= 0) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}min` : ''}` : `${m}min`;
}

function getMondayOfCurrentWeek(baseDate: Date, offsetWeeks = 0): Date {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday - offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const supabase = createClient();
  const { planoAtivo } = usePlanoAtivo();

  // -------------------------------------------------------------
  // FILTRO AUTOMÁTICO PELO PLANO ATIVO SELECIONADO NA SIDEBAR
  // -------------------------------------------------------------
  const sessoesDoPlano = useMemo(
    () => data.todasSessoes.filter((s) => sessaoPertenceAoPlano(s, planoAtivo)),
    [data.todasSessoes, planoAtivo]
  );

  const revisoesHojeDoPlano = useMemo(
    () =>
      data.revisoesDeHoje.filter((r) =>
        revisaoPertenceAoPlano(r, planoAtivo, sessoesDoPlano)
      ),
    [data.revisoesDeHoje, planoAtivo, sessoesDoPlano]
  );

  const [streakOffsetDays, setStreakOffsetDays] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeklyTableMode, setWeeklyTableMode] = useState<'tempo' | 'questoes'>('tempo');
  const [tempoTab, setTempoTab] = useState<'hoje' | 'semana' | 'mes' | 'total'>('hoje');

  const [metaHorasSemana, setMetaHorasSemana] = useState<number>(7.5);
  const [metaQuestoesSemana, setMetaQuestoesSemana] = useState<number>(150);

  const [desafioNome, setDesafioNome] = useState<string>('');
  const [desafioData, setDesafioData] = useState<string>('');

  // Sincroniza o card "Próximo Desafio" com o Plano Ativo
  useEffect(() => {
    if (planoAtivo) {
      setDesafioNome(planoAtivo.nome);
      setDesafioData(planoAtivo.data_prova ? planoAtivo.data_prova.split('T')[0] : '');
    } else {
      const savedDesafioNome = localStorage.getItem('hub_desafio_nome');
      const savedDesafioData = localStorage.getItem('hub_desafio_data');
      if (savedDesafioNome) setDesafioNome(savedDesafioNome);
      if (savedDesafioData) setDesafioData(savedDesafioData);
    }
  }, [planoAtivo]);

  useEffect(() => {
    const savedHoras = localStorage.getItem('hub_meta_horas_semana');
    const savedQuestoes = localStorage.getItem('hub_meta_questoes_semana');
    if (savedHoras) setMetaHorasSemana(parseFloat(savedHoras) || 7.5);
    if (savedQuestoes) setMetaQuestoesSemana(parseInt(savedQuestoes, 10) || 150);
  }, []);

  const salvarMetasSemanais = (horas: number, questoes: number) => {
    setMetaHorasSemana(horas);
    setMetaQuestoesSemana(questoes);
    localStorage.setItem('hub_meta_horas_semana', String(horas));
    localStorage.setItem('hub_meta_questoes_semana', String(questoes));
    toast.success('Metas semanais atualizadas!');
  };

  const salvarDesafio = (nome: string, dataProva: string) => {
    setDesafioNome(nome);
    setDesafioData(dataProva);
    localStorage.setItem('hub_desafio_nome', nome);
    localStorage.setItem('hub_desafio_data', dataProva);
    toast.success('Próximo desafio atualizado!');
  };

  // -------------------------------------------------------------
  // 1. ESTRATIFICAÇÃO DE TEMPO E KPIS DO PLANO ATIVO
  // -------------------------------------------------------------
  const {
    estratificacaoTempo,
    kpiDesempenhoTotal,
    kpiDesempenhoMes,
    kpiEditalPerc,
    kpiEditalTexto,
    kpiEditalMes,
  } = useMemo(() => {
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const currentMonth = now.getUTCMonth();
    const currentYear = now.getUTCFullYear();

    const segundaAtual = getMondayOfCurrentWeek(now, 0);
    const domingoAtual = new Date(segundaAtual);
    domingoAtual.setDate(segundaAtual.getDate() + 6);
    const segundaISO = segundaAtual.toISOString().split('T')[0];
    const domingoISO = domingoAtual.toISOString().split('T')[0];

    let minutosHoje = 0;
    let minutosSemana = 0;
    let minutosMes = 0;
    let minutosTotal = 0;

    const diasAtivosSemana = new Set<string>();
    const diasAtivosMes = new Set<string>();
    const diasAtivosTotal = new Set<string>();
    let blocosHoje = 0;

    let acertosTotal = 0;
    let questoesTotal = 0;
    let acertosMes = 0;
    let questoesMes = 0;

    const totalTopicos = sessoesDoPlano.length;
    const topicosConcluidos = sessoesDoPlano.filter((s) => s.concluida).length;
    let topicosMes = 0;

    sessoesDoPlano.forEach((s) => {
      if (!s.concluida) return;

      const dataStr = s.data_estudo ? s.data_estudo.split('T')[0] : null;
      const dataObj = dataStr ? new Date(dataStr + 'T12:00:00Z') : null;
      const isThisMonth =
        dataObj &&
        dataObj.getUTCMonth() === currentMonth &&
        dataObj.getUTCFullYear() === currentYear;
      const isThisWeek = Boolean(dataStr && dataStr >= segundaISO && dataStr <= domingoISO);
      const isToday = dataStr === todayISO;

      const ac = Number(s.questoes_acertos) || 0;
      const tot = Number(s.questoes_total) || 0;
      const mins = extrairMinutosSessao(s.diario_de_bordo);

      minutosTotal += mins;
      acertosTotal += ac;
      questoesTotal += tot;
      if (dataStr) diasAtivosTotal.add(dataStr);

      if (isToday) {
        minutosHoje += mins;
        blocosHoje += 1;
      }

      if (isThisWeek && dataStr) {
        minutosSemana += mins;
        diasAtivosSemana.add(dataStr);
      }

      if (isThisMonth && dataStr) {
        minutosMes += mins;
        acertosMes += ac;
        questoesMes += tot;
        topicosMes += 1;
        diasAtivosMes.add(dataStr);
      }
    });

    const percTotal = questoesTotal > 0 ? Math.round((acertosTotal / questoesTotal) * 100) : 0;
    const percMes = questoesMes > 0 ? Math.round((acertosMes / questoesMes) * 100) : 0;
    const percEdital = totalTopicos > 0 ? Math.round((topicosConcluidos / totalTopicos) * 100) : 0;

    return {
      estratificacaoTempo: {
        hoje: { texto: formatarMinutosCurto(minutosHoje), min: minutosHoje, sub: `${blocosHoje} ${blocosHoje === 1 ? 'bloco' : 'blocos'}` },
        semana: { texto: formatarMinutosCurto(minutosSemana), min: minutosSemana, sub: `${diasAtivosSemana.size}/7 dias ativos` },
        mes: { texto: formatarMinutosCurto(minutosMes), min: minutosMes, sub: `${diasAtivosMes.size} dias ativos` },
        total: { texto: formatarMinutosCurto(minutosTotal), min: minutosTotal, sub: `${diasAtivosTotal.size} dias estudados` },
      },
      kpiDesempenhoTotal: { perc: percTotal, total: questoesTotal },
      kpiDesempenhoMes: { perc: percMes, total: questoesMes },
      kpiEditalPerc: percEdital,
      kpiEditalTexto: `${topicosConcluidos} de ${totalTopicos} tópicos`,
      kpiEditalMes: topicosMes,
    };
  }, [sessoesDoPlano]);

  // -------------------------------------------------------------
  // 2. CONSTÂNCIA NOS ESTUDOS DO PLANO ATIVO (30 DIAS)
  // -------------------------------------------------------------
  const { diasConstancia, periodoLabel, statusConstancia } = useMemo(() => {
    const datasEstudadas = new Set(
      sessoesDoPlano
        .filter((s) => s.concluida && s.data_estudo)
        .map((s) => s.data_estudo!.split('T')[0])
    );

    const hoje = new Date();
    const fimPeriodo = new Date(hoje);
    fimPeriodo.setDate(hoje.getDate() - streakOffsetDays);

    const inicioPeriodo = new Date(fimPeriodo);
    inicioPeriodo.setDate(fimPeriodo.getDate() - 29);

    const dias: { dateISO: string; label: string; studied: boolean; isToday: boolean }[] = [];
    const todayISO = hoje.toISOString().split('T')[0];

    for (let i = 0; i < 30; i++) {
      const d = new Date(inicioPeriodo);
      d.setDate(inicioPeriodo.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dia = d.getDate().toString().padStart(2, '0');
      const mes = (d.getMonth() + 1).toString().padStart(2, '0');

      dias.push({
        dateISO: iso,
        label: `${dia}/${mes}`,
        studied: datasEstudadas.has(iso),
        isToday: iso === todayISO,
      });
    }

    const fmtCurto = (d: Date) =>
      `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    let streakAtual = 0;
    const checkDate = new Date(hoje);
    while (datasEstudadas.has(checkDate.toISOString().split('T')[0])) {
      streakAtual++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let diasSemEstudo = 0;
    if (streakAtual === 0) {
      const tempDate = new Date(hoje);
      while (diasSemEstudo < 365 && !datasEstudadas.has(tempDate.toISOString().split('T')[0])) {
        diasSemEstudo++;
        tempDate.setDate(tempDate.getDate() - 1);
      }
    }

    return {
      diasConstancia: dias,
      periodoLabel: `${fmtCurto(inicioPeriodo)} ~ ${fmtCurto(fimPeriodo)}`,
      statusConstancia: { streakAtual, diasSemEstudo },
    };
  }, [sessoesDoPlano, streakOffsetDays]);

  // -------------------------------------------------------------
  // 3. METAS SEMANAIS + ÚLTIMAS 5 SEMANAS DO PLANO ATIVO
  // -------------------------------------------------------------
  const { metasSemanaAtual, historicoCincoSemanas } = useMemo(() => {
    const metaMinutos = Math.round(metaHorasSemana * 60);
    const hoje = new Date();
    const segundaAtual = getMondayOfCurrentWeek(hoje, 0);

    const getSomaIntervalo = (inicio: Date, fim: Date) => {
      const iniISO = inicio.toISOString().split('T')[0];
      const fimISO = fim.toISOString().split('T')[0];
      let mins = 0;
      let questoes = 0;

      sessoesDoPlano.forEach((s) => {
        if (!s.concluida || !s.data_estudo) return;
        const dISO = s.data_estudo.split('T')[0];
        if (dISO >= iniISO && dISO <= fimISO) {
          mins += extrairMinutosSessao(s.diario_de_bordo);
          questoes += Number(s.questoes_total) || 0;
        }
      });
      return { mins, questoes };
    };

    const domingoAtual = new Date(segundaAtual);
    domingoAtual.setDate(segundaAtual.getDate() + 6);
    const atual = getSomaIntervalo(segundaAtual, domingoAtual);

    const percHoras = metaMinutos > 0 ? Math.min(100, Math.round((atual.mins / metaMinutos) * 100)) : 0;
    const percQuestoes =
      metaQuestoesSemana > 0 ? Math.min(100, Math.round((atual.questoes / metaQuestoesSemana) * 100)) : 0;

    const cincoSemanas: { label: string; perc: number; bateu: boolean; isCurrent: boolean }[] = [];
    const fmtDiaMes = (d: Date) =>
      `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    for (let i = 4; i >= 0; i--) {
      const ini = new Date(segundaAtual);
      ini.setDate(segundaAtual.getDate() - i * 7);
      const fim = new Date(ini);
      fim.setDate(ini.getDate() + 6);

      const { mins } = getSomaIntervalo(ini, fim);
      const p = metaMinutos > 0 ? Math.min(100, Math.round((mins / metaMinutos) * 100)) : 0;

      cincoSemanas.push({
        label: i === 0 ? 'Semana Atual' : `${fmtDiaMes(ini)} - ${fmtDiaMes(fim)}`,
        perc: p,
        bateu: p >= 100,
        isCurrent: i === 0,
      });
    }

    return {
      metasSemanaAtual: {
        minutosEstudados: atual.mins,
        metaMinutos,
        percHoras,
        questoesResolvidas: atual.questoes,
        percQuestoes,
      },
      historicoCincoSemanas: cincoSemanas,
    };
  }, [sessoesDoPlano, metaHorasSemana, metaQuestoesSemana]);

  // -------------------------------------------------------------
  // 4. TABELA "ESTUDO SEMANAL" DE SEGUNDA A DOMINGO DO PLANO ATIVO
  // -------------------------------------------------------------
  const { linhasTabelaSemanal, labelSemanaTabela, resumoSemanal } = useMemo(() => {
    const hoje = new Date();
    const todayISO = hoje.toISOString().split('T')[0];
    const segundaBase = getMondayOfCurrentWeek(hoje, weekOffset);
    const domingoBase = new Date(segundaBase);
    domingoBase.setDate(segundaBase.getDate() + 6);

    const linhas: {
      curto: string;
      completo: string;
      dataCurta: string;
      dateISO: string;
      isToday: boolean;
      minutos: number;
      blocos: number;
      acertos: number;
      questoes: number;
      percAcerto: number | null;
    }[] = [];

    let somaMinutos = 0;
    let somaBlocos = 0;
    let somaAcertos = 0;
    let somaQuestoes = 0;
    let diasComEstudo = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(segundaBase);
      d.setDate(segundaBase.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dataCurta = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

      let minsDia = 0;
      let blocosDia = 0;
      let acDia = 0;
      let qDia = 0;

      sessoesDoPlano.forEach((s) => {
        if (s.concluida && s.data_estudo && s.data_estudo.split('T')[0] === iso) {
          minsDia += extrairMinutosSessao(s.diario_de_bordo);
          blocosDia += 1;
          acDia += Number(s.questoes_acertos) || 0;
          qDia += Number(s.questoes_total) || 0;
        }
      });

      if (minsDia > 0 || qDia > 0) diasComEstudo += 1;
      somaMinutos += minsDia;
      somaBlocos += blocosDia;
      somaAcertos += acDia;
      somaQuestoes += qDia;

      linhas.push({
        curto: DIAS_SEG_A_DOM[i].curto,
        completo: DIAS_SEG_A_DOM[i].completo,
        dataCurta,
        dateISO: iso,
        isToday: iso === todayISO,
        minutos: minsDia,
        blocos: blocosDia,
        acertos: acDia,
        questoes: qDia,
        percAcerto: qDia > 0 ? Math.round((acDia / qDia) * 100) : null,
      });
    }

    const fmt = (d: Date) =>
      `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    const percSemanaGeral = somaQuestoes > 0 ? Math.round((somaAcertos / somaQuestoes) * 100) : 0;
    const mediaMinutosDia = diasComEstudo > 0 ? Math.round(somaMinutos / diasComEstudo) : 0;

    return {
      linhasTabelaSemanal: linhas,
      labelSemanaTabela: `${fmt(segundaBase)} ~ ${fmt(domingoBase)}`,
      resumoSemanal: {
        somaMinutos,
        somaBlocos,
        mediaMinutosDia,
        somaAcertos,
        somaQuestoes,
        percSemanaGeral,
      },
    };
  }, [sessoesDoPlano, weekOffset]);

  // -------------------------------------------------------------
  // 5. DISTRIBUIÇÃO DE TEMPO POR MATÉRIA DO PLANO ATIVO
  // -------------------------------------------------------------
  const distribuicaoMaterias = useMemo(() => {
    const hoje = new Date();
    const todayISO = hoje.toISOString().split('T')[0];
    const segundaAtual = getMondayOfCurrentWeek(hoje, 0);
    const segundaISO = segundaAtual.toISOString().split('T')[0];
    const mesAtual = hoje.getUTCMonth();
    const anoAtual = hoje.getUTCFullYear();

    const mapa: Record<string, number> = {};
    let somaTotal = 0;

    sessoesDoPlano.forEach((s) => {
      if (!s.concluida) return;
      const dStr = s.data_estudo ? s.data_estudo.split('T')[0] : null;
      if (!dStr && tempoTab !== 'total') return;

      let incluir = false;
      if (tempoTab === 'hoje') incluir = dStr === todayISO;
      else if (tempoTab === 'semana') incluir = Boolean(dStr && dStr >= segundaISO && dStr <= todayISO);
      else if (tempoTab === 'mes') {
        const dObj = dStr ? new Date(dStr + 'T12:00:00Z') : null;
        incluir = Boolean(dObj && dObj.getUTCMonth() === mesAtual && dObj.getUTCFullYear() === anoAtual);
      } else {
        incluir = true;
      }

      if (incluir) {
        const mins = extrairMinutosSessao(s.diario_de_bordo);
        const nome = s.materia_nome?.trim() || 'Outras Disciplinas';
        mapa[nome] = (mapa[nome] || 0) + mins;
        somaTotal += mins;
      }
    });

    return Object.entries(mapa)
      .map(([materia, minutos]) => ({
        materia,
        minutos,
        perc: somaTotal > 0 ? Math.round((minutos / somaTotal) * 100) : 0,
      }))
      .sort((a, b) => b.minutos - a.minutos);
  }, [sessoesDoPlano, tempoTab]);

  // -------------------------------------------------------------
  // 6. FILA DO PLANEJAMENTO DO DIA DO PLANO ATIVO
  // -------------------------------------------------------------
  const { proximoEstudo, filaProximosEstudos } = useMemo(() => {
    const pendentes = [...sessoesDoPlano]
      .filter((s) => !s.concluida)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    return {
      proximoEstudo: pendentes[0] || null,
      filaProximosEstudos: pendentes.slice(1, 4),
    };
  }, [sessoesDoPlano]);

  const handleIniciarEstudo = (sessao: SessaoEstudo) => {
    window.dispatchEvent(
      new CustomEvent('open-registro-estudo', {
        detail: {
          disciplinaId: sessao.disciplina_id ? String(sessao.disciplina_id) : undefined,
          materiaNome: sessao.materia_nome,
          topico: limparTagPlano(sessao.foco_sugerido),
          tempoFormatado: '00:45:00',
        },
      })
    );
  };

  const handleConcluirRapido = async (sessao: SessaoEstudo) => {
    const res = await toggleConclusaoSessao(sessao.id, true);
    if (res?.error) toast.error(res.error);
    else toast.success(`"${sessao.materia_nome}" concluída!`);
  };

  const diasParaProva = useMemo(() => {
    if (!desafioData) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const alvo = new Date(desafioData + 'T00:00:00');
    return Math.ceil((alvo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  }, [desafioData]);

  const nomeUsuario = data.userName || 'Hélio';
  const hojeDataFormatada = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  }, []);

  const quoteDoDia = useMemo(() => {
    const diaDoAno = Math.floor(
      (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return MOTIVATIONAL_QUOTES[diaDoAno % MOTIVATIONAL_QUOTES.length];
  }, []);

  return (
    <div className="space-y-5">
      {/* CABEÇALHO SUPERIOR COM SELO DO PLANO ATIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Bom te ver, {nomeUsuario}
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {planoAtivo
              ? `Exibindo métricas, ciclo e revisões exclusivos do plano ${planoAtivo.nome}`
              : 'Visão unificada de todos os seus planos de estudo'}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-registro-estudo'))}
          className="self-start sm:self-auto h-9 px-4 text-xs font-bold gap-2 shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Estudo</span>
        </Button>
      </div>

      {/* TOPO EM 4 COLUNAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="flex flex-col justify-between p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tempo de Estudo
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {estratificacaoTempo.total.texto}
            </span>
            <span className="text-[11px] text-muted-foreground">no plano</span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-border/50 text-[10px]">
            <div>
              <span className="text-muted-foreground block">Hoje:</span>
              <strong className="text-foreground">{estratificacaoTempo.hoje.texto}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Semana:</span>
              <strong className="text-foreground">{estratificacaoTempo.semana.texto}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block">Mês:</span>
              <strong className="text-foreground">{estratificacaoTempo.mes.texto}</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Desempenho
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {kpiDesempenhoTotal.perc}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({kpiDesempenhoTotal.total} questões)
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/50 block">
            Neste mês: <strong className="text-foreground">{kpiDesempenhoMes.perc}% ({kpiDesempenhoMes.total} q)</strong>
          </span>
        </div>

        <div className="flex flex-col justify-between p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Progresso no Edital
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {kpiEditalPerc}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({kpiEditalTexto})
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/50 block">
            Neste mês: <strong className="text-foreground">{kpiEditalMes} tópicos concluídos</strong>
          </span>
        </div>

        <div className="flex flex-col justify-between p-4 rounded-2xl bg-card border border-border shadow-xs">
          <Quote className="w-5 h-5 text-emerald-500/60" />
          <p className="text-xs text-muted-foreground italic text-center my-2 px-2 leading-relaxed">
            &ldquo;{quoteDoDia.text}&rdquo;
          </p>
          <span className="text-[10px] text-muted-foreground/70 text-right font-semibold">
            — {quoteDoDia.author}
          </span>
        </div>
      </div>

      {/* CONSTÂNCIA NOS ESTUDOS + ESTRATIFICAÇÃO */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Constância nos Estudos {planoAtivo ? `— ${planoAtivo.nome}` : ''}
          </span>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
            <button
              type="button"
              onClick={() => setStreakOffsetDays((prev) => prev + 30)}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{periodoLabel}</span>
            <button
              type="button"
              onClick={() => setStreakOffsetDays((prev) => Math.max(0, prev - 30))}
              disabled={streakOffsetDays === 0}
              className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Flame
              className={cn(
                'w-4 h-4',
                statusConstancia.streakAtual > 0 ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
              )}
            />
            {statusConstancia.streakAtual > 0 ? (
              <span className="text-muted-foreground">
                Você está há <strong className="text-emerald-500">{statusConstancia.streakAtual} {statusConstancia.streakAtual === 1 ? 'dia' : 'dias'}</strong> seguidos estudando neste plano!
              </span>
            ) : (
              <span className="text-muted-foreground">
                <strong className="text-emerald-500">{statusConstancia.diasSemEstudo} dias</strong> sem estudo neste plano. Bastam <strong className="text-emerald-500">20 minutos</strong> para o dia contar.
              </span>
            )}
          </div>

          <Link href="/ciclo" className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Ver detalhes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 no-scrollbar">
          {diasConstancia.map((d) => (
            <div
              key={d.dateISO}
              title={`Dia ${d.label}: ${d.studied ? 'Estudo registrado ✓' : 'Sem registro'}`}
              className={cn(
                'w-6 h-7 sm:w-7 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold transition-all border',
                d.studied
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-secondary/40 border-border/70 text-rose-500/70',
                d.isToday && 'ring-2 ring-emerald-500'
              )}
            >
              {d.studied ? '●' : '✕'}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/60">
          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Hoje</span>
              <span className="text-sm font-extrabold text-foreground">{estratificacaoTempo.hoje.texto}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background text-muted-foreground">
              {estratificacaoTempo.hoje.sub}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Semana (Seg-Dom)</span>
              <span className="text-sm font-extrabold text-emerald-500">{estratificacaoTempo.semana.texto}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background text-muted-foreground">
              {estratificacaoTempo.semana.sub}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Neste Mês</span>
              <span className="text-sm font-extrabold text-foreground">{estratificacaoTempo.mes.texto}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background text-muted-foreground">
              {estratificacaoTempo.mes.sub}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-secondary/30 border border-border/50 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">Total no Plano</span>
              <span className="text-sm font-extrabold text-primary">{estratificacaoTempo.total.texto}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background text-muted-foreground">
              {estratificacaoTempo.total.sub}
            </span>
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL EM 2 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* COLUNA DA ESQUERDA (7 COLS) */}
        <div className="lg:col-span-7 space-y-5">
          {/* 1. PLANEJAMENTO DO DIA DO PLANO ATIVO */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="font-bold uppercase tracking-wider text-muted-foreground">
                  Planejamento do Dia
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="font-semibold text-emerald-500 capitalize">
                  {hojeDataFormatada}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-secondary stroke-current"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 stroke-current transition-all duration-500"
                      strokeDasharray={`${kpiEditalPerc}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
                <div className="text-xs leading-tight">
                  <span className="font-bold text-foreground block">{kpiEditalPerc}%</span>
                  <span className="text-[10px] text-muted-foreground">do ciclo concluído</span>
                </div>
              </div>
            </div>

            {proximoEstudo ? (
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="p-3 rounded-xl bg-secondary border border-border text-foreground flex-shrink-0 mt-0.5">
                    <Scale className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Próximo no Plano
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                      {proximoEstudo.materia_nome || 'Disciplina do Ciclo'}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                      <span>{limparTagPlano(proximoEstudo.foco_sugerido) || 'Tópico programado'}</span>
                      <PenLine className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>45min</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <Button
                    onClick={() => handleIniciarEstudo(proximoEstudo)}
                    className="h-9 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs gap-2 shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Iniciar Estudo</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem onClick={() => handleConcluirRapido(proximoEstudo)} className="gap-2 cursor-pointer">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Marcar como concluído</span>
                      </DropdownMenuItem>
                      {proximoEstudo.disciplina_id && (
                        <Link href={`/disciplinas?page=${proximoEstudo.disciplina_id}`}>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Abrir caderno da disciplina</span>
                          </DropdownMenuItem>
                        </Link>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-secondary/10 space-y-2">
                <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">
                  Nenhum bloco pendente para {planoAtivo ? planoAtivo.nome : 'este plano'}!
                </p>
                <Link href="/ciclo">
                  <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl mt-1">
                    Montar / Ver Ciclo deste Plano
                  </Button>
                </Link>
              </div>
            )}

            {filaProximosEstudos.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Próximos Estudos
                  </span>
                  <Link href="/ciclo">
                    <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-full px-3">
                      Ver planejamento completo &gt;
                    </Button>
                  </Link>
                </div>

                <div className="divide-y divide-border border-t border-border/60">
                  {filaProximosEstudos.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-secondary/20 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-secondary text-muted-foreground flex-shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-foreground truncate">
                            {item.materia_nome || 'Matéria'}
                          </h4>
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <span>
                              {limparTagPlano(item.foco_sugerido) || `Bloco #${item.ordem.toString().padStart(2, '0')}`}
                            </span>
                            <PenLine className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          45min
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => handleIniciarEstudo(item)} className="gap-2 cursor-pointer">
                              <Play className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Registrar estudo</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleConcluirRapido(item)} className="gap-2 cursor-pointer">
                              <Check className="w-3.5 h-3.5" />
                              <span>Concluir rapidamente</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. REVISÕES DO DIA DO PLANO ATIVO */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Revisões do Dia {planoAtivo ? `(${planoAtivo.nome})` : ''}
            </span>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  {revisoesHojeDoPlano.length > 0
                    ? `${revisoesHojeDoPlano.length} revisões para hoje`
                    : 'Sem revisões neste plano'}
                </span>
              </div>
              <Link href="/revisoes">
                <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-full px-3">
                  Ver todas as revisões &gt;
                </Button>
              </Link>
            </div>

            {revisoesHojeDoPlano.length > 0 ? (
              <div className="space-y-1.5">
                {revisoesHojeDoPlano.map((r) => (
                  <DashboardListItem
                    key={r.id}
                    id={r.id}
                    href="/revisoes"
                    type="revisao"
                    action={updateRevisaoStatus}
                  >
                    {r.materia_nome}
                  </DashboardListItem>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center rounded-xl bg-secondary/20 border border-border/50 space-y-1.5">
                <RotateCcw className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">Tudo em dia!</p>
                <p className="text-[11px] text-muted-foreground">
                  Você não tem revisões agendadas para hoje neste plano.
                </p>
              </div>
            )}
          </div>

          {/* 3. LEMBRETES & TAREFAS */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Lembretes & Tarefas
              </span>
              <Link href="/calendario">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] text-emerald-500">
                  + Criar lembrete
                </Button>
              </Link>
            </div>

            {data.tarefasPendentes.length > 0 || data.lembretes.length > 0 ? (
              <div className="space-y-2">
                {data.lembretes.slice(0, 3).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/60 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-medium">{l.titulo}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(l.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
                {data.tarefasPendentes.slice(0, 4).map((t) => (
                  <DashboardListItem
                    key={t.id}
                    id={t.id}
                    href="/tarefas"
                    type="tarefa"
                    action={(id, status) => toggleTarefa(id, status)}
                  >
                    {t.title}
                  </DashboardListItem>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center rounded-xl bg-secondary/20 border border-border/50 space-y-2">
                <CheckSquare className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">Ainda não há lembretes por aqui</p>
                <p className="text-[11px] text-muted-foreground">
                  Anotar datas de provas e boletos ajuda a manter o foco!
                </p>
                <Link href="/calendario" className="inline-block pt-1">
                  <Button size="sm" className="h-8 px-4 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">
                    + Criar lembrete
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DA DIREITA (5 COLS) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. PRÓXIMO DESAFIO (SINCRONIZADO COM O PLANO ATIVO) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 flex-shrink-0 mt-0.5">
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {desafioNome && diasParaProva !== null ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                        Prova do Plano Ativo
                      </span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-[11px] text-muted-foreground hover:text-foreground underline">
                            Alterar data
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3.5 space-y-3 bg-card border-border text-xs" align="end">
                          <h4 className="font-bold">Definir Data da Prova</h4>
                          <input
                            type="text"
                            value={desafioNome}
                            onChange={(e) => setDesafioNome(e.target.value)}
                            placeholder="Nome da Prova"
                            className="h-9 w-full px-3 rounded-lg bg-background border border-border"
                          />
                          <input
                            type="date"
                            value={desafioData}
                            onChange={(e) => setDesafioData(e.target.value)}
                            className="h-9 w-full px-3 rounded-lg bg-background border border-border"
                          />
                          <Button
                            size="sm"
                            onClick={() => salvarDesafio(desafioNome, desafioData)}
                            className="w-full h-8 text-xs font-bold bg-emerald-500 text-white"
                          >
                            Salvar Prova
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <h3 className="text-sm font-bold text-foreground truncate">{desafioNome}</h3>
                    <p className="text-xs text-muted-foreground">
                      {diasParaProva > 0 ? (
                        <>
                          Faltam <strong className="text-emerald-500 text-sm">{diasParaProva} dias</strong> para a sua prova!
                        </>
                      ) : diasParaProva === 0 ? (
                        <strong className="text-emerald-500">É hoje! Boa prova!</strong>
                      ) : (
                        <span>Prova realizada há {Math.abs(diasParaProva)} dias.</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">
                      {planoAtivo ? planoAtivo.nome : 'Qual é o seu próximo desafio?'}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Acompanhe a contagem regressiva para sua próxima prova.{' '}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="text-emerald-500 font-semibold hover:underline inline-flex items-center gap-0.5">
                            Definir data da prova +
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3.5 space-y-3 bg-card border-border text-xs" align="end">
                          <h4 className="font-bold">Definir Próxima Prova</h4>
                          <input
                            type="text"
                            value={desafioNome}
                            onChange={(e) => setDesafioNome(e.target.value)}
                            placeholder="Nome do Concurso"
                            className="h-9 w-full px-3 rounded-lg bg-background border border-border"
                          />
                          <input
                            type="date"
                            value={desafioData}
                            onChange={(e) => setDesafioData(e.target.value)}
                            className="h-9 w-full px-3 rounded-lg bg-background border border-border"
                          />
                          <Button
                            size="sm"
                            onClick={() => salvarDesafio(desafioNome, desafioData)}
                            className="w-full h-8 text-xs font-bold bg-emerald-500 text-white"
                          >
                            Salvar Prova
                          </Button>
                        </PopoverContent>
                      </Popover>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. METAS SEMANAIS + SUAS ÚLTIMAS 5 SEMANAS */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Metas Semanais
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                    title="Configurar Metas da Semana"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3.5 space-y-3 bg-card border-border text-xs" align="end">
                  <h4 className="font-bold text-foreground">Ajustar Metas da Semana</h4>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Horas por semana:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={metaHorasSemana}
                      onChange={(e) => setMetaHorasSemana(parseFloat(e.target.value) || 1)}
                      className="h-8 w-full px-2.5 rounded-lg bg-background border border-border font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground block mb-1">Questões por semana:</label>
                    <input
                      type="number"
                      min="10"
                      value={metaQuestoesSemana}
                      onChange={(e) => setMetaQuestoesSemana(parseInt(e.target.value, 10) || 10)}
                      className="h-8 w-full px-2.5 rounded-lg bg-background border border-border font-bold"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => salvarMetasSemanais(metaHorasSemana, metaQuestoesSemana)}
                    className="w-full h-8 text-xs font-bold bg-emerald-500 text-white"
                  >
                    Salvar Metas
                  </Button>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Horas de Estudo
                  </span>
                  <span className="font-bold text-emerald-500">
                    {formatarMinutos(metasSemanaAtual.minutosEstudados)}
                  </span>{' '}
                  <span className="text-muted-foreground text-[11px]">
                    / {formatarMinutos(metasSemanaAtual.metaMinutos)} planejadas
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">{metasSemanaAtual.percHoras}%</span>
                  <span className="text-[10px] text-muted-foreground block">da meta</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${metasSemanaAtual.percHoras}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Questões Resolvidas
                  </span>
                  <span className="font-bold text-emerald-500">
                    {metasSemanaAtual.questoesResolvidas}
                  </span>{' '}
                  <span className="text-muted-foreground text-[11px]">
                    / {metaQuestoesSemana} esperadas
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">{metasSemanaAtual.percQuestoes}%</span>
                  <span className="text-[10px] text-muted-foreground block">da meta</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${metasSemanaAtual.percQuestoes}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">
                  Suas Últimas Semanas
                </span>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Bateu
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Não bateu
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center">
                {historicoCincoSemanas.map((sem, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-2 rounded-xl flex flex-col items-center justify-end gap-1.5',
                      sem.isCurrent ? 'bg-secondary/60 border border-border' : 'bg-secondary/20'
                    )}
                  >
                    <div className="h-10 w-2 rounded-full bg-secondary flex items-end overflow-hidden">
                      <div
                        className={cn(
                          'w-full rounded-full transition-all',
                          sem.bateu ? 'bg-emerald-500' : 'bg-amber-500'
                        )}
                        style={{ height: `${Math.max(12, sem.perc)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-foreground">{sem.perc}%</span>
                    <span className="text-[9px] text-muted-foreground leading-tight truncate w-full">
                      {sem.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. TABELA DE ESTUDO SEMANAL (SEG A DOM) */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Estudo Semanal (Seg a Dom)
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>{labelSemanaTabela}</span>
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                  disabled={weekOffset === 0}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                {weeklyTableMode === 'tempo' ? 'Visão de carga horária diária' : 'Visão de questões e % de acerto'}
              </span>
              <div className="inline-flex p-0.5 rounded-lg bg-secondary/60 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setWeeklyTableMode('tempo')}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-bold transition-all',
                    weeklyTableMode === 'tempo'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Tempo
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyTableMode('questoes')}
                  className={cn(
                    'px-3 py-1 rounded-md text-[11px] font-bold transition-all',
                    weeklyTableMode === 'questoes'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Questões & %
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 border-b border-border">
                  {weeklyTableMode === 'tempo' ? (
                    <tr>
                      <th className="py-2 px-3">Dia</th>
                      <th className="py-2 px-2">Progresso Diário</th>
                      <th className="py-2 px-3 text-right">Tempo</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-2 px-3">Dia</th>
                      <th className="py-2 px-2 text-center">Questões (C/T)</th>
                      <th className="py-2 px-3 text-right">% Acerto</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-border/60">
                  {linhasTabelaSemanal.map((row) => {
                    const percBarraTempo = Math.min(100, Math.round((row.minutos / 180) * 100));
                    return (
                      <tr
                        key={row.dateISO}
                        className={cn(
                          'transition-colors',
                          row.isToday ? 'bg-emerald-500/[0.06]' : 'hover:bg-secondary/30'
                        )}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'w-8 text-center py-0.5 rounded text-[10px] font-bold',
                                row.isToday
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-secondary text-muted-foreground'
                              )}
                            >
                              {row.curto}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {row.dataCurta}
                            </span>
                          </div>
                        </td>

                        {weeklyTableMode === 'tempo' ? (
                          <>
                            <td className="py-2.5 px-2 w-full">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                    style={{ width: `${percBarraTempo}%` }}
                                  />
                                </div>
                                {row.blocos > 0 && (
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {row.blocos}b
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                              <span className={row.minutos > 0 ? 'text-emerald-400' : 'text-muted-foreground/60'}>
                                {formatarMinutosCurto(row.minutos)}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-2 text-center font-mono">
                              {row.questoes > 0 ? (
                                <span className="font-semibold text-foreground">
                                  <strong className="text-emerald-400">{row.acertos}</strong> / {row.questoes}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/50">0 / 0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              {row.percAcerto !== null ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] px-1.5 py-0 h-5 font-bold',
                                    row.percAcerto >= 80
                                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                      : row.percAcerto >= 60
                                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                                      : 'border-rose-500/50 bg-rose-500/10 text-rose-400'
                                  )}
                                >
                                  {row.percAcerto}%
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/50">—</span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {weeklyTableMode === 'tempo' ? (
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Tempo Total na Semana
                  </span>
                  <span className="text-base font-extrabold text-emerald-500">
                    {formatarMinutos(resumoSemanal.somaMinutos)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Média por Dia Ativo
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatarMinutosCurto(resumoSemanal.mediaMinutosDia)} ({resumoSemanal.somaBlocos} blocos)
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Questões na Semana
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {resumoSemanal.somaQuestoes} questões{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      ({resumoSemanal.somaAcertos} acertos)
                    </span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Desempenho Resumido
                  </span>
                  <span
                    className={cn(
                      'text-base font-extrabold',
                      resumoSemanal.percSemanaGeral >= 80
                        ? 'text-emerald-400'
                        : resumoSemanal.percSemanaGeral >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    )}
                  >
                    {resumoSemanal.percSemanaGeral}% de acerto
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 4. TEMPO POR DISCIPLINA NO PLANO ATIVO */}
          <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tempo por Disciplina
              </span>

              <div className="inline-flex p-0.5 rounded-lg bg-secondary/60 border border-border text-xs">
                {(['hoje', 'semana', 'mes', 'total'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTempoTab(tab)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-all',
                      tempoTab === tab
                        ? 'bg-emerald-500 text-white shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab === 'mes' ? 'Mês' : tab}
                  </button>
                ))}
              </div>
            </div>

            {distribuicaoMaterias.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {distribuicaoMaterias.slice(0, 6).map((item) => (
                  <div key={item.materia} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-[200px]">
                        {item.materia}
                      </span>
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {formatarMinutosCurto(item.minutos)} ({item.perc}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.perc}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center rounded-xl bg-secondary/20 border border-border/50 space-y-2">
                <Hourglass className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">
                  Nenhum tempo de estudo registrado {tempoTab === 'hoje' ? 'hoje' : 'neste período'}.
                </p>
                <p className="text-[11px] text-muted-foreground px-4">
                  Que tal iniciar agora e dar mais um passo rumo à aprovação?
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}