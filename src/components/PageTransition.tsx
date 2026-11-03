'use client';

import React from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full animate-in fade-in duration-150">
      {children}
    </div>
  );
}
