import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import { Editor } from '@tiptap/react';
import {
  Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, CheckSquare, Table, Youtube
} from 'lucide-react';
import {
  Command, CommandGroup, CommandItem, CommandList
} from "@/components/ui/command";
import { cn } from '@/lib/utils';

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
  }
];

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
    // Adiciona o listener diretamente ao DOM do editor para evitar conflitos de eventos
    const editorDom = props.editor.view.dom;
    editorDom.addEventListener('keydown', onKeyDown);
    return () => {
      editorDom.removeEventListener('keydown', onKeyDown);
    };
  }, [props, selectedIndex]);

  return (
    <div className="relative">
      <Command ref={ref} className="rounded-lg border shadow-md w-64 bg-card text-card-foreground absolute">
        <CommandList>
          <CommandGroup>
            {props.items.map((item: any, index: number) => (
              <CommandItem
                key={item.title}
                onSelect={() => selectItem(index)}
                className={cn("flex items-center gap-2", selectedIndex === index && 'aria-selected:bg-accent')}
              >
                {item.icon}
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
});

CommandListComponent.displayName = 'CommandList';

// CORREÇÃO: Exporta diretamente o objeto de configuração
export const slashCommandSuggestion = {
  char: '/',
  command: ({ editor, range, props }: { editor: Editor, range: any, props: any }) => {
    props.command({ editor, range });
  },
  items: ({ query }: { query: string }) => {
    return commandItems.filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
  },
  render: () => {
    let component: any;
    // tippy (popup) é uma dependência opcional, mas a estrutura de render do Tiptap espera este objeto
    let popup: any;

    return {
      onStart: (props: { editor: Editor, clientRect: DOMRect }) => {
        // Renderiza o nosso componente React
        component = React.createElement(CommandListComponent, { ...props, ref: (ref: any) => {} });
      },
      onUpdate(props: any) {
        component.props = { ...component.props, ...props };
      },
      onKeyDown({ event }: { event: KeyboardEvent }) {
        if (event.key === 'Escape' && popup) {
          popup[0].hide();
          return true;
        }
        // Deixa o nosso componente React (CommandListComponent) tratar as outras teclas
        return component?.ref?.current?.onKeyDown(event);
      },
      onExit() {
        if (popup) {
          // popup[0].destroy();
        }
      },
    };
  },
};

