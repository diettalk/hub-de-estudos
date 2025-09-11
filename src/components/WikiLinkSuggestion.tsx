import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Editor, Range, ReactRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Suggestion, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import tippy, { Instance } from 'tippy.js';
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Book, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchDocumentsAndPages } from '@/app/actions';
import { PluginKey } from 'prosemirror-state';

interface SearchItem {
  id: number;
  title: string;
  type: 'documentos' | 'paginas';
}

const WikiLinkListComponent = forwardRef<any, SuggestionProps<SearchItem>>((props, ref) => {
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
  useImperativeHandle(ref, () => ({ onKeyDown }));

  return (
    <Command className="rounded-lg border shadow-md w-80 bg-card text-card-foreground">
      <CommandList>
        <CommandGroup>
          {props.items.length ? (
            props.items.map((item, index) => (
              <CommandItem
                key={`${item.type}-${item.id}`}
                // CORREÇÃO: Usamos onMouseDown para evitar que o editor perca o foco.
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectItem(index);
                }}
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

export const WikiLinkSuggestion = Extension.create({
  name: 'wikiLinkSuggestion',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: new PluginKey('wikiLinkSuggestion'),
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
            .unsetMark('wikiLink')
            .insertContent(']] ')
            .run();
        },
        items: async ({ query }) => {
          return await searchDocumentsAndPages(query);
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

