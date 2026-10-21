// src/components/DeckViewClient.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { updateAnkiDeck } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Trash2, PlusCircle } from 'lucide-react';

type Flashcard = {
  question: string;
  answer: string;
};

type Deck = {
  id: number;
  title: string;
  cards: Flashcard[];
};

export function DeckViewClient({ deck }: { deck: Deck }) {
  const [isPending, startTransition] = useTransition();
  const [cards, setCards] = useState<Flashcard[]>(deck.cards);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Deteta se há alterações para habilitar o botão de guardar
    setHasChanges(JSON.stringify(deck.cards) !== JSON.stringify(cards));
  }, [cards, deck.cards]);

  const handleCardChange = (index: number, field: 'question' | 'answer', value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const deleteCard = (indexToDelete: number) => {
    setCards(currentCards => currentCards.filter((_, index) => index !== indexToDelete));
    toast.info("Flashcard removido. Clique em 'Guardar Alterações' para confirmar.");
  };
  
  const addCard = () => {
    setCards(currentCards => [...currentCards, { question: 'Nova Pergunta', answer: 'Nova Resposta' }]);
  }

  const handleSaveChanges = () => {
    startTransition(async () => {
      const result = await updateAnkiDeck(deck.id, cards);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Alterações guardadas com sucesso!");
        setHasChanges(false);
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{deck.title}</h1>
        <Button onClick={handleSaveChanges} disabled={isPending || !hasChanges}>
          <Save className="w-4 h-4 mr-2" />
          {isPending ? 'A guardar...' : 'Guardar Alterações'}
        </Button>
      </div>

      <div className="space-y-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-card border rounded-lg p-4 group relative">
            <Label className="font-semibold text-primary">Pergunta</Label>
            <Textarea
              value={card.question}
              onChange={(e) => handleCardChange(index, 'question', e.target.value)}
              className="bg-input border-none p-1 focus-visible:ring-1 ring-primary resize-none mt-1"
              rows={2}
            />
            <hr className="my-3 border-border" />
            <Label className="font-semibold text-primary">Resposta</Label>
            <Textarea
              value={card.answer}
              onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
              className="bg-input border-none p-1 focus-visible:ring-1 ring-primary resize-none mt-1"
              rows={3}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => deleteCard(index)}
              title="Apagar este flashcard"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      
      <div className="mt-6 text-center">
        <Button variant="outline" onClick={addCard}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Adicionar Novo Cartão
        </Button>
      </div>
    </div>
  );
}
