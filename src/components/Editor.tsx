// src/components/Editor.tsx

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from './ui/button';
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2 } from 'lucide-react';
import { useTransition } from 'react';

// Barra de ferramentas do editor
const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="border border-gray-700 rounded-t-lg p-2 flex gap-1">
      <Button onClick={() => editor.chain().focus().toggleBold().run()} variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="icon"><Bold className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="icon"><Italic className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleStrike().run()} variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="icon"><Strikethrough className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="icon"><Heading2 className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleBulletList().run()} variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="icon"><List className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="icon"><ListOrdered className="h-4 w-4" /></Button>
    </div>
  );
};

// Props do componente Editor
type EditorProps = {
  pageId: number;
  title: string;
  emoji: string;
  content: any; // O conteúdo vem do banco como JSON
  onSave: (formData: FormData) => Promise<void>;
};

export function Editor({ pageId, title, emoji, content, onSave }: EditorProps) {
  const [isPending, startTransition] = useTransition();

  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert min-h-[300px] max-w-none p-4 focus:outline-none border border-gray-700 border-t-0 rounded-b-lg',
      },
    },
  });

  const handleSave = () => {
    const formData = new FormData();
    formData.append('id', String(pageId));
    formData.append('title', title); // Título e emoji podem ser editáveis no futuro
    formData.append('emoji', emoji);
    formData.append('content', JSON.stringify(editor?.getJSON()));
    startTransition(() => onSave(formData));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}