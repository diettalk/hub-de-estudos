'use client';

import React, { useState, useEffect } from 'react';
import { Music2, X, Youtube, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export function MusicPlayer() {
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [playerUrl, setPlayerUrl] = useState('');
  const { theme } = useTheme();

  // Carrega a última URL guardada quando o componente é montado
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
        // O tema do embed do Spotify pode ser 0 (escuro) ou 1 (claro)
        const spotifyTheme = theme === 'dark' ? '0' : '1';
        embedUrl = `https://open.spotify.com/embed${path}?utm_source=generator&theme=${spotifyTheme}`;
      } else if (urlObject.hostname.includes('youtube.com')) {
        if (urlObject.pathname === '/watch') {
          const videoId = urlObject.searchParams.get('v');
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (urlObject.pathname.includes('/playlist')) {
          const listId = urlObject.searchParams.get('list');
          embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}`;
        }
      }
    } catch (error) {
      console.error("URL inválida:", error);
    }
    setPlayerUrl(embedUrl);
    if(embedUrl) setIsInputVisible(false);
  };

  const handleSetUrl = () => {
    localStorage.setItem('hub-player-url', inputValue);
    handleUrlChange(inputValue);
  };

  const handleStop = () => {
    setPlayerUrl('');
    setInputValue('');
    localStorage.removeItem('hub-player-url');
    setIsInputVisible(false);
  }

  // O player só é renderizado se tiver uma URL para tocar
  if (!playerUrl) {
    return (
      <div className="bg-card/50 backdrop-blur-sm border-b p-2 flex items-center gap-2">
        <Music2 className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Cole um link do Spotify ou YouTube para ouvir música"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSetUrl()}
          className="h-8 flex-grow bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button onClick={handleSetUrl} size="sm">Tocar</Button>
      </div>
    );
  }

  return (
    <div className="bg-card/50 backdrop-blur-sm border-b flex flex-col transition-all duration-300">
      <div className="flex items-center p-1">
        <div className="flex-grow h-20 rounded-md overflow-hidden">
          <iframe
            key={playerUrl} // Força a recriação do iframe quando a URL muda
            src={playerUrl}
            width="100%"
            height="100%"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-0"
          ></iframe>
        </div>
        <div className="flex flex-col ml-2">
           <Button variant="ghost" size="icon" onClick={() => setIsInputVisible(!isInputVisible)} title={isInputVisible ? "Esconder" : "Mudar link"}>
            {isInputVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleStop} title="Parar e fechar player">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {isInputVisible && (
        <div className="p-2 border-t flex items-center gap-2">
          <Link2 className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Cole um novo link..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetUrl()}
            className="h-8 flex-grow bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button onClick={handleSetUrl} size="sm">Tocar</Button>
        </div>
      )}
    </div>
  );
}

