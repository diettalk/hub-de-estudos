// src/components/PomodoroTimer.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';

export function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  // Referência para o áudio de alerta
  const alarmRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer zerou
            if (alarmRef.current) {
              alarmRef.current.play();
            }
            setIsActive(false);
            // Troca de modo
            const newMode = mode === 'work' ? 'break' : 'work';
            setMode(newMode);
            setMinutes(newMode === 'work' ? 25 : 5);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    }

    // Função de limpeza para parar o intervalo
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, seconds, minutes, mode]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(mode === 'work' ? 25 : 5);
    setSeconds(0);
  };

  const setModeAndReset = (newMode: 'work' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setMinutes(newMode === 'work' ? 25 : 5);
    setSeconds(0);
  };

  return (
    <div className="card bg-gray-800 p-6 rounded-lg flex flex-col items-center justify-center h-full text-center">
      {/* Elemento de áudio escondido */}
      <audio ref={alarmRef} src="/alert.mp3" preload="auto"></audio>

      <div className="space-x-2 mb-4">
        <Button
          onClick={() => setModeAndReset('work')}
          variant={mode === 'work' ? 'secondary' : 'ghost'}
        >
          Pomodoro
        </Button>
        <Button
          onClick={() => setModeAndReset('break')}
          variant={mode === 'break' ? 'secondary' : 'ghost'}
        >
          Pausa Curta
        </Button>
      </div>

      <div className="text-7xl font-bold my-4">
        <span>{String(minutes).padStart(2, '0')}</span>
        <span>:</span>
        <span>{String(seconds).padStart(2, '0')}</span>
      </div>
      
      <div className="space-x-4">
        <Button onClick={toggleTimer} className="w-28">
          {isActive ? 'Pausar' : 'Iniciar'}
        </Button>
        <Button onClick={resetTimer} variant="outline">
          Resetar
        </Button>
      </div>
    </div>
  );
}