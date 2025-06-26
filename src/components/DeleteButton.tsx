// src/components/DeleteButton.tsx
'use client';

import { deleteConcurso } from "@/app/actions";
import { Button } from "./ui/button";
import { useTransition } from "react";

export function DeleteButton({ id, nome }: { id: number; nome: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o concurso "${nome}"?`)) {
      startTransition(() => {
        deleteConcurso(id);
      });
    }
  };

  return (
    <Button onClick={handleDelete} disabled={isPending} variant="destructive" size="icon">
      {isPending ? '...' : <i className="fas fa-trash-alt"></i>}
    </Button>
  );
}