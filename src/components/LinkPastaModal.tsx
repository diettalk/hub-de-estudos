// src/components/LinkPastaModal.tsx

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

// Reutilizaremos o tipo Pagina que já deve existir em algum lugar,
// mas o definimos aqui para clareza.
type Pagina = {
  id: number;
  title: string;
  emoji: string;
};

type LinkPastaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  concursoId: number | null;
  paginasDisponiveis: Pagina[]; // Lista de pastas que podem ser vinculadas
};

export function LinkPastaModal({ isOpen, onClose, concursoId, paginasDisponiveis }: LinkPastaModalProps) {
  const [isPending, startTransition] = useTransition();

  const handleLink = (paginaId: number) => {
    if (!concursoId) return;
    startTransition(() => {
      linkPastaToConcurso(concursoId, paginaId).then(() => {
        onClose(); // Fecha o modal após vincular
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle>Vincular Pasta de Disciplinas</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-400 mb-4">Selecione uma pasta da sua Base de Conhecimento para associar a este concurso.</p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {paginasDisponiveis.map((pagina) => (
              <div key={pagina.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-md">
                <span>{pagina.emoji} {pagina.title}</span>
                <Button size="sm" onClick={() => handleLink(pagina.id)} disabled={isPending}>
                  Vincular
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}