// src/components/DisciplinaModal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TextEditor } from "./TextEditor";
import { Button } from "./ui/button";
import { useState, useEffect, useTransition } from "react";
import { type Disciplina } from "@/lib/types";
import { generateFlashcard } from "@/app/actions";
import { Textarea } from "./ui/textarea"; // Usaremos um componente de UI para a área de texto

export function DisciplinaModal({ disciplina, isOpen, onClose }: { disciplina: Disciplina | null; isOpen: boolean; onClose: () => void; }) {
  const [editorContent, setEditorContent] = useState('');
  
  // --- Estados para a funcionalidade de IA ---
  const [textToConvert, setTextToConvert] = useState('');
  const [generatedFlashcard, setGeneratedFlashcard] = useState<{ pergunta: string; resposta: string } | null>(null);
  const [isGenerating, startTransition] = useTransition();
  const [error, setError] = useState('');

  useEffect(() => {
    if (disciplina) {
      // No futuro, aqui buscaremos o conteúdo salvo da disciplina
      setEditorContent(`<h1>Anotações para ${disciplina.nome}</h1><p>Comece a escrever...</p>`);
      // Reseta o estado da IA sempre que um novo modal é aberto
      setGeneratedFlashcard(null);
      setTextToConvert('');
      setError('');
    }
  }, [disciplina]);

  const handleGenerateClick = () => {
    if (!textToConvert || !disciplina) return;
    setError('');
    setGeneratedFlashcard(null);

    startTransition(async () => {
      const result = await generateFlashcard(disciplina.id, textToConvert);
      if (result?.success && result.flashcard) {
        setGeneratedFlashcard(result.flashcard);
      } else {
        setError(result?.error || 'Ocorreu um erro desconhecido.');
      }
    });
  };

  if (!disciplina) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] flex flex-col bg-gray-800 border-gray-700 text-white">
        <DialogHeader className="p-4 border-b border-gray-700">
          <DialogTitle className="text-2xl flex items-center">
            <span className="text-3xl mr-3">{disciplina.emoji}</span>
            {disciplina.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-1 grid grid-cols-2 gap-4">
          {/* Coluna do Editor de Texto */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold p-2">Suas Anotações</h3>
            <TextEditor value={editorContent} onChange={setEditorContent} />
          </div>

          {/* Coluna do Gerador de IA */}
          <div className="flex flex-col p-2 space-y-4 border-l border-gray-700">
            <h3 className="text-lg font-semibold">Gerador de Flashcards com IA</h3>
            <Textarea
              placeholder="Cole aqui um trecho do seu estudo para o Gemini transformar em um flashcard..."
              className="bg-gray-900 text-white h-40"
              value={textToConvert}
              onChange={(e) => setTextToConvert(e.target.value)}
            />
            <Button onClick={handleGenerateClick} disabled={isGenerating}>
              {isGenerating ? 'Gerando...' : 'Gerar Flashcard com IA'}
            </Button>
            
            {generatedFlashcard && (
              <div className="mt-4 p-4 bg-green-900/50 rounded-md border border-green-500/50">
                <p className="font-bold text-green-300">Flashcard Gerado com Sucesso!</p>
                <p className="font-semibold mt-2">Pergunta:</p>
                <p>{generatedFlashcard.pergunta}</p>
                <p className="font-semibold mt-2">Resposta:</p>
                <p>{generatedFlashcard.resposta}</p>
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-red-900/50 rounded-md border border-red-500/50">
                <p className="font-bold text-red-300">Erro:</p>
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="p-4 border-t border-gray-700">
          <Button onClick={onClose} variant="secondary">Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}