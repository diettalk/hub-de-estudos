'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { generateAnkiCards, saveAnkiDeck } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Copy, Trash2, Wand2, Save } from 'lucide-react';

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
      setCards([]);

      // CORREÇÃO: Criar um FormData para enviar os dados para a Server Action
      const formData = new FormData();
      formData.append('sourceText', sourceText);
      formData.append('numCards', String(numCards));

      const result = await generateAnkiCards(formData);
      
      if (result.error) {
        toast.error(`Erro da IA: ${result.error}`);
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

  const deleteCard = (indexToDelete: number) => {
    setCards(currentCards => currentCards.filter((_, index) => index !== indexToDelete));
    toast.info("Flashcard removido.");
  };

  const handleSaveDeck = () => {
    const title = prompt("Dê um título para este deck de flashcards:", `Deck de ${new Date().toLocaleDateString('pt-BR')}`);
    if (!title || !title.trim()) {
        toast.info("Operação cancelada.");
        return;
    }
    startTransition(async () => {
        const result = await saveAnkiDeck(title, cards);
        if(result.error) {
            toast.error(result.error);
        } else {
            toast.success(`Deck "${title}" guardado com sucesso!`);
        }
    });
  };

  const copyToClipboard = () => {
    const textToCopy = cards.map(card => `${card.question}\t${card.answer}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
        toast.success("Deck copiado para a área de transferência!");
    }, () => {
        toast.error("Falha ao copiar.");
    });
  };
  const clearAll = () => { setSourceText(''); setCards([]); }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-card border rounded-lg p-6 space-y-4 flex flex-col">
        <div>
          <Label htmlFor="source-text" className="text-lg font-semibold">Seu Material de Estudo</Label>
          <Textarea id="source-text" value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Cole aqui o seu PDF, anotação ou qualquer texto base..." className="mt-2 h-64 bg-input flex-grow" />
        </div>
        <div>
          <Label htmlFor="num-cards">Número de Flashcards</Label>
          <Input id="num-cards" type="number" value={numCards} onChange={(e) => setNumCards(Math.max(1, parseInt(e.target.value, 10)))} className="w-24 mt-2 bg-input" />
        </div>
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={handleGenerate} disabled={isPending} className="w-full"><Wand2 className="w-4 h-4 mr-2"/>{isPending ? 'A gerar...' : 'Gerar Flashcards'}</Button>
          <Button variant="outline" onClick={clearAll} disabled={isPending} title="Limpar Tudo"><Trash2 className="w-4 h-4"/></Button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Flashcards Gerados</h2>
          {cards.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}><Copy className="w-4 h-4 mr-2" />Copiar para Anki</Button>
              <Button size="sm" onClick={handleSaveDeck} disabled={isPending}><Save className="w-4 h-4 mr-2" />Guardar Deck</Button>
            </div>
          )}
        </div>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 flex-grow">
          {isPending && <p className="text-muted-foreground text-center pt-8">A IA está a pensar...</p>}
          {!isPending && cards.length === 0 && <p className="text-muted-foreground text-center pt-8">Os seus flashcards aparecerão aqui.</p>}
          {cards.map((card, index) => (
            <div key={index} className="bg-secondary p-4 rounded-md text-sm group relative">
              <Label className="font-semibold text-primary">Pergunta</Label>
              <Textarea value={card.question} onChange={(e) => handleCardChange(index, 'question', e.target.value)} className="bg-transparent border-none p-1 focus-visible:ring-1 ring-primary resize-none" rows={2} />
              <hr className="my-2 border-border" />
              <Label className="font-semibold text-primary">Resposta</Label>
              <Textarea value={card.answer} onChange={(e) => handleCardChange(index, 'answer', e.target.value)} className="bg-transparent border-none p-1 focus-visible:ring-1 ring-primary resize-none" rows={3} />
              <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteCard(index)} title="Apagar este flashcard">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
