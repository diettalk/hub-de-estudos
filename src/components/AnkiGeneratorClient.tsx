// src/components/AnkiGeneratorClient.tsx
'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { generateAnkiCards } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Copy, Trash2, Wand2 } from 'lucide-react';

type Flashcard = {
  question: string;
  answer: string;
};

export function AnkiGeneratorClient() {
  const [isPending, startTransition] = useTransition();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [numCards, setNumCards] = useState(5);

  const handleGenerate = () => {
    if (!sourceText.trim()) {
      toast.error('Por favor, insira algum material de estudo.');
      return;
    }

    startTransition(async () => {
      setCards([]); // Limpa os cards antigos antes de gerar novos
      const result = await generateAnkiCards(sourceText, numCards);
      if (result.error) {
        toast.error(`Erro da IA: ${result.error}`);
        setCards([]);
      } else if (result.data) {
        setCards(result.data);
        toast.success(`${result.data.length} flashcards gerados com sucesso!`);
      }
    });
  };

  const handleCardChange = (index: number, field: 'question' | 'answer', value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };

  const copyToClipboard = () => {
    const textToCopy = cards.map(card => `${card.question}\t${card.answer}`).join('\n');
    
    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        toast.success('Flashcards copiados para a área de transferência!');
    } catch (err) {
        toast.error('Falha ao copiar os flashcards.');
    }
    document.body.removeChild(textArea);
  };

  const clearAll = () => {
    setSourceText('');
    setCards([]);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Coluna de Entrada */}
      <div className="bg-card border rounded-lg p-6 space-y-4 flex flex-col">
        <div>
          <Label htmlFor="source-text" className="text-lg font-semibold">Seu Material de Estudo</Label>
          <Textarea
            id="source-text"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Cole aqui o seu PDF, anotação ou qualquer texto base..."
            className="mt-2 h-64 bg-input flex-grow"
          />
        </div>
        <div>
          <Label htmlFor="num-cards">Número de Flashcards</Label>
          <Input
            id="num-cards"
            type="number"
            value={numCards}
            onChange={(e) => setNumCards(Math.max(1, parseInt(e.target.value, 10)))}
            className="w-24 mt-2 bg-input"
          />
        </div>
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleGenerate} disabled={isPending} className="w-full">
            <Wand2 className="w-4 h-4 mr-2"/>
            {isPending ? 'A gerar...' : 'Gerar Flashcards'}
          </Button>
          <Button variant="outline" onClick={clearAll} disabled={isPending} title="Limpar Tudo">
            <Trash2 className="w-4 h-4"/>
          </Button>
        </div>
      </div>

      {/* Coluna de Saída */}
      <div className="bg-card border rounded-lg p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Flashcards Gerados</h2>
          {cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar para Anki
            </Button>
          )}
        </div>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 flex-grow">
          {isPending && <p className="text-muted-foreground text-center pt-8">A IA está a pensar...</p>}
          {!isPending && cards.length === 0 && <p className="text-muted-foreground text-center pt-8">Os seus flashcards aparecerão aqui.</p>}
          {cards.map((card, index) => (
            <div key={index} className="bg-secondary p-4 rounded-md text-sm">
              <Label className="font-semibold text-primary">Pergunta</Label>
              <Textarea
                value={card.question}
                onChange={(e) => handleCardChange(index, 'question', e.target.value)}
                className="bg-transparent border-none p-1 focus-visible:ring-1 ring-primary resize-none"
                rows={2}
              />
              <hr className="my-2 border-border" />
              <Label className="font-semibold text-primary">Resposta</Label>
              <Textarea
                value={card.answer}
                onChange={(e) => handleCardChange(index, 'answer', e.target.value)}
                className="bg-transparent border-none p-1 focus-visible:ring-1 ring-primary resize-none"
                rows={3}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
