// src/components/ConcursoForm.tsx
'use client';
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addConcurso, updateConcurso } from "@/app/actions";
import { type Concurso } from "@/lib/types";

export function ConcursoForm({ concurso }: { concurso?: Concurso }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isEditMode = !!concurso?.id;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isEditMode) {
        formData.append('id', String(concurso.id));
        await updateConcurso(formData);
      } else {
        await addConcurso(formData);
      }
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditMode ? 
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Editar Concurso"><i className="fas fa-pencil-alt"></i></Button> : 
          <Button>+ Novo Concurso</Button>
        }
      </DialogTrigger>
      <DialogContent className="bg-gray-800 border-gray-700 text-white">
        <DialogHeader><DialogTitle>{isEditMode ? 'Editar' : 'Novo'} Concurso</DialogTitle></DialogHeader>
        <form action={handleSubmit}>
          <div className="space-y-4 py-4">
            <div><Label htmlFor="nome">Nome</Label><Input id="nome" name="nome" required defaultValue={concurso?.nome} className="bg-gray-700"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label htmlFor="banca">Banca</Label><Input id="banca" name="banca" required defaultValue={concurso?.banca} className="bg-gray-700"/></div>
              <div><Label htmlFor="data_prova">Data da Prova</Label><Input id="data_prova" name="data_prova" type="date" required defaultValue={concurso?.data_prova?.split('T')[0]} className="bg-gray-700"/></div>
            </div>
            <div>
              <Label htmlFor="prioridades">Prioridades (uma por linha)</Label>
              <Textarea id="prioridades" name="prioridades" defaultValue={concurso?.prioridades?.join('\n') ?? ''} className="bg-gray-700" rows={4}/>
            </div>
          </div>
          <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}