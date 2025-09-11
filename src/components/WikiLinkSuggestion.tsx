"use client";

import React, { useEffect, useState } from "react";
import { Editor, Range } from "@tiptap/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { ReactRenderer } from "@tiptap/react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileText, Book } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikiLinkItem {
  id: string;
  title: string;
  type: "documentos" | "disciplinas";
}

interface WikiLinkSuggestionProps {
  editor: Editor;
  range: Range;
  items: WikiLinkItem[];
  command: (item: WikiLinkItem) => void;
  clientRect: () => DOMRect | null;
}

const WikiLinkListComponent: React.FC<WikiLinkSuggestionProps> = ({
  items,
  command,
  editor,
  range,
  clientRect,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((prev) => (prev + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        upHandler();
        event.preventDefault();
        return true;
      }
      if (event.key === "ArrowDown") {
        downHandler();
        event.preventDefault();
        return true;
      }
      if (event.key === "Enter") {
        enterHandler();
        event.preventDefault();
        return true;
      }
      return false;
    };

    editor.on("keydown", onKeyDown);
    return () => {
      editor.off("keydown", onKeyDown);
    };
  }, [editor, items, selectedIndex]);

  return (
    <Command>
      <CommandList>
        <CommandGroup heading="Links disponíveis">
          {items.length > 0 ? (
            items.map((item, index) => (
              <CommandItem
                key={`${item.type}-${item.id}`}
                // 🔑 aqui está o fix para não perder o foco
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onSelect={() => selectItem(index)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  selectedIndex === index ? "is-selected bg-accent" : ""
                )}
              >
                {item.type === "documentos" ? (
                  <FileText className="w-4 h-4" />
                ) : (
                  <Book className="w-4 h-4" />
                )}
                <span>{item.title}</span>
              </CommandItem>
            ))
          ) : (
            <div className="px-2 py-1 text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          )}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};

export const WikiLinkSuggestion = {
  items: ({ query }: { query: string }) => {
    if (!query) return [];
    return [
      { id: "1", title: "Introdução à Nutrição", type: "documentos" },
      { id: "2", title: "Bioquímica Básica", type: "disciplinas" },
      { id: "3", title: "Fisiologia Humana", type: "disciplinas" },
      { id: "4", title: "Dietas Especiais", type: "documentos" },
    ]
      .filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);
  },

  render: () => {
    let component: ReactRenderer<WikiLinkSuggestionProps>;
    let popup: TippyInstance[];

    return {
      onStart: (props: WikiLinkSuggestionProps) => {
        component = new ReactRenderer(WikiLinkListComponent, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) return;

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: WikiLinkSuggestionProps) {
        component.updateProps(props);

        if (!props.clientRect) return;

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === "Escape") {
          popup?.[0]?.hide();
          return true;
        }
        return component?.ref?.onKeyDown(props);
      },

      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};
