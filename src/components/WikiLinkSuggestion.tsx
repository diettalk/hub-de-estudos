// src/components/WikiLinkSuggestion.tsx

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Item = {
  id: number;
  title: string;
};

type RenderProps = {
  items: Item[];
  command: (item: Item) => void;
  clientRect?: DOMRect;
};

export const WikiLinkSuggestion = {
  render: () => {
    let component: HTMLDivElement | null = null;

    return {
      onStart: (props: RenderProps) => {
        component = document.createElement("div");
        document.body.appendChild(component);

        renderReactComponent(props);
      },
      onUpdate(props: RenderProps) {
        renderReactComponent(props);
      },
      onKeyDown(props: { event: KeyboardEvent }) {
        if (props.event.key === "Escape") {
          destroy();
          return true;
        }
        return false;
      },
      onExit() {
        destroy();
      },
    };

    function renderReactComponent(props: RenderProps) {
      if (!component) return;
      const rect = props.clientRect?.();
      const style: React.CSSProperties = rect
        ? {
            position: "absolute",
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
            background: "#1f2937", // bg-gray-800
            color: "white",
            border: "1px solid #374151", // border-gray-700
            borderRadius: "0.5rem",
            padding: "0.25rem",
            zIndex: 1000,
            minWidth: "200px",
          }
        : { display: "none" };

      const SuggestionList = () => {
        const [selectedIndex, setSelectedIndex] = useState(0);

        useEffect(() => {
          const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedIndex((prev) =>
                prev + 1 < props.items.length ? prev + 1 : prev
              );
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedIndex((prev) =>
                prev - 1 >= 0 ? prev - 1 : prev
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              props.command(props.items[selectedIndex]);
            }
          };
          window.addEventListener("keydown", handler);
          return () => window.removeEventListener("keydown", handler);
        }, [props.items, selectedIndex]);

        return (
          <div style={style}>
            {props.items.length ? (
              props.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`px-3 py-1 cursor-pointer rounded ${
                    index === selectedIndex
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-700"
                  }`}
                  onClick={() => props.command(item)}
                >
                  {item.title}
                </div>
              ))
            ) : (
              <div className="px-3 py-1 text-gray-400">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        );
      };

      createPortal(<SuggestionList />, component);
    }

    function destroy() {
      if (component) {
        document.body.removeChild(component);
        component = null;
      }
    }
  },
};
