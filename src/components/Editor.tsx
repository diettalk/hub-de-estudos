// src/components/Editor.tsx (VERSÃO FINAL COM TÍTULO EDITÁVEL)

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from './ui/button';
import { Input } from './ui/input'; // Importamos o Input
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2 } from 'lucide-react';
import { useTransition, useState, useEffect } from 'react';
import { toast } from 'sonner';

const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="border border-gray-700 rounded-t-lg p-2 flex gap-1 flex-wrap">
      <Button onClick={() => editor.chain().focus().toggleBold().run()} variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon"><Bold className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon"><Italic className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleStrike().run()} variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon"><Strikethrough className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="icon"><Heading2 className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleBulletList().run()} variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon"><List className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon"><ListOrdered className="h-4 w-4" /></Button>
    </div>
  );
};

type EditorProps = {
  pageId: number;
  title: string;
  content: any;
  onSave: (formData: FormData) => Promise<any>;
};

export function Editor({ pageId, title, content, onSave }: EditorProps) {
  const [isPending, startTransition] = useTransition();
  // Criamos estados locais para o título e o conteúdo, para que sejam editáveis.
  const [currentTitle, setCurrentTitle] = useState(title);
  const [isDirty, setIsDirty] = useState(false); // Para saber se houve alteração

  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    // Monitora qualquer atualização no editor para marcar como "sujo" (alterado)
    onUpdate: () => {
      setIsDirty(true);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert min-h-[50vh] max-w-none p-4 focus:outline-none border border-gray-700 border-t-0 rounded-b-lg',
      },
    },
  });

  // Efeito para sincronizar o estado interno quando o usuário clica em outro documento
  useEffect(() => {
    setCurrentTitle(title);
    if (editor) {
      // Usamos .setContent() para atualizar o editor do Tiptap de forma programática
      editor.commands.setContent(content, false); // 'false' evita que o cursor pule
    }
    setIsDirty(false); // Reseta o estado de alteração
  }, [pageId, title, content, editor]);

  const handleSave = () => {
    if (!editor) return;

    const formData = new FormData();
    formData.append('id', String(pageId));
    formData.append('title', currentTitle); // Enviamos o título editado
    formData.append('content', JSON.stringify(editor.getJSON())); // E o conteúdo atual do editor
    
    startTransition(async () => {
      await onSave(formData);
      toast.success("Alterações salvas com sucesso!");
      setIsDirty(false); // Reseta após salvar
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* CAMPO DE TÍTULO EDITÁVEL */}
      <Input
        value={currentTitle}
        onChange={(e) => {
          setCurrentTitle(e.target.value);
          setIsDirty(true);
        }}
        placeholder="Título do Documento"
        className="text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 mb-4"
      />
      <div className="flex-grow">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <div className="mt-4 flex justify-end">
        {/* O botão só fica ativo se houver alterações não salvas */}
        <Button onClick={handleSave} disabled={isPending || !isDirty}>
          {isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}