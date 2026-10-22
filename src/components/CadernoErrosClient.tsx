'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, isWithinInterval, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { createCadernoErro, deleteCadernoErro, updateCadernoErro } from '@/app/caderno-erros/actions';
import { DisciplinaCombobox } from '@/components/DisciplinaCombobox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LIMITES_ERRO, MOTIVOS_ERRO } from '@/lib/caderno-erros';
import { type CadernoErro, type MotivoErro, type Node as TreeNode } from '@/lib/types';

function CadernoErroFormDialog({
  open,
  onOpenChange,
  erro,
  disciplinaTree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  erro: CadernoErro | null;
  disciplinaTree: TreeNode[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [disciplinaId, setDisciplinaId] = useState<number | null>(erro?.disciplina_id ?? null);
  const [disciplinaNome, setDisciplinaNome] = useState(erro?.disciplina_nome ?? '');
  const [motivo, setMotivo] = useState<MotivoErro>(erro?.motivo ?? 'conteudo');

  const handleSubmit = (formData: FormData) => {
    if (erro) formData.set('id', String(erro.id));

    startTransition(async () => {
      const result = erro
        ? await updateCadernoErro(formData)
        : await createCadernoErro(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(erro ? 'Erro atualizado com sucesso.' : 'Erro registrado com sucesso.');
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{erro ? 'Editar erro' : 'Registrar novo erro'}</DialogTitle>
          <DialogDescription>Registre o que aconteceu e como pensar corretamente na próxima vez.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="disciplina_id" value={disciplinaId ?? ''} />
          <div className="space-y-2">
            <Label htmlFor="disciplina-combobox">Disciplina</Label>
            <DisciplinaCombobox
              disciplinaTree={disciplinaTree}
              value={disciplinaId}
              onSelect={(disciplina) => {
                setDisciplinaId(disciplina?.id ?? null);
                if (disciplina) setDisciplinaNome(disciplina.title);
              }}
            />
            <Input
              id="disciplina-combobox"
              name="disciplina_nome"
              value={disciplinaNome}
              onChange={(event) => {
                setDisciplinaNome(event.target.value);
                setDisciplinaId(null);
              }}
              maxLength={LIMITES_ERRO.disciplina_nome}
              placeholder="Ou digite uma disciplina"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assunto">Assunto</Label>
              <Input
                id="assunto"
                name="assunto"
                defaultValue={erro?.assunto ?? ''}
                maxLength={LIMITES_ERRO.assunto}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banca">Banca</Label>
              <Input
                id="banca"
                name="banca"
                defaultValue={erro?.banca ?? ''}
                maxLength={LIMITES_ERRO.banca}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ano">Ano</Label>
              <Input
                id="ano"
                name="ano"
                type="number"
                min={1990}
                max={2100}
                step={1}
                defaultValue={erro?.ano ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo do erro</Label>
              <Select
                name="motivo"
                value={motivo}
                onValueChange={(value) => setMotivo(value as MotivoErro)}
                required
              >
                <SelectTrigger id="motivo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_ERRO.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enunciado">Resumo da questão</Label>
            <Textarea
              id="enunciado"
              name="enunciado"
              defaultValue={erro?.enunciado ?? ''}
              maxLength={LIMITES_ERRO.enunciado}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="o_que_errei">O que eu errei</Label>
            <Textarea
              id="o_que_errei"
              name="o_que_errei"
              defaultValue={erro?.o_que_errei ?? ''}
              maxLength={LIMITES_ERRO.o_que_errei}
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="aprendizado">Forma certa de pensar</Label>
            <Textarea
              id="aprendizado"
              name="aprendizado"
              defaultValue={erro?.aprendizado ?? ''}
              maxLength={LIMITES_ERRO.aprendizado}
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : erro ? 'Salvar alterações' : 'Registrar erro'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CadernoErrosClient({
  erros,
  disciplinaTree,
}: {
  erros: CadernoErro[];
  disciplinaTree: TreeNode[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingErro, setEditingErro] = useState<CadernoErro | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [deleteErro, setDeleteErro] = useState<CadernoErro | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [disciplinaFilter, setDisciplinaFilter] = useState('todas');
  const [motivoFilter, setMotivoFilter] = useState('todos');
  const [isPending, startTransition] = useTransition();

  const openNewErro = () => {
    setEditingErro(null);
    setFormKey((key) => key + 1);
    setDialogOpen(true);
  };

  const openEditErro = (erro: CadernoErro) => {
    setEditingErro(erro);
    setFormKey((key) => key + 1);
    setDialogOpen(true);
  };

  const stats = useMemo(() => {
    const now = new Date();
    const lastWeekStart = subDays(now, 7);
    const recent = erros.filter((erro) =>
      isWithinInterval(parseISO(erro.created_at), { start: lastWeekStart, end: now }),
    ).length;
    const motivos = MOTIVOS_ERRO.map((item) => {
      const count = erros.filter((erro) => erro.motivo === item.value).length;
      return {
        ...item,
        count,
        percentage: erros.length ? Math.round((count / erros.length) * 100) : 0,
      };
    });
    const ranking = new Map<string, number>();
    erros.forEach((erro) => {
      const label = `${erro.disciplina_nome} — ${erro.assunto}`;
      ranking.set(label, (ranking.get(label) ?? 0) + 1);
    });
    const topAssuntos = [...ranking.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5);

    return { recent, motivos, topAssuntos };
  }, [erros]);

  const disciplinas = useMemo(
    () => [...new Set(erros.map((erro) => erro.disciplina_nome))].sort((a, b) => a.localeCompare(b)),
    [erros],
  );

  const filteredErros = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return erros.filter((erro) => {
      const matchesText = !query || [
        erro.assunto,
        erro.enunciado ?? '',
        erro.o_que_errei,
        erro.aprendizado,
      ].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesDisciplina = disciplinaFilter === 'todas' || erro.disciplina_nome === disciplinaFilter;
      const matchesMotivo = motivoFilter === 'todos' || erro.motivo === motivoFilter;
      return matchesText && matchesDisciplina && matchesMotivo;
    });
  }, [erros, searchTerm, disciplinaFilter, motivoFilter]);

  const confirmDelete = () => {
    if (!deleteErro) return;

    startTransition(async () => {
      const result = await deleteCadernoErro(deleteErro.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Erro e revisões excluídos.');
      setDeleteErro(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button onClick={openNewErro}>
          <Plus className="mr-2 h-4 w-4" />
          Novo erro
        </Button>
      </div>

      <section aria-label="Estatísticas do Caderno de Erros" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Total de erros</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{erros.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Últimos 7 dias</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.recent}</p></CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-sm font-medium">Erros por motivo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.motivos.map((item) => (
              <div key={item.value} className="space-y-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span>{item.label}</span>
                  <span className="text-muted-foreground">{item.count} · {item.percentage}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="sm:col-span-2 xl:col-span-4">
          <CardHeader><CardTitle className="text-sm font-medium">Assuntos mais recorrentes</CardTitle></CardHeader>
          <CardContent>
            {stats.topAssuntos.length ? (
              <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {stats.topAssuntos.map((item) => (
                  <li key={item.label} className="flex items-start justify-between gap-2 text-sm">
                    <span>{item.label}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Seus assuntos mais recorrentes aparecerão aqui.</p>
            )}
          </CardContent>
        </Card>
      </section>

      {erros.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            type="search"
            placeholder="Buscar nos erros..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Buscar nos erros"
          />
          <Select value={disciplinaFilter} onValueChange={setDisciplinaFilter}>
            <SelectTrigger aria-label="Filtrar por disciplina" className="w-full">
              <SelectValue placeholder="Todas as disciplinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as disciplinas</SelectItem>
              {disciplinas.map((disciplina) => (
                <SelectItem key={disciplina} value={disciplina}>{disciplina}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={motivoFilter} onValueChange={setMotivoFilter}>
            <SelectTrigger aria-label="Filtrar por motivo" className="w-full">
              <SelectValue placeholder="Todos os motivos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os motivos</SelectItem>
              {MOTIVOS_ERRO.map((item) => (
                <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {erros.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div>
              <h2 className="text-xl font-semibold">Seu caderno começa aqui</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Registre aqui as questões que você errou. Cada erro gera revisões de 24h, 7 e 30 dias.
              </p>
            </div>
            <Button onClick={openNewErro}><Plus className="mr-2 h-4 w-4" />Novo erro</Button>
          </CardContent>
        </Card>
      ) : filteredErros.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhum erro encontrado com esses filtros.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredErros.map((erro) => {
            const motivoLabel = MOTIVOS_ERRO.find((item) => item.value === erro.motivo)?.label ?? erro.motivo;
            return (
              <Card key={erro.id}>
                <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{erro.disciplina_nome}</p>
                    <CardTitle className="text-xl">{erro.assunto}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{motivoLabel}</Badge>
                      {erro.banca && <Badge variant="outline">{erro.banca}</Badge>}
                      {erro.ano && <Badge variant="outline">{erro.ano}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(erro.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditErro(erro)}>
                      <Pencil className="mr-2 h-4 w-4" />Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteErro(erro)}>
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {erro.enunciado && (
                    <div>
                      <h3 className="text-sm font-semibold">Resumo da questão</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{erro.enunciado}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">O que eu errei</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{erro.o_que_errei}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Forma certa de pensar</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{erro.aprendizado}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CadernoErroFormDialog
        key={formKey}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingErro(null);
        }}
        erro={editingErro}
        disciplinaTree={disciplinaTree}
      />

      <AlertDialog open={!!deleteErro} onOpenChange={(open) => { if (!open) setDeleteErro(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir erro?</AlertDialogTitle>
            <AlertDialogDescription>
              As revisões deste erro também serão apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
              {isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
