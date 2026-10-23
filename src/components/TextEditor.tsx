'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent, Node } from '@tiptap/react';
import {
  Italic,
  Bold,
  Link as LinkIcon,
  Youtube,
  Highlighter,
  Table as TableIcon,
  Underline as UnderlineIcon,
  X,
  List,
  ListOrdered,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronsUpDown,
  Check,
  Loader2,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
} from 'lucide-react';

import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import BoldExtension from '@tiptap/extension-bold';
import ItalicExtension from '@tiptap/extension-italic';
import UnderlineExtension from '@tiptap/extension-underline';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import History from '@tiptap/extension-history';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import YoutubeExtension from '@tiptap/extension-youtube';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FontFamily from '@tiptap/extension-font-family';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';

import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SlashCommand } from './SlashCommandList';
import { WikiLink } from './WikiLink';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import './TextEditor.css';

// EXTENSÕES: Bloco Retrátil
const Summary = Node.create({
  name: 'summary',
  group: 'summary',
  content: 'inline*',
  parseHTML() {
    return [{ tag: 'summary' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['summary', { ...HTMLAttributes, class: 'foldable-summary' }, 0];
  },
  selectable: false,
  draggable: false,
});

const FoldableBlock = Node.create({
  name: 'foldableBlock',
  group: 'block',
  content: 'summary block+',
  defining: true,
  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.hasAttribute('open'),
        renderHTML: (attrs) => (attrs.open ? { open: '' } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'details' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['details', HTMLAttributes, 0];
  },
});

// BARRA DE FERRAMENTAS DO EDITOR
const MenuBar = React.memo(
  ({
    editor,
    onClose,
    isSaving,
  }: {
    editor: Editor;
    onClose: () => void;
    isSaving: boolean;
  }) => {
    const [highlightColor, setHighlightColor] = useState('#fef08a');
    const [textColor, setTextColor] = useState('#6366f1');

    const setLink = useCallback(() => {
      if (!editor) return;
      if (editor.isActive('link')) return editor.chain().focus().unsetLink().run();
      const url = window.prompt('URL do link:', editor.getAttributes('link').href || '');
      if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
      if (!editor) return;
      const url = prompt('Cole o link do vídeo do YouTube:');
      if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }, [editor]);

    const addFoldableBlock = useCallback(() => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'foldableBlock',
          attrs: { open: true },
          content: [
            { type: 'summary', content: [{ type: 'text', text: 'Tópico de Dúvida / Jurisprudência' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Detalhes e anotações aqui...' }] },
          ],
        })
        .run();
    }, [editor]);

    if (!editor) return null;

    return (
      <div className="p-2 border-b border-border bg-card flex flex-wrap items-center gap-1.5 sticky top-0 z-10 text-xs">
        {/* Nível de Cabeçalho */}
        <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={cn('h-7 px-2 text-xs', editor.isActive('paragraph') && 'bg-background shadow-xs font-semibold')}
            title="Parágrafo normal"
          >
            <Pilcrow className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn('h-7 px-2 text-xs', editor.isActive('heading', { level: 1 }) && 'bg-background shadow-xs font-semibold')}
            title="Título Principal"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn('h-7 px-2 text-xs', editor.isActive('heading', { level: 2 }) && 'bg-background shadow-xs font-semibold')}
            title="Subtítulo"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn('h-7 px-2 text-xs', editor.isActive('heading', { level: 3 }) && 'bg-background shadow-xs font-semibold')}
            title="Seção"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="h-5 w-px bg-border mx-0.5" />

        {/* Formatação básica */}
        <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn('h-7 px-2', editor.isActive('bold') && 'bg-background shadow-xs text-primary font-bold')}
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn('h-7 px-2', editor.isActive('italic') && 'bg-background shadow-xs text-primary')}
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn('h-7 px-2', editor.isActive('underline') && 'bg-background shadow-xs text-primary')}
            title="Sublinhado (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Alinhamento */}
        <div className="hidden sm:flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn('h-7 px-2', editor.isActive({ textAlign: 'left' }) && 'bg-background shadow-xs')}
            title="Esquerda"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn('h-7 px-2', editor.isActive({ textAlign: 'center' }) && 'bg-background shadow-xs')}
            title="Centro"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn('h-7 px-2', editor.isActive({ textAlign: 'right' }) && 'bg-background shadow-xs')}
            title="Direita"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Listas e Checklists */}
        <div className="flex items-center rounded-lg border border-border bg-secondary/30 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn('h-7 px-2', editor.isActive('bulletList') && 'bg-background shadow-xs text-primary')}
            title="Lista com marcadores"
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn('h-7 px-2', editor.isActive('orderedList') && 'bg-background shadow-xs text-primary')}
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={cn('h-7 px-2', editor.isActive('taskList') && 'bg-background shadow-xs text-primary')}
            title="Checklist / Tarefas"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Extras: Marca-texto, Tabela, Vídeo, Retrátil */}
        <div className="flex items-center gap-1">
          {/* Marca-Texto */}
          <div className="flex items-center rounded-lg border border-border px-1.5 py-0.5 bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()}
              className={cn('h-6 px-1.5', editor.isActive('highlight') && 'bg-secondary')}
              title="Marca-texto"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-500" />
            </Button>
            <input
              type="color"
              value={highlightColor}
              onChange={(e) => setHighlightColor(e.target.value)}
              className="w-4 h-4 p-0 bg-transparent border-none cursor-pointer rounded-full"
              title="Cor do marca-texto"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={cn('h-8 px-2 border border-border', editor.isActive('link') && 'bg-secondary text-primary')}
            title="Inserir Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="h-8 px-2 border border-border"
            title="Inserir Tabela"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={addFoldableBlock}
            className="h-8 px-2 border border-border"
            title="Bloco Retrátil / Acordeão"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={addYoutubeVideo}
            className="h-8 px-2 border border-border text-red-500 hover:text-red-600"
            title="Vídeo YouTube"
          >
            <Youtube className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Status de Salvamento e Fechar */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-1">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="hidden sm:inline">Salvo</span>
              </>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Fechar editor">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
);
MenuBar.displayName = 'MenuBar';

// COMPONENTE PRINCIPAL DO EDITOR
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<void>;
  onClose: () => void;
}

export default function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedSave = useDebouncedCallback(async (currEditor: Editor) => {
    if (currEditor && !currEditor.isDestroyed) {
      setIsSaving(true);
      try {
        await onSave(currEditor.getJSON());
      } finally {
        setTimeout(() => setIsSaving(false), 400);
      }
    }
  }, 1000);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Document,
      Paragraph,
      Text,
      History,
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      ListItem,
      TaskList,
      TaskItem.configure({ nested: true }),
      BoldExtension,
      ItalicExtension,
      UnderlineExtension,
      Link.configure({ openOnClick: false }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      YoutubeExtension.configure({ nocookie: true }),
      CharacterCount,
      SlashCommand,
      WikiLink,
      WikiLinkSuggestion,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'summary'],
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Summary,
      FoldableBlock,
    ],
    content: initialContent || '',
    editorProps: {
      attributes: {
        class:
          'prose dark:prose-invert max-w-none p-6 sm:p-10 focus:outline-none min-h-[500px] leading-relaxed text-foreground',
        spellcheck: 'true',
      },
      handleDOMEvents: {
        click: (view, event) => {
          const target = event.target as HTMLElement;
          if (target.closest('summary.foldable-summary')) {
            return false;
          }
          return undefined;
        },
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      debouncedSave(currentEditor);
    },
    onCreate: () => setIsEditorReady(true),
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && initialContent) {
      try {
        const initialContentJSON =
          typeof initialContent === 'string' ? JSON.parse(initialContent) : initialContent;
        const currentContentJSON = editor.getJSON();
        if (JSON.stringify(currentContentJSON) !== JSON.stringify(initialContentJSON)) {
          editor.commands.setContent(initialContentJSON || '', { emitUpdate: false });
        }
      } catch (error) {
        console.error('Erro ao processar conteúdo inicial:', error);
        editor.commands.setContent('', { emitUpdate: false });
      }
    } else if (editor && !editor.isDestroyed && !initialContent) {
      editor.commands.setContent('', { emitUpdate: false });
    }
  }, [initialContent, editor]);

  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {editor && isEditorReady && (
        <MenuBar editor={editor} onClose={onClose} isSaving={isSaving} />
      )}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}