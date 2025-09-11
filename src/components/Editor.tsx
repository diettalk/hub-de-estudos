// src/components/Editor.tsx

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Bold, Italic, Strikethrough, List, ListOrdered, Heading2 } from 'lucide-react';
import { useTransition, useState, useEffect } from 'react';
import { toast } from 'sonner';

import Suggestion from '@tiptap/suggestion';
import { Node } from '@tiptap/core';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import { supabase } from '@/lib/supabaseClient';

// 🔗 Extensão WikiLink
const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="wiki-link"]' }];
  },

  renderHTML({ node }) {
    return [
      'a',
      {
        'data-type': 'wiki-link',
        'data-id': node.attrs.id,
        href: `/disciplinas/${node.attrs.id}`,
        class: 'text-blue-400 underline hover:text-blue-600',
      },
      node.attrs.title,
    ];
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        char: '[', // só aceita um caractere
        pluginKey: 'wikiLinkSuggestion',
        allowSpaces: true,
        items: async ({ query, state }) => {
          const { from } = state.selection;
          const textBefore = state.doc.textBetween(from - 2, from, '\n', '\n');

          // só abre se digitou `[[`
          if (textBefore !== '[[') return [];

          // 🔎 busca disciplinas no Supabase
          const { data, error } = await supabase
            .from('disciplinas')
            .select('id, title')
            .ilike('title', `%${query}%`)
            .limit(10);

          if (error) {
            console.error(error);
            return [];
          }

          return data || [];
        },
        command: ({ editor, range, props }) => {
          // remove os dois colchetes `[[`
          editor
            .chain()
            .focus()
            .insertContentAt({ from: range.from - 1, to: range.to }, [
              {
                type: 'wikiLink',
                attrs: { id: props.id, title: props.title },
              },
            ])
            .run();
        },
        render: WikiLinkSuggestion,
      }),
    ];
  },
});

const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;
  return (
    <div className="border border-gray-700 rounded-t-lg p-2 flex gap-1 flex-wrap bg-gray-900">
      <Button onClick={() => editor.chain().focus().toggleBold().run()} variant={editor.isActive('bold') ? 'secondary' : 'ghost'} size="sm"><Bold className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleItalic().run()} variant={editor.isActive('italic') ? 'secondary' : 'ghost'} size="sm"><Italic className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleStrike().run()} variant={editor.isActive('strike') ? 'secondary' : 'ghost'} size="sm"><Strikethrough className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'} size="sm"><Heading2 className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleBulletList().run()} variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'} size="sm"><List className="h-4 w-4" /></Button>
      <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'} size="sm"><ListOrdered className="h-4 w-4" /></Button>
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
  const [currentTitle, setCurrentTitle] = useState(title);
  const [isDirty, setIsDirty] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, WikiLink],
    content: content || '',
    onUpdate: () => {
      setIsDirty(true);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert min-h-[60vh] max-w-none p-4 focus:outline-none bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg',
      },
    },
  });

  useEffect(() => {
    setCurrentTitle(title);
    if (editor && editor.isEditable) {
      const isSameContent = JSON.stringify(editor.getJSON()) === JSON.stringify(content);
      if (!isSameContent) {
        editor.commands.setContent(content || '', false);
      }
    }
    setIsDirty(false);
  }, [pageId, title, content, editor]);

  const handleSave = () => {
    if (!editor) return;

    const formData = new FormData();
    formData.append('id', String(pageId));
    formData.append('title', currentTitle);
    formData.append('content', JSON.stringify(editor.getJSON()));

    startTransition(async () => {
      await onSave(formData);
      toast.success("Alterações salvas com sucesso!");
      setIsDirty(false);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <Input
          value={currentTitle}
          onChange={(e) => {
            setCurrentTitle(e.target.value);
            setIsDirty(true);
          }}
          placeholder="Título do Documento"
          className="text-2xl font-bold bg-transparent border-none focus:ring-0 p-0 h-auto"
        />
        <Button onClick={handleSave} disabled={isPending || !isDirty}>
          {isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <div className="flex-grow">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
