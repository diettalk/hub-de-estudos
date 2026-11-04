'use client';

import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { PageTransition } from '@/components/PageTransition';
import { MainSidebar } from '@/components/MainSidebar';
import { RegistroEstudoModal } from '@/components/RegistroEstudoModal';
import { ProfileData } from '@/app/layout';
import {
  Menu,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Timer,
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LayoutClientManagerProps {
  children: React.ReactNode;
  user: User | null;
  profile: ProfileData;
}

const TIMER_STORAGE_KEY = 'hub_persistent_timer_v1';

export function LayoutClientManager({ children, user, profile }: LayoutClientManagerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cronômetro Persistente (não perde o tempo ao dar F5 ou trocar de aba)
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Restaura o estado do cronômetro ao carregar a página
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.running && parsed.startTimestamp) {
          const diffSec = Math.floor((Date.now() - parsed.startTimestamp) / 1000);
          setElapsedSeconds(Math.max(0, (parsed.accumulated || 0) + diffSec));
          setTimerRunning(true);
        } else {
          setElapsedSeconds(parsed.accumulated || 0);
          setTimerRunning(false);
        }
      }
    } catch {
      // ignora erro de leitura
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        try {
          const saved = localStorage.getItem(TIMER_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.running && parsed.startTimestamp) {
              const diffSec = Math.floor((Date.now() - parsed.startTimestamp) / 1000);
              const total = Math.max(0, (parsed.accumulated || 0) + diffSec);
              setElapsedSeconds(total);

              // Alerta sonoro suave a cada 45 minutos (2700s) de foco
              if (total > 0 && total % 2700 === 0) {
                audioRef.current?.play().catch(() => {});
                toast.success('🎯 Você completou mais um ciclo de 45 minutos de foco!');
              }
              return;
            }
          }
        } catch {
          // fallback
        }
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleToggleTimer = () => {
    if (!timerRunning) {
      // Inicia salvando o timestamp atual
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          running: true,
          startTimestamp: Date.now(),
          accumulated: elapsedSeconds,
        })
      );
      setTimerRunning(true);
    } else {
      // Pausa salvando o acumulado
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          running: false,
          startTimestamp: null,
          accumulated: elapsedSeconds,
        })
      );
      setTimerRunning(false);
    }
  };

  const handleResetTimer = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setTimerRunning(false);
    setElapsedSeconds(0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimerHHMMSS = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const handleOpenRegistroComTempo = () => {
    if (timerRunning) handleToggleTimer();
    const tempoFormatado = elapsedSeconds > 0 ? formatTimerHHMMSS(elapsedSeconds) : '00:45:00';
    window.dispatchEvent(
      new CustomEvent('open-registro-estudo', { detail: { tempoFormatado } })
    );
  };

  if (!user) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-background">
        <PageTransition>{children}</PageTransition>
      </main>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Som de alerta do projeto */}
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

      <RegistroEstudoModal />

      <div className="hidden lg:flex h-full flex-shrink-0 z-30">
        <MainSidebar user={user} profile={profile} />
      </div>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-card/80 backdrop-blur-md z-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="lg:hidden">
              <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" aria-label="Abrir menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="p-0 max-h-[90vh] bg-sidebar border-border">
                  <DrawerTitle className="sr-only">Navegação Principal</DrawerTitle>
                  <div className="flex justify-end p-3 border-b border-border">
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="h-[75vh] overflow-y-auto">
                    <MainSidebar
                      user={user}
                      profile={profile}
                      isMobile
                      onNavigate={() => setMobileMenuOpen(false)}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-500 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold tracking-tight text-xs sm:text-sm hidden sm:inline">Modo Estudo</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs">
            <Timer className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-mono font-bold text-[11px] sm:text-xs">
              {formatTimerHHMMSS(elapsedSeconds)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleTimer}
              className="h-6 w-6 rounded-full hover:bg-background"
              title={timerRunning ? 'Pausar Cronômetro' : 'Iniciar Cronômetro'}
            >
              {timerRunning ? (
                <Pause className="w-3 h-3 text-amber-500" />
              ) : (
                <Play className="w-3 h-3 text-emerald-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetTimer}
              className="h-6 w-6 rounded-full hover:bg-background text-muted-foreground"
              title="Zerar Cronômetro"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>

            <div className="h-3.5 w-px bg-border mx-0.5" />

            <button
              type="button"
              onClick={handleOpenRegistroComTempo}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 hover:text-emerald-400 px-1.5 py-0.5 rounded-full transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Registrar</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Janela' : 'Tela Cheia'}</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-[1720px] mx-auto w-full">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}