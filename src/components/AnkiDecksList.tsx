// src/components/AnkiDecksList.tsx
'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { deleteAnkiDeck } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Trash2, FileText } from 'lucide-react';

type Deck = {
  id: number;
  title: string;
  created_at: string;
  cards: any[];
};

export function AnkiDecksList({ decks }: { decks: Deck[] }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (deckId: number, title: string) => {
    if (window.confirm(`Tem certeza que deseja apagar o deck "${title}"?`)) {
      startTransition(async () => {
        const result = await deleteAnkiDeck(deckId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(`Deck "${title}" apagado com sucesso.`);
        }
      });
    }
  };

  if (decks.length === 0) {
    return <p className="text-muted-foreground text-center mt-4">Nenhum deck guardado ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {decks.map((deck) => (
        <div key={deck.id} className="bg-secondary p-3 rounded-lg flex items-center justify-between group">
          <Link href={`/anki/${deck.id}`} className="flex items-center gap-3 flex-grow">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold group-hover:underline">{deck.title}</p>
              <p className="text-xs text-muted-foreground">
                {deck.cards.length} cartões • Criado em {new Date(deck.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(deck.id, deck.title)}
            disabled={isPending}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            title="Apagar Deck"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
