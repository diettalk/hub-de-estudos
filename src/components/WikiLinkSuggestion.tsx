import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ReactRenderer } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import tippy, { Instance } from 'tippy.js';
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Book } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchPaginas } from '@/app/actions';
import { PluginKey } from 'prosemirror-state';

interface SearchItem {
  id: number;
  title: string;
  type: 'paginas';
}

type WikiLinkListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
};

const WikiLinkListComponent = forwardRef<WikiLinkListRef, SuggestionProps<SearchItem>>((props, ref) => {
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
    <Command onMouseDown={(e) => e.preventDefault()} className="rounded-lg border shadow-md w-80 bg-card text-card-foreground">
      <CommandList>
        <CommandGroup>
          {props.items.length ? (
            props.items.map((item, index) => (
              <CommandItem
                key={`${item.type}-${item.id}`}
                onSelect={() => selectItem(index)}
                className={cn("flex items-center gap-2 cursor-pointer", selectedIndex === index && 'is-selected bg-accent')}
              >
                <Book className="w-4 h-4" />
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
          const { id, title } = props;
          const href = `/disciplinas?page=${id}`;
          
          // CORREÇÃO: Usa um método de inserção mais explícito e robusto
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'text',
                text: title,
                marks: [
                  {
                    type: 'wikiLink',
                    attrs: { href },
                  },
                ],
              },
              {
                  type: 'text',
                  text: ']] '
              }
            ])
            .run();
        },
        items: async ({ query }) => await searchPaginas(query),
        render: () => {
          let reactRenderer: ReactRenderer<WikiLinkListRef, SuggestionProps<SearchItem>>;
          let popup: Instance[];
          return {
            onStart: props => {
              const getReferenceClientRect = () => props.clientRect?.() ?? new DOMRect();
              reactRenderer = new ReactRenderer<WikiLinkListRef, SuggestionProps<SearchItem>>(WikiLinkListComponent, { props, editor: props.editor });
              popup = tippy('body', {
                getReferenceClientRect,
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
              popup[0].setProps({ getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect() });
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
