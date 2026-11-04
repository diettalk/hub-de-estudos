'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { linkPastaToConcurso, deleteItem } from '@/app/actions';
import {
  usePlanoAtivo,
  sessaoPertenceAoPlano,
  limparTagPlano,
} from '@/lib/plano-ativo';
import { type Node, type SessaoEstudo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ListTodo,
  Wand2,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  FileText,
  Play,
  Trash2,
  CheckCircle2,
  BookOpen,
  RotateCcw,
  Target,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditalVerticalizadoClientProps {
  disciplinaTree: Node[];
  sessoesConcluidas: SessaoEstudo[];
}

interface TopicoCheckState {
  teoria: boolean;
  revisao: boolean;
  questoes: boolean;
}

// Separa automaticamente um texto bruto de edital colado do PDF em tópicos individuais limpos
function extrairTopicosDoTextoEdital(textoBruto: string): string[] {
  if (!textoBruto.trim()) return [];

  // 1. Se o texto tem vários itens numerados na mesma linha (ex: "1. Atos. 2. Poderes. 3. Licitações")
  let processado = textoBruto
    .replace(/\r\n/g, '\n')
    .replace(/;\s*/g, '\n')
    .replace(/\s+(?=\d+(?:\.\d+)*\s*[-.)]\s*[A-ZÀ-Ú])/g, '\n')
    .replace(/\s+(?=\d+(?:\.\d+)+\s+[A-ZÀ-Ú])/g, '\n');

  const linhas = processado
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  return linhas;
}

export function EditalVerticalizadoClient({
  disciplinaTree,
  sessoesConcluidas,
}: EditalVerticalizadoClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo, recarregarPlanos } = usePlanoAtivo();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDiscs, setCollapsedDiscs] = useState<Record<number, boolean>>({});
  const [checksMap, setChecksMap] = useState<Record<number, TopicoCheckState>>({});

  // Modal de Importação de Edital em Massa
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importDisciplinaModo, setImportDisciplinaModo] = useState<'nova' | 'existente'>('nova');
  const [importDisciplinaId, setImportDisciplinaId] = useState<string>('');
  const [importNovaDisciplinaNome, setImportNovaDisciplinaNome] = useState('');
  const [importTextoBruto, setImportTextoBruto] = useState('');

  // Adicionar tópico avulso dentro de uma disciplina
  const [addingToDiscId, setAddingToDiscId] = useState<number | null>(null);
  const [novoTopicoTitulo, setNovoTopicoTitulo] = useState('');

  const storageKeyChecks = `hub_edital_checks_${planoAtivo?.id || 'geral'}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKeyChecks);
      if (saved) setChecksMap(JSON.parse(saved));
      else setChecksMap({});
    } catch {
      setChecksMap({});
    }
  }, [storageKeyChecks]);

  const handleToggleCheck = (
    topicoId: number,
    campo: 'teoria' | 'revisao' | 'questoes'
  ) => {
    setChecksMap((prev) => {
      const atual = prev[topicoId] || {
        teoria: false,
        revisao: false,
        questoes: false,
      };
      const proximo = {
        ...prev,
        [topicoId]: { ...atual, [campo]: !atual[campo] },
      };
      localStorage.setItem(storageKeyChecks, JSON.stringify(proximo));
      return proximo;
    });
  };

  // Filtra disciplinas que pertencem ao Plano Ativo
  const disciplinasDoPlano = useMemo(() => {
    if (planoAtivo && planoAtivo.disciplinaIds.length > 0) {
      return disciplinaTree.filter((d) =>
        planoAtivo.disciplinaIds.includes(Number(d.id))
      );
    }
    return disciplinaTree;
  }, [disciplinaTree, planoAtivo]);

  const sessoesDoPlano = useMemo(
    () =>
      sessoesConcluidas.filter((s) => sessaoPertenceAoPlano(s, planoAtivo)),
    [sessoesConcluidas, planoAtivo]
  );

  // Calcula estatísticas globais do Edital Verticalizado
  const metricasEdital = useMemo(() => {
    let totalTopicos = 0;
    let teoriaConcluida = 0;
    let revisaoConcluida = 0;
    let questoesConcluidas = 0;

    disciplinasDoPlano.forEach((disc) => {
      const filhos = Array.isArray(disc.children) ? disc.children : [];
      filhos.forEach((topico) => {
        totalTopicos += 1;
        const st = checksMap[Number(topico.id)];
        // Também considera teoria/questões concluídas se houver registro de estudo daquele tópico
        const estudouTopico = sessoesDoPlano.some((s) =>
          (s.foco_sugerido || '')
            .toLowerCase()
            .includes(topico.title.toLowerCase())
        );

        if (st?.teoria || estudouTopico) teoriaConcluida += 1;
        if (st?.revisao) revisaoConcluida += 1;
        if (st?.questoes) questoesConcluidas += 1;
      });
    });

    const percAvanco =
      totalTopicos > 0 ? Math.round((teoriaConcluida / totalTopicos) * 100) : 0;

    return {
      totalTopicos,
      teoriaConcluida,
      revisaoConcluida,
      questoesConcluidas,
      percAvanco,
    };
  }, [disciplinasDoPlano, checksMap, sessoesDoPlano]);

  // Prévia em tempo real dos tópicos extraídos no Modal de Importação
  const topicosExtraidosPreview = useMemo(
    () => extrairTopicosDoTextoEdital(importTextoBruto),
    [importTextoBruto]
  );

  const handleConfirmarImportacaoMassa = (e: React.FormEvent) => {
    e.preventDefault();
    if (topicosExtraidosPreview.length === 0) {
      toast.error('Cole o conteúdo do edital para extrair os tópicos.');
      return;
    }

    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let targetDiscId: number | null = null;

      if (importDisciplinaModo === 'nova') {
        if (!importNovaDisciplinaNome.trim()) {
          toast.error('Digite o nome da disciplina.');
          return;
        }
        const { data: novaDisc, error: discErr } = await supabase
          .from('paginas')
          .insert({
            user_id: user.id,
            title: importNovaDisciplinaNome.trim(),
            emoji: '📘',
            parent_id: null,
          })
          .select('id')
          .single();

        if (discErr || !novaDisc) {
          toast.error('Erro ao criar a disciplina.');
          return;
        }
        targetDiscId = novaDisc.id;

        if (planoAtivo) {
          await linkPastaToConcurso(planoAtivo.id, novaDisc.id);
        }
      } else {
        if (!importDisciplinaId) {
          toast.error('Selecione uma disciplina existente.');
          return;
        }
        targetDiscId = Number(importDisciplinaId);
      }

      const linhasParaInserir = topicosExtraidosPreview.map((titulo) => ({
        user_id: user.id,
        title: titulo.slice(0, 240),
        parent_id: targetDiscId,
        emoji: '📄',
      }));

      const { error: insertErr } = await supabase
        .from('paginas')
        .insert(linhasParaInserir);

      if (insertErr) {
        toast.error('Erro ao importar tópicos.');
      } else {
        toast.success(
          `${linhasParaInserir.length} tópicos do edital importados com sucesso!`
        );
        setImportTextoBruto('');
        setImportNovaDisciplinaNome('');
        setImportModalOpen(false);
        recarregarPlanos();
        router.refresh();
      }
    });
  };

  const handleAddTopicoAvulso = async (discId: number) => {
    if (!novoTopicoTitulo.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('paginas').insert({
      user_id: user.id,
      title: novoTopicoTitulo.trim(),
      parent_id: discId,
      emoji: '📄',
    });

    if (!error) {
      toast.success('Tópico adicionado ao edital!');
      setNovoTopicoTitulo('');
      setAddingToDiscId(null);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Edital Verticalizado
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Controle cirúrgico de cada tópico do edital: Teoria, Revisão, Questões e Desempenho
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setImportModalOpen(true)}
          className="self-start sm:self-auto h-9 px-4 text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
        >
          <Wand2 className="w-4 h-4" />
          <span>Importar Edital em Massa</span>
        </Button>
      </div>

      {/* 4 CARDS DE DOMÍNIO DO EDITAL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Avanço no Edital
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${metricasEdital.percAvanco}%` }}
              />
            </div>
            <span className="text-xl font-extrabold">{metricasEdital.percAvanco}%</span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            {metricasEdital.teoriaConcluida} de {metricasEdital.totalTopicos} tópicos estudados
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Teoria Fechada
            </span>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-extrabold text-foreground block mt-2">
            {metricasEdital.teoriaConcluida}
          </span>
          <span className="text-[11px] text-muted-foreground">tópicos com teoria vista</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Tópicos Revisados
            </span>
            <RotateCcw className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-foreground block mt-2">
            {metricasEdital.revisaoConcluida}
          </span>
          <span className="text-[11px] text-muted-foreground">tópicos com revisão batida</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Questões Feitas
            </span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-2xl font-extrabold text-foreground block mt-2">
            {metricasEdital.questoesConcluidas}
          </span>
          <span className="text-[11px] text-muted-foreground">tópicos treinados em questões</span>
        </div>
      </div>

      {/* BUSCA RÁPIDA DE TÓPICOS */}
      <div className="relative w-full sm:w-96">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar disciplina ou tópico do edital..."
          className="h-10 pl-10 text-xs bg-card border-border rounded-xl"
        />
      </div>

      {/* LISTA DE DISCIPLINAS E TABELA VERTICALIZADA DE TÓPICOS */}
      <div className="space-y-4">
        {disciplinasDoPlano.length > 0 ? (
          disciplinasDoPlano.map((disc) => {
            const discId = Number(disc.id);
            const isCollapsed = Boolean(collapsedDiscs[discId]);
            const topicosOriginais = Array.isArray(disc.children) ? disc.children : [];
            const topicos = searchQuery.trim()
              ? topicosOriginais.filter((t) =>
                  t.title.toLowerCase().includes(searchQuery.toLowerCase())
                )
              : topicosOriginais;

            if (
              searchQuery.trim() &&
              topicos.length === 0 &&
              !disc.title.toLowerCase().includes(searchQuery.toLowerCase())
            ) {
              return null;
            }

            const concluidosNaDisc = topicosOriginais.filter(
              (t) => checksMap[Number(t.id)]?.teoria
            ).length;
            const percDisc =
              topicosOriginais.length > 0
                ? Math.round((concluidosNaDisc / topicosOriginais.length) * 100)
                : 0;

            return (
              <div
                key={disc.id}
                className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden"
              >
                {/* Cabeçalho da Disciplina */}
                <div
                  onClick={() =>
                    setCollapsedDiscs((prev) => ({ ...prev, [discId]: !prev[discId] }))
                  }
                  className="p-4 bg-secondary/40 border-b border-border/60 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className="text-base">{disc.emoji || '📘'}</span>
                    <h2 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                      {disc.title}
                    </h2>
                    <Badge variant="secondary" className="text-[10px]">
                      {topicosOriginais.length} tópicos
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${percDisc}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold">{percDisc}%</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddingToDiscId(addingToDiscId === discId ? null : discId);
                        setCollapsedDiscs((prev) => ({ ...prev, [discId]: false }));
                      }}
                      className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1"
                    >
                      <Plus className="w-3 h-3 text-emerald-500" />
                      <span>Tópico</span>
                    </Button>
                  </div>
                </div>

                {/* Input rápido para adicionar tópico manual */}
                {addingToDiscId === discId && (
                  <div className="p-3 bg-secondary/20 border-b border-border flex items-center gap-2">
                    <Input
                      value={novoTopicoTitulo}
                      onChange={(e) => setNovoTopicoTitulo(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTopicoAvulso(discId);
                      }}
                      placeholder="Digite o nome do novo tópico do edital..."
                      className="h-8 text-xs bg-background rounded-lg flex-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddTopicoAvulso(discId)}
                      className="h-8 px-3 text-xs font-bold bg-emerald-500 text-white rounded-lg"
                    >
                      Adicionar
                    </Button>
                  </div>
                )}

                {/* Tabela Verticalizada de Tópicos */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    {topicos.length > 0 ? (
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/20 border-b border-border/60">
                          <tr>
                            <th className="py-2.5 px-5">Tópico do Edital</th>
                            <th className="py-2.5 px-3 text-center w-24">Teoria</th>
                            <th className="py-2.5 px-3 text-center w-24">Revisão</th>
                            <th className="py-2.5 px-3 text-center w-24">Questões</th>
                            <th className="py-2.5 px-3 text-center w-32">Desempenho</th>
                            <th className="py-2.5 px-4 text-right w-36">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {topicos.map((topico, idx) => {
                            const tid = Number(topico.id);
                            const st = checksMap[tid] || {
                              teoria: false,
                              revisao: false,
                              questoes: false,
                            };

                            // Cruza questões feitas neste tópico específico
                            const sessoesDoTopico = sessoesDoPlano.filter((s) =>
                              (s.foco_sugerido || '')
                                .toLowerCase()
                                .includes(topico.title.toLowerCase())
                            );
                            let ac = 0;
                            let tot = 0;
                            sessoesDoTopico.forEach((s) => {
                              ac += Number(s.questoes_acertos) || 0;
                              tot += Number(s.questoes_total) || 0;
                            });
                            const percTopico = tot > 0 ? Math.round((ac / tot) * 100) : null;

                            return (
                              <tr
                                key={topico.id}
                                className={cn(
                                  'hover:bg-secondary/20 transition-colors group',
                                  st.teoria && 'bg-emerald-500/[0.03]'
                                )}
                              >
                                <td className="py-3 px-5">
                                  <span
                                    className={cn(
                                      'font-medium text-foreground',
                                      st.teoria && 'text-emerald-400 font-semibold'
                                    )}
                                  >
                                    {idx + 1}. {topico.title}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <Checkbox
                                    checked={st.teoria}
                                    onCheckedChange={() => handleToggleCheck(tid, 'teoria')}
                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                  />
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <Checkbox
                                    checked={st.revisao}
                                    onCheckedChange={() => handleToggleCheck(tid, 'revisao')}
                                    className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                                  />
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <Checkbox
                                    checked={st.questoes}
                                    onCheckedChange={() => handleToggleCheck(tid, 'questoes')}
                                    className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                  />
                                </td>

                                <td className="py-3 px-3 text-center font-mono">
                                  {percTopico !== null ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-bold border-emerald-500/40 text-emerald-400"
                                    >
                                      {ac}/{tot} ({percTopico}%)
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Link
                                      href={`/disciplinas?page=${topico.id}`}
                                      title="Abrir Caderno de Resumo deste tópico"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </Button>
                                    </Link>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        window.dispatchEvent(
                                          new CustomEvent('open-registro-estudo', {
                                            detail: {
                                              disciplinaId: String(disc.id),
                                              topico: topico.title,
                                            },
                                          })
                                        )
                                      }
                                      className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10"
                                      title="Registrar estudo deste tópico"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={async () => {
                                        if (confirm(`Excluir o tópico "${topico.title}"?`)) {
                                          await deleteItem('paginas', tid);
                                          router.refresh();
                                        }
                                      }}
                                      className="h-7 w-7 text-muted-foreground hover:text-rose-400 opacity-0 group-hover:opacity-100"
                                      title="Excluir tópico"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        Esta disciplina ainda não tem tópicos cadastrados. Clique em &ldquo;Importar Edital em Massa&rdquo; no topo!
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-14 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
            <ListTodo className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">
              Nenhuma disciplina vinculada a este plano ainda.
            </p>
            <Button
              onClick={() => setImportModalOpen(true)}
              className="h-9 px-5 text-xs font-bold bg-emerald-500 text-white rounded-xl gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Importar Disciplina e Tópicos do Edital</span>
            </Button>
          </div>
        )}
      </div>

      {/* MODAL IMPORTADOR INTELIGENTE DE EDITAL EM MASSA */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[780px] max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-emerald-500" />
                  <span>Importar Tópicos do Edital em Massa</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Cole o bloco de conteúdos copiado direto do PDF do edital que separamos todos os tópicos automaticamente!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmarImportacaoMassa}
              className="p-6 space-y-4 overflow-y-auto flex-1 text-xs"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportDisciplinaModo('nova')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl font-bold transition-all',
                    importDisciplinaModo === 'nova'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  Criar Nova Disciplina
                </button>
                <button
                  type="button"
                  onClick={() => setImportDisciplinaModo('existente')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl font-bold transition-all',
                    importDisciplinaModo === 'existente'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  Adicionar em Disciplina Existente
                </button>
              </div>

              {importDisciplinaModo === 'nova' ? (
                <div className="space-y-1.5">
                  <label className="font-semibold block">Nome da Nova Disciplina *</label>
                  <Input
                    value={importNovaDisciplinaNome}
                    onChange={(e) => setImportNovaDisciplinaNome(e.target.value)}
                    placeholder="Ex.: Direito Administrativo, Língua Portuguesa..."
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="font-semibold block">Selecione a Disciplina *</label>
                  <select
                    value={importDisciplinaId}
                    onChange={(e) => setImportDisciplinaId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-xs font-medium text-foreground"
                    required
                  >
                    <option value="">Escolha uma matéria...</option>
                    {disciplinasDoPlano.map((d) => (
                      <option key={d.id} value={String(d.id)} className="bg-card">
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold block">
                  Cole aqui o conteúdo programático copiado do Edital (PDF) *
                </label>
                <textarea
                  rows={6}
                  value={importTextoBruto}
                  onChange={(e) => setImportTextoBruto(e.target.value)}
                  placeholder="Ex.: 1. Compreensão e interpretação de textos. 2. Tipologia textual. 3. Ortografia oficial. 4. Acentuação gráfica..."
                  className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Prévia dos tópicos detectados */}
              {topicosExtraidosPreview.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/30 space-y-2">
                  <span className="font-bold text-emerald-400 block">
                    ✓ {topicosExtraidosPreview.length} tópicos identificados automaticamente:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-[11px] text-muted-foreground">
                    {topicosExtraidosPreview.map((t, i) => (
                      <div key={i} className="truncate">
                        • {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setImportModalOpen(false)}
                  className="h-9 text-xs rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-9 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Importar {topicosExtraidosPreview.length} Tópicos</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}