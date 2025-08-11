'use client';

import { useTransition } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { linkPastaToConcurso } from '@/app/actions';
import { type Disciplina } from '@/lib/types'; // Usaremos o nosso tipo centralizado
import { toast } from 'sonner';

type LinkPastaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  concursoId: number | null;
  paginasDisponiveis: Disciplina[]; // Lista de pastas que podem ser vinculadas
};

export function LinkPastaModal({ isOpen, onClose, concursoId, paginasDisponiveis }: LinkPastaModalProps) {
  const [isPending, startTransition] = useTransition();

  const handleLink = (paginaId: number) => {
    if (!concursoId) return;
    startTransition(() => {
      linkPastaToConcurso(concursoId, paginaId).then(() => {
        toast.success("Pasta vinculada com sucesso!");
        onClose(); // Fecha o modal após vincular
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Pasta de Disciplinas</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">Selecione uma pasta da sua Base de Conhecimento para associar a este concurso.</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
            {paginasDisponiveis.map((pagina) => (
              <div key={pagina.id} className="flex justify-between items-center bg-secondary p-3 rounded-md">
                <span>{pagina.emoji} {pagina.title}</span>
                <Button size="sm" onClick={() => handleLink(pagina.id)} disabled={isPending}>
                  Vincular
                </Button>
              </div>
            ))}
            {paginasDisponiveis.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Não há disciplinas disponíveis para vincular.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
