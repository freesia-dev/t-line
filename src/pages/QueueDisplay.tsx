import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { fetchQueueState, formatQueueNumber, subscribeToQueueState, QueueState, QueueStatus } from '@/lib/supabaseQueueStore';
import { getPrintConfig, getTVDisplayConfig, PrintConfig, TVDisplayConfig } from '@/lib/queueStore';
import { announceQueue } from '@/lib/audioUtils';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QueueDisplay = () => {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [tvConfig, setTVConfig] = useState<TVDisplayConfig>(getTVDisplayConfig());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flashCS, setFlashCS] = useState(false);
  const [flashTeller, setFlashTeller] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  const [isLoading, setIsLoading] = useState(true);
  
  const lastCalledRef = useRef<{ type: string | null; number: number | null; at: string | null }>({
    type: null,
    number: null,
    at: null,
  });

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

    const configInterval = setInterval(() => {
      setPrintConfig(getPrintConfig());
      setTVConfig(getTVDisplayConfig());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(configInterval);
    };
  }, [soundEnabled]);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
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
        className={`rounded-2xl p-3 sm:p-4 lg:p-6 ${bgClass} shadow-2xl h-full flex flex-col justify-center`}
        animate={flash ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5, repeat: flash ? Infinity : 0 }}
      >
        <div className="text-center">
          <h2 
            className="font-bold text-white drop-shadow-lg"
            style={{ fontSize: 'clamp(0.875rem, 2vw, 1.5rem)' }}
          >
            {isTeller ? 'TELLER' : 'CUSTOMER SERVICE'}
          </h2>
          
          {/* Status Badge */}
          <div className="flex justify-center my-1 sm:my-2">
            <span 
              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-white font-semibold ${statusBadge.bg}`}
              style={{ fontSize: 'clamp(0.625rem, 1.2vw, 0.875rem)' }}
            >
              {statusBadge.text}
            </span>
          </div>

          <div 
            className="font-black text-white leading-none drop-shadow-xl"
            style={{ fontSize: 'clamp(2.5rem, 12vmin, 10rem)' }}
          >
            {number}
          </div>
          <div className="mt-2 sm:mt-3 flex justify-center gap-4 sm:gap-6">
            <div className="text-center">
              <p 
                className="text-white/80"
                style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}
              >
                Menunggu
              </p>
              <p 
                className="font-bold text-white"
                style={{ fontSize: 'clamp(1rem, 3vmin, 2rem)' }}
              >
                {waiting}
              </p>
            </div>
            <div className="text-center">
              <p 
                className="text-white/80"
                style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}
              >
                Total
              </p>
              <p 
                className="font-bold text-white"
                style={{ fontSize: 'clamp(1rem, 3vmin, 2rem)' }}
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
    if (!tvConfig.showMedia || !tvConfig.mediaUrl) {
      return (
        <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
          <p className="text-gray-400" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>Tidak ada media</p>
        </div>
      );
    }

    if (tvConfig.mediaType === 'video') {
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

    return (
      <img
        src={tvConfig.mediaUrl}
        alt="Promo"
        className="w-full h-full object-cover rounded-xl"
      />
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
        className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-2 sm:p-3 shadow-lg shrink-0"
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
              className="font-bold text-white"
              style={{ fontSize: 'clamp(0.75rem, 2vmin, 1.5rem)' }}
            >
              {printConfig.bankName}
            </h1>
            <p 
              className="text-blue-100"
              style={{ fontSize: 'clamp(0.5rem, 1.5vmin, 1rem)' }}
            >
              {printConfig.branchName}
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2 sm:gap-4">
          <div>
            <p 
              className="font-bold text-amber-300"
              style={{ fontSize: 'clamp(1.25rem, 5vmin, 3rem)' }}
            >
              {time}
            </p>
            <p 
              className="text-white/80"
              style={{ fontSize: 'clamp(0.5rem, 1.2vmin, 0.875rem)' }}
            >
              {currentDate}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-amber-300 hover:bg-white/10 h-6 w-6 sm:h-8 sm:w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-amber-300 hover:bg-white/10 h-6 w-6 sm:h-8 sm:w-8"
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
          className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 rounded-lg overflow-hidden shadow-lg shrink-0"
          style={{ marginTop: 'clamp(0.5rem, 1.5vmin, 1rem)' }}
        >
          <div className="py-1.5 sm:py-2 px-3">
            <motion.div
              className="whitespace-nowrap text-white font-bold"
              style={{ fontSize: 'clamp(0.75rem, 1.5vmin, 1.125rem)' }}
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
