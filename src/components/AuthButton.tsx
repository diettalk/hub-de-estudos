// src/components/AuthButton.tsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useEffect, useState } from 'react';
import { type Session } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

export function AuthButton() {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        router.refresh(); 
      }
    );
    return () => { authListener.subscription.unsubscribe(); };
  }, [supabase, router]);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return session ? (
    <Button variant="outline" size="sm" onClick={handleSignOut}>Logout</Button>
  ) : (
    <Button variant="outline" size="sm" onClick={handleSignIn}>Login com GitHub</Button>
  );
}