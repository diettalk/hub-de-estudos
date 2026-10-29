'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  FolderTree,
  BookOpen,
  Search,
  Plus,
  Clock,
  FileText,
  BarChart3,
  ArrowLeft,
  Calendar,
  ListChecks,
  Check,
  X,
} from 'lucide-react';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import { type Node, type SessaoEstudo } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DisciplinasClientProps {
  paginaTree: Node[];
  initialPage: Node | null;
}

const ICON_COLORS = [
  'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
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

function formatarHoras(min: number): string {
  if (min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m}min`;
}

function findNodePath(nodes: Node[], nodeId: string | number): Node[] {
  const targetId = String(nodeId);
  function search(currentPath: Node[], currentNodes: Node[]): Node[] | null {
    for (const node of currentNodes) {
      const newPath = [...currentPath, node];
      if (String(node.id) === targetId) return newPath;
      if (Array.isArray(node.children) && node.children.length > 0) {
        const foundPath = search(newPath, node.children);
        if (foundPath) return foundPath;
      }
    }
    return null;
  }
  return search([], nodes) || [];
}

function countAllTopics(nodes: Node[]): number {
  let count = 0;
  for (const n of nodes) {
    if (Array.isArray(n.children) && n.children.length > 0) {
      count += n.children.length + countAllTopics(n.children);
    }
  }
  return count;
}

export default function DisciplinasClient({ paginaTree, initialPage }: DisciplinasClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [selectedPage, setSelectedPage] = useState<Node | null>(initialPage);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Modo dentro de uma disciplina selecionada: 'editor' (Caderno Tiptap) ou 'historico' (Desempenho, Tópicos e Registros)
  const [activeSubTab, setActiveSubTab] = useState<'historico' | 'editor'>('historico');

  // Sessões carregadas para calcular horas, questões, desempenho e histórico
  const [sessoes, setSessoes] = useState<SessaoEstudo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para criar nova disciplina ou tópico rápido
  const [showNewDiscForm, setShowNewDiscForm] = useState(false);
  const [novaDiscNome, setNovaDiscNome] = useState('');
  const [novoTopicoNome, setNovoTopicoNome] = useState('');

  const fetchSessoes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('ciclo_sessoes')
      .select('*')
      .eq('user_id', user.id)
      .order('data_estudo', { ascending: false });
    if (data) setSessoes(data as SessaoEstudo[]);
  }, [supabase]);

  useEffect(() => {
    setIsMounted(true);
    fetchSessoes();

    // Atualiza as métricas sempre que um novo estudo for registrado no modal
    const handleRefresh = () => {
      setTimeout(fetchSessoes, 600);
    };
    window.addEventListener('open-registro-estudo', handleRefresh);
    return () => window.removeEventListener('open-registro-estudo', handleRefresh);
  }, [fetchSessoes]);

  const activeId = searchParams.get('page');

  const breadcrumbPath = useMemo(() => {
    if (!activeId) return [];
    return findNodePath(paginaTree, activeId);
  }, [paginaTree, activeId]);

  useEffect(() => {
    const id = searchParams.get('page');
    if (id && initialPage && Number(id) === initialPage.id) {
      setSelectedPage(initialPage);
    } else if (id) {
      const path = findNodePath(paginaTree, id);
      if (path.length > 0) {
        setSelectedPage(path[path.length - 1]);
      }
    } else {
      setSelectedPage(null);
    }
  }, [searchParams, initialPage, paginaTree]);

  const handleSave = async (newContent: JSONContent) => {
    if (!selectedPage) return;
    const contentAsString = JSON.stringify(newContent);
    await updatePaginaContent(selectedPage.id, contentAsString);
  };

  // Cálculo de métricas por disciplina (raiz ou nó selecionado)
  const calcularMetricasNode = useCallback(
    (node: Node) => {
      const topicosFilhos = Array.isArray(node.children) ? node.children : [];
      const sessoesDaMateria = sessoes.filter(
        (s) =>
          s.disciplina_id === node.id ||
          s.materia_nome?.trim().toLowerCase() === node.title.trim().toLowerCase()
      );

      const concluidas = sessoesDaMateria.filter((s) => s.concluida);
      let minutos = 0;
      let acertos = 0;
      let questoes = 0;

      concluidas.forEach((s) => {
        minutos += extrairMinutos(s.diario_de_bordo);
        acertos += Number(s.questoes_acertos) || 0;
        questoes += Number(s.questoes_total) || 0;
      });

      const totalRef = Math.max(topicosFilhos.length, sessoesDaMateria.length, 1);
      const avancoPerc =
        sessoesDaMateria.length > 0
          ? Math.min(100, Math.round((concluidas.length / totalRef) * 100))
          : 0;
      const desempenhoPerc = questoes > 0 ? Math.round((acertos / questoes) * 100) : null;

      return {
        topicosFilhos,
        topicosCount: topicosFilhos.length,
        minutos,
        acertos,
        questoes,
        avancoPerc,
        desempenhoPerc,
        historico: concluidas,
      };
    },
    [sessoes]
  );

  // Resumo Geral de todas as disciplinas
  const resumoGeral = useMemo(() => {
    let totalMinutos = 0;
    let totalAcertos = 0;
    let totalQuestoes = 0;
    let somaAvanco = 0;

    paginaTree.forEach((d) => {
      const m = calcularMetricasNode(d);
      totalMinutos += m.minutos;
      totalAcertos += m.acertos;
      totalQuestoes += m.questoes;
      somaAvanco += m.avancoPerc;
    });

    const avancoGeral =
      paginaTree.length > 0 ? Math.round(somaAvanco / paginaTree.length) : 0;
    const desempenhoGeral =
      totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : null;
    const totalTopicos = countAllTopics(paginaTree) || paginaTree.length;

    return {
      disciplinasCount: paginaTree.length,
      topicosCount: totalTopicos,
      minutos: totalMinutos,
      acertos: totalAcertos,
      questoes: totalQuestoes,
      avancoPerc: avancoGeral,
      desempenhoPerc: desempenhoGeral,
    };
  }, [paginaTree, calcularMetricasNode]);

  const handleCreateRootDisciplina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDiscNome.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('paginas').insert({
      user_id: user.id,
      title: novaDiscNome.trim(),
      emoji: '📘',
      parent_id: null,
    });

    if (error) {
      toast.error('Erro ao criar disciplina.');
    } else {
      toast.success(`Disciplina "${novaDiscNome}" criada!`);
      setNovaDiscNome('');
      setShowNewDiscForm(false);
      router.refresh();
    }
  };

  const handleCreateSubTopico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage || !novoTopicoNome.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('paginas').insert({
      user_id: user.id,
      title: novoTopicoNome.trim(),
      parent_id: selectedPage.id,
    });

    if (error) {
      toast.error('Erro ao adicionar tópico.');
    } else {
      toast.success('Tópico adicionado!');
      setNovoTopicoNome('');
      router.refresh();
    }
  };

  // =========================================================================
  // 1. QUANDO UMA DISCIPLINA OU TÓPICO ESTÁ SELECIONADO (?page=ID)
  // =========================================================================
  if (selectedPage && isMounted) {
    // Usa as métricas da disciplina raiz (se estiver em um sub-tópico, pega a raiz do caminho)
    const rootDisciplina = breadcrumbPath[0] || selectedPage;
    const m = calcularMetricasNode(rootDisciplina);

    return (
      <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-6.5rem)] w-full">
        {/* SIDEBAR DE ÁRVORE RECOLHÍVEL */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out flex-shrink-0',
            isSidebarOpen ? 'w-full lg:w-72 h-64 lg:h-[calc(100vh-6.5rem)]' : 'w-0 hidden lg:block overflow-hidden'
          )}
        >
          <div className="h-full rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <HierarchicalSidebar
              treeData={paginaTree}
              table="paginas"
              title="Estrutura"
              activeId={activeId}
              isMinimized={false}
              onToggleMinimize={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>

        {/* ÁREA PRINCIPAL DA DISCIPLINA SELECIONADA */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* BARRA SUPERIOR: Toggle + Breadcrumb + Alternador (Histórico vs Editor) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-card border border-border shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium text-muted-foreground no-scrollbar">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                title={isSidebarOpen ? 'Ocultar árvore lateral' : 'Mostrar árvore lateral'}
              >
                {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </Button>

              <div className="h-4 w-px bg-border flex-shrink-0" />

              <Link
                href="/disciplinas"
                className="hover:text-foreground flex items-center gap-1.5 transition-colors flex-shrink-0 font-semibold"
              >
                <FolderTree className="w-3.5 h-3.5 text-emerald-500" />
                <span>Todas as Disciplinas</span>
              </Link>

              {breadcrumbPath.map((node, index) => (
                <React.Fragment key={node.id}>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                  <Link
                    href={`/disciplinas?page=${node.id}`}
                    className={cn(
                      'px-2 py-0.5 rounded-md transition-colors truncate max-w-[180px]',
                      index === breadcrumbPath.length - 1
                        ? 'font-bold text-foreground bg-secondary'
                        : 'hover:text-foreground hover:bg-secondary/40'
                    )}
                  >
                    {node.title}
                  </Link>
                </React.Fragment>
              ))}
            </div>

            {/* Alternador: Histórico & Tópicos vs Caderno de Resumos */}
            <div className="flex items-center gap-2">
              <div className="inline-flex p-0.5 rounded-xl bg-secondary/60 border border-border text-xs">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('historico')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    activeSubTab === 'historico'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Histórico & Tópicos</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('editor')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    activeSubTab === 'editor'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Caderno de Resumos</span>
                </button>
              </div>

              <Button
                size="sm"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent('open-registro-estudo', {
                      detail: {
                        disciplinaId: String(rootDisciplina.id),
                        topico: selectedPage.id !== rootDisciplina.id ? selectedPage.title : '',
                      },
                    })
                  )
                }
                className="h-8 px-3 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Registrar Estudo</span>
              </Button>
            </div>
          </div>

          {/* ABA 1: HISTÓRICO DE REGISTROS, DESEMPENHO E TÓPICOS DO EDITAL */}
          {activeSubTab === 'historico' ? (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* 4 Cards de Métricas da Disciplina */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                    Avanço no Edital
                  </span>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${m.avancoPerc}%` }}
                      />
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
                    Questões Respondidas
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

              {/* Grid: Tópicos da Disciplina + Histórico de Registros */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Tópicos */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-card border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Tópicos de {rootDisciplina.title} ({m.topicosFilhos.length})
                    </h3>
                  </div>

                  <form onSubmit={handleCreateSubTopico} className="flex gap-2">
                    <Input
                      value={novoTopicoNome}
                      onChange={(e) => setNovoTopicoNome(e.target.value)}
                      placeholder="Adicionar novo tópico..."
                      className="h-9 text-xs bg-secondary/30 rounded-xl"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9 px-3 text-xs font-bold bg-emerald-500 text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </form>

                  <div className="divide-y divide-border/60 max-h-96 overflow-y-auto">
                    {m.topicosFilhos.length > 0 ? (
                      m.topicosFilhos.map((topico, idx) => (
                        <div
                          key={topico.id}
                          className="py-2.5 flex items-center justify-between gap-2 text-xs"
                        >
                          <Link
                            href={`/disciplinas?page=${topico.id}`}
                            onClick={() => setActiveSubTab('editor')}
                            className="font-medium text-foreground hover:text-emerald-400 truncate"
                          >
                            {idx + 1}. {topico.title}
                          </Link>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Link
                              href={`/disciplinas?page=${topico.id}`}
                              onClick={() => setActiveSubTab('editor')}
                            >
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-primary">
                                Abrir Nota
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent('open-registro-estudo', {
                                    detail: {
                                      disciplinaId: String(rootDisciplina.id),
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
                        Nenhum sub-tópico cadastrado nesta disciplina.
                      </p>
                    )}
                  </div>
                </div>

                {/* Histórico de Registros da Disciplina */}
                <div className="lg:col-span-7 p-5 rounded-2xl bg-card border border-border space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Histórico de Registros ({m.historico.length})
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
                        Clique em &ldquo;+ Registrar Estudo&rdquo; acima para gravar seu avanço!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ABA 2: O EDITOR DE RESUMOS TIPTAP */
            <div className="flex-1 min-h-[550px] rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
              <TextEditor
                key={selectedPage.id}
                initialContent={selectedPage.content ?? null}
                onSave={handleSave}
                onClose={() => router.push('/disciplinas')}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. VISÃO PRINCIPAL DE "/disciplinas" (IGUAL AO PRINT 3)
  // =========================================================================
  const disciplinasFiltradas = paginaTree.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Disciplinas
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          As disciplinas, o histórico de progresso e os cadernos de estudo
        </p>
      </div>

      {/* BANNER SUPERIOR CONSOLIDADO (IGUAL AO PRINT 3) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl flex-shrink-0">
            📚
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-foreground">
                Base Geral de Disciplinas
              </h2>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                ✓ ATIVO
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Todas as matérias sincronizadas com seus planos e ciclos
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <strong className="text-foreground">{resumoGeral.disciplinasCount}</strong> disciplinas
              </span>
              <span className="flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5" />
                <strong className="text-foreground">{resumoGeral.topicosCount}</strong> tópicos
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 lg:border-l lg:border-border lg:pl-6">
          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Avanço no Edital
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${resumoGeral.avancoPerc}%` }}
                />
              </div>
              <span className="text-sm font-extrabold">{resumoGeral.avancoPerc}%</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Horas de Estudo
            </span>
            <span className="text-sm font-extrabold block mt-1">
              {formatarHoras(resumoGeral.minutos)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Questões
            </span>
            <span className="text-sm font-extrabold block mt-1">
              {resumoGeral.questoes > 0 ? resumoGeral.questoes : '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase text-muted-foreground block">
              Desempenho
            </span>
            <span
              className={cn(
                'text-sm font-extrabold block mt-1',
                resumoGeral.desempenhoPerc !== null ? 'text-emerald-400' : 'text-muted-foreground'
              )}
            >
              {resumoGeral.desempenhoPerc !== null ? `${resumoGeral.desempenhoPerc}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* BARRA DE BUSCA + BOTÃO NOVA DISCIPLINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar disciplina..."
            className="h-10 pl-10 text-xs bg-card border-border rounded-xl"
          />
        </div>

        {showNewDiscForm ? (
          <form onSubmit={handleCreateRootDisciplina} className="flex items-center gap-2">
            <Input
              value={novaDiscNome}
              onChange={(e) => setNovaDiscNome(e.target.value)}
              placeholder="Nome da nova disciplina..."
              className="h-10 w-64 text-xs bg-card rounded-xl"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 text-xs font-bold bg-emerald-500 text-white rounded-xl"
            >
              Salvar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowNewDiscForm(false)}
              className="h-10 w-10 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </form>
        ) : (
          <Button
            onClick={() => setShowNewDiscForm(true)}
            className="h-10 px-4 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Disciplina</span>
          </Button>
        )}
      </div>

      {/* TABELA DE TODAS AS DISCIPLINAS (IGUAL AO PRINT 3) */}
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
                <th className="py-3.5 px-4 text-right w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {disciplinasFiltradas.length > 0 ? (
                disciplinasFiltradas.map((disc, idx) => {
                  const md = calcularMetricasNode(disc);
                  const colorClass = ICON_COLORS[idx % ICON_COLORS.length];

                  return (
                    <tr
                      key={disc.id}
                      onClick={() => {
                        setActiveSubTab('historico');
                        router.push(`/disciplinas?page=${disc.id}`);
                      }}
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
                          <div>
                            <span className="font-bold text-foreground group-hover:text-emerald-400 transition-colors block truncate max-w-[340px]">
                              {disc.title}
                            </span>
                            {md.topicosCount > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {md.topicosCount} tópicos no caderno
                              </span>
                            )}
                          </div>
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

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setActiveSubTab('editor');
                              router.push(`/disciplinas?page=${disc.id}`);
                            }}
                            className="h-7 px-2.5 text-[11px] text-primary hover:bg-primary/10 rounded-lg"
                            title="Abrir Caderno / Editor de Texto"
                          >
                            Caderno
                          </Button>
                          <ChevronRight
                            onClick={() => {
                              setActiveSubTab('historico');
                              router.push(`/disciplinas?page=${disc.id}`);
                            }}
                            className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <p className="font-bold text-sm text-foreground">Nenhuma disciplina encontrada.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}