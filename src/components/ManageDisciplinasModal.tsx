// src/components/ManageDisciplinasModal.tsx
'use client';
import { useTransition } from 'react'; // REMOVIDO: useState
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toggleDisciplinaConcurso } from '@/app/actions';
import { type Disciplina, type EnrichedConcurso } from '@/lib/types';

export function ManageDisciplinasModal({ concurso, allDisciplinas }: { concurso: any, allDisciplinas: any[] }) { // CORREÇÃO: tipos mais específicos
  const [isPending, startTransition] = useTransition();

  const handleCheckedChange = (disciplinaId: number) => {
    const isCurrentlyLinked = concurso.linkedDisciplinaIds.includes(disciplinaId);
    startTransition(() => {
      toggleDisciplinaConcurso(concurso.id, disciplinaId, isCurrentlyLinked);
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Gerenciar Disciplinas</Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Gerenciar Disciplinas para: {concurso.nome}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {allDisciplinas.map((disciplina) => {
            const isLinked = concurso.linkedDisciplinaIds.includes(disciplina.id);
            return (
              <div key={disciplina.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700">
                <input
                  type="checkbox"
                  id={`disciplina-${concurso.id}-${disciplina.id}`}
                  checked={isLinked}
                  onChange={() => handleCheckedChange(disciplina.id)}
                  disabled={isPending}
                  className="h-4 w-4 rounded accent-blue-500 bg-gray-900 border-gray-600"
                />
                <label htmlFor={`disciplina-${concurso.id}-${disciplina.id}`} className="font-medium cursor-pointer">
                  {disciplina.emoji} {disciplina.nome}
                </label>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}