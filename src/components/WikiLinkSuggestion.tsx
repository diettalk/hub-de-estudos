// src/components/WikiLinkSuggestion.tsx

'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  items: { id: number; title: string }[];
  command: (item: { id: number; title: string }) => void;
};

export function WikiLinkSuggestion(props: any) {
  const { items, command } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectItem = (index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        event.preventDefault();
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        event.preventDefault();
      }
      if (event.key === 'Enter') {
        enterHandler();
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', keyDownHandler);
    return () => {
      document.removeEventListener('keydown', keyDownHandler);
    };
  });

  if (!items.length) {
    return (
      <Card className="p-2 text-sm bg-gray-800 text-gray-400">
        Nenhum resultado encontrado
      </Card>
    );
  }

  return (
    <Card
      ref={containerRef}
      className="bg-gray-900 border border-gray-700 shadow-lg rounded-md overflow-hidden"
    >
      <ul className="max-h-60 overflow-y-auto">
        {items.map((item: { id: number; title: string }, index: number) => (
          <li
            key={item.id}
            className={cn(
              'px-3 py-2 cursor-pointer text-sm',
              index === selectedIndex
                ? 'bg-blue-600 text-white'
                : 'text-gray-200 hover:bg-gray-800'
            )}
            onClick={() => selectItem(index)}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </Card>
  );
}
