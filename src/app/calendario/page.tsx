// src/app/calendario/page.tsx

'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState, useTransition, useCallback } from 'react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, isSameDay } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { addLembrete, deleteLembrete, updateRevisaoStatus, updateLembrete } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LembreteEditor } from '@/components/LembreteEditor';

type Lembrete = {
  id: number;
  titulo: string;
  cor: string;
  data: string;
};

type CalendarEvent = {
  key: string;
  id: number;
  title: string;
  type: 'revisao' | 'lembrete';
  color: string;
  completed: boolean;
  revisionType?: 'R1' | 'R7' | 'R30';
  date: Date;
  data: Lembrete | any;
};

export default function CalendarioGeralPage() {
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [isPending, startTransition] = useTransition();
  const supabase = createClientComponentClient();

  const fetchEvents = useCallback(async () => {
    // CORREÇÃO: A busca agora aceita 'is.false' OU 'is.null', tornando-a robusta
    const sessoesPromise = supabase
      .from('sessoes_estudo')
      .select('id, foco, data_revisao_1, r1_concluida, data_revisao_2, r2_concluida, data_revisao_3, r3_concluida')
      .or('r1_concluida.is.false,r1_concluida.is.null,r2_concluida.is.false,r2_concluida.is.null,r3_concluida.is.false,r3_concluida.is.null');

    const lembretesPromise = supabase.from('lembretes').select('*');
    
    const [{ data: sessoes }, { data: lembretesData }] = await Promise.all([sessoesPromise, lembretesPromise]);
    
    const allEvents: Record<string, CalendarEvent[]> = {};
    
    const addEvent = (dateStr: string | null, event: Omit<CalendarEvent, 'date'> & {date?: Date}) => {
      if (dateStr) {
        if (!allEvents[dateStr]) allEvents[dateStr] = [];
        allEvents[dateStr].push({ ...event, date: new Date(dateStr + 'T03:00:00') });
      }
    };

    sessoes?.forEach(r => {
      if(!r.r1_concluida) addEvent(r.data_revisao_1, { key: `r1-${r.id}`, id: r.id, title: r.foco, type: 'revisao', revisionType: 'R1', completed: r.r1_concluida, color: '#EF4444', data: r });
      if(!r.r2_concluida) addEvent(r.data_revisao_2, { key: `r2-${r.id}`, id: r.id, title: r.foco, type: 'revisao', revisionType: 'R7', completed: r.r2_concluida, color: '#F59E0B', data: r });
      if(!r.r3_concluida) addEvent(r.data_revisao_3, { key: `r3-${r.id}`, id: r.id, title: r.foco, type: 'revisao', revisionType: 'R30', completed: r.r3_concluida, color: '#10B981', data: r });
    });

    (lembretesData as Lembrete[] | null)?.forEach(l => addEvent(l.data, { key: `l-${l.id}`, id: l.id, title: l.titulo, type: 'lembrete', color: l.cor, completed: false, data: l }));
    
    setEvents(allEvents);
  }, [supabase]);

  useEffect(() => {
    fetchEvents();
    const channel = supabase.channel('realtime-calendario-page').on('postgres_changes', { event: '*', schema: 'public' }, fetchEvents).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, fetchEvents]);
  
  const selectedDayString = format(selectedDay, 'yyyy-MM-dd');
  const tasksForSelectedDay = events[selectedDayString] || [];

  // Gera uma lista de modificadores para destacar os dias com eventos
  const eventDays = Object.values(events).flat().map(event => event.date);
  const modifiers = {
    events: eventDays
  };
  const modifiersStyles = {
    events: {
      color: '#34d399',
      fontWeight: 'bold',
    }
  };

  return (
    <div>
      <header className="text-left mb-8"><h1 className="text-3xl font-bold">Calendário Geral Unificado</h1></header>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 card bg-gray-800 p-2 sm:p-4">
            <DayPicker 
              mode="single" 
              selected={selectedDay} 
              onSelect={(day) => setSelectedDay(day || new Date())} 
              locale={ptBR} 
              className="text-white"
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
        </div>
        <div className="lg:col-span-2 card bg-gray-800 p-6">
          <h3 className="font-bold text-xl mb-4">Eventos para {format(selectedDay, 'PPP', { locale: ptBR })}</h3>
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2 mb-4">
            {tasksForSelectedDay.map((event) => (
              <div key={event.key} className={`p-3 rounded-lg flex items-center gap-3 border-l-4 ${event.completed ? 'opacity-50' : 'bg-gray-900/50'}`} style={{borderColor: event.color}}>
                {event.type === 'revisao' && (
                  <input type="checkbox" className="h-5 w-5 shrink-0" checked={event.completed} 
                         onChange={() => startTransition(() => updateRevisaoStatus(event.id, event.revisionType!, !event.completed))}
                         disabled={isPending}
                  />
                )}
                <div className="flex-grow">
                  <p className={event.completed ? 'line-through' : ''}>{event.title}</p>
                  <span className="text-xs text-gray-400">{event.type} {event.revisionType || ''}</span>
                </div>
                {event.type === 'lembrete' && (
                  <div className='flex items-center'>
                    <LembreteEditor lembrete={event.data as Lembrete} onAction={fetchEvents} />
                    <Button onClick={() => startTransition(() => deleteLembrete(event.id))} disabled={isPending} variant="ghost" size="icon" className="h-6 w-6">
                        <i className="fas fa-times text-xs text-red-500"></i>
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {tasksForSelectedDay.length === 0 && <p className="text-gray-500">Nenhum evento para este dia.</p>}
          </div>
          <form id="lembrete-form" action={async (formData) => {
              const form = document.getElementById('lembrete-form') as HTMLFormElement;
              await addLembrete(formData);
              form.reset();
            }}>
            <Label className="text-xs">Novo Lembrete:</Label>
            <div className="mt-1 flex items-end gap-2">
                <input type="hidden" name="data" value={format(selectedDay, 'yyyy-MM-dd')} />
                <Input name="titulo" required className="bg-gray-700 h-9 flex-grow" autoComplete="off"/>
                <Input name="cor" type="color" defaultValue="#8b5cf6" className="bg-gray-700 h-9 p-1 w-10"/>
                <Button type="submit">Add</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}