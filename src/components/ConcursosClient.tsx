'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  deleteConcurso,
  updateConcursoStatus,
  unlinkPastaFromConcurso,
} from '@/app/actions';
import { ConcursoFormModal, extractLinksAndPriorities } from './ConcursoFormModal';
import { LinkPastaModal } from './LinkPastaModal';
import { type Concurso, type Disciplina, type SessaoEstudo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Archive,
  ArchiveRestore,
  Trash2,
  Calendar,
  BookOpen,
  ListChecks,
  ExternalLink,
  Clock,
  Target,
  CheckCircle2,
  Play,
  FileText,
  Sparkles,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Extrai minutos da tag "⏱️ HH:MM:SS"
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

function formatarHoras(min: number): string {
  if (min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m}min`;
}

const ICON_COLORS = [
  'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
];

type ConcursosClientProps = {
  ativos: Concurso[];
  previstos: Concurso[];
  arquivados: Concurso[];
  paginasDisponiveis: Disciplina[];
  sessoes: SessaoEstudo[];
};

export function ConcursosClient({
  ativos: initialAtivos,
  previstos: initialPrevistos,
  arquivados: initialArquivados,
  paginasDisponiveis,
  sessoes,
}: ConcursosClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();

  const [tabStatus, setTabStatus] = useState<'ativo' | 'previsto' | 'arquivado'>('ativo');

  // Nível de navegação: Plano selecionado -> Disciplina selecionada
  const [selectedPlanoId, setSelectedPlanoId] = useState<number | null>(null);
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState<number | null>(null);

  const [searchDisciplina, setSearchDisciplina] = useState('');
  const [novoTopicoNome, setNovoTopicoNome] = useState('');

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingConcurso, setEditingConcurso] = useState<Concurso | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingConcursoId, setLinkingConcursoId] = useState<number | null>(null);

  const todosConcursos = useMemo(
    () => [...initialAtivos, ...initialPrevistos, ...initialArquivados],
    [initialAtivos, initialPrevistos, initialArquivados]
  );

  const selectedPlano = useMemo(
    () => todosConcursos.find((c) => c.id === selectedPlanoId) || null,
    [todosConcursos, selectedPlanoId]
  );

  const selectedDisciplina = useMemo(
    () => paginasDisponiveis.find((p) => p.id === selectedDisciplinaId) || null,
    [paginasDisponiveis, selectedDisciplinaId]
  );

  // Calcula métricas de uma Disciplina específica (Avanço %, Horas, Questões, Desempenho e Histórico)
  const calcularMetricasDisciplina = (disc: Disciplina) => {
    const topicosFilhos = paginasDisponiveis.filter((p) => p.parent_id === disc.id);
    const sessoesDaDisciplina = sessoes.filter(
      (s) =>
        s.disciplina_id === disc.id ||
        s.materia_nome?.trim().toLowerCase() === disc.title.trim().toLowerCase()
    );

    const sessoesConcluidas = sessoesDaDisciplina.filter((s) => s.concluida);
    let minutos = 0;
    let acertos = 0;
    let questoes = 0;

    sessoesConcluidas.forEach((s) => {
      minutos += extrairMinutos(s.diario_de_bordo);
      acertos += Number(s.questoes_acertos) || 0;
      questoes += Number(s.questoes_total) || 0;
    });

    const totalRef = Math.max(topicosFilhos.length, sessoesDaDisciplina.length, 1);
    const avancoPerc =
      sessoesDaDisciplina.length > 0
        ? Math.min(100, Math.round((sessoesConcluidas.length / totalRef) * 100))
        : 0;

    const desempenhoPerc = questoes > 0 ? Math.round((acertos / questoes) * 100) : null;

    return {
      topicosCount: topicosFilhos.length,
      topicosFilhos,
      minutos,
      acertos,
      questoes,
      avancoPerc,
      desempenhoPerc,
      historico: sessoesConcluidas,
    };
  };

  // Calcula métricas consolidadas de um Plano inteiro
  const calcularMetricasPlano = (plano: Concurso) => {
    const disciplinasDoPlano = (plano.concurso_paginas || [])
      .map((cp) => cp.paginas)
      .filter((p): p is Disciplina => Boolean(p));

    let totalMinutos = 0;
    let totalAcertos = 0;
    let totalQuestoes = 0;
    let totalTopicos = 0;
    let somaAvanco = 0;

    disciplinasDoPlano.forEach((d) => {
      const m = calcularMetricasDisciplina(d);
      totalMinutos += m.minutos;
      totalAcertos += m.acertos;
      totalQuestoes += m.questoes;
      totalTopicos += Math.max(m.topicosCount, 1);
      somaAvanco += m.avancoPerc;
    });

    const avancoPlano =
      disciplinasDoPlano.length > 0
        ? Math.round(somaAvanco / disciplinasDoPlano.length)
        : 0;
    const desempenhoPlano =
      totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : null;

    return {
      disciplinas: disciplinasDoPlano,
      disciplinasCount: disciplinasDoPlano.length,
      topicosCount: totalTopicos,
      minutos: totalMinutos,
      acertos: totalAcertos,
      questoes: totalQuestoes,
      avancoPerc: avancoPlano,
      desempenhoPerc: desempenhoPlano,
    };
  };

  const handleCreateSubTopico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisciplina || !novoTopicoNome.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('paginas').insert({
      user_id: user.id,
      title: novoTopicoNome.trim(),
      parent_id: selectedDisciplina.id,
    });

    if (error) {
      toast.error('Erro ao criar tópico.');
    } else {
      toast.success('Tópico adicionado à disciplina!');
      setNovoTopicoNome('');
      router.refresh();
    }
  };

  // =========================================================================
  // NÍVEL 3: VISÃO DE DETALHE, TÓPICOS E HISTÓRICO DA DISCIPLINA
  // =========================================================================
  if (selectedDisciplina) {
    const m = calcularMetricasDisciplina(selectedDisciplina);

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* TOPO / BREADCRUMB */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDisciplinaId(null)}
              className="h-9 w-9 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {selectedPlano && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedDisciplinaId(null)}
                      className="hover:text-foreground truncate max-w-[220px]"
                    >
                      {selectedPlano.nome}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
                <span>Disciplina</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
                <span>{selectedDisciplina.emoji || '📘'}</span>
                <span>{selectedDisciplina.title}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/disciplinas?page=${selectedDisciplina.id}`}>
              <Button variant="outline" size="sm" className="h-9 px-3.5 text-xs font-semibold gap-1.5 rounded-xl">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Abrir Caderno de Resumos</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('open-registro-estudo', {
                    detail: { disciplinaId: String(selectedDisciplina.id) },
                  })
                )
              }
              className="h-9 px-4 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Estudo</span>
            </Button>
          </div>
        </div>

        {/* BANNER DE MÉTRICAS DA DISCIPLINA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Avanço no Edital
            </span>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${m.avancoPerc}%` }} />
              </div>
              <span className="text-lg font-extrabold">{m.avancoPerc}%</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Horas de Estudo
            </span>
            <span className="text-xl font-extrabold text-foreground mt-1 block">
              {formatarHoras(m.minutos)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Questões Resolvidas
            </span>
            <span className="text-xl font-extrabold text-foreground mt-1 block">
              {m.questoes > 0 ? `${m.acertos} / ${m.questoes}` : '—'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border">
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Desempenho
            </span>
            <span
              className={cn(
                'text-xl font-extrabold mt-1 block',
                m.desempenhoPerc === null
                  ? 'text-muted-foreground'
                  : m.desempenhoPerc >= 80
                  ? 'text-emerald-400'
                  : m.desempenhoPerc >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              )}
            >
              {m.desempenhoPerc !== null ? `${m.desempenhoPerc}%` : '—'}
            </span>
          </div>
        </div>

        {/* GRID: TÓPICOS DO EDITAL (ESQUERDA) + HISTÓRICO DE REGISTROS (DIREITA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* TÓPICOS DO EDITAL */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Tópicos do Edital ({m.topicosFilhos.length})
              </h3>
            </div>

            <form onSubmit={handleCreateSubTopico} className="flex gap-2">
              <Input
                value={novoTopicoNome}
                onChange={(e) => setNovoTopicoNome(e.target.value)}
                placeholder="Adicionar novo tópico do edital..."
                className="h-9 text-xs bg-secondary/30 rounded-xl"
              />
              <Button type="submit" size="sm" className="h-9 px-3 text-xs font-bold bg-emerald-500 text-white rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </form>

            <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
              {m.topicosFilhos.length > 0 ? (
                m.topicosFilhos.map((topico, i) => (
                  <div key={topico.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground truncate">
                      {i + 1}. {topico.title}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link href={`/disciplinas?page=${topico.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-primary">
                          Resumo
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent('open-registro-estudo', {
                              detail: {
                                disciplinaId: String(selectedDisciplina.id),
                                topico: topico.title,
                              },
                            })
                          )
                        }
                        className="h-7 px-2 text-[11px] text-emerald-500"
                      >
                        Estudar
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Nenhum tópico cadastrado ainda. Adicione os tópicos do edital no campo acima!
                </p>
              )}
            </div>
          </div>

          {/* HISTÓRICO DE REGISTROS DE ESTUDO DA DISCIPLINA */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Histórico de Registros desta Disciplina ({m.historico.length})
            </h3>

            {m.historico.length > 0 ? (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {m.historico.map((reg) => {
                  const mins = extrairMinutos(reg.diario_de_bordo);
                  const ac = Number(reg.questoes_acertos) || 0;
                  const tot = Number(reg.questoes_total) || 0;
                  const perc = tot > 0 ? Math.round((ac / tot) * 100) : null;

                  return (
                    <div
                      key={reg.id}
                      className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {reg.data_estudo
                              ? new Date(reg.data_estudo + 'T12:00:00Z').toLocaleDateString('pt-BR')
                              : 'Sem data'}
                          </Badge>
                          <span className="font-bold text-foreground truncate">
                            {reg.foco_sugerido || 'Estudo Geral'}
                          </span>
                        </div>
                        {reg.diario_de_bordo && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {reg.diario_de_bordo}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono font-bold text-emerald-400">
                          {formatarHoras(mins)}
                        </span>
                        {tot > 0 && (
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {ac}/{tot} ({perc}%)
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center rounded-xl bg-secondary/20 border border-border/50 space-y-2">
                <Clock className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-foreground">
                  Nenhum estudo registrado para esta disciplina ainda.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Clique em &ldquo;Registrar Estudo&rdquo; no topo para gravar seu primeiro avanço!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // NÍVEL 2: DENTRO DO PLANO SELECIONADO (PRINTS 2 E 3)
  // =========================================================================
  if (selectedPlano) {
    const mp = calcularMetricasPlano(selectedPlano);
    const { namedLinks, cleanPriorities } = extractLinksAndPriorities(selectedPlano);

    const disciplinasFiltradas = mp.disciplinas.filter((d) =>
      d.title.toLowerCase().includes(searchDisciplina.toLowerCase())
    );

    const handleDesvincularDisciplina = (e: React.MouseEvent, paginaId: number) => {
      e.stopPropagation();
      if (confirm('Remover esta disciplina deste plano? (Suas anotações não serão apagadas)')) {
        startTransition(() => {
          unlinkPastaFromConcurso(selectedPlano.id, paginaId);
        });
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* TOPO COM BOTÃO VOLTAR */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedPlanoId(null)}
            className="h-9 w-9 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {selectedPlano.nome}
            </h1>
            <p className="text-xs text-muted-foreground">
              Acompanhe as disciplinas e o progresso deste plano
            </p>
          </div>
        </div>

        {/* CARD BANNER DO PLANO (IGUAL AO PRINT 2 E 3) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Esquerda: Ícone + Nome + Status + Contadores */}
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0">
                🎯
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-foreground truncate">
                    {selectedPlano.nome}
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold uppercase">
                    ✓ {selectedPlano.status}
                  </Badge>
                </div>
                {selectedPlano.banca && (
                  <p className="text-xs text-muted-foreground">{selectedPlano.banca}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                  {selectedPlano.data_prova && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Prova: {new Date(selectedPlano.data_prova).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    <strong className="text-foreground">{mp.disciplinasCount}</strong> disciplinas
                  </span>
                  <span className="flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5" />
                    <strong className="text-foreground">{mp.topicosCount}</strong> tópicos
                  </span>
                </div>
              </div>
            </div>

            {/* Direita: Métricas Consolidadas + Menu 3 Pontinhos */}
            <div className="flex flex-wrap items-center gap-6 lg:border-l lg:border-border lg:pl-6">
              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Avanço no Edital
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${mp.avancoPerc}%` }}
                    />
                  </div>
                  <span className="text-sm font-extrabold">{mp.avancoPerc}%</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Horas de Estudo
                </span>
                <span className="text-sm font-extrabold block mt-1">
                  {formatarHoras(mp.minutos)}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Questões
                </span>
                <span className="text-sm font-extrabold block mt-1">
                  {mp.questoes > 0 ? mp.questoes : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                  Desempenho
                </span>
                <span
                  className={cn(
                    'text-sm font-extrabold block mt-1',
                    mp.desempenhoPerc !== null ? 'text-emerald-400' : 'text-muted-foreground'
                  )}
                >
                  {mp.desempenhoPerc !== null ? `${mp.desempenhoPerc}%` : '—'}
                </span>
              </div>

              {/* Menu 3 Pontinhos (Editar, Arquivar, Excluir) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="h-9 w-9 rounded-xl">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 text-xs">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditingConcurso(selectedPlano);
                      setIsFormModalOpen(true);
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar plano</span>
                  </DropdownMenuItem>

                  {selectedPlano.status !== 'arquivado' ? (
                    <DropdownMenuItem
                      onClick={() =>
                        startTransition(() => updateConcursoStatus(selectedPlano.id, 'arquivado'))
                      }
                      className="gap-2 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Arquivar plano</span>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() =>
                        startTransition(() => updateConcursoStatus(selectedPlano.id, 'ativo'))
                      }
                      className="gap-2 cursor-pointer"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5" />
                      <span>Ativar plano</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir o plano "${selectedPlano.nome}"?`)) {
                        startTransition(() => {
                          deleteConcurso(selectedPlano.id);
                          setSelectedPlanoId(null);
                        });
                      }
                    }}
                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir plano</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* FAIXA DE LINKS NOMEADOS DOS EDITAIS + PRIORIDADES */}
          {(namedLinks.length > 0 || cleanPriorities.length > 0) && (
            <div className="pt-3 border-t border-border/60 flex flex-wrap items-center gap-2">
              {namedLinks.map((lnk, idx) => (
                <a
                  key={idx}
                  href={lnk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{lnk.label}</span>
                </a>
              ))}
              {cleanPriorities.map((p, idx) => (
                <Badge key={idx} variant="secondary" className="text-[11px] font-medium">
                  📌 {p}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* BARRA DE FERRAMENTAS: BUSCAR DISCIPLINA + NOVA DISCIPLINA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchDisciplina}
              onChange={(e) => setSearchDisciplina(e.target.value)}
              placeholder="Buscar disciplina..."
              className="h-10 pl-10 text-xs bg-card border-border rounded-xl"
            />
          </div>

          <Button
            onClick={() => {
              setLinkingConcursoId(selectedPlano.id);
              setIsLinkModalOpen(true);
            }}
            className="h-10 px-4 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Disciplina</span>
          </Button>
        </div>

        {/* TABELA DE DISCIPLINAS DO PLANO (IGUAL AO PRINT 2 E 3) */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/40 border-b border-border">
                <tr>
                  <th className="py-3.5 px-5 text-emerald-500">Disciplina ▲</th>
                  <th className="py-3.5 px-4 w-48">Avanço no Edital</th>
                  <th className="py-3.5 px-4 text-center w-36">Horas de Estudo</th>
                  <th className="py-3.5 px-4 text-center w-32">Questões</th>
                  <th className="py-3.5 px-4 text-center w-32">Desempenho</th>
                  <th className="py-3.5 px-4 text-right w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {disciplinasFiltradas.length > 0 ? (
                  disciplinasFiltradas.map((disc, idx) => {
                    const md = calcularMetricasDisciplina(disc);
                    const colorClass = ICON_COLORS[idx % ICON_COLORS.length];

                    return (
                      <tr
                        key={disc.id}
                        onClick={() => setSelectedDisciplinaId(disc.id)}
                        className="hover:bg-secondary/30 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'w-8 h-8 rounded-lg border flex items-center justify-center text-sm flex-shrink-0',
                                colorClass
                              )}
                            >
                              {disc.emoji || '📘'}
                            </span>
                            <span className="font-bold text-foreground group-hover:text-emerald-400 transition-colors truncate max-w-[340px]">
                              {disc.title}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${md.avancoPerc}%` }}
                              />
                            </div>
                            <span className="font-bold text-foreground">{md.avancoPerc}%</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-medium text-muted-foreground">
                          {formatarHoras(md.minutos)}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          {md.questoes > 0 ? (
                            <span>
                              <strong className="text-emerald-400">{md.acertos}</strong> / {md.questoes}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {md.desempenhoPerc !== null ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] font-bold',
                                md.desempenhoPerc >= 80
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                                  : md.desempenhoPerc >= 60
                                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                                  : 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                              )}
                            >
                              {md.desempenhoPerc}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => handleDesvincularDisciplina(e, disc.id)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                              title="Desvincular disciplina deste plano"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <p className="font-bold text-sm text-foreground">
                        Nenhuma disciplina neste plano ainda.
                      </p>
                      <p className="text-xs mt-1">
                        Clique em &ldquo;+ Nova Disciplina&rdquo; acima para criar ou vincular matérias a este plano!
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ConcursoFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          concurso={editingConcurso}
        />
        <LinkPastaModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          concursoId={linkingConcursoId}
          paginasDisponiveis={paginasDisponiveis}
          jaVinculadasIds={mp.disciplinas.map((d) => d.id)}
        />
      </div>
    );
  }

  // =========================================================================
  // NÍVEL 1: LISTA DE PLANOS DE ESTUDO (PRINT 1)
  // =========================================================================
  const listaAtual =
    tabStatus === 'ativo'
      ? initialAtivos
      : tabStatus === 'previsto'
      ? initialPrevistos
      : initialArquivados;

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA PÁGINA DE PLANOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Planos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gerencie seus planos de estudo e editais verticalizados
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingConcurso(null);
            setIsFormModalOpen(true);
          }}
          className="h-10 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Criar plano</span>
        </Button>
      </div>

      {/* BARRA DE ABAS (ATIVOS, PREVISTOS, ARQUIVADOS) */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTabStatus('ativo')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              tabStatus === 'ativo'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {initialAtivos.length} {initialAtivos.length === 1 ? 'plano ativo' : 'planos ativos'}
          </button>
          <button
            type="button"
            onClick={() => setTabStatus('previsto')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              tabStatus === 'previsto'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Previstos ({initialPrevistos.length})
          </button>
          <button
            type="button"
            onClick={() => setTabStatus('arquivado')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              tabStatus === 'arquivado'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Arquivados ({initialArquivados.length})
          </button>
        </div>
      </div>

      {/* LISTA HORIZONTAL DE PLANOS (IGUAL AO PRINT 1) */}
      <div className="space-y-3.5">
        {listaAtual.length > 0 ? (
          listaAtual.map((plano) => {
            const mp = calcularMetricasPlano(plano);
            const { namedLinks } = extractLinksAndPriorities(plano);

            return (
              <div
                key={plano.id}
                onClick={() => setSelectedPlanoId(plano.id)}
                className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all cursor-pointer group shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Esquerda: Ícone + Nome + Subtítulo + Links */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl flex-shrink-0">
                    🎯
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-foreground group-hover:text-emerald-400 transition-colors truncate">
                      {plano.nome}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{plano.banca || 'Plano personalizado'}</span>
                      <span>•</span>
                      <span>{mp.disciplinasCount} disciplinas</span>
                      {plano.data_prova && (
                        <>
                          <span>•</span>
                          <span>
                            Prova: {new Date(plano.data_prova).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                        </>
                      )}
                    </div>

                    {namedLinks.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        {namedLinks.map((lnk, i) => (
                          <a
                            key={i}
                            href={lnk.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary hover:bg-emerald-500/20 hover:text-emerald-400 text-[10px] font-semibold text-muted-foreground transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>{lnk.label}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direita: Avanço | Horas | Questões | Desempenho | Seta > */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 lg:border-l lg:border-border/70 lg:pl-6 flex-shrink-0">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Avanço no Edital
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${mp.avancoPerc}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold">{mp.avancoPerc}%</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Horas de Estudo
                    </span>
                    <span className="text-xs font-extrabold block mt-1">
                      {formatarHoras(mp.minutos)}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Questões
                    </span>
                    <span className="text-xs font-extrabold block mt-1">
                      {mp.questoes > 0 ? mp.questoes : '—'}
                    </span>
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                      Desempenho
                    </span>
                    <span
                      className={cn(
                        'text-xs font-extrabold block mt-1',
                        mp.desempenhoPerc !== null ? 'text-emerald-400' : 'text-muted-foreground'
                      )}
                    >
                      {mp.desempenhoPerc !== null ? `${mp.desempenhoPerc}%` : '—'}
                    </span>
                  </div>

                  <ChevronRight className="w-5 h-5 text-emerald-500 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-2">
            <p className="text-sm font-bold text-foreground">Nenhum plano nesta categoria.</p>
            <p className="text-xs text-muted-foreground">
              Clique em &ldquo;+ Criar plano&rdquo; no canto superior direito para montar seu plano de estudos!
            </p>
          </div>
        )}
      </div>

      <ConcursoFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        concurso={editingConcurso}
      />
    </div>
  );
}