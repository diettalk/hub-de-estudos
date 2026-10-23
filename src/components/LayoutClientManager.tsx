'use client';

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { PageTransition } from '@/components/PageTransition';
import { MainSidebar } from '@/components/MainSidebar';
import { ProfileData } from '@/app/layout';
import { Menu, X, Sparkles, Maximize2, Minimize2, Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface LayoutClientManagerProps {
  children: React.ReactNode;
  user: User | null;
  profile: ProfileData;
}

export function LayoutClientManager({ children, user, profile }: LayoutClientManagerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Mini Pomodoro Global
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomodoroActive && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
    } else if (secondsLeft === 0) {
      setPomodoroActive(false);
    }
    return () => clearInterval(interval);
  }, [pomodoroActive, secondsLeft]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      {/* SIDEBAR DESKTOP (Fixa a partir de telas lg) */}
      <div className="hidden lg:flex h-full flex-shrink-0 z-30">
        <MainSidebar user={user} profile={profile} />
      </div>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* CABEÇALHO GLOBAL / BARRA DE FOCO (Tablet & Celular) */}
        <header className="flex items-center justify-between h-14 px-3 sm:px-6 border-b border-border bg-card/80 backdrop-blur-md z-20 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Botão Gaveta Mobile */}
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
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-bold tracking-tight text-xs sm:text-sm hidden sm:inline">Modo Estudo</span>
            </div>
          </div>

          {/* CENTRO: Mini Pomodoro Rápido */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary/80 border border-border text-xs">
            <Timer className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono font-bold text-[11px] sm:text-xs">{formatTimer(secondsLeft)}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPomodoroActive(!pomodoroActive)}
              className="h-6 w-6 rounded-full hover:bg-background"
              title={pomodoroActive ? 'Pausar' : 'Iniciar Foco'}
            >
              {pomodoroActive ? <Pause className="w-3 h-3 text-amber-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setPomodoroActive(false);
                setSecondsLeft(25 * 60);
              }}
              className="h-6 w-6 rounded-full hover:bg-background text-muted-foreground"
              title="Reiniciar 25min"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>
          </div>

          {/* DIREITA: Modo Tela Cheia (Perfeito para Tablet S10 FE) */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              title="Modo Tela Cheia (Ocultar barras)"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Janela' : 'Tela Cheia'}</span>
            </Button>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL COM SCROLL SUAVE */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6">
          <div className="max-w-7xl mx-auto w-full">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}