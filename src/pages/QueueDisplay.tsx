import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchQueueState, formatQueueNumber, subscribeToQueueState, QueueState, QueueStatus } from '@/lib/supabaseQueueStore';
import { getPrintConfig, PrintConfig, TVDisplayConfig, VoiceConfig } from '@/lib/queueStore';
import { fetchTVDisplayConfig, subscribeToTVDisplayConfig } from '@/lib/supabaseTVConfig';
import { fetchVoiceConfig, subscribeToVoiceConfig } from '@/lib/supabaseVoiceConfig';
import { announceQueueWithConfig, primeAnnouncementAudio, reloadVoices } from '@/lib/audioUtils';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { Volume2, VolumeX, Maximize, Minimize, Loader2, WifiOff, Wifi, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DisplayInfoPanel from '@/components/DisplayInfoPanel';
import { RatesTable } from '@/components/DisplayInfoPanel';
import { PiggyBank, TrendingUp, Clock } from 'lucide-react';

// Rotating hero card for product rates — shows one product at a time, big & legible.
const ProductHeroRotator = ({
  rates,
  intervalMs = 5000,
}: {
  rates: { name: string; rate: string; note?: string }[];
  intervalMs?: number;
}) => {
  const [idx, setIdx] = useState(0);
  const count = rates.length;

  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs]);

  useEffect(() => {
    if (idx >= count && count > 0) setIdx(0);
  }, [idx, count]);

  const current = count > 0 ? rates[idx % count] : null;

  return (
    <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 shadow-2xl flex flex-col overflow-hidden">
      {/* Decorative silhouettes */}
      <svg
        className="absolute -right-10 -bottom-10 w-2/3 h-2/3 text-white/5 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="140" cy="140" r="110" />
        <circle cx="140" cy="140" r="70" className="text-white/5" />
        <circle cx="140" cy="140" r="35" className="text-white/5" />
      </svg>
      <PiggyBank
        className="absolute -left-4 -top-4 text-white/5 pointer-events-none"
        style={{ width: 'clamp(4rem, 14vmin, 10rem)', height: 'clamp(4rem, 14vmin, 10rem)' }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-black/25 backdrop-blur-sm text-white shrink-0 border-b border-white/10">
        <PiggyBank style={{ width: 'clamp(1rem, 2.4vmin, 2rem)', height: 'clamp(1rem, 2.4vmin, 2rem)' }} />
        <h3
          className="font-bold uppercase tracking-wide drop-shadow"
          style={{ fontSize: 'clamp(0.875rem, 2.2vmin, 1.75rem)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.08em' }}
        >
          Suku Bunga Produk
        </h3>
        {count > 1 && (
          <div className="ml-auto flex gap-1.5">
            {rates.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${i === idx ? 'bg-white scale-110' : 'bg-white/40'}`}
                style={{ width: 'clamp(0.35rem, 0.8vmin, 0.6rem)', height: 'clamp(0.35rem, 0.8vmin, 0.6rem)' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hero content */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-3 sm:p-5">
        {!current ? (
          <div className="text-white/70" style={{ fontSize: 'clamp(0.85rem, 1.8vmin, 1.25rem)' }}>
            Belum ada data produk
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative w-full h-full flex flex-col items-center justify-center text-center text-white gap-2"
            >
              <div
                className="font-semibold uppercase tracking-[0.15em] text-white/80 leading-tight px-2"
                style={{
                  fontSize: 'clamp(1rem, 3.2vmin, 2.6rem)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {current.name}
              </div>
              <div
                className="font-black text-white leading-none drop-shadow-2xl tabular-nums"
                style={{
                  fontSize: 'clamp(2.5rem, 11vmin, 8rem)',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '-0.03em',
                }}
              >
                {current.rate}
              </div>
              {current.note && current.note !== '-' && (
                <div
                  className="font-medium text-white/75 italic"
                  style={{ fontSize: 'clamp(0.85rem, 2vmin, 1.5rem)' }}
                >
                  {current.note}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

const QueueDisplay = () => {
  const [searchParams] = useSearchParams();
  const isKioskMode = searchParams.get('kiosk') === 'true';
  
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [tvConfig, setTVConfig] = useState<TVDisplayConfig | null>(null);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flashCS, setFlashCS] = useState(false);
  const [flashTeller, setFlashTeller] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [kioskReady, setKioskReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Ensure announcements never overlap/cancel each other (speechSynthesis.cancel is used internally).
  const announceChainRef = useRef<Promise<void>>(Promise.resolve());
  const pendingAnnouncementRef = useRef<null | { queueNumber: string; destination: string; config: VoiceConfig }>(null);
  
  const lastCalledRef = useRef<{ type: string | null; number: number | null; at: string | null }>({
    type: null,
    number: null,
    at: null,
  });
  const voiceConfigRef = useRef<VoiceConfig | null>(null);
  const soundEnabledRef = useRef<boolean>(true);
  const audioUnlockedRef = useRef<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kioskAttemptRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    audioUnlockedRef.current = audioUnlocked;
  }, [audioUnlocked]);

  // Request Wake Lock to prevent screen sleep
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        console.log('Wake Lock activated - screen will stay on');
        
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
          console.log('Wake Lock released');
        });
      } catch (err) {
        console.log('Wake Lock request failed:', err);
      }
    }
  }, []);

  // Re-request wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock(); // Request on mount

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [requestWakeLock]);

  // Kiosk Mode: Auto-fullscreen for desktop/TV without user interaction
  useEffect(() => {
    if (!isKioskMode) return;
    
    const attemptKioskFullscreen = async () => {
      kioskAttemptRef.current++;
      console.log(`[Kiosk] Attempting fullscreen (attempt ${kioskAttemptRef.current})`);
      
      if (document.fullscreenElement) {
        setIsFullscreen(true);
        setKioskReady(true);
        console.log('[Kiosk] Already in fullscreen');
        return;
      }
      
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setKioskReady(true);
        console.log('[Kiosk] Fullscreen activated successfully');
        toast.success('Mode Kiosk aktif - Fullscreen', { duration: 2000 });
      } catch (err) {
        console.log('[Kiosk] Direct fullscreen failed:', err);
        // For browsers that need user gesture, show a prompt
        if (kioskAttemptRef.current < 3) {
          setTimeout(attemptKioskFullscreen, 1000);
        } else {
          setKioskReady(true); // Give up, continue anyway
          toast.info('Klik layar untuk aktivasi fullscreen', { duration: 5000 });
        }
      }
    };
    
    // Try immediately, then retry a few times
    // Small delay to ensure DOM is ready
    const timer = setTimeout(attemptKioskFullscreen, 500);
    
    return () => clearTimeout(timer);
  }, [isKioskMode]);

  // CRITICAL: Unlock audio on first user interaction (especially for kiosk mode)
  // Browsers block audio until user gesture - this is essential for kiosk displays
  const unlockAudio = useCallback(async () => {
    if (audioUnlocked) return;
    
    console.log('[Display] Attempting to unlock audio...');
    
    try {
      // Prime the announcement audio engine (the same AudioContext used by playDingSound/announceQueueWithConfig)
      await primeAnnouncementAudio();

      // Also keep a local AudioContext as a generic unlock fallback (some WebViews behave better this way)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log('[Display] AudioContext resumed successfully');
      }
      const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);

      // Unlock Web Speech API in the same gesture
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.cancel();
      }

      setAudioUnlocked(true);
      console.log('[Display] Audio unlocked successfully!');
      toast.success('Audio aktif', { duration: 2000 });
    } catch (error) {
      console.error('[Display] Failed to unlock audio:', error);
    }
  }, [audioUnlocked]);

  const enqueueAnnouncement = useCallback((queueNumber: string, destination: string, config: VoiceConfig) => {
    announceChainRef.current = announceChainRef.current
      .then(() => announceQueueWithConfig(queueNumber, destination, config))
      .catch((err) => {
        console.error('[Display] Announcement chain error:', err);
      });
  }, []);

  // If a call happened while kiosk audio was locked, play it immediately after unlock.
  useEffect(() => {
    if (!audioUnlocked) return;
    const pending = pendingAnnouncementRef.current;
    if (!pending) return;

    pendingAnnouncementRef.current = null;
    console.log('[Display] Flushing pending announcement after audio unlock:', pending);
    enqueueAnnouncement(pending.queueNumber, pending.destination, pending.config);
  }, [audioUnlocked, enqueueAnnouncement]);

  // Auto-fullscreen and audio unlock on first user interaction
  useEffect(() => {
    const handleFirstInteraction = async () => {
      console.log('[Display] First interaction detected');
      
      // Unlock audio first
      await unlockAudio();
      
      // Then try fullscreen
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
          if (isKioskMode) setKioskReady(true);
        }).catch((err) => {
          console.log('Auto-fullscreen failed:', err);
        });
      }
      
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    // Also listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isKioskMode, unlockAudio]);

  // Network status monitoring and auto-reconnect
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi tersambung kembali', { duration: 3000 });
      // Refresh data on reconnect
      fetchQueueState().then((state) => {
        if (state) setQueueState(state);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Koneksi terputus, mencoba menyambung ulang...', { duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-refresh every 30 seconds as backup sync
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (navigator.onLine) {
        fetchQueueState().then((state) => {
          if (state) setQueueState(state);
        });
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Load TV config from Supabase and subscribe to changes
  useEffect(() => {
    fetchTVDisplayConfig().then((config) => {
      console.log('[Display] TV config loaded:', config);
      setTVConfig(config);
    });

    const unsubscribeTVConfig = subscribeToTVDisplayConfig((config) => {
      console.log('[Display] TV config updated via realtime:', config);
      setTVConfig(config);
      toast.success('Pengaturan display diperbarui', { duration: 2000 });
    });

    return () => {
      unsubscribeTVConfig();
    };
  }, []);

  // Load Voice config from Supabase and subscribe to changes
  // Also pre-load TTS voices for faster announcements
  useEffect(() => {
    // Pre-load voices on mount
    reloadVoices();
    console.log('[Display] Voice pre-loading initiated');
    
    fetchVoiceConfig().then((config) => {
      console.log('[Display] Voice config loaded:', config);
      setVoiceConfig(config);
      voiceConfigRef.current = config;
    });

    const unsubscribeVoiceConfig = subscribeToVoiceConfig((config) => {
      console.log('[Display] Voice config updated via realtime:', config);
      setVoiceConfig(config);
      voiceConfigRef.current = config;
      toast.success('Pengaturan suara diperbarui', { duration: 2000 });
    });

    return () => {
      unsubscribeVoiceConfig();
    };
  }, []);

  useEffect(() => {
    fetchQueueState().then((state) => {
      if (state) {
        setQueueState(state);
        lastCalledRef.current = {
          type: state.last_called_type,
          number: state.last_called_number,
          at: state.last_called_at,
        };
      }
      setIsLoading(false);
    });

    const unsubscribe = subscribeToQueueState((newState) => {
      console.log('[Display] Queue state updated:', newState);
      setQueueState(newState);
      
      if (
        newState.last_called_at && 
        newState.last_called_at !== lastCalledRef.current.at &&
        newState.last_called_type &&
        newState.last_called_number
      ) {
        console.log('[Display] New queue call detected:', {
          type: newState.last_called_type,
          number: newState.last_called_number,
          soundEnabled,
          hasVoiceConfig: !!voiceConfigRef.current
        });
        
        if (soundEnabledRef.current) {
          const queueNumber = formatQueueNumber(
            newState.last_called_type as 'CS' | 'TELLER',
            newState.last_called_number
          );
          const destination = newState.last_called_type === 'CS' ? 'Customer Service' : 'Teller';
          
          // Use voiceConfigRef if available, otherwise use current voiceConfig state or fetch fresh
          const configToUse = voiceConfigRef.current || voiceConfig;
          
           if (configToUse) {
             // In kiosk mode, if audio isn't unlocked yet, don't drop the call—queue it.
             if (isKioskMode && !audioUnlockedRef.current) {
               console.log('[Display] Kiosk audio locked; saving pending announcement');
               pendingAnnouncementRef.current = { queueNumber, destination, config: configToUse };
             } else {
               console.log('[Display] Announcing with config:', configToUse);
               enqueueAnnouncement(queueNumber, destination, configToUse);
             }
           } else {
            // Fallback: fetch voice config and announce
            console.log('[Display] No voice config, fetching...');
            fetchVoiceConfig().then((freshConfig) => {
              voiceConfigRef.current = freshConfig;
              console.log('[Display] Fetched config, announcing:', freshConfig);

               if (isKioskMode && !audioUnlockedRef.current) {
                 pendingAnnouncementRef.current = { queueNumber, destination, config: freshConfig };
               } else {
                 enqueueAnnouncement(queueNumber, destination, freshConfig);
               }
            });
          }
        }
        
        if (newState.last_called_type === 'CS') {
          setFlashCS(true);
          setTimeout(() => setFlashCS(false), 3000);
        } else if (newState.last_called_type === 'TELLER') {
          setFlashTeller(true);
          setTimeout(() => setFlashTeller(false), 3000);
        }
        
        lastCalledRef.current = {
          type: newState.last_called_type,
          number: newState.last_called_number,
          at: newState.last_called_at,
        };
      }
    });

    // Only poll print config locally (it's device-specific)
    const configInterval = setInterval(() => {
      setPrintConfig(getPrintConfig());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(configInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
   }, [isKioskMode, enqueueAnnouncement]);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  // Slideshow effect
  useEffect(() => {
    if (tvConfig?.mediaMode === 'slideshow' && tvConfig.slideshowImages && tvConfig.slideshowImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % tvConfig.slideshowImages.length);
      }, (tvConfig.slideshowInterval || 5) * 1000);
      return () => clearInterval(interval);
    }
  }, [tvConfig?.mediaMode, tvConfig?.slideshowImages, tvConfig?.slideshowInterval]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isLoading || !tvConfig) {
    return (
      <div className="h-[100dvh] w-screen bg-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Show audio unlock prompt for kiosk mode if audio not yet unlocked
  if (isKioskMode && !audioUnlocked) {
    return (
      <div 
        className="h-[100dvh] w-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center cursor-pointer"
        onClick={unlockAudio}
        onTouchStart={unlockAudio}
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center text-white"
        >
          <Volume2 className="h-24 w-24 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Aktifkan Audio</h1>
          <p className="text-xl opacity-80">Sentuh layar untuk mengaktifkan suara</p>
        </motion.div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const csNumber = queueState && queueState.cs_serving > 0 ? formatQueueNumber('CS', queueState.cs_serving) : '---';
  const tellerNumber = queueState && queueState.teller_serving > 0 ? formatQueueNumber('TELLER', queueState.teller_serving) : '---';

  const runningTextSpeed = {
    slow: '30s',
    medium: '20s',
    fast: '10s',
  };

  const getStatusBadge = (status: QueueStatus) => {
    switch (status) {
      case 'serving': 
        return { bg: 'bg-green-500', text: 'Sedang Dilayani' };
      case 'calling': 
        return { bg: 'bg-yellow-500', text: 'Memanggil' };
      case 'repeat': 
        return { bg: 'bg-orange-500', text: 'Panggilan Ulang' };
      case 'break': 
        return { bg: 'bg-red-500', text: 'Istirahat' };
      default: 
        return { bg: 'bg-gray-400', text: 'Menunggu' };
    }
  };

  // Queue Card Component with responsive sizing
  const QueueCard = ({ type, number, flash, waiting, total, status }: { 
    type: 'TELLER' | 'CS'; 
    number: string; 
    flash: boolean; 
    waiting: number; 
    total: number;
    status: QueueStatus;
  }) => {
    const isTeller = type === 'TELLER';
    const statusBadge = getStatusBadge(status);
    
    const bgClass = flash 
      ? (isTeller ? 'bg-gradient-to-br from-amber-400 to-amber-500' : 'bg-gradient-to-br from-blue-400 to-blue-500')
      : (isTeller ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-blue-500 to-blue-600');

    return (
      <motion.div
        className={`rounded-2xl p-4 sm:p-6 lg:p-8 ${bgClass} shadow-2xl h-full flex flex-col justify-center`}
        animate={flash ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5, repeat: flash ? Infinity : 0 }}
      >
        <div className="text-center">
          <h2 
            className="font-bold text-white drop-shadow-lg"
            style={{ fontSize: 'clamp(1.25rem, 4vw, 3rem)' }}
          >
            {isTeller ? 'TELLER' : 'CUSTOMER SERVICE'}
          </h2>
          
          {/* Status Badge */}
          <div className="flex justify-center my-3 sm:my-4">
            <span 
              className={`px-4 sm:px-8 py-2 sm:py-3 rounded-full text-white font-bold ${statusBadge.bg}`}
              style={{ fontSize: 'clamp(1rem, 3vw, 2.5rem)' }}
            >
              {statusBadge.text}
            </span>
          </div>

          <div 
            className="font-black text-white leading-none drop-shadow-xl"
            style={{ fontSize: 'clamp(4rem, 18vmin, 16rem)' }}
          >
            {number}
          </div>
          <div className="mt-4 sm:mt-6 flex justify-center gap-6 sm:gap-10">
            <div className="text-center">
              <p 
                className="text-white/80 font-medium"
                style={{ fontSize: 'clamp(0.75rem, 2vw, 1.5rem)' }}
              >
                Menunggu
              </p>
              <p 
                className="font-bold text-white"
                style={{ fontSize: 'clamp(1.5rem, 5vmin, 4rem)' }}
              >
                {waiting}
              </p>
            </div>
            <div className="text-center">
              <p 
                className="text-white/80 font-medium"
                style={{ fontSize: 'clamp(0.75rem, 2vw, 1.5rem)' }}
              >
                Total
              </p>
              <p 
                className="font-bold text-white"
                style={{ fontSize: 'clamp(1.5rem, 5vmin, 4rem)' }}
              >
                {total}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Decorative empty / fallback state with brand silhouette
  const MediaEmpty = ({ label = 'Tidak ada media' }: { label?: string }) => (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex items-center justify-center shadow-2xl">
      {/* Silhouette pattern */}
      <svg className="absolute inset-0 w-full h-full text-white/10" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#dots)" />
        {/* Building silhouette */}
        <g fill="currentColor" className="text-white/15">
          <rect x="60" y="160" width="280" height="120" />
          <polygon points="60,160 200,90 340,160" />
          <rect x="190" y="200" width="20" height="80" className="text-blue-900/30" fill="currentColor" />
          <rect x="100" y="190" width="30" height="30" />
          <rect x="150" y="190" width="30" height="30" />
          <rect x="220" y="190" width="30" height="30" />
          <rect x="270" y="190" width="30" height="30" />
        </g>
      </svg>
      <div className="relative text-center text-white/90 px-6">
        <div className="font-bold tracking-wide drop-shadow-lg" style={{ fontSize: 'clamp(1rem, 3vmin, 2.25rem)' }}>
          {printConfig.bankName?.split(' ').slice(0, 3).join(' ') || 'Selamat Datang'}
        </div>
        <div className="opacity-70 mt-2" style={{ fontSize: 'clamp(0.7rem, 1.6vmin, 1.1rem)' }}>{label}</div>
      </div>
    </div>
  );

  // Media Component
  const MediaContent = () => {
    if (!tvConfig.showMedia) {
      return <MediaEmpty label="Media dinonaktifkan" />;
    }

    // Video mode
    if (tvConfig.mediaMode === 'video' && tvConfig.mediaUrl) {
      return (
        <video
          src={tvConfig.mediaUrl}
          autoPlay
          loop
          muted
          className="w-full h-full object-cover rounded-xl"
        />
      );
    }

    // Slideshow mode
    if (tvConfig.mediaMode === 'slideshow' && tvConfig.slideshowImages.length > 0) {
      const animationType = tvConfig.slideshowAnimation || 'fade';
      
      // Animation variants for different effects
      const getAnimationVariants = () => {
        switch (animationType) {
          case 'slide':
            return {
              initial: { x: '100%', opacity: 0 },
              animate: { x: 0, opacity: 1 },
              exit: { x: '-100%', opacity: 0 },
            };
          case 'slideUp':
            return {
              initial: { y: '100%', opacity: 0 },
              animate: { y: 0, opacity: 1 },
              exit: { y: '-100%', opacity: 0 },
            };
          case 'zoom':
            return {
              initial: { scale: 1.2, opacity: 0 },
              animate: { scale: 1, opacity: 1 },
              exit: { scale: 0.8, opacity: 0 },
            };
          case 'fade':
          default:
            return {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            };
        }
      };

      const variants = getAnimationVariants();

      return (
        <div className="w-full h-full relative rounded-xl overflow-hidden bg-white">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={tvConfig.slideshowImages[currentSlide]}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-contain absolute inset-0"
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ 
                duration: 0.8, 
                ease: [0.4, 0, 0.2, 1] // Smooth easing
              }}
            />
          </AnimatePresence>
          {/* Slide indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {tvConfig.slideshowImages.map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'bg-white scale-125' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      );
    }

    // Single image mode
    if (tvConfig.mediaMode === 'single' && tvConfig.mediaUrl) {
      return (
        <img
          src={tvConfig.mediaUrl}
          alt="Promo"
          className="w-full h-full object-cover rounded-xl"
        />
      );
    }

    // Fallback - no media configured
    return <MediaEmpty />;
  };

  // Wraps MediaContent + interest-rate / FX panels with optional rotation
  const InfoArea = () => (
    <DisplayInfoPanel config={tvConfig} renderMedia={() => <MediaContent />} />
  );

  // Layout Components with responsive gap
  const Layout1 = () => (
    <div className="flex gap-2 sm:gap-4 h-full">
      <div className="flex-1 flex flex-col gap-2 sm:gap-4">
        <QueueCard 
          type="TELLER" 
          number={tellerNumber} 
          flash={flashTeller}
          waiting={queueState ? Math.max(0, queueState.teller_queue - queueState.teller_serving) : 0}
          total={queueState?.teller_queue || 0}
          status={queueState?.teller_status || 'idle'}
        />
        <QueueCard 
          type="CS" 
          number={csNumber} 
          flash={flashCS}
          waiting={queueState ? Math.max(0, queueState.cs_queue - queueState.cs_serving) : 0}
          total={queueState?.cs_queue || 0}
          status={queueState?.cs_status || 'idle'}
        />
      </div>
      <div className="w-1/2">
        <InfoArea />
      </div>
    </div>
  );

  const Layout2 = () => (
    <div className="flex flex-col gap-2 sm:gap-4 h-full">
      <div className="flex-1 flex gap-2 sm:gap-4">
        <QueueCard 
          type="TELLER" 
          number={tellerNumber} 
          flash={flashTeller}
          waiting={queueState ? Math.max(0, queueState.teller_queue - queueState.teller_serving) : 0}
          total={queueState?.teller_queue || 0}
          status={queueState?.teller_status || 'idle'}
        />
        <QueueCard 
          type="CS" 
          number={csNumber} 
          flash={flashCS}
          waiting={queueState ? Math.max(0, queueState.cs_queue - queueState.cs_serving) : 0}
          total={queueState?.cs_queue || 0}
          status={queueState?.cs_status || 'idle'}
        />
      </div>
      <div className="h-1/3">
        <InfoArea />
      </div>
    </div>
  );

  const Layout3 = () => (
    <div className="flex gap-2 sm:gap-4 h-full">
      <div className="w-1/2">
        <InfoArea />
      </div>
      <div className="flex-1 flex flex-col gap-2 sm:gap-4">
        <QueueCard 
          type="TELLER" 
          number={tellerNumber} 
          flash={flashTeller}
          waiting={queueState ? Math.max(0, queueState.teller_queue - queueState.teller_serving) : 0}
          total={queueState?.teller_queue || 0}
          status={queueState?.teller_status || 'idle'}
        />
        <QueueCard 
          type="CS" 
          number={csNumber} 
          flash={flashCS}
          waiting={queueState ? Math.max(0, queueState.cs_queue - queueState.cs_serving) : 0}
          total={queueState?.cs_queue || 0}
          status={queueState?.cs_status || 'idle'}
        />
      </div>
    </div>
  );

  const Layout4 = () => (
    <div className="flex gap-2 sm:gap-4 h-full">
      <div className="flex-1">
        <QueueCard 
          type="TELLER" 
          number={tellerNumber} 
          flash={flashTeller}
          waiting={queueState ? Math.max(0, queueState.teller_queue - queueState.teller_serving) : 0}
          total={queueState?.teller_queue || 0}
          status={queueState?.teller_status || 'idle'}
        />
      </div>
      <div className="flex-1">
        <QueueCard 
          type="CS" 
          number={csNumber} 
          flash={flashCS}
          waiting={queueState ? Math.max(0, queueState.cs_queue - queueState.cs_serving) : 0}
          total={queueState?.cs_queue || 0}
          status={queueState?.cs_status || 'idle'}
        />
      </div>
    </div>
  );

  // Compact hero queue card for dashboard layout
  const CompactQueueCard = ({ type, number, flash, status }: {
    type: 'TELLER' | 'CS';
    number: string;
    flash: boolean;
    status: QueueStatus;
  }) => {
    const isTeller = type === 'TELLER';
    const statusBadge = getStatusBadge(status);
    const bgClass = flash
      ? (isTeller ? 'bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-300 via-blue-500 to-indigo-700')
      : (isTeller ? 'bg-gradient-to-br from-amber-400 via-amber-600 to-orange-700' : 'bg-gradient-to-br from-blue-500 via-blue-700 to-indigo-800');
    return (
      <motion.div
        className={`relative rounded-2xl ${bgClass} shadow-2xl h-full w-full flex flex-col justify-between items-center px-2 py-3 sm:py-4 overflow-hidden ring-1 ring-white/20`}
        animate={flash ? { scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 0.5, repeat: flash ? Infinity : 0 }}
      >
        {/* Decorative silhouette: big letter in bottom-right, clipped */}
        <div
          className="absolute right-[-1rem] bottom-[-2rem] font-black text-white/10 leading-none select-none pointer-events-none"
          style={{ fontSize: 'clamp(4rem, 16vmin, 12rem)' }}
          aria-hidden
        >
          {isTeller ? 'A' : 'B'}
        </div>
        <svg className="absolute -left-8 -bottom-8 w-1/2 h-1/2 text-white/10 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="20" cy="80" r="50" />
          <circle cx="20" cy="80" r="32" />
        </svg>

        {/* Header: label + status */}
        <div className="relative flex flex-col items-center w-full gap-1 shrink-0">
          <h2
            className="font-bold text-white drop-shadow text-center leading-none tracking-wide whitespace-nowrap"
            style={{ fontSize: 'clamp(0.65rem, 1.6vmin, 1.35rem)' }}
          >
            {isTeller ? 'TELLER' : 'CUSTOMER SERVICE'}
          </h2>
          <span
            className={`px-3 py-0.5 rounded-full text-white font-semibold shadow ${statusBadge.bg} leading-none whitespace-nowrap`}
            style={{ fontSize: 'clamp(0.55rem, 1.1vmin, 0.9rem)' }}
          >
            {statusBadge.text}
          </span>
        </div>

        {/* Number — centered, fills remaining space */}
        <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
          <div
            className="font-black text-white leading-none drop-shadow-xl tabular-nums"
            style={{ fontSize: 'clamp(2.2rem, 9.5vmin, 7rem)' }}
          >
            {number}
          </div>
        </div>
      </motion.div>
    );
  };

  const DepositHeroStrip = ({ rates }: { rates: { tenor: string; rate: string }[] }) => {
    const count = Math.max(rates.length, 1);
    const tenorSize = count <= 4
      ? 'clamp(0.85rem, 2.2vmin, 1.5rem)'
      : count <= 6
      ? 'clamp(0.75rem, 1.9vmin, 1.25rem)'
      : 'clamp(0.65rem, 1.6vmin, 1.05rem)';
    const rateSize = count <= 4
      ? 'clamp(2rem, 7vmin, 5.5rem)'
      : count <= 6
      ? 'clamp(1.6rem, 5.5vmin, 4.5rem)'
      : 'clamp(1.3rem, 4.5vmin, 3.5rem)';

    return (
      <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 shadow-2xl flex flex-col overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3">
        {/* Decorative silhouette */}
        <svg className="absolute -right-8 -top-8 w-1/3 h-1/3 text-white/5 pointer-events-none" viewBox="0 0 100 100" fill="currentColor" aria-hidden>
          <circle cx="70" cy="30" r="40" />
          <circle cx="70" cy="30" r="25" className="text-white/5" />
        </svg>
        {/* Header */}
        <div className="relative flex items-center gap-2 sm:gap-3 px-2 shrink-0 text-white">
          <TrendingUp style={{ width: 'clamp(1rem, 2.4vmin, 2rem)', height: 'clamp(1rem, 2.4vmin, 2rem)' }} />
          <h3 className="font-bold uppercase tracking-wide drop-shadow" style={{ fontSize: 'clamp(0.9rem, 2.2vmin, 1.75rem)' }}>
            Suku Bunga Deposito
          </h3>
          <span className="ml-auto text-white/70" style={{ fontSize: 'clamp(0.6rem, 1.3vmin, 0.95rem)' }}>
            % per tahun
          </span>
        </div>
        {/* Hero cards strip */}
        <div className="relative flex-1 min-h-0 flex gap-2 sm:gap-3">
          {rates.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/70" style={{ fontSize: 'clamp(0.75rem, 1.5vmin, 1rem)' }}>
              Belum ada data deposito
            </div>
          ) : (
            rates.map((r, i) => (
              <div
                key={i}
                className="relative flex-1 min-w-0 rounded-xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm ring-1 ring-white/20 shadow-lg flex flex-col items-center justify-center p-1 sm:p-2 overflow-hidden"
              >
                {/* Decorative big silhouette per card */}
                <Clock
                  className="absolute -right-3 -bottom-3 text-white/10 pointer-events-none"
                  style={{ width: 'clamp(3rem, 10vmin, 7rem)', height: 'clamp(3rem, 10vmin, 7rem)' }}
                  aria-hidden
                />
                <div
                  className="relative font-semibold uppercase tracking-wide text-white/80 text-center leading-tight"
                  style={{ fontSize: tenorSize }}
                >
                  {r.tenor}
                </div>
                <div
                  className="relative font-black text-white leading-none drop-shadow-xl tabular-nums mt-1"
                  style={{ fontSize: rateSize }}
                >
                  {r.rate}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const Layout5 = () => (
    <div className="flex flex-col gap-2 sm:gap-3 h-full min-h-0">
      {/* Top: Media + (Queues over Product Rates) */}
      <div className="flex-[5] min-h-0 flex gap-2 sm:gap-3">
        {/* Media (hero) */}
        <div className="flex-[5] min-w-0">
          <MediaContent />
        </div>
        {/* Right column: queues + product rates */}
        <div className="flex-[4] min-w-0 flex flex-col gap-2 sm:gap-3">
          {/* Queue numbers */}
          <div className="flex gap-2 sm:gap-3 flex-[3] min-h-0">
            <div className="flex-1 min-w-0">
              <CompactQueueCard
                type="TELLER"
                number={tellerNumber}
                flash={flashTeller}
                status={queueState?.teller_status || 'idle'}
              />
            </div>
            <div className="flex-1 min-w-0">
              <CompactQueueCard
                type="CS"
                number={csNumber}
                flash={flashCS}
                status={queueState?.cs_status || 'idle'}
              />
            </div>
          </div>
          {/* Product rates — more breathing room */}
          <div className="flex-[5] min-h-0">
            <RatesTable
              title="Suku Bunga Produk"
              icon={<PiggyBank />}
              gradient="from-blue-600 via-blue-700 to-indigo-800"
              headers={['Produk', 'Bunga', 'Ket.']}
              rows={(tvConfig.productRates || []).map((r) => [r.name, r.rate, r.note || '-'])}
            />
          </div>
        </div>
      </div>
      {/* Bottom: Deposit rates as hero cards — one per tenor */}
      <div className="flex-[3] min-h-0">
        <DepositHeroStrip rates={tvConfig.depositRates || []} />
      </div>
    </div>
  );

  const renderLayout = () => {
    switch (tvConfig.layout) {
      case 'layout1': return <Layout1 />;
      case 'layout2': return <Layout2 />;
      case 'layout3': return <Layout3 />;
      case 'layout4': return <Layout4 />;
      case 'layout5': return <Layout5 />;
      default: return <Layout1 />;
    }
  };

  return (
    <div className="h-[100dvh] w-screen bg-white p-2 sm:p-4 flex flex-col overflow-hidden box-border">
      {/* Header */}
      <div 
        className="flex items-center justify-between bg-white rounded-xl p-2 sm:p-3 shadow-lg shrink-0 border border-gray-200"
        style={{ marginBottom: 'clamp(0.5rem, 1.5vmin, 1rem)' }}
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <img 
            src={logoBank} 
            alt="Logo" 
            className="object-contain"
            style={{ height: 'clamp(2rem, 6vmin, 4rem)' }}
          />
          <div>
            <h1 
              className="font-bold text-blue-700"
              style={{ fontSize: 'clamp(0.75rem, 2vmin, 1.5rem)' }}
            >
              {printConfig.bankName}
            </h1>
            <p 
              className="text-blue-500"
              style={{ fontSize: 'clamp(0.5rem, 1.5vmin, 1rem)' }}
            >
              {printConfig.branchName}
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2 sm:gap-4">
          <div>
            <p 
              className="font-bold text-blue-600"
              style={{ fontSize: 'clamp(1.25rem, 5vmin, 3rem)' }}
            >
              {time}
            </p>
            <p 
              className="text-blue-400"
              style={{ fontSize: 'clamp(0.5rem, 1.2vmin, 0.875rem)' }}
            >
              {currentDate}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {/* Kiosk mode indicator */}
            {isKioskMode && (
              <div 
                className={`h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center rounded-full ${kioskReady ? 'text-purple-500' : 'text-purple-300'}`}
                title={kioskReady ? 'Mode Kiosk Aktif' : 'Mode Kiosk Menunggu'}
              >
                <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
            )}
            {/* Connection status indicator */}
            <div 
              className={`h-6 w-6 sm:h-8 sm:w-8 flex items-center justify-center rounded-full ${isOnline ? 'text-green-500' : 'text-red-500'}`}
              title={isOnline ? 'Terhubung' : 'Tidak terhubung'}
            >
              {isOnline ? <Wifi className="h-3 w-3 sm:h-4 sm:w-4" /> : <WifiOff className="h-3 w-3 sm:h-4 sm:w-4" />}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-6 w-6 sm:h-8 sm:w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-6 w-6 sm:h-8 sm:w-8"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderLayout()}
      </div>

      {/* Running Text */}
      {tvConfig.showRunningText && tvConfig.runningText && (
        <div 
          className="rounded-lg overflow-hidden shadow-lg shrink-0"
          style={{ 
            marginTop: 'clamp(0.5rem, 1.5vmin, 1rem)',
            backgroundColor: tvConfig.runningTextBgColor || '#f59e0b',
          }}
        >
          <div className="py-1.5 sm:py-2 px-3">
            <motion.div
              className="whitespace-nowrap font-bold"
              style={{ 
                fontSize: 'clamp(0.75rem, 1.5vmin, 1.125rem)',
                color: tvConfig.runningTextColor || '#ffffff',
              }}
              animate={{ x: ['100%', '-100%'] }}
              transition={{
                duration: parseInt(runningTextSpeed[tvConfig.runningTextSpeed]),
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              📢 {tvConfig.runningText} 📢
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueDisplay;
