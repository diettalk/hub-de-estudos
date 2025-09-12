'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Music2, X, Youtube, Grab } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 30, y: window.innerHeight - 250 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Guarda o link no localStorage para persistir entre sessões
  const [inputValue, setInputValue] = useState('');
  const [playerUrl, setPlayerUrl] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('hub-player-url');
    if (savedUrl) {
      setInputValue(savedUrl);
      handleUrlChange(savedUrl);
    }
  }, []);

  const handleUrlChange = (url: string) => {
    let embedUrl = '';
    try {
      const urlObject = new URL(url);
      if (urlObject.hostname.includes('spotify.com')) {
        const path = urlObject.pathname;
        embedUrl = `https://open.spotify.com/embed${path}`;
      } else if (urlObject.hostname.includes('youtube.com')) {
        if (urlObject.pathname === '/watch') {
          const videoId = urlObject.searchParams.get('v');
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (urlObject.pathname === '/playlist') {
          const listId = urlObject.searchParams.get('list');
          embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}`;
        }
      }
    } catch (error) {
      // URL inválida, não faz nada
    }
    setPlayerUrl(embedUrl);
  };

  const handleSetUrl = () => {
    localStorage.setItem('hub-player-url', inputValue);
    handleUrlChange(inputValue);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-50 rounded-full h-14 w-14 shadow-lg"
          aria-label="Abrir Player de Música"
        >
          <Music2 className="h-6 w-6" />
        </Button>
      )}

      {/* Janela do Player */}
      {isOpen && (
        <Card 
          className="fixed z-50 w-[350px] h-[480px] shadow-2xl flex flex-col"
          style={{ top: position.y, left: position.x }}
        >
          <CardHeader 
            className="flex flex-row items-center justify-between py-2 px-4 border-b"
            onMouseDown={handleMouseDown}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Grab className="w-4 h-4 text-muted-foreground" />
              Player
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 flex-grow flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Cole um link do Spotify ou YouTube"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button onClick={handleSetUrl}>Tocar</Button>
            </div>
            
            <div className="flex-grow rounded-md overflow-hidden border">
              {playerUrl ? (
                <iframe
                  src={playerUrl}
                  width="100%"
                  height="100%"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="bg-secondary"
                ></iframe>
              ) : (
                <div className="h-full flex items-center justify-center bg-secondary text-muted-foreground text-sm">
                  Cole um link para começar a ouvir.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
