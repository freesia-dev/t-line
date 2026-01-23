import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchQueueState, formatQueueNumber, subscribeToQueueState, QueueState, QueueStatus } from '@/lib/supabaseQueueStore';
import { getPrintConfig, PrintConfig, TVDisplayConfig } from '@/lib/queueStore';
import { fetchTVDisplayConfig, subscribeToTVDisplayConfig } from '@/lib/supabaseTVConfig';
import { announceQueue } from '@/lib/audioUtils';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { Volume2, VolumeX, Maximize, Minimize, Loader2, WifiOff, Wifi, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const QueueDisplay = () => {
  const [searchParams] = useSearchParams();
  const isKioskMode = searchParams.get('kiosk') === 'true';
  
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [tvConfig, setTVConfig] = useState<TVDisplayConfig | null>(null);
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
  
  const lastCalledRef = useRef<{ type: string | null; number: number | null; at: string | null }>({
    type: null,
    number: null,
    at: null,
  });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const kioskAttemptRef = useRef(0);

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

  // Auto-fullscreen on first user interaction (for non-kiosk mode or fallback)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
          if (isKioskMode) setKioskReady(true);
        }).catch((err) => {
          console.log('Auto-fullscreen failed:', err);
        });
      }
      // Remove listener after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    // Also listen for fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isKioskMode]);

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
      setQueueState(newState);
      
      if (
        newState.last_called_at && 
        newState.last_called_at !== lastCalledRef.current.at &&
        newState.last_called_type &&
        newState.last_called_number
      ) {
        if (soundEnabled) {
          const queueNumber = formatQueueNumber(
            newState.last_called_type as 'CS' | 'TELLER',
            newState.last_called_number
          );
          const destination = newState.last_called_type === 'CS' ? 'Customer Service' : 'Teller';
          announceQueue(queueNumber, destination);
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
  }, [soundEnabled]);

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

  // Media Component
  const MediaContent = () => {
    if (!tvConfig.showMedia) {
      return (
        <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
          <p className="text-gray-400" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>Tidak ada media</p>
        </div>
      );
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
    return (
      <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
        <p className="text-gray-400" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>Tidak ada media</p>
      </div>
    );
  };

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
        <MediaContent />
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
        <MediaContent />
      </div>
    </div>
  );

  const Layout3 = () => (
    <div className="flex gap-2 sm:gap-4 h-full">
      <div className="w-1/2">
        <MediaContent />
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

  const renderLayout = () => {
    switch (tvConfig.layout) {
      case 'layout1': return <Layout1 />;
      case 'layout2': return <Layout2 />;
      case 'layout3': return <Layout3 />;
      case 'layout4': return <Layout4 />;
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
