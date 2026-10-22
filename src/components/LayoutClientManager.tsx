'use client';

import { PageTransition } from '@/components/PageTransition';
import { MusicPlayer } from '@/components/MusicPlayer';
import type { User } from '@supabase/supabase-js';

export function LayoutClientManager({ children, user }: { children: React.ReactNode, user: User | null }) {
  return (
    <div className="flex-1 flex flex-col h-screen">
      {user && <MusicPlayer />}
      <main className="flex-1 overflow-y-auto">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}