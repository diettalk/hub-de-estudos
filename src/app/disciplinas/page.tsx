// src/app/disciplinas/page.tsx

'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateTopicoAnotacoes } from '@/app/actions';

// Tipos para os dados
type Topico = { id: number; nome: string; anotacoes: string | null };
type Disciplina = { id: number; nome: string; topicos: Topico[] };

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [selectedTopico, setSelectedTopico] = useState<Topico | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('disciplinas')
        .select(`*, topicos(*)`);
      if (data) {
        setDisciplinas(data as Disciplina[]);
      }
    };
    fetchData();
  }, [supabase]);

  const handleSelectTopico = (disciplina: Disciplina, topico: Topico) => {
    setSelectedDisciplina(disciplina);
    setSelectedTopico(topico);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
      <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">BIBLIOTECA</h2>
        {/* Botão + Nova (funcionalidade futura) */}
        
        <div className="space-y-2">
          {disciplinas.map((disciplina) => (
            <div key={disciplina.id}>
              <h3 className="font-semibold px-3 py-2">{disciplina.nome}</h3>
              <ul className="space-y-1">
                {disciplina.topicos.map((topico) => (
                  <li key={topico.id}>
                    <button
                      onClick={() => handleSelectTopico(disciplina, topico)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedTopico?.id === topico.id
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-700'
                      }`}
                    >
                      {topico.nome}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg flex flex-col">
        {selectedTopico ? (
          <>
            <h2 className="text-2xl font-bold mb-1">
              {selectedDisciplina?.nome}
            </h2>
            <p className="text-gray-400 mb-4">{selectedTopico.nome}</p>
            
            <form 
              action={(formData) => startTransition(() => updateTopicoAnotacoes(formData))}
              className="flex flex-col flex-grow"
            >
              <input type="hidden" name="topicoId" value={selectedTopico.id} />
              <Textarea
                key={selectedTopico.id} // Força a re-renderização ao mudar de tópico
                name="anotacoes"
                defaultValue={selectedTopico.anotacoes || ''}
                className="flex-grow bg-gray-900 text-white border-gray-700 resize-none"
                placeholder="Digite suas anotações sobre este tópico..."
              />
              <Button type="submit" disabled={isPending} className="mt-4 self-end">
                {isPending ? 'Salvando...' : 'Salvar Anotações'}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Selecione um tópico para ver os detalhes.</p>
          </div>
        )}
      </div>
    </div>
  );
}