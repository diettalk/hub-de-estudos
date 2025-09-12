'use client';

import React, { useState, useEffect } from 'react';
import { Music2, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type PlayerType = 'spotify' | 'youtube';

export function MusicPlayer() {
  const [activePlayer, setActivePlayer] = useState<PlayerType>('spotify');
  const [isMinimized, setIsMinimized] = useState(true);
  
  const [spotifyInput, setSpotifyInput] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const { theme } = useTheme();

  // Carrega os links guardados quando o componente é montado
  useEffect(() => {
    const savedSpotify = localStorage.getItem('hub-player-spotify-url');
    const savedYoutube = localStorage.getItem('hub-player-youtube-url');
    if (savedSpotify) {
        setSpotifyInput(savedSpotify);
        setSpotifyUrl(generateSpotifyEmbedUrl(savedSpotify));
    }
    if (savedYoutube) {
        setYoutubeInput(savedYoutube);
        setYoutubeUrl(generateYoutubeEmbedUrl(savedYoutube));
    }
  }, []);

  const generateSpotifyEmbedUrl = (url: string) => {
    try {
      const urlObject = new URL(url);
      if (urlObject.hostname.includes('spotify.com')) {
        const path = urlObject.pathname;
        const spotifyTheme = theme === 'dark' ? '0' : '1';
        return `https://open.spotify.com/embed${path}?utm_source=generator&theme=${spotifyTheme}`;
      }
    } catch (e) { return ''; }
    return '';
  };

  const generateYoutubeEmbedUrl = (url: string) => {
    try {
      const urlObject = new URL(url);
      if (urlObject.hostname.includes('youtube.com') || urlObject.hostname.includes('youtu.be')) {
        let videoId = urlObject.searchParams.get('v');
        if (urlObject.pathname.includes('/playlist')) {
            const listId = urlObject.searchParams.get('list');
            return `https://www.youtube.com/embed/videoseries?list=${listId}`;
        }
        if (urlObject.hostname.includes('youtu.be')) {
            videoId = urlObject.pathname.substring(1);
        }
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
      }
    } catch (e) { return ''; }
    return '';
  };

  const handleSetSpotify = () => {
    localStorage.setItem('hub-player-spotify-url', spotifyInput);
    setSpotifyUrl(generateSpotifyEmbedUrl(spotifyInput));
    if (spotifyInput) setActivePlayer('spotify');
  };

  const handleSetYoutube = () => {
    localStorage.setItem('hub-player-youtube-url', youtubeInput);
    setYoutubeUrl(generateYoutubeEmbedUrl(youtubeInput));
    if (youtubeInput) setActivePlayer('youtube');
  };

  const PlayerFrame = ({ type }: { type: PlayerType }) => {
    const url = type === 'spotify' ? spotifyUrl : youtubeUrl;
    const aspectRatio = type === 'youtube' ? '16/9' : undefined;
    const height = type === 'spotify' ? '152px' : undefined;

    if (!url) return null;
    
    return (
        <iframe
            key={url}
            src={url}
            width="100%"
            height={height}
            style={{ aspectRatio }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-0 bg-secondary rounded-md"
        ></iframe>
    );
  };

  const hasContent = spotifyUrl || youtubeUrl;

  return (
    <div className={cn(
      "bg-card/80 backdrop-blur-sm border-b transition-all duration-300 ease-in-out flex flex-col",
    )}>
      {/* Barra Superior - Sempre visível */}
      <div className="flex items-center px-2 h-12 flex-shrink-0">
        <div className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-primary" />
             <ToggleGroup type="single" value={activePlayer} onValueChange={(value: PlayerType) => value && setActivePlayer(value)} size="sm">
                <ToggleGroupItem value="spotify" aria-label="Spotify">Spotify</ToggleGroupItem>
                <ToggleGroupItem value="youtube" aria-label="YouTube">YouTube</ToggleGroupItem>
            </ToggleGroup>
        </div>
        <div className="flex-grow"></div>
        <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? "Mostrar Player" : "Esconder Player"}>
          {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* Área Expansível */}
      {!isMinimized && (
        <div className="p-2 pt-0 border-t">
          {activePlayer === 'spotify' && (
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <Input placeholder="Cole um link de playlist/álbum do Spotify" value={spotifyInput} onChange={e => setSpotifyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetSpotify()} className="h-8"/>
                    <Button onClick={handleSetSpotify} size="sm">Tocar</Button>
                </div>
                {spotifyUrl && <PlayerFrame type="spotify" />}
            </div>
          )}
          {activePlayer === 'youtube' && (
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <Input placeholder="Cole um link de vídeo/playlist do YouTube" value={youtubeInput} onChange={e => setYoutubeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetYoutube()} className="h-8"/>
                    <Button onClick={handleSetYoutube} size="sm">Tocar</Button>
                </div>
                {youtubeUrl && <PlayerFrame type="youtube" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

