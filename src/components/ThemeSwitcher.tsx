// src/components/ThemeSwitcher.tsx
'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button 
      className="p-2 rounded-full hover:bg-secondary"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title="Trocar tema"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Trocar tema</span>
    </button>
  );
}
