// src/components/PomodoroTimer.tsx

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Settings } from 'lucide-react';

export function PomodoroTimer() {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  // O estado do tempo agora é um único valor em segundos
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  const alarmRef = useRef<HTMLAudioElement>(null);
  // Usamos useRef para o endTime para que ele não cause re-renderizações
  const endTimeRef = useRef<number | null>(null);

  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
  }, []);

  // Efeito principal do timer, agora muito mais simples
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        const remaining = endTimeRef.current ? endTimeRef.current - Date.now() : 0;
        setTimeLeft(Math.max(0, Math.round(remaining / 1000)));

        if (remaining <= 0) {
          alarmRef.current?.play();
          const newMode = mode === 'work' ? 'break' : 'work';
          switchMode(newMode, false); // Troca de modo sem resetar para o tempo cheio
        }
      }, 250); // Atualiza 4x por segundo para mais precisão visual
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, mode]);

  // Efeito para sincronizar ao voltar para a aba
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive && endTimeRef.current) {
        const remaining = endTimeRef.current - Date.now();
        setTimeLeft(Math.max(0, Math.round(remaining / 1000)));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isActive]);

  const toggleTimer = () => {
    stopAlarm(); // Para o alarme se ele estiver tocando
    if (!isActive) {
      // Se está iniciando, define o tempo final
      endTimeRef.current = Date.now() + timeLeft * 1000;
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    stopAlarm();
    setIsActive(false);
    const newTime = (mode === 'work' ? workDuration : breakDuration) * 60;
    setTimeLeft(newTime);
  };

  const switchMode = (newMode: 'work' | 'break', stopCurrentAlarm = true) => {
    if (stopCurrentAlarm) stopAlarm();
    setMode(newMode);
    setIsActive(false);
    const newTime = (newMode === 'work' ? workDuration : breakDuration) * 60;
    setTimeLeft(newTime);
  };
  
  // Calcula minutos e segundos para exibição
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="card bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center h-full text-center relative">
      <audio ref={alarmRef} src="/alert.mp3" preload="auto"></audio>
      
      <Dialog onOpenChange={(open) => !open && resetTimer()}>
        <DialogTrigger asChild><Button variant="ghost" size="icon" className="absolute top-4 right-4"><Settings className="h-4 w-4" /></Button></DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
          <DialogHeader><DialogTitle>Configurar Timer</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="work" className="text-right">Pomodoro (min)</Label><Input id="work" type="number" value={workDuration} onChange={(e) => setWorkDuration(Number(e.target.value))} className="col-span-3 bg-gray-900"/></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="break" className="text-right">Pausa (min)</Label><Input id="break" type="number" value={breakDuration} onChange={(e) => setBreakDuration(Number(e.target.value))} className="col-span-3 bg-gray-900"/></div>
          </div>
          <DialogFooter><DialogClose asChild><Button type="button">Salvar e Resetar</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="space-x-2 mb-4">
        <Button onClick={() => switchMode('work')} variant={mode === 'work' ? 'secondary' : 'ghost'}>Pomodoro</Button>
        <Button onClick={() => switchMode('break')} variant={mode === 'break' ? 'secondary' : 'ghost'}>Pausa Curta</Button>
      </div>

      <div className="text-7xl font-bold my-4" style={{fontVariantNumeric: 'tabular-nums'}}>
        <span>{String(minutes).padStart(2, '0')}</span>:<span>{String(seconds).padStart(2, '0')}</span>
      </div>
      
      <div className="space-x-4">
        <Button onClick={toggleTimer} className="w-28">{isActive ? 'Pausar' : 'Iniciar'}</Button>
        <Button onClick={resetTimer} variant="outline">Resetar</Button>
      </div>
    </div>
  );
}