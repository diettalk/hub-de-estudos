import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Editor, Range, ReactRenderer } from '@tiptap/react';
import { Extension, Mark } from '@tiptap/core';
import { Suggestion, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import tippy, { Instance } from 'tippy.js';
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Book, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchDocumentsAndPages } from '@/app/actions';

// 1. Define um novo tipo de "Mark" para os nossos links [[...]]
export const WikiLink = Mark.create({
  name: 'wikiLink',
  
  addAttributes() {
    return {
      href: { default: null },
      'data-type': { default: 'wikiLink' },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="wikiLink"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', { ...HTMLAttributes, class: 'wiki-link' }, 0];
  },
});

// 2. Define a estrutura dos itens que a nossa pesquisa irá retornar
interface SearchItem {
  id: number;
  title: string;
  type: 'documentos' | 'paginas';
}

// 3. Cria o componente React que renderiza a lista de sugestões
const WikiLinkListComponent = forwardRef<any, SuggestionProps<SearchItem>>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
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
  useImperativeHandle(ref, () => ({ onKeyDown }));

  return (
    <Command className="rounded-lg border shadow-md w-80 bg-card text-card-foreground">
      <CommandList>
        <CommandGroup>
          {props.items.length ? (
            props.items.map((item, index) => (
              <CommandItem
                key={item.id}
                onSelect={() => selectItem(index)}
                className={cn("flex items-center gap-2 cursor-pointer", selectedIndex === index ? 'is-selected bg-accent' : '')}
              >
                {item.type === 'documentos' ? <FileText className="w-4 h-4" /> : <Book className="w-4 h-4" />}
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
WikiLinkListComponent.displayName = 'WikiLinkList';

// 4. Cria a extensão do Tiptap que junta tudo
export const WikiLinkSuggestion = Extension.create({
  name: 'wikiLinkSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        command: ({ editor, range, props }) => {
          const { id, title, type } = props;
          const href = type === 'documentos' ? `/documentos?id=${id}` : `/disciplinas?page=${id}`;
          
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setMark('wikiLink', { href })
            .insertContent(title)
            .unsetMark('wikiLink') // Para que o texto seguinte não seja um link
            .insertContent(' ')
            .run();
        },
        items: async ({ query }) => {
          const results = await searchDocumentsAndPages(query);
          return results;
        },
        render: () => {
          let reactRenderer: ReactRenderer<any>;
          let popup: Instance[];

          return {
            onStart: props => {
              reactRenderer = new ReactRenderer(WikiLinkListComponent, { props, editor: props.editor });
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
