'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { type Disciplina } from '@/lib/types';

interface DisciplinaComboboxProps {
  disciplinas: Disciplina[];
  value: number | null;
  onSelect: (disciplina: Disciplina | null) => void;
  className?: string;
  disabled?: boolean;
}

export function DisciplinaCombobox({ disciplinas, value, onSelect, className, disabled = false }: DisciplinaComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selecionada = disciplinas.find((d) => d.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal text-left h-auto py-1 px-2 text-sm', className)}
        >
          <div className="flex items-center gap-2 truncate">
            {selecionada ? (
              <>
                {/* ALTERAÇÃO 1: Só renderiza o span se o emoji existir */}
                {selecionada.emoji && <span className="text-base">{selecionada.emoji}</span>}
                <span className="truncate">{selecionada.title}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Selecione a matéria...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar matéria..." />
          <CommandList>
            <CommandEmpty>Nenhuma matéria encontrada.</CommandEmpty>
            <CommandGroup>
              {disciplinas.map((disciplina) => (
                <CommandItem
                  key={disciplina.id}
                  value={disciplina.title}
                  onSelect={() => {
                    onSelect(disciplina.id === value ? null : disciplina);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === disciplina.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2 truncate">
                     {/* ALTERAÇÃO 2: Só renderiza o span se o emoji existir */}
                     {disciplina.emoji && <span className="text-base">{disciplina.emoji}</span>}
                     <span className="truncate">{disciplina.title}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}