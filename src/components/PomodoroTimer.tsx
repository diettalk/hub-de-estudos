// src/components/PomodoroTimer.tsx
'use client';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label'; // A IMPORTAÇÃO QUE FALTAVA

export function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialTime, setInitialTime] = useState(25);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            if(interval) clearInterval(interval);
            setIsActive(false);
            alert("Pomodoro concluído!");
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      if(interval) clearInterval(interval);
    }
    return () => { if(interval) clearInterval(interval) };
  }, [isActive, seconds, minutes]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setMinutes(initialTime); setSeconds(0); };
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value, 10);
    if (!isNaN(newTime) && newTime > 0) { setInitialTime(newTime); setMinutes(newTime); }
  }

  return (
    <div className="card bg-gray-800 p-6 flex flex-col items-center justify-center">
      <h3 className="text-xl font-bold mb-4">Área de Foco (Pomodoro)</h3>
      <div className="text-6xl text-center font-bold p-6 bg-red-800/80 rounded-lg w-full">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div className="flex gap-4 mt-4">
        <Button onClick={toggleTimer}>{isActive ? 'Pausar' : 'Iniciar'}</Button>
        <Button onClick={resetTimer} variant="secondary">Resetar</Button>
        <Button onClick={() => setIsEditing(!isEditing)} variant="ghost" size="icon"><i className="fas fa-cog"></i></Button>
      </div>
      {isEditing && (
        <div className="flex items-center gap-2 mt-4">
          <Input type="number" value={initialTime} onChange={handleTimeChange} className="w-24 bg-gray-700"/>
          <Label>minutos</Label>
        </div>
      )}
    </div>
  );
}