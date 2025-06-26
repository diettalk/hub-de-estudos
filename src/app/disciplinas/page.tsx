// src/app/disciplinas/page.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { type Disciplina, type Topico } from '@/lib/types';
import { addMasterDisciplina, updateDisciplina, deleteDisciplina, deleteTopico } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TopicoEditor } from '@/components/TopicoEditor'; // Importa o novo componente

function DisciplinaForm({ disciplina, onAction }: { disciplina?: Disciplina; onAction: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {disciplina ? <Button variant="ghost" size="icon" className="h-6 w-6 p-0"><i className="fas fa-pencil-alt text-xs"/></Button> : <Button size="sm">+ Nova</Button>}
      </DialogTrigger>
      <DialogContent className="bg-gray-800 text-white"><DialogHeader><DialogTitle>{disciplina ? 'Editar' : 'Nova'} Disciplina</DialogTitle></DialogHeader>
        <form action={async (formData) => { if (disciplina) formData.append('id', String(disciplina.id)); await (disciplina ? updateDisciplina(formData) : addMasterDisciplina(formData)); onAction(); setOpen(false); }}>
          <div className="space-y-4 py-4">
            <div><Label>Nome</Label><Input name="nome" defaultValue={disciplina?.nome} className="bg-gray-700"/></div>
            <div><Label>Emoji</Label><Input name="emoji" defaultValue={disciplina?.emoji} className="bg-gray-700"/></div>
          </div>
          <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DisciplinasPage() {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [topicos, setTopicos] = useState<Topico[]>([]);
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  const fetchData = async () => {
    const { data: discData } = await supabase.from('disciplinas').select('*').order('nome');
    setDisciplinas(discData ?? []);
    if (selectedDisciplina) {
      const { data: topicoData } = await supabase.from('topicos').select('*').eq('disciplina_id', selectedDisciplina.id).order('created_at');
      setTopicos(topicoData ?? []);
    } else {
      setTopicos([]);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('realtime-all').on('postgres_changes', { event: '*', schema: 'public' }, fetchData).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    if (selectedDisciplina) {
      fetchData(); // Recarrega os tópicos quando a disciplina muda
    } else {
      setTopicos([]);
    }
  }, [selectedDisciplina]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
      <aside className="md:col-span-1 space-y-2 bg-gray-800/50 p-2 rounded-lg border overflow-y-auto">
        <div className="flex justify-between items-center p-2"><h3 className="font-bold text-sm">BIBLIOTECA</h3><DisciplinaForm onAction={fetchData} /></div>
        {disciplinas.map(d => (
          <div key={d.id} onClick={() => setSelectedDisciplina(d)} className={`p-2 rounded-md cursor-pointer text-sm flex justify-between items-center ${selectedDisciplina?.id === d.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>
            <span className="flex items-center gap-2"><span className="text-lg">{d.emoji}</span> {d.nome}</span>
            <div className="flex items-center">
              <DisciplinaForm disciplina={d} onAction={fetchData} />
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isPending} onClick={(e) => { e.stopPropagation(); if(confirm('Certeza?')) { startTransition(() => deleteDisciplina(d.id)); }}}>
                <i className="fas fa-trash-alt text-xs text-red-500"></i>
              </Button>
            </div>
          </div>
        ))}
      </aside>

      <main className="md:col-span-3 card bg-gray-800/50 border-gray-700 p-4">
        {selectedDisciplina ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">{selectedDisciplina.emoji} {selectedDisciplina.nome}</h2>
              <TopicoEditor disciplinaId={selectedDisciplina.id} onAction={fetchData} />
            </div>
            <div className="space-y-2">
              {topicos.map(t => (
                <div key={t.id} className="p-3 rounded-lg flex justify-between items-center bg-gray-800 hover:bg-gray-700/50">
                  <TopicoEditor topico={t} disciplinaId={selectedDisciplina.id} onAction={fetchData} />
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={isPending} onClick={async () => { if(confirm('Certeza?')) { await deleteTopico(t.id); fetchData(); } }}>
                    <i className="fas fa-trash-alt text-xs text-red-500"/>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : <p className="text-gray-500 flex h-full items-center justify-center">Selecione uma disciplina na sua biblioteca.</p>}
      </main>
    </div>
  );
}