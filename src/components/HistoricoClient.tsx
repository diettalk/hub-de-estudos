'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteSessaoCiclo } from '@/app/actions';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
  limparTagPlano,
} from '@/lib/plano-ativo';
import { type SessaoEstudo, type Disciplina } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Target,
  CheckSquare,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Filter,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HistoricoClientProps {
  sessoesIniciais: SessaoEstudo[];
  disciplinas: Disciplina[];
}

const ICON_COLORS = [
  'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
];

function extrairMinutos(diario: string | null): number {
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

function extrairCategoriaETopico(foco: string | null): { categoria: string; topico: string } {
  const limpo = limparTagPlano(foco);
  const match = limpo.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (match) {
    return { categoria: match[1], topico: match[2] || 'Estudo Geral' };
  }
  return { categoria: 'Teoria', topico: limpo || 'Estudo Geral' };
}

function extrairTempoString(diario: string | null): string {
  if (diario) {
    const match = diario.match(/⏱️\s*(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (match) return match[1];
  }
  return '00:50:00';
}

function formatarHoras(min: number): string {
  if (min <= 0) return '0min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m.toString().padStart(2, '0')}min` : ''}` : `${m}min`;
}

export function HistoricoClient({ sessoesIniciais, disciplinas }: HistoricoClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  const [sessoes, setSessoes] = useState<SessaoEstudo[]>(sessoesIniciais);
  const [showFilters, setShowFilters] = useState(false);
  const [periodoFilter, setPeriodoFilter] = useState<'tudo' | '7d' | '30d'>('tudo');
  const [disciplinaFilter, setDisciplinaFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Edição
  const [editingSessao, setEditingSessao] = useState<SessaoEstudo | null>(null);
  const [editMateria, setEditMateria] = useState('');
  const [editFoco, setEditFoco] = useState('');
  const [editData, setEditData] = useState('');
  const [editTempo, setEditTempo] = useState('00:45:00');
  const [editAcertos, setEditAcertos] = useState('0');
  const [editTotal, setEditTotal] = useState('0');
  const [editNotas, setEditNotas] = useState('');

  const sessoesDoPlano = useMemo(
    () => sessoes.filter((s) => s.concluida && sessaoPertenceAoPlano(s, planoAtivo)),
    [sessoes, planoAtivo]
  );

  const sessoesFiltradas = useMemo(() => {
    const hoje = new Date();
    const limite = new Date(hoje);
    if (periodoFilter === '7d') limite.setDate(hoje.getDate() - 7);
    if (periodoFilter === '30d') limite.setDate(hoje.getDate() - 30);
    const limiteISO = limite.toISOString().split('T')[0];

    return sessoesDoPlano.filter((s) => {
      const dStr = s.data_estudo ? s.data_estudo.split('T')[0] : null;
      if (periodoFilter !== 'tudo' && (!dStr || dStr < limiteISO)) return false;
      if (disciplinaFilter !== 'all' && s.materia_nome !== disciplinaFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.materia_nome?.toLowerCase().includes(q) ||
        s.foco_sugerido?.toLowerCase().includes(q) ||
        s.diario_de_bordo?.toLowerCase().includes(q)
      );
    });
  }, [sessoesDoPlano, periodoFilter, disciplinaFilter, searchQuery]);

  // Cálculo dos 4 KPIs Superiores (Idêntico ao Print 1)
  const kpis = useMemo(() => {
    let totalMinutos = 0;
    let totalAcertos = 0;
    let totalQuestoes = 0;
    let totalPaginas = 0;
    const materiasSet = new Set<string>();

    sessoesFiltradas.forEach((s) => {
      totalMinutos += extrairMinutos(s.diario_de_bordo);
      totalAcertos += Number(s.questoes_acertos) || 0;
      totalQuestoes += Number(s.questoes_total) || 0;
      totalPaginas += extrairPaginasLidas(s.diario_de_bordo);
      if (s.materia_nome) materiasSet.add(s.materia_nome);
    });

    const totalErros = Math.max(0, totalQuestoes - totalAcertos);
    const percDesempenho =
      totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

    // Tópicos do edital (subpáginas das disciplinas do plano)
    const subtopicos = disciplinas.filter((d) => {
      if (!d.parent_id) return false;
      if (planoAtivo && planoAtivo.disciplinaIds.length > 0) {
        return planoAtivo.disciplinaIds.includes(Number(d.parent_id));
      }
      return true;
    });
    const totalTopicosEdital = Math.max(subtopicos.length, sessoesDoPlano.length, 1);
    const concluidosEdital = Math.min(totalTopicosEdital, sessoesDoPlano.length);
    const pendentesEdital = Math.max(0, totalTopicosEdital - concluidosEdital);
    const percEdital = Math.round((concluidosEdital / totalTopicosEdital) * 100);

    const horasFloat = totalMinutos / 60;
    const paginasPorHora =
      horasFloat > 0 ? (totalPaginas / horasFloat).toFixed(1).replace('.', ',') : '0,0';

    return {
      totalMinutos,
      totalAcertos,
      totalErros,
      totalQuestoes,
      percDesempenho,
      totalTopicosEdital,
      concluidosEdital,
      pendentesEdital,
      percEdital,
      totalPaginas,
      paginasPorHora,
      materiasUnicas: Array.from(materiasSet),
    };
  }, [sessoesFiltradas, disciplinas, planoAtivo, sessoesDoPlano.length]);

  // Agrupamento por Dia (Idêntico ao Print 1: "14/05 Qui — 🕒 1h30min")
  const gruposPorDia = useMemo(() => {
    const mapa: Record<string, { dataISO: string; minutosDia: number; itens: SessaoEstudo[] }> = {};
    sessoesFiltradas.forEach((s) => {
      const k = s.data_estudo ? s.data_estudo.split('T')[0] : 'Sem Data';
      if (!mapa[k]) mapa[k] = { dataISO: k, minutosDia: 0, itens: [] };
      mapa[k].minutosDia += extrairMinutos(s.diario_de_bordo);
      mapa[k].itens.push(s);
    });
    return Object.values(mapa).sort((a, b) => b.dataISO.localeCompare(a.dataISO));
  }, [sessoesFiltradas]);

  const handleOpenEdit = (s: SessaoEstudo) => {
    setEditingSessao(s);
    setEditMateria(s.materia_nome || '');
    setEditFoco(limparTagPlano(s.foco_sugerido));
    setEditData(s.data_estudo ? s.data_estudo.split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditTempo(extrairTempoString(s.diario_de_bordo));
    setEditAcertos(String(s.questoes_acertos ?? 0));
    setEditTotal(String(s.questoes_total ?? 0));
    const comentarioLimpo = limparTagPlano(s.diario_de_bordo)
      .replace(/⏱️\s*\d{1,2}:\d{2}(?::\d{2})?\s*\|?\s*/, '')
      .trim();
    setEditNotas(comentarioLimpo);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSessao) return;

    startTransition(async () => {
      const partesDiario: string[] = [];
      if (planoAtivo) partesDiario.push(`[PLANO:${planoAtivo.id}]`);
      partesDiario.push(`⏱️ ${editTempo.trim() || '00:45:00'}`);
      if (editNotas.trim()) partesDiario.push(editNotas.trim());

      const novoDiario = partesDiario.join(' | ');
      const ac = Math.max(0, parseInt(editAcertos) || 0);
      const tot = Math.max(ac, parseInt(editTotal) || 0);

      const { error } = await supabase
        .from('ciclo_sessoes')
        .update({
          materia_nome: editMateria.trim(),
          foco_sugerido: editFoco.trim(),
          data_estudo: editData,
          diario_de_bordo: novoDiario,
          questoes_acertos: ac,
          questoes_total: tot,
        })
        .eq('id', editingSessao.id);

      if (error) {
        toast.error('Erro ao atualizar registro.');
      } else {
        setSessoes((prev) =>
          prev.map((item) =>
            item.id === editingSessao.id
              ? {
                  ...item,
                  materia_nome: editMateria.trim(),
                  foco_sugerido: editFoco.trim(),
                  data_estudo: editData,
                  diario_de_bordo: novoDiario,
                  questoes_acertos: ac,
                  questoes_total: tot,
                }
              : item
          )
        );
        toast.success('Registro atualizado!');
        setEditingSessao(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Deseja realmente excluir este registro do histórico?')) return;
    startTransition(async () => {
      await deleteSessaoCiclo(id);
      setSessoes((prev) => prev.filter((s) => s.id !== id));
      toast.success('Registro excluído.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO IGUAL AO PRINT 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Histórico
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Registros detalhados dos seus estudos
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

      {/* OS 4 CARDS DE TOPO IDÊNTICOS AO PRINT 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TEMPO DE ESTUDO */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tempo de Estudo
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground my-2 block">
            {formatarHoras(kpis.totalMinutos)}
          </span>
          <span className="text-xs text-muted-foreground">
            acumulado nos registros
          </span>
        </div>

        {/* 2. DESEMPENHO */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Desempenho
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {kpis.percDesempenho}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({kpis.totalQuestoes} questões)
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {kpis.totalAcertos} certas • {kpis.totalErros} erradas
          </span>
        </div>

        {/* 3. PROGRESSO NO EDITAL */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Progresso no Edital
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {kpis.percEdital}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({kpis.concluidosEdital} de {kpis.totalTopicosEdital})
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {kpis.pendentesEdital} tópicos pendentes
          </span>
        </div>

        {/* 4. PÁGINAS LIDAS */}
        <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Páginas Lidas
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">
              {kpis.totalPaginas}
            </span>
            <span className="text-xs text-muted-foreground">
              ({kpis.paginasPorHora} por hora)
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            no período filtrado
          </span>
        </div>
      </div>

      {/* BOTÃO DE FILTROS NO CANTO DIREITO (IGUAL AO PRINT 1) */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 px-4 text-xs font-bold gap-2 rounded-xl bg-card"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
            <span>Filtros</span>
          </Button>
        </div>

        {showFilters && (
          <div className="p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              {[
                { id: 'tudo', label: 'Desde o início' },
                { id: '7d', label: 'Últimos 7 dias' },
                { id: '30d', label: 'Últimos 30 dias' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodoFilter(p.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    periodoFilter === p.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={disciplinaFilter}
                onChange={(e) => setDisciplinaFilter(e.target.value)}
                className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground"
              >
                <option value="all" className="bg-card">Todas as Disciplinas</option>
                {kpis.materiasUnicas.map((m) => (
                  <option key={m} value={m} className="bg-card">{m}</option>
                ))}
              </select>

              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tópico ou anotação..."
                className="h-9 w-60 text-xs bg-secondary/30 rounded-xl"
              />
            </div>
          </div>
        )}
      </div>

      {/* LISTA DE REGISTROS AGRUPADOS POR DIA (ESTILO PRINT 1) */}
      <div className="space-y-4">
        {gruposPorDia.length > 0 ? (
          gruposPorDia.map((grupo) => {
            const dObj =
              grupo.dataISO !== 'Sem Data' ? new Date(grupo.dataISO + 'T12:00:00Z') : null;
            const diaMes = dObj
              ? `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1)
                  .toString()
                  .padStart(2, '0')}`
              : 'Sem Data';
            const diaSemana = dObj
              ? new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
                  .format(dObj)
                  .replace('.', '')
              : '';

            return (
              <div
                key={grupo.dataISO}
                className="rounded-2xl bg-card border border-border shadow-xs overflow-hidden"
              >
                {/* Topo do Card do Dia: "14/05 Qui — 🕒 1h30min" */}
                <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between text-xs">
                  <div className="flex items-baseline gap-2">
                    <span className="font-extrabold text-sm text-foreground">{diaMes}</span>
                    <span className="text-muted-foreground capitalize font-medium">
                      {diaSemana}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{formatarHoras(grupo.minutosDia)}</span>
                  </div>
                </div>

                {/* Itens estudados naquele dia */}
                <div className="divide-y divide-border/50">
                  {grupo.itens.map((reg, idx) => {
                    const mins = extrairMinutos(reg.diario_de_bordo);
                    const ac = Number(reg.questoes_acertos) || 0;
                    const tot = Number(reg.questoes_total) || 0;
                    const perc = tot > 0 ? Math.round((ac / tot) * 100) : null;
                    const { categoria, topico } = extrairCategoriaETopico(reg.foco_sugerido);
                    const catLabel =
                      tot > 0 && categoria === 'Teoria' ? 'Teoria + Questões' : categoria;
                    const colorClass = ICON_COLORS[idx % ICON_COLORS.length];

                    return (
                      <div
                        key={reg.id}
                        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={cn(
                              'w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-extrabold flex-shrink-0',
                              colorClass
                            )}
                          >
                            A-Z
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-foreground truncate">
                              {reg.materia_nome || 'Disciplina'}
                            </h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide truncate mt-0.5">
                              {topico}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 self-end sm:self-center flex-shrink-0 text-xs">
                          <Badge variant="secondary" className="text-[11px] font-semibold px-2.5 py-0.5">
                            {catLabel}
                          </Badge>

                          <span className="font-semibold text-muted-foreground w-16 text-right">
                            {formatarHoras(mins)}
                          </span>

                          <div className="w-28 text-right flex items-center justify-end gap-2">
                            {tot > 0 ? (
                              <>
                                <span className="font-mono">
                                  <strong className="text-emerald-400">{ac}</strong> / {tot}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] font-bold',
                                    perc! >= 80
                                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                                      : perc! >= 60
                                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                                      : 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                                  )}
                                >
                                  {perc}%
                                </Badge>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(reg)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Editar registro"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(reg.id)}
                              disabled={isPending}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="Excluir registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-14 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-2">
            <Clock className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">
              Nenhum registro de estudo encontrado.
            </p>
            <p className="text-xs text-muted-foreground">
              Clique em &ldquo;+ Adicionar Estudo&rdquo; no topo para registrar sua primeira sessão!
            </p>
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO */}
      {editingSessao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[600px] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <h2 className="text-lg font-bold">Editar Registro de Estudo</h2>
              <button
                type="button"
                onClick={() => setEditingSessao(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold block">Matéria</label>
                  <Input
                    value={editMateria}
                    onChange={(e) => setEditMateria(e.target.value)}
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold block">Data do Estudo</label>
                  <Input
                    type="date"
                    value={editData}
                    onChange={(e) => setEditData(e.target.value)}
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold block">Tópico / Foco Estudado</label>
                <Input
                  value={editFoco}
                  onChange={(e) => setEditFoco(e.target.value)}
                  className="h-10 text-xs bg-secondary/30 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold block">Tempo (HH:MM:SS)</label>
                  <Input
                    value={editTempo}
                    onChange={(e) => setEditTempo(e.target.value)}
                    placeholder="00:45:00"
                    className="h-10 text-center font-mono font-bold text-xs bg-secondary/30 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-emerald-400 block">Questões Certas</label>
                  <Input
                    type="number"
                    min={0}
                    value={editAcertos}
                    onChange={(e) => setEditAcertos(e.target.value)}
                    className="h-10 text-center font-bold text-xs bg-secondary/30 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold block">Total de Questões</label>
                  <Input
                    type="number"
                    min={0}
                    value={editTotal}
                    onChange={(e) => setEditTotal(e.target.value)}
                    className="h-10 text-center font-bold text-xs bg-secondary/30 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold block">Observações / Comentários</label>
                <textarea
                  rows={3}
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingSessao(null)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Salvar Alterações</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
