'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Lembrete, type Revisao } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { addLembrete, updateLembrete, deleteLembrete } from '@/app/actions';
import { toast } from 'sonner';

export function CalendarioDashboardCard({ lembretes, revisoes }: { lembretes: Lembrete[], revisoes: Revisao[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLembrete, setEditingLembrete] = useState<Lembrete | null>(null);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const todaysRevisoes = revisoes.filter(r => r.data_revisao && isSameDay(parseISO(r.data_revisao), selectedDate));
    const todaysLembretes = lembretes.filter(l => l.data && isSameDay(parseISO(l.data), selectedDate));
    
    return [
        ...todaysRevisoes.map(r => ({ ...r, eventType: 'revisao' as const })),
        ...todaysLembretes.map(l => ({ ...l, eventType: 'lembrete' as const }))
    ];
  }, [revisoes, lembretes, selectedDate]);

  const eventDays = useMemo(() => {
    const dates = new Set<string>();
    lembretes.forEach(l => l.data && dates.add(format(parseISO(l.data), 'yyyy-MM-dd')));
    revisoes.forEach(r => r.data_revisao && dates.add(format(parseISO(r.data_revisao), 'yyyy-MM-dd')));
    return Array.from(dates).map(dateStr => parseISO(dateStr));
  }, [lembretes, revisoes]);
  
  const handleFormSubmit = (formData: FormData) => {
    startTransition(async () => {
      const action = editingLembrete ? updateLembrete : addLembrete;
      await action(formData);
      toast.success(`Lembrete ${editingLembrete ? 'atualizado' : 'adicionado'} com sucesso!`);
      setIsModalOpen(false);
      setEditingLembrete(null);
      router.refresh();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteLembrete(id);
      toast.success('Lembrete apagado com sucesso!');
      router.refresh();
    });
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Calendário</h2>
              </div>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setEditingLembrete(null)}>
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </DialogTrigger>
          </div>
          <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              modifiers={{ event: eventDays }}
              modifiersStyles={{ event: { color: 'hsl(var(--destructive))', fontWeight: 'bold' } }}
              className="w-full" // <-- AQUI A CORREÇÃO DE LAYOUT
          />
          <div className="border-t mt-4 pt-4 flex-grow flex flex-col min-h-0">
              <h3 className="font-semibold text-center mb-2">
                  Eventos para {selectedDate ? format(selectedDate, 'dd/MM') : ''}
              </h3>
              <div className="space-y-2 flex-grow overflow-y-auto text-sm pr-2">
                  {selectedDayEvents.length > 0 ? (
                      selectedDayEvents.map((event, index) => (
                          <div key={index} className="flex items-center justify-between gap-2 group">
                              <div className="flex items-center gap-2 truncate">
                                <div className={`w-2 h-2 rounded-full ${event.eventType === 'revisao' ? 'bg-destructive' : 'bg-primary'} flex-shrink-0`}></div>
                                <span className="truncate">
                                    {'materia_nome' in event ? event.materia_nome : event.titulo}
                                </span>
                              </div>
                              {event.eventType === 'lembrete' && (
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingLembrete(event)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive" onClick={() => handleDelete(event.id)}>
                                      <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                          </div>
                      ))
                  ) : (
                      <p className="text-muted-foreground text-center pt-4">Nenhum evento para este dia.</p>
                  )}
              </div>
              <Link href="/calendario" className="mt-4 flex-shrink-0">
                  <Button variant="outline" className="w-full">Ver Calendário Completo</Button>
              </Link>
          </div>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingLembrete ? 'Editar Lembrete' : 'Adicionar Lembrete'}</DialogTitle>
        </DialogHeader>
        <form action={handleFormSubmit}>
            {editingLembrete && <input type="hidden" name="id" value={editingLembrete.id} />}
            <div className="space-y-4">
                <div>
                    <Label htmlFor="titulo">Título</Label>
                    <Input id="titulo" name="titulo" required defaultValue={editingLembrete?.titulo || ''} />
                </div>
                <div>
                    <Label htmlFor="data">Data</Label>
                    <Input id="data" name="data" type="date" required defaultValue={editingLembrete?.data ? format(parseISO(editingLembrete.data), 'yyyy-MM-dd') : (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')} />
                </div>
                <div>
                    <Label htmlFor="cor">Cor</Label>
                    <Input id="cor" name="cor" type="color" defaultValue={editingLembrete?.cor || '#60a5fa'} />
                </div>
            </div>
            <DialogFooter className="mt-4">
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
