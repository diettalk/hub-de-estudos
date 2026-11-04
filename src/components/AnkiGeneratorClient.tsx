'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  generateAnkiCards,
  saveAnkiDeck,
  deleteAnkiDeck,
  updateAnkiDeck,
} from '@/app/actions';
import { usePlanoAtivo, limparTagPlano } from '@/lib/plano-ativo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BrainCircuit,
  Wand2,
  Save,
  Copy,
  Download,
  Trash2,
  Play,
  Edit,
  Plus,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Flashcard = {
  question: string;
  answer: string;
};

type Deck = {
  id: number;
  title: string;
  created_at: string;
  cards: Flashcard[];
};

type PaginaResumo = {
  id: number;
  title: string;
  parent_id: number | null;
  content: any;
};

// Extrai texto puro de um documento JSON do Tiptap
function extrairTextoTiptap(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') {
    try {
      return extrairTextoTiptap(JSON.parse(node));
    } catch {
      return node;
    }
  }
  let texto = '';
  if (node.text) texto += node.text + ' ';
  if (Array.isArray(node.content)) {
    node.content.forEach((child: any) => {
      texto += extrairTextoTiptap(child) + '\n';
    });
  }
  return texto.replace(/\n{3,}/g, '\n\n').trim();
}

export function AnkiGeneratorClient({
  initialDecks = [],
  paginas = [],
}: {
  initialDecks?: Deck[];
  paginas?: PaginaResumo[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { planoAtivo } = usePlanoAtivo();

  // Abas principais: 'gerador' | 'decks' | 'estudo' | 'editar_deck'
  const [activeView, setActiveView] = useState<'gerador' | 'estudo' | 'editar_deck'>('gerador');

  // Estados do Gerador IA
  const [sourceText, setSourceText] = useState('');
  const [numCards, setNumCards] = useState(8);
  const [cardStyle, setCardStyle] = useState<'objetivo' | 'cespe' | 'pratico'>('objetivo');
  const [deckTitleInput, setDeckTitleInput] = useState('');
  const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);

  // Estados do Modo Estudo Interativo (Flip Card)
  const [studyingDeck, setStudyingDeck] = useState<Deck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [acertosSessao, setAcertosSessao] = useState(0);

  // Estados de Edição de um Deck Salvo
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [editDeckTitle, setEditDeckTitle] = useState('');
  const [editDeckCards, setEditDeckCards] = useState<Flashcard[]>([]);

  // Filtra decks do Plano Ativo (ou mostra todos se Visão Geral)
  const decksFiltrados = useMemo(() => {
    if (!planoAtivo) return initialDecks;
    return initialDecks.filter((d) => {
      const match = d.title.match(/\[PLANO:(\d+)\]/);
      if (match) return parseInt(match[1], 10) === planoAtivo.id;
      return true;
    });
  }, [initialDecks, planoAtivo]);

  const paginasComConteudo = useMemo(
    () =>
      paginas.filter((p) => {
        const txt = extrairTextoTiptap(p.content);
        return txt.length > 20;
      }),
    [paginas]
  );

  const handleImportarDaPagina = (paginaId: string) => {
    if (!paginaId) return;
    const pag = paginas.find((p) => String(p.id) === paginaId);
    if (!pag) return;
    const texto = extrairTextoTiptap(pag.content);
    if (!texto) {
      toast.error('Esta página ainda não possui texto escrito.');
      return;
    }
    setSourceText(texto.slice(0, 20000));
    setDeckTitleInput(pag.title);
    toast.success(`Conteúdo de "${pag.title}" importado para o gerador!`);
  };

  const handleGenerate = () => {
    if (!sourceText.trim()) {
      toast.error('Cole algum texto ou importe de um caderno antes de gerar.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('sourceText', sourceText);
      formData.append('numCards', String(numCards));
      formData.append('cardStyle', cardStyle);

      const result = await generateAnkiCards(formData);
      if (result.error) {
        toast.error(`Erro da IA: ${result.error}`);
      } else if (result.data) {
        setGeneratedCards(result.data);
        toast.success(`${result.data.length} flashcards criados pela IA!`);
      }
    });
  };

  const handleSaveGeneratedDeck = () => {
    if (generatedCards.length === 0) return;
    const rawTitle =
      deckTitleInput.trim() || `Deck de Estudo (${new Date().toLocaleDateString('pt-BR')})`;
    const finalTitle = planoAtivo ? `[PLANO:${planoAtivo.id}] ${rawTitle}` : rawTitle;

    startTransition(async () => {
      const res = await saveAnkiDeck(finalTitle, generatedCards);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Deck "${rawTitle}" salvo na sua coleção!`);
        setDeckTitleInput('');
        router.refresh();
      }
    });
  };

  const handleExportTxt = (title: string, cardsToExport: Flashcard[]) => {
    const content = cardsToExport
      .map(
        (c) =>
          `${c.question.replace(/\t|\n/g, ' ')}\t${c.answer.replace(/\t|\n/g, '<br>')}`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${limparTagPlano(title).replace(/\s+/g, '_')}_anki.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Arquivo .txt baixado! Basta importar no aplicativo Anki.');
  };

  const handleStartStudy = (deck: Deck) => {
    if (!deck.cards || deck.cards.length === 0) {
      toast.error('Este deck não possui cartões.');
      return;
    }
    setStudyingDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setAcertosSessao(0);
    setActiveView('estudo');
  };

  const handleOpenEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setEditDeckTitle(limparTagPlano(deck.title));
    setEditDeckCards([...(deck.cards || [])]);
    setActiveView('editar_deck');
  };

  const handleSaveEditedDeck = () => {
    if (!editingDeck) return;
    const match = editingDeck.title.match(/\[PLANO:(\d+)\]/);
    const prefix = match ? `[PLANO:${match[1]}] ` : planoAtivo ? `[PLANO:${planoAtivo.id}] ` : '';
    const finalTitle = `${prefix}${editDeckTitle.trim() || 'Deck sem título'}`;

    startTransition(async () => {
      const res = await updateAnkiDeck(editingDeck.id, finalTitle, editDeckCards);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Deck atualizado com sucesso!');
        setActiveView('gerador');
        router.refresh();
      }
    });
  };

  const handleDeleteDeck = (deck: Deck) => {
    const cleanName = limparTagPlano(deck.title);
    if (!confirm(`Deseja realmente apagar o deck "${cleanName}"?`)) return;
    startTransition(async () => {
      const res = await deleteAnkiDeck(deck.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success(`Deck "${cleanName}" removido.`);
        router.refresh();
      }
    });
  };

  // =========================================================================
  // MODO 1: ESTUDO ATIVO DE FLASHCARDS (VIRAR CARTÃO FRENTE / VERSO)
  // =========================================================================
  if (activeView === 'estudo' && studyingDeck) {
    const total = studyingDeck.cards.length;
    const cardAtual = studyingDeck.cards[currentCardIndex];
    const progressoPerc = Math.round(((currentCardIndex + 1) / total) * 100);

    const avancarCard = (acertou: boolean) => {
      if (acertou) setAcertosSessao((prev) => prev + 1);
      setIsFlipped(false);
      if (currentCardIndex + 1 < total) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        toast.success(
          `Deck concluído! Você acertou ${acertosSessao + (acertou ? 1 : 0)} de ${total} cartões!`
        );
        setActiveView('gerador');
      }
    };

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView('gerador')}
            className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar aos Decks</span>
          </Button>

          <div className="text-center">
            <h2 className="text-sm sm:text-base font-extrabold text-foreground">
              {limparTagPlano(studyingDeck.title)}
            </h2>
            <span className="text-xs text-muted-foreground">
              Cartão {currentCardIndex + 1} de {total}
            </span>
          </div>

          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
            Acertos: {acertosSessao}
          </Badge>
        </div>

        {/* Barra de Progresso */}
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressoPerc}%` }}
          />
        </div>

        {/* O CARTÃO INTERATIVO (FRENTE E VERSO) */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={cn(
            'min-h-[340px] p-8 sm:p-10 rounded-3xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-lg select-none',
            isFlipped
              ? 'bg-emerald-500/[0.06] border-emerald-500/40'
              : 'bg-card border-border hover:border-emerald-500/30'
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>{isFlipped ? '💡 Resposta (Verso)' : '❓ Pergunta (Frente)'}</span>
            <span className="flex items-center gap-1 text-emerald-500">
              <RotateCw className="w-3.5 h-3.5" />
              Clique para virar
            </span>
          </div>

          <div className="my-auto py-8 text-center">
            <p className="text-lg sm:text-xl font-bold text-foreground leading-relaxed whitespace-pre-wrap">
              {isFlipped ? cardAtual.answer : cardAtual.question}
            </p>
          </div>

          <div className="text-center text-[11px] text-muted-foreground">
            {!isFlipped
              ? 'Tente responder mentalmente antes de clicar para revelar o verso'
              : 'Avalie seu domínio abaixo para avançar ao próximo cartão'}
          </div>
        </div>

        {/* BOTÕES DE AVALIAÇÃO */}
        {isFlipped ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              onClick={() => avancarCard(false)}
              className="h-11 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold text-xs"
            >
              Errei (Revisar)
            </Button>
            <Button
              onClick={() => avancarCard(true)}
              className="h-11 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-bold text-xs"
            >
              Difícil
            </Button>
            <Button
              onClick={() => avancarCard(true)}
              className="h-11 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-xs"
            >
              Bom
            </Button>
            <Button
              onClick={() => avancarCard(true)}
              className="h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs"
            >
              Fácil (Dominei)
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              onClick={() => setIsFlipped(true)}
              className="h-11 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-2"
            >
              <RotateCw className="w-4 h-4" />
              <span>Mostrar Resposta</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // MODO 2: EDITOR DE DECK SALVO
  // =========================================================================
  if (activeView === 'editar_deck' && editingDeck) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setActiveView('gerador')}
              className="h-9 w-9 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-500 block">
                Editando Deck
              </span>
              <Input
                value={editDeckTitle}
                onChange={(e) => setEditDeckTitle(e.target.value)}
                className="h-9 text-base font-extrabold bg-card border-border rounded-xl mt-0.5 w-72 sm:w-96"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setEditDeckCards((prev) => [
                  ...prev,
                  { question: 'Nova pergunta...', answer: 'Nova resposta...' },
                ])
              }
              className="h-9 px-3.5 text-xs font-bold gap-1.5 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Cartão</span>
            </Button>

            <Button
              size="sm"
              disabled={isPending}
              onClick={handleSaveEditedDeck}
              className="h-9 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? 'Salvando...' : 'Salvar Alterações'}</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editDeckCards.map((card, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-card border border-border space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[10px] font-mono">
                  Cartão #{idx + 1}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setEditDeckCards((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-400">Pergunta (Frente)</label>
                <Textarea
                  value={card.question}
                  onChange={(e) => {
                    const next = [...editDeckCards];
                    next[idx].question = e.target.value;
                    setEditDeckCards(next);
                  }}
                  rows={2}
                  className="text-xs bg-secondary/30 rounded-xl resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-400">Resposta (Verso)</label>
                <Textarea
                  value={card.answer}
                  onChange={(e) => {
                    const next = [...editDeckCards];
                    next[idx].answer = e.target.value;
                    setEditDeckCards(next);
                  }}
                  rows={3}
                  className="text-xs bg-secondary/30 rounded-xl resize-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODO 3: TELA PRINCIPAL DO GERADOR ANKI COM IA + MEUS DECKS SALVOS
  // =========================================================================
  return (
    <div className="space-y-8">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Gerador Anki com IA
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold">
              {planoAtivo ? `🎯 ${planoAtivo.nome}` : '🌐 Todos os Planos'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Transforme seus resumos, leis e PDFs em flashcards prontos para estudo ativo
          </p>
        </div>
      </div>

      {/* GRID DO GERADOR: ENTRADA DE MATERIAL (ESQUERDA) + CARTÕES GERADOS (DIREITA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: CONFIGURAÇÃO E TEXTO BASE */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Material de Estudo Base
            </span>

            {/* Importar direto de uma página do Caderno de Disciplinas */}
            {paginasComConteudo.length > 0 && (
              <select
                onChange={(e) => handleImportarDaPagina(e.target.value)}
                defaultValue=""
                className="h-8 px-2.5 rounded-xl border border-border bg-secondary/40 text-xs font-medium text-foreground max-w-[240px]"
              >
                <option value="" disabled>
                  📥 Importar texto de um Caderno...
                </option>
                {paginasComConteudo.map((p) => (
                  <option key={p.id} value={String(p.id)} className="bg-card">
                    {p.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Textarea
            value={sourceText}
            maxLength={25000}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Cole aqui seu resumo, artigos de lei, jurisprudência ou importe de um caderno no seletor acima..."
            className="h-60 bg-secondary/20 border-border rounded-xl text-xs leading-relaxed resize-none"
          />

          {/* Opções de Estilo e Quantidade */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            <div className="sm:col-span-8 space-y-1.5">
              <label className="text-xs font-semibold block">Estilo de Cobrança da IA</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'objetivo', label: 'Direto' },
                  { id: 'cespe', label: 'Certo/Errado' },
                  { id: 'pratico', label: 'Casos/Prazos' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCardStyle(st.id as any)}
                    className={cn(
                      'py-2 px-2 rounded-xl text-xs font-bold border transition-all',
                      cardStyle === st.id
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-border bg-secondary/30 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="text-xs font-semibold block">Qtd. de Cards (1-50)</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={numCards}
                onChange={(e) =>
                  setNumCards(Math.min(50, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className="h-9 text-center font-bold text-xs bg-secondary/30 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-2 shadow-sm"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isPending ? 'A IA está gerando seus cards...' : 'Gerar Flashcards com IA'}</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSourceText('');
                setGeneratedCards([]);
              }}
              disabled={isPending}
              className="h-10 w-10 rounded-xl"
              title="Limpar tudo"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* COLUNA DIREITA: FLASHCARDS RECÉM-GERADOS */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Flashcards Gerados ({generatedCards.length})
            </span>

            {generatedCards.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportTxt(deckTitleInput || 'deck', generatedCards)}
                  className="h-8 px-3 text-xs rounded-xl gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar .txt (Anki)</span>
                </Button>
              </div>
            )}
          </div>

          {generatedCards.length > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/30 border border-border">
              <Input
                value={deckTitleInput}
                onChange={(e) => setDeckTitleInput(e.target.value)}
                placeholder="Nome do Deck (Ex.: Direito Constitucional - Art. 5º)"
                className="h-9 text-xs bg-background rounded-lg flex-1"
              />
              <Button
                size="sm"
                disabled={isPending}
                onClick={handleSaveGeneratedDeck}
                className="h-9 px-4 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Deck</span>
              </Button>
            </div>
          )}

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 flex-1">
            {generatedCards.length > 0 ? (
              generatedCards.map((card, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2 relative group text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-emerald-400">
                      Cartão #{idx + 1} — Pergunta
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGeneratedCards((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Textarea
                    value={card.question}
                    onChange={(e) => {
                      const next = [...generatedCards];
                      next[idx].question = e.target.value;
                      setGeneratedCards(next);
                    }}
                    rows={2}
                    className="bg-background/60 text-xs rounded-lg resize-none"
                  />
                  <span className="text-[10px] font-bold uppercase text-indigo-400 block pt-1">
                    Resposta
                  </span>
                  <Textarea
                    value={card.answer}
                    onChange={(e) => {
                      const next = [...generatedCards];
                      next[idx].answer = e.target.value;
                      setGeneratedCards(next);
                    }}
                    rows={2}
                    className="bg-background/60 text-xs rounded-lg resize-none"
                  />
                </div>
              ))
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-border/80 bg-secondary/10">
                <BrainCircuit className="w-8 h-8 text-emerald-500/60 mb-2" />
                <p className="text-xs font-bold text-foreground">
                  {isPending
                    ? 'Analisando o texto e elaborando questões...'
                    : 'Nenhum flashcard gerado ainda'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs">
                  Cole um texto à esquerda ou escolha uma página do seu caderno para gerar flashcards instantaneamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: COLEÇÃO DE DECKS SALVOS (COM BOTÃO ESTUDAR AGORA E EDITAR) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            <span>Meus Decks Salvos ({decksFiltrados.length})</span>
          </h2>
        </div>

        {decksFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {decksFiltrados.map((deck) => {
              const qtd = Array.isArray(deck.cards) ? deck.cards.length : 0;
              return (
                <div
                  key={deck.id}
                  className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                        {limparTagPlano(deck.title)}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] font-mono flex-shrink-0">
                        {qtd} cards
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Criado em {new Date(deck.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                    <Button
                      size="sm"
                      onClick={() => handleStartStudy(deck)}
                      className="flex-1 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Estudar Agora</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenEditDeck(deck)}
                      className="h-9 w-9 rounded-xl"
                      title="Editar cartões do deck"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleExportTxt(deck.title, deck.cards || [])}
                      className="h-9 w-9 rounded-xl"
                      title="Baixar arquivo .txt para Anki"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDeck(deck)}
                      disabled={isPending}
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                      title="Apagar deck"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center rounded-2xl border border-dashed border-border bg-card/40">
            <p className="text-xs font-bold text-muted-foreground">
              Nenhum deck salvo neste plano ainda. Gere seus primeiros flashcards acima e clique em &ldquo;Salvar Deck&rdquo;!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}