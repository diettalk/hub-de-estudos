import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import { Editor, Range, ReactRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Suggestion, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import tippy, { Instance } from 'tippy.js';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare
} from 'lucide-react';
import {
  Command, CommandGroup, CommandItem, CommandList
} from "@/components/ui/command";
import { cn } from '@/lib/utils';

interface CommandItemProps {
  title: string;
  icon: React.ReactNode;
  command: ({ editor, range }: { editor: Editor, range: Range }) => void;
}

const commandItems: CommandItemProps[] = [
  { title: 'Título 1', icon: <Heading1 className="w-4 h-4" />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(); } },
  { title: 'Título 2', icon: <Heading2 className="w-4 h-4" />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(); } },
  { title: 'Título 3', icon: <Heading3 className="w-4 h-4" />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(); } },
  { title: 'Lista', icon: <List className="w-4 h-4" />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleBulletList().run(); } },
  { title: 'Lista Numerada', icon: <ListOrdered className="w-4 h-4" />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleOrderedList().run(); } },
  { title: 'Lista de Tarefas', icon: <CheckSquare className="w-4 h-4" />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).toggleTaskList().run(); } },
];

const CommandListComponent = forwardRef<HTMLDivElement, SuggestionProps<CommandItemProps>>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const onKeyDown = ({ event }: SuggestionKeyDownProps) => {
    if (event.key === 'ArrowUp') {
      setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
      return true;
    }
    if (event.key === 'ArrowDown') {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
      return true;
    }
    if (event.key === 'Enter') {
      selectItem(selectedIndex);
      return true;
    }
    return false;
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  // Expondo a função onKeyDown para o Tiptap
  React.useImperativeHandle(ref, () => ({ onKeyDown }));

  return (
    <Command className="rounded-lg border shadow-md w-64 bg-card text-card-foreground">
      <CommandList>
        <CommandGroup>
          {props.items.length ? (
            props.items.map((item, index) => (
              <CommandItem
                key={item.title}
                onSelect={() => selectItem(index)}
                className={cn("flex items-center gap-2 cursor-pointer", selectedIndex === index ? 'is-selected bg-accent' : '')}
              >
                {item.icon}
                <span>{item.title}</span>
              </CommandItem>
            ))
          ) : (
            <CommandItem disabled>Nenhum resultado.</CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
});

CommandListComponent.displayName = 'CommandList';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        items: ({ query }) => {
          return commandItems
            .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
            .slice(0, 10);
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => {
          let reactRenderer: ReactRenderer<unknown, { onKeyDown: (props: {event: Event}) => boolean }>;
          let popup: Instance[];

          return {
            onStart: props => {
              reactRenderer = new ReactRenderer(CommandListComponent, {
                props,
                editor: props.editor,
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: reactRenderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate(props) {
              reactRenderer.updateProps(props);
              if (!props.clientRect) return;
              popup[0].setProps({ getReferenceClientRect: props.clientRect });
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }
              return reactRenderer.ref?.onKeyDown(props) ?? false;
            },
            onExit() {
              popup[0].destroy();
              reactRenderer.destroy();
            },
          };
        },
      }),
    ];
  },
});

