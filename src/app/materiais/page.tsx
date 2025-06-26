// src/app/materiais/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type EnrichedConcurso, type Disciplina } from '@/lib/types';
import { ConcursoForm } from "@/components/ConcursoForm";
import { ConcursosList } from '@/components/ConcursosList';

export default function MateriaisPage() {
  const [concursos, setConcursos] = useState<EnrichedConcurso[]>([]);
  const [allDisciplinas, setAllDisciplinas] = useState<Disciplina[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getData = async () => {
      const { data: concursosData } = await supabase
        .from('concursos')
        .select('*, concurso_disciplinas(disciplinas(id, nome, emoji))')
        .order('created_at', { ascending: false });
      
      const { data: disciplinasData } = await supabase
        .from('disciplinas')
        .select('*')
        .order('nome');

      const formattedConcursos = (concursosData as any[] ?? []).map(c => ({
        ...c,
        linkedDisciplinaIds: c.concurso_disciplinas.map((cd: any) => cd.disciplinas?.id).filter(Boolean)
      }));
      
      setConcursos(formattedConcursos);
      setAllDisciplinas(disciplinasData ?? []);
    };
    getData();
  }, [supabase]);

  return (
    <div className="space-y-10">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Gerenciar Concursos</h2>
          <ConcursoForm />
        </div>
        <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
          <ConcursosList concursos={concursos} allDisciplinas={allDisciplinas} />
        </div>
      </section>
    </div>
  );
}