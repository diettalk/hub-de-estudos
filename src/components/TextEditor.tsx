'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent, Editor, JSONContent, Node } from '@tiptap/react';
import {
  Italic,
  Bold,
  Link as LinkIcon,
  Youtube,
  Highlighter,
  Palette,
  Table as TableIcon,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  CheckSquare,
  ChevronsUpDown,
  Check,
  Loader2,
  Pilcrow,
  Trash2,
  Plus,
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
import { updateItemTitle, deleteItem, createItem } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SlashCommand } from './SlashCommandList';
import { WikiLink } from './WikiLink';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import './TextEditor.css';

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

const TEXT_COLOR_PRESETS = [
  { label: 'Verde', color: '#34d399' },
  { label: 'Azul', color: '#60a5fa' },
  { label: 'Amarelo', color: '#facc15' },
  { label: 'Vermelho', color: '#f87171' },
  { label: 'Roxo', color: '#c084fc' },
  { label: 'Laranja', color: '#fb923c' },
  { label: 'Rosa', color: '#f472b6' },
  { label: 'Ciano', color: '#2dd4bf' },
];

const HIGHLIGHT_PRESETS = [
  { label: 'Amarelo', color: '#fde047' },
  { label: 'Verde', color: '#4ade80' },
  { label: 'Azul', color: '#60a5fa' },
  { label: 'Rosa', color: '#f472b6' },
  { label: 'Roxo', color: '#c084fc' },
];

const MenuBar = React.memo(
  ({
    editor,
    isSaving,
  }: {
    editor: Editor;
    onClose: () => void;
    isSaving: boolean;
  }) => {
    const [linkUrl, setLinkUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [activeTextColor, setActiveTextColor] = useState<string>('');

    useEffect(() => {
      if (!editor) return;
      const updateColor = () => {
        if (!editor.isDestroyed) {
          setActiveTextColor(editor.getAttributes('textStyle').color || '');
        }
      };
      editor.on('selectionUpdate', updateColor);
      editor.on('transaction', updateColor);
      return () => {
        editor.off('selectionUpdate', updateColor);
        editor.off('transaction', updateColor);
      };
    }, [editor]);

    if (!editor) return null;

    const handleApplyLink = (e: React.FormEvent) => {
      e.preventDefault();
      if (!linkUrl.trim()) {
        editor.chain().focus().unsetLink().run();
      } else {
        const formatted = linkUrl.startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
        editor.chain().focus().extendMarkRange('link').setLink({ href: formatted }).run();
      }
      setLinkUrl('');
    };

    const handleApplyYoutube = (e: React.FormEvent) => {
      e.preventDefault();
      if (!youtubeUrl.trim()) return;
      editor.chain().focus().setYoutubeVideo({ src: youtubeUrl.trim() }).run();
      setYoutubeUrl('');
      toast.success('Vídeo do YouTube inserido no resumo!');
    };

    const addFoldableBlock = () => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'foldableBlock',
          attrs: { open: true },
          content: [
            {
              type: 'summary',
              content: [{ type: 'text', text: 'Tópico Recolhível / Jurisprudência (Clique para abrir/fechar)' }],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Escreva a explicação detalhada aqui dentro...' }],
            },
          ],
        })
        .run();
    };

    return (
      <div className="px-4 py-2.5 border-b border-border bg-secondary/20 flex flex-wrap items-center gap-2 sticky top-0 z-10 text-xs">
        {/* 1. TÍTULOS E PARÁGRAFO */}
        <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={cn(
              'h-7 px-2 text-xs',
              editor.isActive('paragraph') && 'bg-secondary font-bold text-emerald-400'
            )}
            title="Texto normal"
          >
            <Pilcrow className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Texto</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              'h-7 px-2 text-xs font-bold',
              editor.isActive('heading', { level: 1 }) && 'bg-secondary text-emerald-400'
            )}
            title="Título Grande (H1)"
          >
            H1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'h-7 px-2 text-xs font-bold',
              editor.isActive('heading', { level: 2 }) && 'bg-secondary text-emerald-400'
            )}
            title="Subtítulo (H2)"
          >
            H2
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              'h-7 px-2 text-xs font-bold',
              editor.isActive('heading', { level: 3 }) && 'bg-secondary text-emerald-400'
            )}
            title="Seção (H3)"
          >
            H3
          </Button>
        </div>

        {/* 2. NEGRITO, ITÁLICO, SUBLINHADO */}
        <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'h-7 px-2.5',
              editor.isActive('bold') && 'bg-secondary text-emerald-400 font-bold'
            )}
            title="Negrito (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn('h-7 px-2.5', editor.isActive('italic') && 'bg-secondary text-emerald-400')}
            title="Itálico (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              'h-7 px-2.5',
              editor.isActive('underline') && 'bg-secondary text-emerald-400'
            )}
            title="Sublinhado (Ctrl+U)"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* 3. COR DO TEXTO (8 CORES DE LEITURA + SELETOR LIVRE + PADRÃO) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1.5 rounded-xl bg-card text-xs"
              title="Mudar cor da fonte / texto"
            >
              <Palette
                className="w-3.5 h-3.5"
                style={{ color: activeTextColor || '#34d399' }}
              />
              <span className="hidden md:inline">Cor da Letra</span>
              {activeTextColor && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/20"
                  style={{ backgroundColor: activeTextColor }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3.5 space-y-3 bg-card border-border shadow-xl" align="start">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground">Cor do Texto</span>
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetColor().run()}
                className="px-2 py-0.5 rounded bg-secondary text-[10px] font-bold text-muted-foreground hover:text-foreground"
              >
                Voltar ao Padrão
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TEXT_COLOR_PRESETS.map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => editor.chain().focus().setColor(c.color).run()}
                  className="flex items-center gap-1.5 p-1.5 rounded-lg border border-border/60 hover:bg-secondary/60 transition-all text-[10px] font-bold"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">Outra cor personalizada:</span>
              <input
                type="color"
                value={activeTextColor || '#34d399'}
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                className="w-7 h-7 rounded cursor-pointer bg-transparent border-none"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* 4. MARCA-TEXTO COM CORES RÁPIDAS */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 px-2.5 gap-1.5 rounded-xl bg-card text-xs',
                editor.isActive('highlight') && 'border-amber-400 text-amber-400'
              )}
              title="Grifar texto (Marca-texto)"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Grifar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 space-y-2 bg-card border-border shadow-xl" align="start">
            <span className="text-[11px] font-bold text-muted-foreground block">
              Escolha a cor do Marca-Texto:
            </span>
            <div className="flex items-center justify-between gap-1.5">
              {HIGHLIGHT_PRESETS.map((p) => (
                <button
                  key={p.color}
                  type="button"
                  onClick={() => editor.chain().focus().toggleHighlight({ color: p.color }).run()}
                  style={{ backgroundColor: p.color }}
                  className="w-7 h-7 rounded-lg border border-black/20 hover:scale-110 transition-transform"
                  title={p.label}
                />
              ))}
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                className="px-2 py-1 rounded-lg bg-secondary text-[10px] font-bold text-muted-foreground hover:text-foreground"
                title="Remover grifo"
              >
                Limpar
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 5. LISTAS E CHECKLIST */}
        <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn('h-7 px-2', editor.isActive('bulletList') && 'bg-secondary text-emerald-400')}
            title="Lista com marcadores"
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'h-7 px-2',
              editor.isActive('orderedList') && 'bg-secondary text-emerald-400'
            )}
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={cn('h-7 px-2', editor.isActive('taskList') && 'bg-secondary text-emerald-400')}
            title="Lista de tarefas (Checklist)"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* 6. INSERIR LINK */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 px-2.5 gap-1.5 rounded-xl bg-card text-xs',
                editor.isActive('link') && 'border-emerald-500 text-emerald-400'
              )}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Link</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 space-y-2.5 bg-card border-border shadow-xl" align="start">
            <span className="text-xs font-bold block">Inserir Link no Texto</span>
            <form onSubmit={handleApplyLink} className="flex gap-1.5">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs bg-secondary/30 rounded-lg"
              />
              <Button type="submit" size="sm" className="h-8 px-3 text-xs font-bold bg-emerald-500 text-white rounded-lg">
                OK
              </Button>
            </form>
            {editor.isActive('link') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="w-full h-7 text-[11px] text-rose-400"
              >
                Remover link atual
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* 7. INSERIR VÍDEO DO YOUTUBE */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 gap-1.5 rounded-xl bg-card text-xs text-rose-400 hover:text-rose-300"
            >
              <Youtube className="w-3.5 h-3.5" />
              <span className="hidden md:inline">YouTube</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3.5 space-y-2.5 bg-card border-border shadow-xl" align="start">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <Youtube className="w-4 h-4 text-rose-500" />
              Embutir Videoaula do YouTube
            </span>
            <p className="text-[11px] text-muted-foreground">
              Cole o link do vídeo do YouTube abaixo para assistir dentro do seu resumo:
            </p>
            <form onSubmit={handleApplyYoutube} className="flex gap-1.5">
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-8 text-xs bg-secondary/30 rounded-lg flex-1"
              />
              <Button type="submit" size="sm" className="h-8 px-3 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-lg">
                Inserir
              </Button>
            </form>
          </PopoverContent>
        </Popover>

        {/* 8. TABELA E ACORDEÃO */}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          className="h-8 px-2.5 gap-1.5 rounded-xl bg-card text-xs"
          title="Inserir Tabela"
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Tabela</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={addFoldableBlock}
          className="h-8 px-2.5 gap-1.5 rounded-xl bg-card text-xs"
          title="Inserir Bloco Recolhível (Acordeão)"
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Acordeão</span>
        </Button>

        {/* STATUS DE SALVAMENTO */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Salvo</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);
MenuBar.displayName = 'MenuBar';

interface TextEditorProps {
  pageId?: number;
  pageTitle?: string;
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<void>;
  onClose: () => void;
}

export default function TextEditor({
  pageId,
  pageTitle = 'Resumo da Disciplina',
  initialContent,
  onSave,
  onClose,
}: TextEditorProps) {
  const router = useRouter();
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [titleValue, setTitleValue] = useState(pageTitle);

  useEffect(() => {
    setTitleValue(pageTitle);
  }, [pageTitle]);

  const debouncedSave = useDebouncedCallback(async (currEditor: Editor) => {
    if (currEditor && !currEditor.isDestroyed) {
      setIsSaving(true);
      try {
        await onSave(currEditor.getJSON());
      } finally {
        setTimeout(() => setIsSaving(false), 400);
      }
    }
  }, 900);

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
      Link.configure({ openOnClick: true }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      YoutubeExtension.configure({ nocookie: true, width: 640, height: 360 }),
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
          'prose dark:prose-invert max-w-none px-6 sm:px-12 py-6 focus:outline-none min-h-[480px] leading-relaxed text-foreground text-sm sm:text-base [&_span[style*="color"]_*]:!text-inherit [&_strong]:!text-inherit',
        spellcheck: 'true',
      },
      handleDOMEvents: {
        click: (_view, event) => {
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

  const handleTitleBlur = async () => {
    if (!pageId || !titleValue.trim() || titleValue.trim() === pageTitle) return;
    const res = await updateItemTitle('paginas', pageId, titleValue.trim());
    if (!res.error) {
      toast.success('Título da página atualizado!');
      router.refresh();
    }
  };

  const handleDeleteCurrentPage = async () => {
    if (!pageId) return;
    if (!confirm(`Deseja realmente excluir a página "${titleValue}"?`)) return;
    const res = await deleteItem('paginas', pageId);
    if (!res.error) {
      toast.success('Página excluída.');
      router.push('/disciplinas');
    }
  };

  const handleCreateSubPage = async () => {
    if (!pageId) return;
    const res = await createItem('paginas', pageId);
    if (!res.error && res.newItem?.id) {
      toast.success('Subpágina criada!');
      router.refresh();
      router.push(`/disciplinas?page=${res.newItem.id}`);
    }
  };

  const wordCount = editor?.storage.characterCount?.words() || 0;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="flex-1 flex flex-col h-full bg-card overflow-hidden">
      {editor && isEditorReady && (
        <MenuBar editor={editor} onClose={onClose} isSaving={isSaving} />
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 sm:px-12 pt-8 pb-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            type="text"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="Título da Página / Tópico..."
            className="text-xl sm:text-2xl font-extrabold text-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/40 rounded-lg px-1.5 py-0.5 flex-1"
          />

          {pageId && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateSubPage}
                className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>Criar Subtópico</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeleteCurrentPage}
                className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Página</span>
              </Button>
            </div>
          )}
        </div>

        <EditorContent editor={editor} />
      </div>

      <div className="px-6 py-2 border-t border-border/60 bg-secondary/20 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          💡 Dica: Digite <strong className="text-foreground">/</strong> em qualquer linha para abrir comandos rápidos
        </span>
        <span>
          {wordCount} palavras • ~{readingTimeMin} min de leitura
        </span>
      </div>
    </div>
  );
}