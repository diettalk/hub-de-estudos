'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { linkPastaToConcurso } from '@/app/actions';
import { type Disciplina } from '@/lib/types';
import { toast } from 'sonner';
import { Search, Plus, Check, X, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const CORES_ICONES = [
  { emoji: '⚖️', label: 'Direito', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { emoji: '🔤', label: 'Português', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
  { emoji: '🌐', label: 'Atualidades/DF', bg: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
  { emoji: '🩺', label: 'Saúde/Nutrição', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { emoji: '🏛️', label: 'Administração', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { emoji: '📘', label: 'Específicos', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
];

type LinkPastaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  concursoId: number | null;
  paginasDisponiveis: Disciplina[];
  jaVinculadasIds?: number[];
};

export function LinkPastaModal({
  isOpen,
  onClose,
  concursoId,
  paginasDisponiveis,
  jaVinculadasIds = [],
}: LinkPastaModalProps) {
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [novaDisciplinaNome, setNovaDisciplinaNome] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📘');
  const router = useRouter();
  const supabase = createClient();

  if (!isOpen || !concursoId) return null;

  // Filtra apenas disciplinas raiz (parent_id === null)
  const disciplinasRaiz = paginasDisponiveis.filter(
    (p) => !p.parent_id && p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleLinkExistente = (paginaId: number) => {
    startTransition(() => {
      linkPastaToConcurso(concursoId, paginaId).then(() => {
        toast.success('Disciplina adicionada ao plano!');
        router.refresh();
      });
    });
  };

  const handleCriarEVincular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaDisciplinaNome.trim()) {
      toast.error('Digite um nome para a nova disciplina.');
      return;
    }

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: novaPagina, error } = await supabase
        .from('paginas')
        .insert({
          user_id: user.id,
          title: novaDisciplinaNome.trim(),
          emoji: selectedEmoji,
          parent_id: null,
        })
        .select('id')
        .single();

      if (error || !novaPagina) {
        toast.error('Erro ao criar disciplina.');
        return;
      }

      await linkPastaToConcurso(concursoId, novaPagina.id);
      toast.success(`"${novaDisciplinaNome}" criada e adicionada ao plano!`);
      setNovaDisciplinaNome('');
      router.refresh();
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[640px] max-h-[88vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div>
            <h2 className="text-lg font-bold">Nova Disciplina no Plano</h2>
            <p className="text-xs text-muted-foreground">
              Crie uma disciplina nova ou selecione uma já existente na sua base.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* SEÇÃO 1: CRIAR NOVA DISCIPLINA (ESTILO PRINT 4) */}
          <form onSubmit={handleCriarEVincular} className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block">
              Criar Nova Disciplina
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-9 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">DISCIPLINA</label>
                <Input
                  value={novaDisciplinaNome}
                  onChange={(e) => setNovaDisciplinaNome(e.target.value)}
                  placeholder="Busque ou digite um nome novo..."
                  className="h-10 bg-background text-xs rounded-xl"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">ÍCONE / COR</label>
                <div className="flex items-center gap-1 h-10 px-2 rounded-xl bg-background border border-border overflow-x-auto no-scrollbar">
                  {CORES_ICONES.map((item) => (
                    <button
                      key={item.emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(item.emoji)}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all flex-shrink-0',
                        selectedEmoji === item.emoji ? 'ring-2 ring-emerald-500 bg-secondary' : 'opacity-60 hover:opacity-100'
                      )}
                      title={item.label}
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending || !novaDisciplinaNome.trim()}
                className="h-9 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar e Adicionar ao Plano</span>
              </Button>
            </div>
          </form>

          {/* SEÇÃO 2: VINCULAR DISCIPLINA JÁ EXISTENTE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Ou Vincular Disciplina Existente
              </span>
              <span className="text-[11px] text-muted-foreground">
                {disciplinasRaiz.length} encontradas
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar disciplinas existentes..."
                className="h-9 pl-9 text-xs bg-secondary/20 rounded-xl"
              />
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {disciplinasRaiz.map((pagina) => {
                const isLinked = jaVinculadasIds.includes(pagina.id);
                return (
                  <div
                    key={pagina.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/60 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-sm flex-shrink-0">
                        {pagina.emoji || '📘'}
                      </span>
                      <span className="text-xs font-semibold truncate">{pagina.title}</span>
                    </div>

                    {isLinked ? (
                      <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 px-2.5">
                        <Check className="w-3.5 h-3.5" /> No plano
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleLinkExistente(pagina.id)}
                        disabled={isPending}
                        className="h-7 px-3 text-xs rounded-lg"
                      >
                        Vincular
                      </Button>
                    )}
                  </div>
                );
              })}

              {disciplinasRaiz.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Nenhuma disciplina encontrada. Crie uma nova no campo acima!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}