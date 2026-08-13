import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Leaf, TreePine, CloudRain, ListMusic, X, Camera } from 'lucide-react';
import { PLAYLISTS, type PlaylistConfig } from './data/playlists';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

/** Parse "Song Title - Artist" or "Song Title | Artist" from YT video title */
function parseSongMeta(rawTitle: string): { song: string; artist: string } {
  // Common YouTube title patterns: "Song - Artist", "Song | Artist", "Song (Film) | Artist"
  const separators = [' - ', ' | ', ' – ', ' — '];
  for (const sep of separators) {
    const idx = rawTitle.lastIndexOf(sep);
    if (idx > 0) {
      return {
        song: rawTitle.substring(0, idx).trim(),
        artist: rawTitle.substring(idx + sep.length).trim(),
      };
    }
  }
  return { song: rawTitle, artist: '' };
}
const SUBTITLES = [
  "चौखट, खेत, और सुहाने मौसम की यादें",
  "गांव के माटी में बसल बा हमनी के मन",
  "आंगन के छांव, अउर नदी के किनारे वाला सांझ",
  "हर गाना, एक याद, एक अपना ज़माना",
  "बनास नदी के लहर, अउर भगौती मइया के आशीष",
  "बचपन के गलियां, अउर बाबा-दादी के किस्सा",
  "खेत-खलिहान के हवा, अउर गांव के अपनापन"
];

const INFO_CONTENT = {
  hi: {
    title: "आपण गांव के बाग बगीचा",
    subtitle: "Apan Gaon Ke Bagh Bagicha",
    description: "70, 80 और 90 के दशक की क्लासिक बॉलीवुड यादें। एक पुराने गांव के आंगन (चौखट) और मानसून के खेतों के माहौल के साथ — जिसका मकसद उन सरल समय और खूबसूरत मौसम की यादों को वापस लाना है।",
    builtBy: "निर्माता",
    rotations: "रोटेशन (Rotations)",
    audioDisclaimer: "ऑडियो सीधे YouTube के एम्बेडेड प्लेयर के माध्यम से स्ट्रीम किया जाता है; सभी अधिकार संबंधित लेबल, संगीतकारों और कलाकारों के पास सुरक्षित हैं। यहाँ कुछ भी होस्ट नहीं किया गया है।",
    freeDisclaimer: "यह स्टेशन पूरी तरह से मुफ़्त है और मुफ़्त ही रहेगा।",
    contactDisclaimerPrefix: "क्या आपके पास यहाँ किसी चीज़ के अधिकार हैं और आप उसे हटाना चाहते हैं? ",
    contactEmail: "vpbhaskarwork@gmail.com",
    contactDisclaimerSuffix: " पर ईमेल करें और उसे तुरंत हटा दिया जाएगा।"
  },
  en: {
    title: "Our Village Courtyard",
    subtitle: "Apan Gaon Ke Bagh Bagicha",
    description: "Classic Bollywood nostalgia from the 70s, 80s, and 90s. Recreated with the atmosphere of an old village courtyard (chaukhat) overlooking monsoon fields — meant to bring back memories of simpler times and beautiful weather.",
    builtBy: "built by",
    rotations: "Rotations",
    audioDisclaimer: "Audio is streamed directly through YouTube's embedded player; all rights remain with the respective labels, composers, and performers. Nothing is hosted here.",
    freeDisclaimer: "The station is completely free and stays free.",
    contactDisclaimerPrefix: "Hold rights to something here and want it removed? Email ",
    contactEmail: "vpbhaskarwork@gmail.com",
    contactDisclaimerSuffix: " and it comes down immediately."
  }
};

export function App() {
  const [activePlaylist, setActivePlaylist] = useState<PlaylistConfig>(PLAYLISTS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentSongTitle, setCurrentSongTitle] = useState<string>('');
  const [currentArtist, setCurrentArtist] = useState<string>('');
  const [trackIndex, setTrackIndex] = useState<number>(0);
  const [totalTracks, setTotalTracks] = useState<number>(0);
  const [hasPlayedOnce, setHasPlayedOnce] = useState<boolean>(false);
  const [showTracklist, setShowTracklist] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);
  const [playlistTitles, setPlaylistTitles] = useState<string[]>([]);
  const [time, setTime] = useState(new Date());

  const [lang, setLang] = useState<'hi' | 'en'>(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'hi';
    }
    return 'hi';
  });

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Router for /info
  useEffect(() => {
    if (window.location.pathname === '/info') {
      setShowAbout(true);
    }

    const handlePopState = () => {
      setShowAbout(window.location.pathname === '/info');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openAbout = () => {
    setShowAbout(true);
    window.history.pushState(null, '', '/info');
  };

  const closeAbout = () => {
    setShowAbout(false);
    window.history.pushState(null, '', '/');
  };

  // Subtitle Rotation
  const [subtitleIndex, setSubtitleIndex] = useState(() => Math.floor(Math.random() * SUBTITLES.length));
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const currentText = SUBTITLES[subtitleIndex];
    // Base 3 seconds + 80ms per character for reading speed
    const duration = 3000 + (currentText.length * 80);

    const timeout = setTimeout(() => {
      setFadeState('out');
      setTimeout(() => {
        setSubtitleIndex((prev) => (prev + 1) % SUBTITLES.length);
        setFadeState('in');
      }, 400); // Wait 400ms for the fade-out to complete before changing text and fading in
    }, duration);

    return () => clearTimeout(timeout);
  }, [subtitleIndex]);

  // Ambient Sounds
  const [birdsOn, setBirdsOn] = useState<boolean>(false);
  const birdsAudioRef = useRef<HTMLAudioElement | null>(null);

  const toggleBirds = () => {
    const nextState = !birdsOn;
    setBirdsOn(nextState);

    if (!birdsAudioRef.current) {
      birdsAudioRef.current = new Audio('/freesound_community-birds-chirping-ambiance-26052.mp3');
      birdsAudioRef.current.loop = true;
      birdsAudioRef.current.volume = 0.4;
    }

    if (nextState) {
      birdsAudioRef.current.play().catch(console.error);
    } else {
      birdsAudioRef.current.pause();
    }
  };

  const playerRef = useRef<any>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState<boolean>(false);

  // Initialize YouTube IFrame Player API
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer(activePlaylist.id);
      } else {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = () => {
          initPlayer(activePlaylist.id);
        };
      }
    };

    const initPlayer = (playlistId: string) => {
      if (playerRef.current) return;

      playerRef.current = new window.YT.Player('hidden-yt-player', {
        height: '1',
        width: '1',
        playerVars: {
          listType: 'playlist',
          list: playlistId,
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            updatePlaylistInfo();
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsPlaying(true);
              if (!hasPlayedOnce) setHasPlayedOnce(true);
              updateTrackMeta();
              updatePlaylistInfo();
            } else if (event.data === 2 || event.data === 0) {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    loadYouTubeAPI();

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying YouTube player', e);
        }
        playerRef.current = null;
      }
    };
  }, []);

  const updatePlaylistInfo = useCallback(() => {
    if (!playerRef.current) return;
    try {
      const playlist = playerRef.current.getPlaylist?.();
      const idx = playerRef.current.getPlaylistIndex?.();
      if (playlist && playlist.length > 0) {
        setTotalTracks(playlist.length);
      }
      if (typeof idx === 'number' && idx >= 0) {
        setTrackIndex(idx);
      }
    } catch { /* ignore */ }
  }, []);

  const updateTrackMeta = useCallback(() => {
    if (!playerRef.current?.getVideoData) return;
    const videoData = playerRef.current.getVideoData();
    if (videoData?.title) {
      const { song, artist } = parseSongMeta(videoData.title);
      setCurrentSongTitle(song);
      const finalArtist = artist || videoData.author || '';
      setCurrentArtist(finalArtist);

      // Setup Media Session API for background/lock-screen play
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song,
          artist: finalArtist,
          album: 'Bagicha Music',
          artwork: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });
      }
    }
    updatePlaylistInfo();
  }, [updatePlaylistInfo]);

  // Register Media Session Action Handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        playerRef.current?.playVideo();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        playerRef.current?.pauseVideo();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playerRef.current?.previousVideo();
        setTimeout(updateTrackMeta, 800);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playerRef.current?.nextVideo();
        setTimeout(updateTrackMeta, 800);
      });
    }
  }, [updateTrackMeta]);

  // Check if song title overflows and needs marquee
  useEffect(() => {
    if (titleRef.current && titleContainerRef.current) {
      setNeedsMarquee(titleRef.current.scrollWidth > titleContainerRef.current.clientWidth + 10);
    }
  }, [currentSongTitle]);

  // Poll for track changes (YT doesn't always fire onStateChange for track advance within playlist)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      updateTrackMeta();
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, updateTrackMeta]);

  const handleSelectPlaylist = (playlist: PlaylistConfig) => {
    if (playlist.id === activePlaylist.id) return;
    setActivePlaylist(playlist);
    setCurrentSongTitle('');
    setCurrentArtist('');
    setTrackIndex(0);
    setTotalTracks(0);
    setPlaylistTitles([]);
    setShowTracklist(false);

    if (playerRef.current) {
      // Force the player to stop the current video before loading the new playlist.
      // This prevents the YouTube API from getting stuck in the old playlist loop.
      playerRef.current.stopVideo();

      const args = {
        listType: 'playlist',
        list: playlist.id,
        index: 0,
      };
      // Always load and play the new playlist instantly when a tab is clicked
      playerRef.current.loadPlaylist(args);
      if (!hasPlayedOnce) setHasPlayedOnce(true);
    }
  };

  const handleTogglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
      if (!hasPlayedOnce) setHasPlayedOnce(true);
    }
  };

  const handleNextTrack = () => {
    if (playerRef.current?.nextVideo) {
      playerRef.current.nextVideo();
      setTimeout(updateTrackMeta, 800);
    }
  };

  const handlePrevTrack = () => {
    if (playerRef.current?.previousVideo) {
      playerRef.current.previousVideo();
      setTimeout(updateTrackMeta, 800);
    }
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleToggleTracklist = () => {
    if (!showTracklist && playerRef.current?.getPlaylist) {
      // Build title list from video IDs — we show index + generic title
      const playlist = playerRef.current.getPlaylist();
      if (playlist) {
        setPlaylistTitles(playlist);
        setTotalTracks(playlist.length);
      }
    }
    setShowTracklist(!showTracklist);
  };

  const handleJumpToTrack = (index: number) => {
    if (playerRef.current?.playVideoAt) {
      playerRef.current.playVideoAt(index);
      setShowTracklist(false);
      setTimeout(updateTrackMeta, 800);
    }
  };

  const displaySong = currentSongTitle || activePlaylist.label;
  const formattedTime = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const formattedDate = time.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase() + ' • IST';

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full overflow-y-auto bg-[#2C3631] select-none flex flex-col justify-between p-3 sm:p-6 md:p-8">
      {/* Hidden YouTube Audio Engine */}
      <div className="fixed top-0 left-0 w-1 h-1 opacity-0 pointer-events-none overflow-hidden -z-50">
        <div id="hidden-yt-player" />
      </div>

      <div
        className="fixed inset-0 bg-cover bg-no-repeat pointer-events-none z-0"
        style={{
          backgroundImage: `url('/village_bg.png')`,
          backgroundPosition: 'center 70%',
        }}
      />

      {/* Soft daytime gradient overlay — transparent top, soft earthy green/charcoal bottom */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(44, 54, 49, 0.1) 0%, rgba(44, 54, 49, 0.4) 40%, rgba(44, 54, 49, 0.75) 75%, rgba(20, 26, 23, 0.9) 100%)',
        }}
      />
      {/* Soft radial vignette for depth */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(20, 26, 23, 0.6) 100%)' }} />

      {/* 2. Top-Left Clock Widget & Top-Right Dedication Badge */}
      <header className="sticky top-0 sm:top-2 z-50 flex items-start justify-between w-full max-w-6xl mx-auto mb-1 sm:mb-2 py-2">
        {/* Top-Left Widget (Clock & Ambience) */}
        <div className="flex flex-col items-start gap-1 text-left drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
          <div className="text-[#F2EFE9]" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
            <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight">{formattedTime}</div>
            <div className="font-mono text-[10px] sm:text-xs text-[#B8C0BA] tracking-widest">{formattedDate}</div>
          </div>

          <button
            onClick={openAbout}
            className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-md text-[#F2EFE9] hover:text-white transition-all text-[10px] sm:text-xs font-mono shadow-lg"
          >
            built by <Camera className="w-3 h-3" /> @vpbhaskar7
          </button>

          {/* Ambient Sounds Toggle Panel */}
          <button 
            onClick={toggleBirds}
            title="मन फ्रेश"
            className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md border shadow-lg font-mukta text-[10px] sm:text-xs transition-all duration-300 ${
              birdsOn 
                ? 'bg-[#5A7D59]/30 border-[#5A7D59] text-[#E5B869]' 
                : 'bg-black/40 border-white/10 text-[#B8C0BA] hover:text-white hover:bg-black/60'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium tracking-wide">मन फ्रेश</span>
          </button>
        </div>

        {/* Top-Right Dedication Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#2C3631]/85 backdrop-blur-md border border-[#5A7D59]/40 text-[#F2EFE9] shadow-lg whitespace-nowrap">
          <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5A7D59] fill-current animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-mukta font-bold tracking-wide">
            गांव की यादें 🌿
          </span>
        </div>
      </header>

      {/* 3. Main Title */}
      <main className="relative z-20 text-center my-auto py-2 flex flex-col items-center justify-center space-y-1 sm:space-y-2 px-2">
        <h1
          className="font-yatra text-[#F2EFE9] green-text-glow tracking-wide leading-tight"
          style={{ fontSize: 'clamp(2.8rem, 8vw, 7rem)' }}
        >
          आपण गांव के बाग बगीचा
        </h1>
        <p
          aria-live="polite"
          className={`text-sm sm:text-lg md:text-xl text-[#B8C0BA] font-mukta font-medium tracking-wide max-w-xl transition-all duration-500 transform ${fadeState === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
        >
          {SUBTITLES[subtitleIndex]}
        </p>
      </main>

      {/* Multi-Playlist Pill Tab Switcher */}
      <div className="relative z-20 w-full max-w-5xl mx-auto overflow-x-auto flex items-center justify-start md:justify-center gap-2 py-1 px-2 no-scrollbar flex-nowrap scroll-smooth mb-2 md:mb-3">
        {PLAYLISTS.map((pl) => {
          const isActive = pl.id === activePlaylist.id;
          return (
            <button
              key={pl.id}
              onClick={() => handleSelectPlaylist(pl)}
              className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mukta font-bold transition-all duration-200 shadow-md ${isActive
                  ? 'bg-gradient-to-r from-[#5A7D59] to-[#E5B869] text-[#1A0F0A] border border-[#E5B869] shadow-[0_0_15px_rgba(90,125,89,0.4)] scale-105'
                  : 'bg-[#2C3631]/85 backdrop-blur-md text-[#B8C0BA] border border-[#B8C0BA]/30 hover:border-[#5A7D59]/60 hover:text-[#F2EFE9]'
                }`}
            >
              <CloudRain className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#1A0F0A]' : 'text-[#5A7D59]'}`} />
              <span>{pl.hindiLabel}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Bottom Player Section */}
      <footer className="relative z-20 w-full max-w-2xl mx-auto space-y-2.5">
        {/* Player Card */}
        <div className="bg-[#2C3631]/60 backdrop-blur-2xl border border-white/10 sm:border-2 sm:border-white/10 rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 shadow-2xl flex flex-col gap-2 relative">

          {/* Top Bar: Badge + Track Counter */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 px-2 gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isPlaying ? 'bg-green-400 on-air-pulse' : 'bg-red-500/50'
                  }`}
              />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/80 shrink-0">
                {activePlaylist.badge}
              </span>
            </div>
            {totalTracks > 0 && (
              <span className="text-[10px] font-mono text-white/60 tracking-wider shrink-0">
                TRACK {String(trackIndex + 1).padStart(2, '0')} / {String(totalTracks).padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Main Player Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 py-1">

            {/* Left: Album Art & Song Info */}
            <div className="flex items-center gap-3 w-full sm:w-[55%] min-w-0">
              <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#2C3631] border-2 border-white/10 shrink-0 shadow-xl overflow-hidden">
                <TreePine className={`w-7 h-7 text-[#E5B869] ${isPlaying ? 'animate-pulse' : ''}`} />
                <div className="absolute w-2 h-2 rounded-full bg-[#2C3631]" />
              </div>

              <div className="min-w-0 flex-1 overflow-hidden flex flex-col justify-center pr-2">
                <div ref={titleContainerRef} className="marquee-container w-full">
                  <p
                    ref={titleRef}
                    className={`text-sm sm:text-base font-bold text-white tracking-wide whitespace-nowrap ${needsMarquee ? 'marquee-text' : 'truncate'
                      }`}
                  >
                    {displaySong}
                  </p>
                </div>
                <p className="text-[11px] sm:text-xs text-white/60 font-mukta truncate mt-0.5">
                  {currentArtist || activePlaylist.description}
                </p>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center justify-center sm:justify-end gap-3 sm:gap-5 w-full sm:w-[45%] shrink-0">
              <button
                onClick={handlePrevTrack}
                title="Previous Song"
                className="p-2 text-white/70 hover:text-white transition-colors active:scale-95"
              >
                <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="relative flex items-center justify-center">
                {!hasPlayedOnce && (
                  <span className="absolute w-14 h-14 rounded-full border-2 border-white/50 play-nudge-ring pointer-events-none" />
                )}
                <button
                  onClick={handleTogglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white text-[#1A0F0A] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />
                  )}
                </button>
              </div>

              <button
                onClick={handleNextTrack}
                title="Next Song"
                className="p-2 text-white/70 hover:text-white transition-colors active:scale-95"
              >
                <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-white/10 ml-1">
                <button
                  onClick={handleToggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="p-2 text-white/70 hover:text-white transition-colors active:scale-95"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>

                <button
                  onClick={handleToggleTracklist}
                  title="Show Tracklist"
                  className={`p-2 transition-colors active:scale-95 ${showTracklist ? 'text-white' : 'text-white/70 hover:text-white'
                    }`}
                >
                  <ListMusic className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating Tracklist Drawer */}
          {showTracklist && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#2C3631]/60 backdrop-blur-2xl border-2 border-[#5A7D59]/30 rounded-xl player-card-shadow max-h-64 overflow-y-auto no-scrollbar z-40">
              <div className="sticky top-0 bg-[#2C3631]/70 backdrop-blur-xl flex items-center justify-between px-3 py-2 border-b border-[#B8C0BA]/20 z-10">
                <span className="text-xs font-mono font-bold text-[#E5B869] uppercase">
                  {activePlaylist.badge} — {totalTracks} TRACKS
                </span>
                <button
                  onClick={() => setShowTracklist(false)}
                  className="text-[#B8C0BA] hover:text-[#E5B869] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-[#B8C0BA]/20">
                {playlistTitles.map((videoId, idx) => (
                  <button
                    key={`${videoId}-${idx}`}
                    onClick={() => handleJumpToTrack(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${idx === trackIndex
                        ? 'bg-[#5A7D59]/20 text-[#E5B869]'
                        : 'text-[#F2EFE9] hover:bg-[#5A7D59]/15'
                      }`}
                  >
                    <span className={`text-[10px] font-mono w-5 text-right shrink-0 ${idx === trackIndex ? 'text-[#E5B869]' : 'text-[#B8C0BA]'
                      }`}>
                      {idx === trackIndex ? '▶' : String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-mukta truncate">
                      Track {idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </footer>

      {/* About Modal Overlay */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex p-4 sm:p-8 bg-black/80 backdrop-blur-xl transition-all overflow-y-auto">
          <div className="relative w-full max-w-4xl m-auto bg-[#1A1A1A] border border-white/10 rounded-2xl sm:rounded-3xl p-6 pt-16 sm:p-12 sm:pt-12 text-[#F2EFE9] shadow-2xl flex flex-col md:flex-row gap-8 md:gap-16">
            
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-4">
              <button
                onClick={() => setLang(l => l === 'en' ? 'hi' : 'en')}
                className="px-3 py-1 text-[10px] sm:text-xs font-mono font-bold tracking-widest rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                {lang === 'en' ? 'EN / हिं' : 'हिं / EN'}
              </button>
              <button
                onClick={closeAbout}
                className="p-2 text-white/50 hover:text-white transition-colors bg-white/5 rounded-full sm:bg-transparent"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <h2 className="font-yatra text-3xl sm:text-4xl text-[#E5B869] mb-2 tracking-wide">{INFO_CONTENT[lang].title}</h2>
                <div className="text-xs font-mono text-[#B8C0BA] tracking-widest uppercase">{INFO_CONTENT[lang].subtitle}</div>
              </div>
              <p className="font-mukta text-sm sm:text-base text-white/80 leading-relaxed">
                {INFO_CONTENT[lang].description}
              </p>

              <a
                href="https://www.instagram.com/vpbhaskar7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-mono"
              >
                {INFO_CONTENT[lang].builtBy} <Camera className="w-4 h-4 text-pink-500" /> @vpbhaskar7
              </a>
            </div>

            <div className="flex-1 space-y-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-[#B8C0BA] tracking-widest uppercase mb-4">{INFO_CONTENT[lang].rotations}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm font-mukta">
                  {PLAYLISTS.map(pl => (
                    <div key={pl.id} className="text-white/80">{lang === 'en' ? pl.label : pl.hindiLabel}</div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-white/10 text-xs text-white/50 font-mukta leading-relaxed">
                <p>
                  {INFO_CONTENT[lang].audioDisclaimer}
                </p>
                <p>
                  {INFO_CONTENT[lang].freeDisclaimer}
                </p>
                <p>
                  {INFO_CONTENT[lang].contactDisclaimerPrefix}
                  <a href="mailto:vpbhaskarwork@gmail.com" className="text-white hover:underline">{INFO_CONTENT[lang].contactEmail}</a>
                  {INFO_CONTENT[lang].contactDisclaimerSuffix}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
