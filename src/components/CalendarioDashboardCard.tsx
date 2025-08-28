'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { type Lembrete, type Revisao } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export function CalendarioDashboardCard({ lembretes, revisoes }: { lembretes: Lembrete[], revisoes: Revisao[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const todaysRevisoes = revisoes.filter(r => r.data_revisao && isSameDay(parseISO(r.data_revisao), selectedDate));
    const todaysLembretes = lembretes.filter(l => l.data && isSameDay(parseISO(l.data), selectedDate));
    
    const allEvents = [
        ...todaysRevisoes.map(r => ({ ...r, eventType: 'revisao' })),
        ...todaysLembretes.map(l => ({ ...l, eventType: 'lembrete' }))
    ];

    return allEvents;
  }, [revisoes, lembretes, selectedDate]);

  const eventDays = useMemo(() => {
    const dates = new Set<string>();
    lembretes.forEach(l => l.data && dates.add(format(parseISO(l.data), 'yyyy-MM-dd')));
    revisoes.forEach(r => r.data_revisao && dates.add(format(parseISO(r.data_revisao), 'yyyy-MM-dd')));
    return Array.from(dates).map(dateStr => parseISO(dateStr));
  }, [lembretes, revisoes]);

  return (
    <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Calendário</h2>
        </div>
        <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(day) => setSelectedDate(day || new Date())}
            locale={ptBR}
            modifiers={{ event: eventDays }}
            modifiersStyles={{ 
                event: { 
                    color: 'hsl(var(--destructive))',
                    fontWeight: 'bold'
                } 
            }}
            className="mx-auto"
        />
        <div className="border-t mt-4 pt-4 flex-grow flex flex-col">
            <h3 className="font-semibold text-center mb-2">
                Eventos para {selectedDate ? format(selectedDate, 'dd/MM') : ''}
            </h3>
            <div className="space-y-2 flex-grow overflow-y-auto text-sm pr-2">
                {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map((event, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${event.eventType === 'revisao' ? 'bg-destructive' : 'bg-primary'} flex-shrink-0`}></div>
                            <span className="truncate">
                                {'materia_nome' in event ? event.materia_nome : event.titulo}
                            </span>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center pt-4">Nenhum evento hoje.</p>
                )}
            </div>
            <Link href="/calendario" className="mt-4">
                <Button variant="outline" className="w-full">Ver Calendário Completo</Button>
            </Link>
        </div>
    </div>
  );
}
