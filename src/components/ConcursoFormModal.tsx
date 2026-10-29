'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addConcurso, updateConcurso } from '@/app/actions';
import { type Concurso } from '@/lib/types';
import { toast } from 'sonner';
import { Plus, Trash2, Link as LinkIcon, X } from 'lucide-react';

export interface NamedLink {
  label: string;
  url: string;
}

// Extrai links nomeados salvos nas prioridades com prefixo "[LINK]Nome|URL" + edital_url principal
export function extractLinksAndPriorities(concurso: Concurso | null): {
  namedLinks: NamedLink[];
  cleanPriorities: string[];
} {
  if (!concurso) return { namedLinks: [], cleanPriorities: [] };

  const namedLinks: NamedLink[] = [];
  const cleanPriorities: string[] = [];

  if (concurso.edital_url?.trim()) {
    namedLinks.push({ label: 'Edital Principal', url: concurso.edital_url.trim() });
  }

  (concurso.prioridades || []).forEach((line) => {
    if (line.startsWith('[LINK]')) {
      const raw = line.replace('[LINK]', '');
      const [label, ...urlParts] = raw.split('|');
      const url = urlParts.join('|');
      if (url?.trim()) {
        namedLinks.push({ label: label?.trim() || 'Link', url: url.trim() });
      }
    } else if (line.trim()) {
      cleanPriorities.push(line);
    }
  });

  return { namedLinks, cleanPriorities };
}

type ConcursoFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  concurso: Concurso | null;
};

export function ConcursoFormModal({ isOpen, onClose, concurso }: ConcursoFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const isEditMode = concurso !== null;

  const [nome, setNome] = useState('');
  const [banca, setBanca] = useState('');
  const [dataProva, setDataProva] = useState('');
  const [status, setStatus] = useState('ativo');
  const [prioridadesTexto, setPrioridadesTexto] = useState('');
  const [links, setLinks] = useState<NamedLink[]>([{ label: 'Edital Verticalizado', url: '' }]);

  useEffect(() => {
    if (isOpen) {
      if (concurso) {
        setNome(concurso.nome || '');
        setBanca(concurso.banca || '');
        setDataProva(concurso.data_prova?.split('T')[0] || '');
        setStatus(concurso.status || 'ativo');
        const { namedLinks, cleanPriorities } = extractLinksAndPriorities(concurso);
        setLinks(namedLinks.length > 0 ? namedLinks : [{ label: 'Edital Principal', url: '' }]);
        setPrioridadesTexto(cleanPriorities.join('\n'));
      } else {
        setNome('');
        setBanca('');
        setDataProva('');
        setStatus('ativo');
        setPrioridadesTexto('');
        setLinks([{ label: 'Edital Principal', url: '' }]);
      }
    }
  }, [isOpen, concurso]);

  const handleAddLinkRow = () => {
    setLinks((prev) => [...prev, { label: '', url: '' }]);
  };

  const handleRemoveLinkRow = (idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLinkChange = (idx: number, field: 'label' | 'url', value: string) => {
    setLinks((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome do plano.');
      return;
    }

    const validLinks = links.filter((l) => l.url.trim() !== '');
    const primaryUrl = validLinks[0]?.url.trim() || '';

    // Todos os links com nome (incluindo o primeiro se tiver nome personalizado) vão codificados nas linhas de prioridades para preservar o nome
    const linkLines = validLinks.map(
      (l) => `[LINK]${l.label.trim() || 'Edital'}|${l.url.trim()}`
    );
    const normalPriorities = prioridadesTexto
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const combinedPriorities = [...linkLines, ...normalPriorities].join('\n');

    const formData = new FormData();
    if (isEditMode && concurso) {
      formData.append('id', String(concurso.id));
    }
    formData.append('nome', nome.trim());
    formData.append('banca', banca.trim());
    formData.append('data_prova', dataProva);
    formData.append('edital_url', primaryUrl);
    formData.append('status', status);
    formData.append('prioridades', combinedPriorities);

    const action = isEditMode ? updateConcurso : addConcurso;
    startTransition(() => {
      action(formData).then((result) => {
        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success(isEditMode ? 'Plano atualizado com sucesso!' : 'Novo plano criado!');
          onClose();
        }
      });
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[680px] max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div>
            <h2 className="text-lg font-bold">
              {isEditMode ? 'Editar Plano de Estudo' : 'Criar Novo Plano de Estudo'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure o concurso, datas e adicione quantos links de editais desejar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8 space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Plano / Concurso</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: SEDES-DF (Especialista em Assistência Social - Nutrição)"
                className="h-10 bg-secondary/30 text-xs rounded-xl"
                required
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <Label className="text-xs font-semibold">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-10 bg-secondary/30 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="previsto">Previsto</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Banca / Cargo / Subtítulo</Label>
              <Input
                value={banca}
                onChange={(e) => setBanca(e.target.value)}
                placeholder="Ex.: Cebraspe • Pós-Edital"
                className="h-10 bg-secondary/30 text-xs rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data da Prova (ou referência)</Label>
              <Input
                type="date"
                value={dataProva}
                onChange={(e) => setDataProva(e.target.value)}
                className="h-10 bg-secondary/30 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* MÚLTIPLOS LINKS NOMEADOS DE EDITAIS */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-emerald-500" />
                Links e Editais Nomeados
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLinkRow}
                className="h-7 px-2.5 text-xs gap-1 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Link
              </Button>
            </div>

            <div className="space-y-2">
              {links.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={item.label}
                    onChange={(e) => handleLinkChange(idx, 'label', e.target.value)}
                    placeholder="Nome (Ex.: Edital Verticalizado)"
                    className="h-9 w-1/3 bg-secondary/30 text-xs rounded-xl"
                  />
                  <Input
                    type="url"
                    value={item.url}
                    onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                    placeholder="https://..."
                    className="h-9 flex-1 bg-secondary/30 text-xs rounded-xl"
                  />
                  {links.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLinkRow(idx)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* OBSERVAÇÕES / PRIORIDADES */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-semibold">Notas / Prioridades do Plano (uma por linha)</Label>
            <Textarea
              value={prioridadesTexto}
              onChange={(e) => setPrioridadesTexto(e.target.value)}
              placeholder="Ex.: Focar em Conhecimentos Específicos (Peso 2)..."
              rows={3}
              className="bg-secondary/30 text-xs rounded-xl resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9 text-xs rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
            >
              {isPending ? 'Salvando...' : isEditMode ? 'Salvar Alterações' : 'Criar Plano'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}