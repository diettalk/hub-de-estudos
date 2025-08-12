'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Folder, File } from 'lucide-react';
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
import { type Node as DisciplinaNode, type Disciplina } from '@/lib/types';

// Componente recursivo para renderizar cada item da árvore
const CommandTreeItem = ({
  node,
  level = 0,
  onSelect,
  value,
}: {
  node: DisciplinaNode;
  level?: number;
  onSelect: (disciplina: Disciplina | null) => void;
  value: number | null;
}) => {
  return (
    <>
      <CommandItem
        key={node.id}
        value={node.title}
        onSelect={() => onSelect(node.id === value ? null : node)}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
      >
        <Check
          className={cn('mr-2 h-4 w-4', value === node.id ? 'opacity-100' : 'opacity-0')}
        />
        <div className="flex items-center gap-2 truncate">
          {node.children && node.children.length > 0 ? (
            <Folder className="h-4 w-4 text-muted-foreground" />
          ) : (
            <File className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">{node.title}</span>
        </div>
      </CommandItem>
      {node.children && node.children.length > 0 && (
        node.children.map(childNode => (
          <CommandTreeItem
            key={childNode.id}
            node={childNode}
            level={level + 1}
            onSelect={onSelect}
            value={value}
          />
        ))
      )}
    </>
  );
};

interface DisciplinaComboboxProps {
  disciplinaTree: DisciplinaNode[];
  value: number | null;
  onSelect: (disciplina: Disciplina | null) => void;
  className?: string;
  disabled?: boolean;
}

export function DisciplinaCombobox({ disciplinaTree, value, onSelect, className, disabled = false }: DisciplinaComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // Função para encontrar a disciplina selecionada em toda a árvore
  const findSelected = (nodes: DisciplinaNode[], id: number | null): Disciplina | undefined => {
    if (id === null) return undefined;
    for (const node of nodes) {
        if (node.id === id) return node;
        const found = findSelected(node.children, id);
        if (found) return found;
    }
  };

  const selecionada = findSelected(disciplinaTree, value);

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
              {disciplinaTree.map((node) => (
                <CommandTreeItem
                  key={node.id}
                  node={node}
                  onSelect={(disciplina) => {
                    onSelect(disciplina);
                    setOpen(false);
                  }}
                  value={value}
                />
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
