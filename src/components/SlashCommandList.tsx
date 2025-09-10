import React, { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { Editor } from '@tiptap/react';
import { suggestion } from '@tiptap/suggestion';
import {
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, CheckSquare, Table, Youtube
} from 'lucide-react';
import {
  Command, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { cn } from '@/lib/utils';

// 1. Define os comandos disponíveis, seus ícones e a ação a ser executada
const commandItems = [
  {
    title: 'Título 1',
    icon: <Heading1 className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    title: 'Título 2',
    icon: <Heading2 className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    title: 'Título 3',
    icon: <Heading3 className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    title: 'Parágrafo',
    icon: <Pilcrow className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Lista',
    icon: <List className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Lista Numerada',
    icon: <ListOrdered className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Lista de Tarefas',
    icon: <CheckSquare className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Tabela',
    icon: <Table className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
        editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'YouTube',
    icon: <Youtube className="w-4 h-4" />,
    command: ({ editor, range }: { editor: Editor, range: any }) => {
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) {
            editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: url }).run();
        }
    },
  }
];

// 2. Cria o componente React que renderiza a lista de sugestões
const CommandListComponent = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (e.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (e.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    };
    props.editor.view.dom.addEventListener('keydown', onKeyDown);
    return () => {
      props.editor.view.dom.removeEventListener('keydown', onKeyDown);
    };
  }, [props, selectedIndex]);

  return (
    <Command ref={ref} className="rounded-lg border shadow-md w-64 bg-card text-card-foreground">
      <CommandList>
        <CommandGroup>
          {props.items.map((item: any, index: number) => (
            <CommandItem
              key={item.title}
              onSelect={() => selectItem(index)}
              className={cn("flex items-center gap-2", selectedIndex === index && 'bg-accent')}
            >
              {item.icon}
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
});

CommandListComponent.displayName = 'CommandList';

// 3. Configura a extensão de sugestão do Tiptap
export const slashCommand = suggestion({
  char: '/',
  command: ({ editor, range, props }) => {
    props.command({ editor, range });
  },
  items: ({ query }) => {
    return commandItems.filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()));
  },
  render: () => {
    let component: any;
    let popup: any;
    return {
      onStart: props => {
        component = <CommandListComponent {...props} />;
      },
      onUpdate(props) {
        component = <CommandListComponent {...props} />;
      },
      onKeyDown({ event }) {
        if (event.key === 'Escape') {
          popup[0].hide();
          return true;
        }
        return false;
      },
      onExit() {
        // popup[0].destroy(); // Descomente se houver problemas de memória
      },
    };
  },
});
