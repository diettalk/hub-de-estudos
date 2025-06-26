// src/components/ConcursosList.tsx
'use client';
import { type EnrichedConcurso, type Disciplina } from '@/lib/types';
import { ConcursoForm } from './ConcursoForm';
import { DeleteButton } from './DeleteButton';
import { ManageDisciplinasModal } from './ManageDisciplinasModal';
import Link from 'next/link';

export function ConcursosList({ concursos, allDisciplinas }: { concursos: EnrichedConcurso[], allDisciplinas: Disciplina[] }) {
  if (!concursos || concursos.length === 0) {
    return <p className="text-gray-400">Nenhum concurso cadastrado.</p>;
  }

  return (
    <div className="space-y-4">
      {concursos.map((concurso) => (
        <div key={concurso.id} className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold">{concurso.nome}</h3>
              <p className="text-sm text-gray-400">{concurso.banca} - Prova em: {new Date(concurso.data_prova).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
            </div>
            <div className="flex items-center gap-2">
              <ManageDisciplinasModal concurso={concurso} allDisciplinas={allDisciplinas} />
              <ConcursoForm concurso={concurso} />
              <DeleteButton id={concurso.id} nome={concurso.nome} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-700">
            <div>
              <h4 className="font-semibold text-sm uppercase text-gray-400 mb-2">Disciplinas Vinculadas</h4>
              <div className="flex flex-wrap gap-2">
                {concurso.concurso_disciplinas.length > 0 ? concurso.concurso_disciplinas.map((cd) => (
                  cd.disciplinas && (<Link key={cd.disciplinas.id} href={`/disciplinas?selecionar=${cd.disciplinas.id}`} className="bg-gray-700 text-xs font-semibold px-2 py-1 rounded-full hover:bg-blue-600 transition-colors">{cd.disciplinas.emoji} {cd.disciplinas.nome}</Link>)
                )) : <p className="text-xs text-gray-500">Nenhuma disciplina vinculada.</p>}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase text-gray-400 mb-2">Prioridades</h4>
              {concurso.prioridades && concurso.prioridades.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                  {concurso.prioridades.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              ) : <p className="text-sm text-gray-500">Nenhuma prioridade definida.</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}