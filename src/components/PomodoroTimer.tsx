// src/components/PomodoroTimer.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
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
  // Estados para os tempos customizáveis
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  // Estados do timer principal
  const [minutes, setMinutes] = useState(workDuration);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  const alarmRef = useRef<HTMLAudioElement>(null);

  // Efeito para carregar as durações do localStorage ao iniciar
  useEffect(() => {
    const savedWorkDuration = localStorage.getItem('pomodoroWorkDuration');
    const savedBreakDuration = localStorage.getItem('pomodoroBreakDuration');
    if (savedWorkDuration) setWorkDuration(parseInt(savedWorkDuration, 10));
    if (savedBreakDuration) setBreakDuration(parseInt(savedBreakDuration, 10));
  }, []);

  // Efeito para resetar o timer quando a duração customizada muda
  useEffect(() => {
    resetTimer();
    // Salva as novas durações no localStorage
    localStorage.setItem('pomodoroWorkDuration', String(workDuration));
    localStorage.setItem('pomodoroBreakDuration', String(breakDuration));
  }, [workDuration, breakDuration]);
  
  // Efeito principal do timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes !== 0) {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (isActive && minutes === 0 && seconds === 0) {
      alarmRef.current?.play();
      const newMode = mode === 'work' ? 'break' : 'work';
      setMode(newMode);
      setMinutes(newMode === 'work' ? workDuration : breakDuration);
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, minutes, mode, workDuration, breakDuration]);


  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setMinutes(mode === 'work' ? workDuration : breakDuration);
    setSeconds(0);
  };
  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setMinutes(newMode === 'work' ? workDuration : breakDuration);
    setSeconds(0);
  };

  return (
    <div className="card bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center h-full text-center relative">
      <audio ref={alarmRef} src="/alert.mp3" preload="auto"></audio>
      
      <Dialog>
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
              <Label htmlFor="work" className="text-right">Pomodoro</Label>
              <Input id="work" type="number" value={workDuration} onChange={(e) => setWorkDuration(Number(e.target.value))} className="col-span-3 bg-gray-900"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="break" className="text-right">Pausa</Label>
              <Input id="break" type="number" value={breakDuration} onChange={(e) => setBreakDuration(Number(e.target.value))} className="col-span-3 bg-gray-900"/>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Salvar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="space-x-2 mb-4">
        <Button onClick={() => switchMode('work')} variant={mode === 'work' ? 'secondary' : 'ghost'}>Pomodoro</Button>
        <Button onClick={() => switchMode('break')} variant={mode === 'break' ? 'secondary' : 'ghost'}>Pausa Curta</Button>
      </div>

      <div className="text-7xl font-bold my-4" style={{fontVariantNumeric: 'tabular-nums'}}>
        <span>{String(minutes).padStart(2, '0')}</span>
        <span>:</span>
        <span>{String(seconds).padStart(2, '0')}</span>
      </div>
      
      <div className="space-x-4">
        <Button onClick={toggleTimer} className="w-28">{isActive ? 'Pausar' : 'Iniciar'}</Button>
        <Button onClick={resetTimer} variant="outline">Resetar</Button>
      </div>
    </div>
  );
}