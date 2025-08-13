// src/components/CalendarioClient.tsx
'use client';

import { useState, useMemo, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { addLembrete, deleteLembrete, updateRevisaoStatus } from '@/app/actions';
import { LembreteEditor } from '@/components/LembreteEditor';
import { type Lembrete, type Revisao } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

export function CalendarioClient({ lembretes, revisoes }: { lembretes: Lembrete[], revisoes: Revisao[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const router = useRouter();

  const eventDays = useMemo(() => {
    const dates = new Set<string>();
    lembretes.forEach(l => dates.add(format(parseISO(l.data), 'yyyy-MM-dd')));
    revisoes.forEach(r => dates.add(format(parseISO(r.data_revisao), 'yyyy-MM-dd')));
    return Array.from(dates).map(dateStr => parseISO(dateStr));
  }, [lembretes, revisoes]);

  const modifiers = {
    event: eventDays,
  };

  // CORREÇÃO: Definindo o estilo diretamente aqui
  const modifiersStyles = {
    event: {
      color: 'hsl(var(--destructive))', // Usa a sua cor vermelha do tema
      fontWeight: '700',
    },
  };

  const selectedDayLembretes = lembretes.filter(l => isSameDay(parseISO(l.data), selectedDate));
  const selectedDayRevisoes = revisoes.filter(r => isSameDay(parseISO(r.data_revisao), selectedDate));

  const onActionSuccess = () => {
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Coluna do Calendário */}
      <div className="lg:col-span-2 bg-card border rounded-lg p-6">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={(day) => setSelectedDate(day || new Date())}
          month={currentDate}
          onMonthChange={setCurrentDate}
          locale={ptBR}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles} // Aplicando o novo estilo
          showOutsideDays
          fixedWeeks
        />
      </div>

      {/* Coluna de Eventos do Dia */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">Eventos para {format(selectedDate, 'd \'de\' MMMM', { locale: ptBR })}</h2>
        
        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
          {/* Lógica para mostrar revisões */}
          {selectedDayRevisoes.map(revisao => (
            <div key={`rev-${revisao.id}`} className="flex items-start gap-3">
              <Checkbox 
                id={`revisao-${revisao.id}`}
                className="mt-1"
                checked={revisao.concluida}
                onCheckedChange={(checked) => {
                  updateRevisaoStatus(revisao.id, !!checked).then(() => toast.success("Revisão atualizada!"));
                }}
              />
              <div>
                <p className={`font-semibold ${revisao.concluida ? 'line-through text-muted-foreground' : ''}`}>{revisao.materia_nome}</p>
                <p className="text-xs text-muted-foreground">{revisao.tipo_revisao}</p>
              </div>
            </div>
          ))}
          
          {/* Lógica para mostrar lembretes */}
          {selectedDayLembretes.map(lembrete => (
            <div key={`lem-${lembrete.id}`} className="flex items-center justify-between hover:bg-secondary/50 p-1 rounded-md group">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lembrete.cor }}></div>
                <span className="text-sm">{lembrete.titulo}</span>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <LembreteEditor lembrete={lembrete} data={format(selectedDate, 'yyyy-MM-dd')} onActionSuccess={onActionSuccess} />
                <form action={() => deleteLembrete(lembrete.id).then(() => onActionSuccess())}>
                   <button type="submit" className="p-2 text-muted-foreground hover:text-destructive" title="Apagar Lembrete"><Trash2 className="w-4 h-4" /></button>
                </form>
              </div>
            </div>
          ))}

          {selectedDayLembretes.length === 0 && selectedDayRevisoes.length === 0 && (
             <p className="text-muted-foreground text-center pt-8">Nenhum evento para este dia.</p>
          )}
        </div>
        
        <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-2 text-sm">Novo Lembrete:</h3>
            <LembreteEditor data={format(selectedDate, 'yyyy-MM-dd')} onActionSuccess={onActionSuccess} />
        </div>
      </div>
    </div>
  );
}
