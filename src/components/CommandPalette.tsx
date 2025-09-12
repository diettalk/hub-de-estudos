'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { FileText, Book } from 'lucide-react';

interface SearchableItem {
  id: number;
  title: string;
  type: 'documentos' | 'paginas';
}

interface CommandPaletteProps {
  initialItems: SearchableItem[];
}

export function CommandPalette({ initialItems }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar documentos ou disciplinas..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        
        <CommandGroup heading="Documentos">
          {initialItems
            .filter((item) => item.type === 'documentos')
            .map((item) => (
              <CommandItem
                key={`doc-${item.id}`}
                value={`${item.title} documento`}
                onSelect={() => {
                  runCommand(() => router.push(`/documentos?id=${item.id}`));
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
        </CommandGroup>

        <CommandGroup heading="Disciplinas">
          {initialItems
            .filter((item) => item.type === 'paginas')
            .map((item) => (
              <CommandItem
                key={`page-${item.id}`}
                value={`${item.title} disciplina`}
                onSelect={() => {
                  runCommand(() => router.push(`/disciplinas?page=${item.id}`));
                }}
              >
                <Book className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
