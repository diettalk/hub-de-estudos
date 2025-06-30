// src/app/calendario/page.tsx (VERSÃO CORRIGIDA)

'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useTransition, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { addLembrete, deleteLembrete, updateRevisaoStatus } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LembreteEditor } from '@/components/LembreteEditor';
import { Checkbox } from '@/components/ui/checkbox'; // Usando o Checkbox de shadcn para consistência
import { toast } from 'sonner';

// Tipos de dados que o calendário vai manipular
type Lembrete = { id: number; titulo: string; cor: string; data: string; };
type Revisao = { id: number; materia_nome: string; foco_sugerido: string; tipo_revisao: string; data_revisao: string; concluida: boolean; };
type CalendarEvent = {
  key: string; 
  id: number; 
  title: string; 
  type: 'revisao' | 'lembrete';
  color: string; 
  completed: boolean;
  date: Date;
  data: Lembrete | Revisao; // O evento pode ser um Lembrete ou uma Revisão
};

export default function CalendarioGeralPage() {
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  // ***** INÍCIO DA CORREÇÃO PRINCIPAL *****
  const fetchEvents = useCallback(async () => {
    // 1. Buscamos da tabela 'revisoes', não mais de 'sessoes_estudo'
    const revisoesPromise = supabase.from('revisoes').select('*');
    const lembretesPromise = supabase.from('lembretes').select('*');
    
    // Executamos as duas buscas em paralelo
    const [{ data: revisoesData }, { data: lembretesData }] = await Promise.all([revisoesPromise, lembretesPromise]);
    
    const allEvents: Record<string, CalendarEvent[]> = {};
    
    // Função auxiliar para adicionar um evento ao nosso objeto de eventos
    const addEvent = (dateStr: string | null, eventData: Omit<CalendarEvent, 'date'> & {date?: Date}) => {
      if (dateStr) {
        if (!allEvents[dateStr]) allEvents[dateStr] = [];
        // Usamos T00:00:00 para tratar a data como local, evitando problemas de fuso horário
        allEvents[dateStr].push({ ...eventData, date: new Date(dateStr + 'T00:00:00') });
      }
    };

    // 2. Processamos os dados da tabela 'revisoes'
    (revisoesData as Revisao[] | null)?.forEach(r => {
      let color = '#8B5CF6';
      if (r.tipo_revisao === '24h') color = '#EF4444';
      if (r.tipo_revisao === '7 dias') color = '#F59E0B';
      if (r.tipo_revisao === '30 dias') color = '#10B981';

      addEvent(r.data_revisao, { 
        key: `rev-${r.id}`, 
        id: r.id, 
        title: `${r.materia_nome || 'Revisão'}: ${r.foco_sugerido}`, 
        type: 'revisao', 
        completed: r.concluida, 
        color: color, 
        data: r 
      });
    });

    // Processamos os lembretes como antes
    (lembretesData as Lembrete[] | null)?.forEach(l => 
      addEvent(l.data, { 
        key: `l-${l.id}`, 
        id: l.id, 
        title: l.titulo, 
        type: 'lembrete', 
        color: l.cor, 
        completed: false, 
        data: l 
      })
    );
    
    setEvents(allEvents);
  }, [supabase]);
  // ***** FIM DA CORREÇÃO PRINCIPAL *****

  useEffect(() => {
    fetchEvents();
    // Configura o listener em tempo real do Supabase para atualizar o calendário automaticamente
    const channel = supabase.channel('realtime-calendario-page').on('postgres_changes', { event: '*', schema: 'public' }, fetchEvents).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchEvents]);
  
  const selectedDayString = format(selectedDay, 'yyyy-MM-dd');
  const tasksForSelectedDay = events[selectedDayString] || [];
  // Marcamos os dias que têm eventos no calendário principal
  const eventDays = Object.keys(events).map(dateStr => new Date(dateStr + 'T00:00:00'));
  const modifiers = { events: eventDays };
  const modifiersStyles = { events: { color: '#34d399', fontWeight: 'bold' } };

  return (
    <div>
      <header className="text-left mb-8"><h1 className="text-3xl font-bold">Calendário Geral Unificado</h1></header>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card bg-gray-800 p-2 sm:p-4"><DayPicker mode="single" selected={selectedDay} onSelect={(day) => setSelectedDay(day || new Date())} locale={ptBR} className="text-white" modifiers={modifiers} modifiersStyles={modifiersStyles} /></div>
        <div className="lg:col-span-2 card bg-gray-800 p-6">
          <h3 className="font-bold text-xl mb-4">Eventos para {format(selectedDay, 'PPP', { locale: ptBR })}</h3>
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 mb-4">
            {tasksForSelectedDay.length > 0 ? tasksForSelectedDay.map((event) => (
              <div key={event.key} className={`p-3 rounded-lg flex items-center gap-3 border-l-4 ${event.completed ? 'opacity-50' : 'bg-gray-900/50'}`} style={{borderColor: event.color}}>
                {event.type === 'revisao' && (
                  <Checkbox 
                    className="h-5 w-5 shrink-0" 
                    checked={event.completed} 
                    // CORREÇÃO: A chamada da ação agora está correta
                    onCheckedChange={(isChecked) => startTransition(async () => {
                      const result = await updateRevisaoStatus(event.id, isChecked as boolean);
                      if(result?.error) toast.error(result.error);
                    })}
                    disabled={isPending} 
                  />
                )}
                <div className="flex-grow">
                  <p className={event.completed ? 'line-through' : ''}>{event.title}</p>
                  <span className="text-xs text-gray-400">{(event.data as any).tipo_revisao || event.type}</span>
                </div>
                {event.type === 'lembrete' && <div className='flex items-center'><LembreteEditor lembrete={event.data as Lembrete} onAction={fetchEvents} /><Button onClick={() => startTransition(() => deleteLembrete(event.id))} disabled={isPending} variant="ghost" size="icon" className="h-6 w-6"><i className="fas fa-times text-xs text-red-500"></i></Button></div>}
              </div>
            )) : <p className="text-gray-500">Nenhum evento para este dia.</p>}
          </div>
          <form id="lembrete-form" action={async (formData) => { await addLembrete(formData); (document.getElementById('lembrete-form') as HTMLFormElement)?.reset(); }}>
            <Label className="text-xs">Novo Lembrete:</Label>
            <div className="mt-1 flex items-end gap-2"><input type="hidden" name="data" value={format(selectedDay, 'yyyy-MM-dd')} /><Input name="titulo" required className="bg-gray-700 h-9 flex-grow" autoComplete="off"/><Input name="cor" type="color" defaultValue="#8b5cf6" className="bg-gray-700 h-9 p-1 w-10"/><Button type="submit">Add</Button></div>
          </form>
        </div>
      </div>
    </div>
  );
}