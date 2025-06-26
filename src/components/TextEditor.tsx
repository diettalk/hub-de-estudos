// src/components/TextEditor.tsx
'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import './TextEditor.css'; // Vamos criar este arquivo para estilizar

// Componente para a barra de ferramentas do editor
const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  // Função para deixar o botão com estilo de "ativo"
  const getButtonClass = (name: string, params?: object) => {
    return editor.isActive(name, params)
      ? 'bg-blue-500 text-white p-2 rounded-md'
      : 'bg-gray-600 hover:bg-gray-500 p-2 rounded-md';
  };

  // A CORREÇÃO ESTÁ AQUI: O return estava fora da função.
  return (
    <div className="p-2 bg-gray-700 rounded-t-lg flex flex-wrap gap-2">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={getButtonClass('bold')}>
        Negrito
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={getButtonClass('italic')}>
        Itálico
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={getButtonClass('heading', { level: 2 })}>
        Título
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={getButtonClass('blockquote')}>
        Citação
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={getButtonClass('bulletList')}>
        Lista
      </button>
    </div>
  );
};


export function TextEditor({ value, onChange }: { value: string; onChange: (value: string) => void; }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none p-4 focus:outline-none min-h-[150px] bg-white text-black rounded-b-lg',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="h-full flex flex-col">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
    </div>
  );
}