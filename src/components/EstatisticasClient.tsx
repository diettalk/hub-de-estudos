'use client';

import React, { useState, useMemo } from 'react';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
} from '@/lib/plano-ativo';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Target,
  Clock,
  CalendarCheck,
  BookOpen,
  PlayCircle,
  CheckSquare,
  BarChart2,
  Plus,
  Info,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EstatisticasClientProps {
  todasSessoes: SessaoEstudo[];
  disciplinas: Disciplina[];
}

function extrairMinutos(diario: string | null): number {
  if (diario) {
    const match = diario.match(/⏱️\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      return (
        (parseInt(match[1], 10) || 0) * 60 +
        (parseInt(match[2], 10) || 0) +
        Math.round((parseInt(match[3] || '0', 10) || 0) / 60)
      );
    }
  }
  return 50;
}

function extrairPaginasLidas(diario: string | null): number {
  if (!diario) return 0;
  const match = diario.match(/📄\s*Págs:\s*(\d+)\s*a\s*(\d+)/i);
  if (match) {
    const ini = parseInt(match[1], 10) || 0;
    const fim = parseInt(match[2], 10) || 0;
    if (fim >= ini && fim > 0) return fim - ini + (ini > 0 ? 1 : 0);
  }
  return 0;
}

function extrairMinutosVideo(diario: string | null, foco: string | null): number {
  if (!diario && !foco) return 0;
  if (diario && diario.includes('🎥 Vídeo:')) {
    const m = diario.match(/\((\d{1,2}):(\d{2})(?::\d{2})?\s*-\s*(\d{1,2}):(\d{2})(?::\d{2})?\)/);
    if (m) {
      const iniMin = (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
      const fimMin = (parseInt(m[3], 10) || 0) * 60 + (parseInt(m[4], 10) || 0);
      if (fimMin > iniMin) return fimMin - iniMin;
    }
    return extrairMinutos(diario);
  }
  if (foco && foco.includes('[Videoaula]')) {
    return extrairMinutos(diario);
  }
  return 0;
}

function formatarHoras(min: number): string {
  if (min <= 0) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}min` : ''}` : `${m}min`;
}

export function EstatisticasClient({ todasSessoes, disciplinas }: EstatisticasClientProps) {
  const { planoAtivo } = usePlanoAtivo();
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d' | 'inicio'>('30d');

  const sessoesDoPlano = useMemo(
    () => todasSessoes.filter((s) => s.concluida && sessaoPertenceAoPlano(s, planoAtivo)),
    [todasSessoes, planoAtivo]
  );

  // Cálculo do intervalo e métricas completas do Print 2
  const stats = useMemo(() => {
    const hoje = new Date();
    const numDias =
      periodo === '7d' ? 7 : periodo === '30d' ? 30 : periodo === '90d' ? 90 : 30;
    const dataInicial = new Date(hoje);
    dataInicial.setDate(hoje.getDate() - (numDias - 1));
    const dataInicialISO = dataInicial.toISOString().split('T')[0];

    const filtradas =
      periodo === 'inicio'
        ? sessoesDoPlano
        : sessoesDoPlano.filter((s) => {
            const dStr = s.data_estudo ? s.data_estudo.split('T')[0] : null;
            return Boolean(dStr && dStr >= dataInicialISO);
          });

    let minutosTotal = 0;
    let acertosTotal = 0;
    let questoesTotal = 0;
    let paginasTotal = 0;
    let minutosVideoTotal = 0;
    const diasComEstudoSet = new Set<string>();

    // Mapa diário para os 3 gráficos de evolução
    const mapaDiario: Record<
      string,
      { label: string; minutos: number; questoes: number; acertos: number }
    > = {};

    for (let i = 0; i < numDias; i++) {
      const d = new Date(dataInicial);
      d.setDate(dataInicial.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const lbl = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      mapaDiario[iso] = { label: lbl, minutos: 0, questoes: 0, acertos: 0 };
    }

    filtradas.forEach((s) => {
      const mins = extrairMinutos(s.diario_de_bordo);
      const ac = Number(s.questoes_acertos) || 0;
      const tot = Number(s.questoes_total) || 0;
      const pags = extrairPaginasLidas(s.diario_de_bordo);
      const vid = extrairMinutosVideo(s.diario_de_bordo, s.foco_sugerido);
      const dStr = s.data_estudo ? s.data_estudo.split('T')[0] : null;

      minutosTotal += mins;
      acertosTotal += ac;
      questoesTotal += tot;
      paginasTotal += pags;
      minutosVideoTotal += vid;

      if (dStr) {
        diasComEstudoSet.add(dStr);
        if (mapaDiario[dStr]) {
          mapaDiario[dStr].minutos += mins;
          mapaDiario[dStr].questoes += tot;
          mapaDiario[dStr].acertos += ac;
        }
      }
    });

    const diasEstudados = diasComEstudoSet.size;
    const diasTotais = numDias;
    const diasFalhados = Math.max(0, diasTotais - diasEstudados);
    const percConstancia = Math.round((diasEstudados / Math.max(1, diasTotais)) * 100);
    const mediaPorDiaEstudado = diasEstudados > 0 ? Math.round(minutosTotal / diasEstudados) : 0;

    const percDesempenho =
      questoesTotal > 0 ? Math.round((acertosTotal / questoesTotal) * 100) : 0;
    const paginasPorHora =
      minutosTotal > 0 ? ((paginasTotal / (minutosTotal / 60)).toFixed(1)).replace('.', ',') : '0,0';

    const subtopicos = disciplinas.filter((d) => {
      if (!d.parent_id) return false;
      if (planoAtivo && planoAtivo.disciplinaIds.length > 0) {
        return planoAtivo.disciplinaIds.includes(Number(d.parent_id));
      }
      return true;
    });
    const totalTopicosEdital = Math.max(subtopicos.length, sessoesDoPlano.length, 1);
    const concluidosPeriodo = filtradas.length;
    const pendentesEdital = Math.max(0, totalTopicosEdital - sessoesDoPlano.length);
    const percEdital = Math.min(100, Math.round((sessoesDoPlano.length / totalTopicosEdital) * 100));

    const fmtData = (d: Date) => d.toLocaleDateString('pt-BR');

    return {
      intervaloTexto: `${fmtData(dataInicial)} a ${fmtData(hoje)}`,
      temRegistros: filtradas.length > 0,
      minutosTotal,
      mediaPorDiaEstudado,
      diasEstudados,
      diasFalhados,
      diasTotais,
      percConstancia,
      acertosTotal,
      questoesTotal,
      percDesempenho,
      paginasTotal,
      paginasPorHora,
      minutosVideoTotal,
      concluidosPeriodo,
      pendentesEdital,
      percEdital,
      serieDiaria: Object.values(mapaDiario),
    };
  }, [sessoesDoPlano, periodo, disciplinas, planoAtivo]);

  return (
    <div className="space-y-6">
      {/* CABEÇALHO IGUAL AO PRINT 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Estatísticas
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Acompanhe sua evolução nos estudos
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => window.dispatchEvent(new CustomEvent('open-registro-estudo'))}
          className="self-start sm:self-auto h-9 px-4 text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Estudo</span>
        </Button>
      </div>

      {/* SELETOR DE PERÍODO (7 DIAS | 30 DIAS | 90 DIAS | DESDE O INÍCIO) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex p-1 rounded-xl bg-card border border-border text-xs">
          {[
            { id: '7d', label: '7 dias' },
            { id: '30d', label: '30 dias' },
            { id: '90d', label: '90 dias' },
            { id: 'inicio', label: 'Desde o início' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                periodo === p.id
                  ? 'bg-secondary text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          {stats.intervaloTexto}
        </span>
      </div>

      {/* AVISO QUANDO NÃO HÁ REGISTROS NO PERÍODO */}
      {!stats.temRegistros && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
          <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Nenhum registro neste período. Registre um estudo para acompanhar a sua evolução.
          </span>
        </div>
      )}

      {/* GRID DOS 6 CARDS SUPERIORES (LAYOUT EXATO DO PRINT 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* CARD GRANDE ESQUERDA (4 COLS): DESEMPENHO */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border flex flex-col justify-between min-h-[250px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Desempenho
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Target className="w-4 h-4" />
            </div>
          </div>

          {stats.questoesTotal > 0 ? (
            <div className="my-auto text-center space-y-2 py-4">
              <span className="text-5xl font-extrabold text-emerald-400 block">
                {stats.percDesempenho}%
              </span>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{stats.acertosTotal}</strong> certas de{' '}
                <strong className="text-foreground">{stats.questoesTotal}</strong> questões
              </p>
            </div>
          ) : (
            <div className="my-auto text-center space-y-2 py-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <HelpCircle className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-foreground">Nenhuma questão no período</p>
            </div>
          )}
          <div />
        </div>

        {/* BLOCO DIREITO (8 COLS): 5 CARDS DISTRIBUÍDOS EM 2 LINHAS */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-12 gap-4">
          {/* Linha 1: Tempo de Estudo (6 cols) + Constância nos Estudos (6 cols) */}
          <div className="sm:col-span-6 p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tempo de Estudo
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 pt-4">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  <strong className="text-foreground">
                    {formatarHoras(stats.mediaPorDiaEstudado)}
                  </strong>{' '}
                  por dia estudado (média)
                </p>
                <p>
                  <strong className="text-foreground">{stats.diasEstudados} dias</strong> estudados
                </p>
                <p>
                  <strong className="text-foreground">{stats.diasTotais} dias</strong> totais
                </p>
              </div>
              <span className="text-3xl font-extrabold text-foreground">
                {formatarHoras(stats.minutosTotal)}
              </span>
            </div>
          </div>

          <div className="sm:col-span-6 p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Constância nos Estudos
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 pt-4">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  <strong className="text-foreground">{stats.diasEstudados} dias</strong> estudados
                </p>
                <p>
                  <strong className="text-foreground">{stats.diasFalhados} dias</strong> falhados
                </p>
              </div>
              <span className="text-3xl font-extrabold text-foreground">
                {stats.percConstancia}%
              </span>
            </div>
          </div>

          {/* Linha 2: Páginas Lidas (4 cols) + Videoaulas (4 cols) + Progresso no Edital (4 cols) */}
          <div className="sm:col-span-4 p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Páginas Lidas
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 pt-4">
              <div className="text-xs text-muted-foreground">
                <p>{stats.paginasPorHora} páginas por hora</p>
                <p>no período filtrado</p>
              </div>
              <span className="text-3xl font-extrabold text-foreground">
                {stats.paginasTotal}
              </span>
            </div>
          </div>

          <div className="sm:col-span-4 p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Videoaulas
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <PlayCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-end pt-4">
              <span className="text-3xl font-extrabold text-foreground">
                {formatarHoras(stats.minutosVideoTotal)}
              </span>
            </div>
          </div>

          <div className="sm:col-span-4 p-5 rounded-2xl bg-card border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Progresso no Edital
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 pt-4">
              <div className="text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">{stats.concluidosPeriodo}</strong> concluídos no período
                </p>
                <p>
                  <strong className="text-foreground">{stats.pendentesEdital}</strong> tópicos pendentes
                </p>
              </div>
              <span className="text-3xl font-extrabold text-foreground">
                {stats.percEdital}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OS 3 GRÁFICOS DE EVOLUÇÃO AO LONGO DO TEMPO (PRINT 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. HORAS ESTUDADAS AO LONGO DO TEMPO */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Horas Estudadas ao Longo do Tempo
            </span>
            <span className="text-xs text-muted-foreground">Por dia</span>
          </div>

          {stats.minutosTotal > 0 ? (
            <div className="h-44 flex items-end gap-1.5 pt-4 border-b border-border/60 px-1">
              {stats.serieDiaria.map((d, i) => {
                const hPerc = Math.min(100, Math.round((d.minutos / 180) * 100));
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                    title={`${d.label}: ${formatarHoras(d.minutos)}`}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t transition-all',
                        d.minutos > 0 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-secondary h-1'
                      )}
                      style={{ height: d.minutos > 0 ? `${Math.max(10, hPerc)}%` : '3px' }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-foreground">Sem dados no período</p>
              <p className="text-[11px] text-muted-foreground">
                Ajuste o filtro ou registre estudos para ver a evolução.
              </p>
            </div>
          )}
        </div>

        {/* 2. QUESTÕES RESOLVIDAS AO LONGO DO TEMPO */}
        <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Questões Resolvidas ao Longo do Tempo
            </span>
            <span className="text-xs text-muted-foreground">Por dia</span>
          </div>

          {stats.questoesTotal > 0 ? (
            <div className="h-44 flex items-end gap-1.5 pt-4 border-b border-border/60 px-1">
              {stats.serieDiaria.map((d, i) => {
                const qPerc = Math.min(100, Math.round((d.questoes / 50) * 100));
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end h-full group"
                    title={`${d.label}: ${d.questoes} questões (${d.acertos} acertos)`}
                  >
                    <div
                      className={cn(
                        'w-full rounded-t transition-all',
                        d.questoes > 0 ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-secondary h-1'
                      )}
                      style={{ height: d.questoes > 0 ? `${Math.max(10, qPerc)}%` : '3px' }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-foreground">Sem dados no período</p>
              <p className="text-[11px] text-muted-foreground">
                Ajuste o filtro ou registre estudos para ver a evolução.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. DESEMPENHO AO LONGO DO TEMPO (LARGURA TOTAL) */}
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Desempenho ao Longo do Tempo
          </span>
          <span className="text-xs text-muted-foreground">Por dia</span>
        </div>

        {stats.questoesTotal > 0 ? (
          <div className="h-44 flex items-end gap-2 pt-4 border-b border-border/60 px-1">
            {stats.serieDiaria.map((d, i) => {
              const pDia = d.questoes > 0 ? Math.round((d.acertos / d.questoes) * 100) : 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                  title={`${d.label}: ${pDia}% de acerto (${d.acertos}/${d.questoes})`}
                >
                  <div
                    className={cn(
                      'w-full rounded-t transition-all',
                      d.questoes > 0
                        ? pDia >= 80
                          ? 'bg-emerald-500'
                          : pDia >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                        : 'bg-secondary h-1'
                    )}
                    style={{ height: d.questoes > 0 ? `${Math.max(12, pDia)}%` : '3px' }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-center space-y-1.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-foreground">Sem dados no período</p>
            <p className="text-[11px] text-muted-foreground">
              Ajuste o filtro ou registre estudos para ver a evolução.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
