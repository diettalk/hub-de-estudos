'use client';

import React, { useState, useEffect } from 'react';
import { Music2, ChevronDown, ChevronUp, Link2, Youtube as YoutubeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Ícone personalizado do Spotify para o seletor
const SpotifyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.901 17.03c-.221.359-.636.491-.995.271-2.903-1.76-6.52-2.162-10.923-1.181-.428.092-.85-.17-.942-.599-.092-.428.17-.85.599-.942 4.819-1.082 8.841-.635 12.04 1.339.359.22.491.636.271.995v-.013zm1.258-3.18c-.271.44-.783.582-1.223.312-3.24-1.96-7.762-2.523-12.245-1.383-.502.13-.995-.16-1.125-.662-.13-.502.16-.995.662-1.125 5.013-1.259 9.945-.635 13.617 1.608.44.27.582.783.312 1.223zm.13-3.414C15.193 7.93 9.428 7.648 5.518 8.73c-.582.16-1.174-.23-1.334-.813-.16-.582.23-1.174.813-1.334 4.453-1.22 10.87- .89 15.057 1.83.522.342.703 1.006.362 1.528-.342.522-1.006.703-1.528.362z"/>
  </svg>
);

type PlayerType = 'spotify' | 'youtube';

export function MusicPlayer() {
  const [activePlayer, setActivePlayer] = useState<PlayerType>('spotify');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [spotifyInput, setSpotifyInput] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const { theme } = useTheme();

  useEffect(() => {
    const savedSpotify = localStorage.getItem('hub-player-spotify-url');
    const savedYoutube = localStorage.getItem('hub-player-youtube-url');
    if (savedSpotify) {
      setSpotifyInput(savedSpotify);
      setSpotifyUrl(generateSpotifyEmbedUrl(savedSpotify, theme));
    }
    if (savedYoutube) {
      setYoutubeInput(savedYoutube);
      setYoutubeUrl(generateYoutubeEmbedUrl(savedYoutube));
    }
  }, [theme]); // Adiciona 'theme' para atualizar o player do Spotify se o tema mudar

  const generateSpotifyEmbedUrl = (url: string, currentTheme: string | undefined) => {
    try {
      const urlObject = new URL(url);
      if (urlObject.hostname.includes('spotify.com')) {
        const path = urlObject.pathname;
        const spotifyTheme = currentTheme === 'dark' ? '0' : '1';
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
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) { return ''; }
    return '';
  };

  const handleSetSpotify = () => {
    localStorage.setItem('hub-player-spotify-url', spotifyInput);
    setSpotifyUrl(generateSpotifyEmbedUrl(spotifyInput, theme));
    if (spotifyInput) setActivePlayer('spotify');
  };

  const handleSetYoutube = () => {
    localStorage.setItem('hub-player-youtube-url', youtubeInput);
    setYoutubeUrl(generateYoutubeEmbedUrl(youtubeInput));
    if (youtubeInput) setActivePlayer('youtube');
  };

  const PlayerFrame = ({ type }: { type: PlayerType }) => {
    const url = type === 'spotify' ? spotifyUrl : youtubeUrl;
    if (!url) return null;
    
    return (
        <iframe
            key={url}
            src={url}
            width="100%"
            height="100%"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-0 bg-secondary"
        ></iframe>
    );
  };

  return (
    <div className="bg-card/80 backdrop-blur-sm border-b flex transition-all duration-300 ease-in-out">
      {/* Coluna de Controlo Vertical */}
      <div className="flex flex-col items-center justify-center p-2 border-r gap-2">
        <ToggleGroup type="single" value={activePlayer} onValueChange={(value: PlayerType) => value && setActivePlayer(value)} size="sm" orientation="vertical">
            <ToggleGroupItem value="spotify" aria-label="Spotify" className="rounded-full h-8 w-8">
                <SpotifyIcon className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="youtube" aria-label="YouTube" className="rounded-full h-8 w-8">
                <YoutubeIcon className="w-4 h-4" />
            </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Área Principal do Player */}
      <div className="flex-grow flex flex-col p-2 min-w-0">
          {/* Input para colar o link */}
          <div className="flex gap-2 items-center flex-shrink-0">
              {activePlayer === 'spotify' && (
                  <>
                    <Input placeholder="Cole um link de playlist/álbum do Spotify" value={spotifyInput} onChange={e => setSpotifyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetSpotify()} className="h-8"/>
                    <Button onClick={handleSetSpotify} size="sm">Tocar</Button>
                  </>
              )}
              {activePlayer === 'youtube' && (
                  <>
                    <Input placeholder="Cole um link de vídeo/playlist do YouTube" value={youtubeInput} onChange={e => setYoutubeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSetYoutube()} className="h-8"/>
                    <Button onClick={handleSetYoutube} size="sm">Tocar</Button>
                  </>
              )}
          </div>
          
          {/* Container do Iframe (NÃO é removido ao minimizar) */}
          <div className={cn(
            "rounded-md overflow-hidden mt-2 transition-all duration-300 ease-in-out",
            isExpanded ? "h-[80px]" : "h-0 opacity-0",
            activePlayer === 'youtube' && isExpanded && "h-auto max-h-[240px] opacity-100 aspect-video"
          )}>
            <PlayerFrame type={activePlayer} />
          </div>
      </div>

       {/* Botão de Expandir/Recolher */}
       <div className="p-2 flex items-start">
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? "Recolher Player" : "Expandir Player"}>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
       </div>
    </div>
  );
}

