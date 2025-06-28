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

  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);

  const alarmRef = useRef<HTMLAudioElement>(null);
  const endTimeRef = useRef<number | null>(null);
  
  // Funções de controle do timer
  const stopAlarm = useCallback(() => {
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }
    setIsAlarmPlaying(false);
  }, []);

  const resetTimer = useCallback(() => {
    stopAlarm();
    setIsActive(false);
    const newTime = (mode === 'work' ? workDuration : breakDuration) * 60;
    setTimeLeft(newTime);
  }, [mode, workDuration, breakDuration, stopAlarm]);

  const switchMode = useCallback((newMode: 'work' | 'break') => {
    stopAlarm();
    setMode(newMode);
    setIsActive(false);
    const newTime = (newMode === 'work' ? workDuration : breakDuration) * 60;
    setTimeLeft(newTime);
  }, [workDuration, breakDuration, stopAlarm]);

  // Efeito principal do timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        const remaining = endTimeRef.current ? endTimeRef.current - Date.now() : 0;
        if (remaining <= 0) {
          setTimeLeft(0);
          alarmRef.current?.play();
          setIsActive(false);
          setIsAlarmPlaying(true);
        } else {
          setTimeLeft(Math.round(remaining / 1000));
        }
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const toggleTimer = () => {
    if (isAlarmPlaying) return;
    if (isActive) {
      setIsActive(false);
    } else {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      setIsActive(true);
    }
  };

  const handleAcknowledgeAlarm = () => {
    const newMode = mode === 'work' ? 'break' : 'work';
    switchMode(newMode);
  };
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="card bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center h-full text-center relative">
      <audio ref={alarmRef} src="/alert.mp3" preload="auto" />
      
      {/* CÓDIGO DO DIALOG DE CONFIGURAÇÃO REINSERIDO AQUI */}
      <Dialog onOpenChange={(open) => !open && resetTimer()}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Configurar Timer</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="work" className="text-right">Pomodoro (min)</Label>
              <Input id="work" type="number" value={workDuration} onChange={(e) => setWorkDuration(Math.max(1, Number(e.target.value)))} className="col-span-3 bg-gray-900"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="break" className="text-right">Pausa (min)</Label>
              <Input id="break" type="number" value={breakDuration} onChange={(e) => setBreakDuration(Math.max(1, Number(e.target.value)))} className="col-span-3 bg-gray-900"/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Salvar e Resetar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="space-x-2 mb-4">
        <Button onClick={() => switchMode('work')} variant={mode === 'work' ? 'secondary' : 'ghost'}>Foco</Button>
        <Button onClick={() => switchMode('break')} variant={mode === 'break' ? 'secondary' : 'ghost'}>Pausa</Button>
      </div>

      <div className="text-7xl font-bold my-4" style={{fontVariantNumeric: 'tabular-nums'}}>
        <span>{String(minutes).padStart(2, '0')}</span>:<span>{String(seconds).padStart(2, '0')}</span>
      </div>
      
      <div className="space-x-4">
        {isAlarmPlaying ? (
          <Button onClick={handleAcknowledgeAlarm} className="w-48 bg-green-600 hover:bg-green-700">
            {mode === 'work' ? 'Iniciar Pausa' : 'Iniciar Foco'}
          </Button>
        ) : (
          <>
            <Button onClick={toggleTimer} className="w-28">{isActive ? 'Pausar' : 'Iniciar'}</Button>
            <Button onClick={resetTimer} variant="outline">Resetar</Button>
          </>
        )}
      </div>
    </div>
  );
}