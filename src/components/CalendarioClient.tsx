'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCadernoErro,
  updateCadernoErro,
  deleteCadernoErro,
} from '@/app/caderno-erros/actions';
import { MOTIVOS_ERRO } from '@/lib/caderno-erros';
import { usePlanoAtivo, limparTagPlano } from '@/lib/plano-ativo';
import { type CadernoErro, type Node, type Disciplina } from '@/lib/types';
import { DisciplinaCombobox } from './DisciplinaCombobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  NotebookPen,
  Plus,
  Search,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  X,
  Check,
  Loader2,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CadernoErrosClientProps {
  erros: CadernoErro[];
  disciplinaTree: Node[];
}

export function CadernoErrosClient({ erros, disciplinaTree }: CadernoErrosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDisciplinaFilter, setSelectedDisciplinaFilter] = useState<string>('all');
  const [selectedMotivoFilter, setSelectedMotivoFilter] = useState<string>('all');

  // Modo Revisão Ativa (oculta o bloco de Aprendizado até clicar para revelar)
  const [modoTreino, setModoTreino] = useState(false);
  const [reveladosIds, setReveladosIds] = useState<number[]>([]);

  // Modal de Criar / Editar Erro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingErro, setEditingErro] = useState<CadernoErro | null>(null);

  // Estados do formulário
  const [formDisciplinaId, setFormDisciplinaId] = useState<number | null>(null);
  const [formDisciplinaNome, setFormDisciplinaNome] = useState('');
  const [formAssunto, setFormAssunto] = useState('');
  const [formBanca, setFormBanca] = useState('');
  const [formAno, setFormAno] = useState('');
  const [formMotivo, setFormMotivo] = useState<string>(MOTIVOS_ERRO[0]?.value || 'lacuna_teorica');
  const [formEnunciado, setFormEnunciado] = useState('');
  const [formOQueErrei, setFormOQueErrei] = useState('');
  const [formAprendizado, setFormAprendizado] = useState('');

  // Filtra a árvore de disciplinas para o Plano Ativo
  const disciplinaTreeDoPlano = useMemo(() => {
    if (planoAtivo && planoAtivo.disciplinaIds.length > 0) {
      return disciplinaTree.filter((d) => planoAtivo.disciplinaIds.includes(Number(d.id)));
    }
    return disciplinaTree;
  }, [disciplinaTree, planoAtivo]);

  // Filtra os erros que pertencem ao Plano Ativo
  const errosDoPlano = useMemo(() => {
    if (!planoAtivo) return erros;

    return erros.filter((erro) => {
      // 1. Verifica carimbo explícito [PLANO:ID] no assunto ou enunciado
      const texto = `${erro.assunto || ''} ${erro.enunciado || ''}`;
      const match = texto.match(/\[PLANO:(\d+)\]/);
      if (match) {
        return parseInt(match[1], 10) === planoAtivo.id;
      }

      // 2. Verifica se a disciplina_id está no plano
      if (erro.disciplina_id && planoAtivo.disciplinaIds.includes(Number(erro.disciplina_id))) {
        return true;
      }

      // 3. Verifica pelo nome da disciplina
      if (erro.disciplina_nome?.trim()) {
        const nomeNorm = erro.disciplina_nome.trim().toLowerCase();
        if (planoAtivo.disciplinaNomes.some((n) => n.toLowerCase() === nomeNorm)) {
          return true;
        }
      }

      return false;
    });
  }, [erros, planoAtivo]);

  // Aplica busca e filtros secundários (Disciplina e Motivo)
  const errosFiltrados = useMemo(() => {
    return errosDoPlano.filter((e) => {
      if (
        selectedDisciplinaFilter !== 'all' &&
        e.disciplina_nome !== selectedDisciplinaFilter
      ) {
        return false;
      }
      if (selectedMotivoFilter !== 'all' && e.motivo !== selectedMotivoFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        e.disciplina_nome?.toLowerCase().includes(q) ||
        e.assunto?.toLowerCase().includes(q) ||
        e.banca?.toLowerCase().includes(q) ||
        e.o_que_errei?.toLowerCase().includes(q) ||
        e.aprendizado?.toLowerCase().includes(q) ||
        e.enunciado?.toLowerCase().includes(q)
      );
    });
  }, [errosDoPlano, selectedDisciplinaFilter, selectedMotivoFilter, searchQuery]);

  // Estatísticas rápidas de diagnóstico no topo
  const diagnostico = useMemo(() => {
    const porMotivo: Record<string, number> = {};
    const porDisciplina: Record<string, number> = {};

    errosDoPlano.forEach((e) => {
      porMotivo[e.motivo] = (porMotivo[e.motivo] || 0) + 1;
      if (e.disciplina_nome) {
        porDisciplina[e.disciplina_nome] = (porDisciplina[e.disciplina_nome] || 0) + 1;
      }
    });

    const topMotivoEntry = Object.entries(porMotivo).sort((a, b) => b[1] - a[1])[0];
    const topDiscEntry = Object.entries(porDisciplina).sort((a, b) => b[1] - a[1])[0];

    const topMotivoLabel = topMotivoEntry
      ? MOTIVOS_ERRO.find((m) => m.value === topMotivoEntry[0])?.label || topMotivoEntry[0]
      : '—';

    return {
      total: errosDoPlano.length,
      maiorVilao: topMotivoLabel,
      maiorVilaoCount: topMotivoEntry ? topMotivoEntry[1] : 0,
      disciplinaCritica: topDiscEntry ? topDiscEntry[0] : '—',
      disciplinaCriticaCount: topDiscEntry ? topDiscEntry[1] : 0,
      disciplinasUnicas: Object.keys(porDisciplina),
    };
  }, [errosDoPlano]);

  const getMotivoLabel = (val: string) =>
    MOTIVOS_ERRO.find((m) => m.value === val)?.label || val;

  const handleOpenNew = () => {
    setEditingErro(null);
    const defaultDisc = disciplinaTreeDoPlano[0] || null;
    setFormDisciplinaId(defaultDisc ? Number(defaultDisc.id) : null);
    setFormDisciplinaNome(defaultDisc ? defaultDisc.title : '');
    setFormAssunto('');
    setFormBanca(planoAtivo?.banca || '');
    setFormAno(String(new Date().getFullYear()));
    setFormMotivo(MOTIVOS_ERRO[0]?.value || 'lacuna_teorica');
    setFormEnunciado('');
    setFormOQueErrei('');
    setFormAprendizado('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (erro: CadernoErro) => {
    setEditingErro(erro);
    setFormDisciplinaId(erro.disciplina_id);
    setFormDisciplinaNome(erro.disciplina_nome);
    setFormAssunto(limparTagPlano(erro.assunto));
    setFormBanca(erro.banca || '');
    setFormAno(erro.ano ? String(erro.ano) : '');
    setFormMotivo(erro.motivo);
    setFormEnunciado(erro.enunciado || '');
    setFormOQueErrei(erro.o_que_errei);
    setFormAprendizado(erro.aprendizado);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Deseja realmente excluir este registro do Caderno de Erros?')) return;
    startTransition(async () => {
      const res = await deleteCadernoErro(id);
      if (res.error) toast.error(res.error);
      else {
        toast.success('Erro excluído.');
        router.refresh();
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    if (editingErro) {
      fd.append('id', String(editingErro.id));
    }
    if (formDisciplinaId) {
      fd.append('disciplina_id', String(formDisciplinaId));
    }
    fd.append('disciplina_nome', formDisciplinaNome.trim());

    // Carimba o Plano Ativo no assunto se houver plano selecionado
    const assuntoComPlano = planoAtivo
      ? `[PLANO:${planoAtivo.id}] ${formAssunto.trim()}`
      : formAssunto.trim();

    fd.append('assunto', assuntoComPlano);
    fd.append('banca', formBanca.trim());
    fd.append('ano', formAno.trim());
    fd.append('motivo', formMotivo);
    fd.append('enunciado', formEnunciado.trim());
    fd.append('o_que_errei', formOQueErrei.trim());
    fd.append('aprendizado', formAprendizado.trim());

    const action = editingErro ? updateCadernoErro : createCadernoErro;
    startTransition(async () => {
      const res = await action(fd);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          editingErro
            ? 'Registro atualizado!'
            : 'Erro registrado e revisões (24h, 7d, 30d) agendadas!'
        );
        setIsModalOpen(false);
        router.refresh();
      }
    });
  };

  const toggleRevelar = (id: number) => {
    setReveladosIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Caderno de Erros
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Transforme cada questão errada em aprendizado ativo e revisões automáticas
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setModoTreino(!modoTreino);
              setReveladosIds([]);
            }}
            className={cn(
              'h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl',
              modoTreino && 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
            )}
          >
            {modoTreino ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{modoTreino ? 'Mostrar Respostas' : 'Modo Treino (Ocultar)'}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenNew}
            className="h-9 px-4 text-xs font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Erro</span>
          </Button>
        </div>
      </div>

      {/* 3 CARDS DE DIAGNÓSTICO DE ERROS DO PLANO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Erros Mapeados no Plano
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <NotebookPen className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground block mt-2">
            {diagnostico.total}
          </span>
          <span className="text-[11px] text-muted-foreground">
            questões analisadas com revisão agendada
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Principal Causa de Erro
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-lg font-extrabold text-amber-400 block mt-2 truncate">
            {diagnostico.maiorVilao}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {diagnostico.maiorVilaoCount > 0
              ? `${diagnostico.maiorVilaoCount} ocorrências registradas`
              : 'Sem registros ainda'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-muted-foreground">
              Disciplina Mais Crítica
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <span className="text-lg font-extrabold text-rose-400 block mt-2 truncate">
            {diagnostico.disciplinaCritica}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {diagnostico.disciplinaCriticaCount > 0
              ? `${diagnostico.disciplinaCriticaCount} erros concentrados`
              : 'Sem registros ainda'}
          </span>
        </div>
      </div>

      {/* BARRA DE BUSCA E FILTROS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por assunto, enunciado, banca ou aprendizado..."
            className="h-9 pl-9 text-xs bg-background/80 rounded-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDisciplinaFilter}
            onChange={(e) => setSelectedDisciplinaFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all" className="bg-card">Todas as Disciplinas</option>
            {diagnostico.disciplinasUnicas.map((d) => (
              <option key={d} value={d} className="bg-card">{d}</option>
            ))}
          </select>

          <select
            value={selectedMotivoFilter}
            onChange={(e) => setSelectedMotivoFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground focus:outline-none"
          >
            <option value="all" className="bg-card">Todos os Motivos</option>
            {MOTIVOS_ERRO.map((m) => (
              <option key={m.value} value={m.value} className="bg-card">{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTA DE CARDS DO CADERNO DE ERROS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {errosFiltrados.length > 0 ? (
          errosFiltrados.map((erro) => {
            const ocultarAprendizado = modoTreino && !reveladosIds.includes(erro.id);

            return (
              <div
                key={erro.id}
                className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/30 transition-all flex flex-col justify-between gap-4 shadow-xs"
              >
                <div className="space-y-3">
                  {/* Topo do Card: Disciplina, Motivo, Banca e Ações */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                          {erro.disciplina_nome}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-400">
                          {getMotivoLabel(erro.motivo)}
                        </Badge>
                        {(erro.banca || erro.ano) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {[erro.banca, erro.ano].filter(Boolean).join(' • ')}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-foreground pt-1">
                        {limparTagPlano(erro.assunto)}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(erro)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Editar erro"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(erro.id)}
                        disabled={isPending}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Excluir erro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Enunciado (se houver) */}
                  {erro.enunciado && (
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs text-muted-foreground leading-relaxed">
                      <span className="text-[10px] font-bold uppercase text-foreground/70 block mb-0.5">
                        Contexto / Enunciado:
                      </span>
                      {erro.enunciado}
                    </div>
                  )}

                  {/* O Que Errei */}
                  <div className="p-3 rounded-xl bg-rose-500/[0.06] border border-rose-500/25 text-xs leading-relaxed">
                    <span className="text-[10px] font-bold uppercase text-rose-400 flex items-center gap-1 mb-0.5">
                      <AlertTriangle className="w-3 h-3" /> O que eu confundi / errei:
                    </span>
                    <p className="text-foreground/90">{erro.o_que_errei}</p>
                  </div>

                  {/* Aprendizado / Chave de Correção */}
                  <div
                    onClick={() => modoTreino && toggleRevelar(erro.id)}
                    className={cn(
                      'p-3.5 rounded-xl border text-xs leading-relaxed transition-all',
                      ocultarAprendizado
                        ? 'bg-secondary/60 border-dashed border-emerald-500/40 cursor-pointer text-center py-5'
                        : 'bg-emerald-500/[0.07] border-emerald-500/30'
                    )}
                  >
                    {ocultarAprendizado ? (
                      <div className="flex flex-col items-center justify-center gap-1 text-emerald-400 font-bold">
                        <Eye className="w-4 h-4" />
                        <span>Clique para revelar a Regra / Aprendizado</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1 mb-0.5">
                          <Lightbulb className="w-3 h-3" /> Aprendizado Definitivo (Não errar mais):
                        </span>
                        <p className="text-foreground font-medium">{erro.aprendizado}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    Registrado em {new Date(erro.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-emerald-500 font-semibold">
                    ✓ Revisões 24h/7d/30d ativas
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-14 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-2">
            <NotebookPen className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-bold text-foreground">
              Nenhum erro registrado {planoAtivo ? `no plano ${planoAtivo.nome}` : 'neste filtro'}.
            </p>
            <p className="text-xs text-muted-foreground">
              Clique em &ldquo;+ Registrar Erro&rdquo; no topo para cadastrar questões que você errou!
            </p>
          </div>
        )}
      </div>

      {/* MODAL AMPLO DE CADASTRO / EDIÇÃO DE ERRO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-[780px] max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
              <div>
                <h2 className="text-lg font-bold">
                  {editingErro ? 'Editar Registro de Erro' : 'Registrar Novo Erro no Caderno'}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ao salvar, o sistema agenda automaticamente revisões para 24h, 7d e 30d.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-6 space-y-1.5">
                  <label className="font-semibold block">Disciplina *</label>
                  <DisciplinaCombobox
                    disciplinaTree={disciplinaTreeDoPlano}
                    value={formDisciplinaId}
                    onSelect={(disc: Disciplina | null) => {
                      setFormDisciplinaId(disc ? disc.id : null);
                      setFormDisciplinaNome(disc ? disc.title : '');
                    }}
                    className="h-10 bg-secondary/30"
                  />
                  {!formDisciplinaId && (
                    <Input
                      value={formDisciplinaNome}
                      onChange={(e) => setFormDisciplinaNome(e.target.value)}
                      placeholder="Ou digite o nome da matéria..."
                      className="h-9 text-xs bg-secondary/20 rounded-xl mt-1.5"
                    />
                  )}
                </div>

                <div className="sm:col-span-6 space-y-1.5">
                  <label className="font-semibold block">Assunto / Tópico da Questão *</label>
                  <Input
                    value={formAssunto}
                    onChange={(e) => setFormAssunto(e.target.value)}
                    placeholder="Ex.: Controle de Constitucionalidade, Crase..."
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="font-semibold block">Motivo Principal do Erro *</label>
                  <select
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-secondary/30 text-xs font-medium text-foreground"
                  >
                    {MOTIVOS_ERRO.map((m) => (
                      <option key={m.value} value={m.value} className="bg-card">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="font-semibold block">Banca (opcional)</label>
                  <Input
                    value={formBanca}
                    onChange={(e) => setFormBanca(e.target.value)}
                    placeholder="Ex.: Cebraspe, FGV..."
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1.5">
                  <label className="font-semibold block">Ano (opcional)</label>
                  <Input
                    type="number"
                    value={formAno}
                    onChange={(e) => setFormAno(e.target.value)}
                    placeholder="2026"
                    className="h-10 text-xs bg-secondary/30 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold block">Resumo do Enunciado (opcional)</label>
                <textarea
                  rows={2}
                  value={formEnunciado}
                  onChange={(e) => setFormEnunciado(e.target.value)}
                  placeholder="Cole o trecho da questão ou o comando principal..."
                  className="w-full rounded-xl border border-border bg-secondary/30 p-3 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-rose-400 block">
                    O que eu errei / Pegadinha da banca *
                  </label>
                  <textarea
                    rows={4}
                    value={formOQueErrei}
                    onChange={(e) => setFormOQueErrei(e.target.value)}
                    placeholder="Ex.: Achei que o prazo era de 15 dias úteis, mas a lei fala em dias corridos..."
                    className="w-full rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-3 text-xs resize-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-emerald-400 block">
                    Aprendizado / Como acertar na próxima *
                  </label>
                  <textarea
                    rows={4}
                    value={formAprendizado}
                    onChange={(e) => setFormAprendizado(e.target.value)}
                    placeholder="Ex.: Art. 12: O prazo é improrrogável e contado em dias corridos!"
                    className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] p-3 text-xs resize-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
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
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingErro ? 'Salvar Alterações' : 'Salvar no Caderno'}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}