import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getQueueState, formatQueueNumber, getPrintConfig, getTVDisplayConfig, QueueState, PrintConfig, TVDisplayConfig } from '@/lib/queueStore';
import { announceQueue } from '@/lib/audioUtils';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QueueDisplay = () => {
  const [queueState, setQueueState] = useState<QueueState>(getQueueState());
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [tvConfig, setTVConfig] = useState<TVDisplayConfig>(getTVDisplayConfig());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastCSServing, setLastCSServing] = useState(queueState.csServing);
  const [lastTellerServing, setLastTellerServing] = useState(queueState.tellerServing);
  const [flashCS, setFlashCS] = useState(false);
  const [flashTeller, setFlashTeller] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const interval = setInterval(() => {
      const newState = getQueueState();
      setQueueState(newState);
      setPrintConfig(getPrintConfig());
      setTVConfig(getTVDisplayConfig());
      
      if (newState.csServing > lastCSServing && soundEnabled) {
        const queueNumber = formatQueueNumber('CS', newState.csServing);
        announceQueue(queueNumber, 'Customer Service');
        setFlashCS(true);
        setTimeout(() => setFlashCS(false), 3000);
      }
      
      if (newState.tellerServing > lastTellerServing && soundEnabled) {
        const queueNumber = formatQueueNumber('TELLER', newState.tellerServing);
        announceQueue(queueNumber, 'Teller');
        setFlashTeller(true);
        setTimeout(() => setFlashTeller(false), 3000);
      }
      
      setLastCSServing(newState.csServing);
      setLastTellerServing(newState.tellerServing);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastCSServing, lastTellerServing, soundEnabled]);

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

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const csNumber = queueState.csServing > 0 ? formatQueueNumber('CS', queueState.csServing) : '---';
  const tellerNumber = queueState.tellerServing > 0 ? formatQueueNumber('TELLER', queueState.tellerServing) : '---';

  const runningTextSpeed = {
    slow: '30s',
    medium: '20s',
    fast: '10s',
  };

  // Queue Card Component
  const QueueCard = ({ type, number, flash, waiting, total }: { 
    type: 'TELLER' | 'CS'; 
    number: string; 
    flash: boolean; 
    waiting: number; 
    total: number;
  }) => {
    const isTeller = type === 'TELLER';
    const bgClass = flash 
      ? (isTeller ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-blue-500 to-blue-600')
      : (isTeller ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' : 'bg-gradient-to-br from-blue-600 to-blue-700');
    const textClass = isTeller ? 'text-emerald-100' : 'text-blue-100';
    const subTextClass = isTeller ? 'text-emerald-200' : 'text-blue-200';

    return (
      <motion.div
        className={`rounded-3xl p-6 md:p-8 ${bgClass} shadow-2xl h-full flex flex-col justify-center`}
        animate={flash ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.5, repeat: flash ? Infinity : 0 }}
      >
        <div className="text-center">
          <h2 className={`text-2xl md:text-3xl font-bold ${textClass} mb-2`}>
            {isTeller ? 'TELLER' : 'CUSTOMER SERVICE'}
          </h2>
          <p className={`text-lg ${subTextClass} mb-4`}>Sedang Dilayani</p>
          <div className="text-[4rem] sm:text-[5rem] md:text-[6rem] lg:text-[8rem] xl:text-[10rem] font-black text-white leading-none">
            {number}
          </div>
          <div className="mt-4 flex justify-center gap-6">
            <div className="text-center">
              <p className={`text-sm ${subTextClass}`}>Menunggu</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{waiting}</p>
            </div>
            <div className="text-center">
              <p className={`text-sm ${subTextClass}`}>Total</p>
              <p className="text-2xl md:text-3xl font-bold text-white">{total}</p>
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
        <div className="w-full h-full bg-slate-800 rounded-2xl flex items-center justify-center">
          <p className="text-slate-500 text-lg">Tidak ada media</p>
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
          className="w-full h-full object-cover rounded-2xl"
        />
      );
    }

    return (
      <img
        src={tvConfig.mediaUrl}
        alt="Promo"
        className="w-full h-full object-cover rounded-2xl"
      />
    );
  };

  // Layout Components
  const Layout1 = () => (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col gap-6">
        <QueueCard 
          type="TELLER" 
          number={tellerNumber} 
          flash={flashTeller}
          waiting={Math.max(0, queueState.tellerQueue - queueState.tellerServing)}
          total={queueState.tellerQueue}
        />
        <QueueCard 
          type="CS" 
          number={csNumber} 
          flash={flashCS}
          waiting={Math.max(0, queueState.csQueue - queueState.csServing)}
          total={queueState.csQueue}
        />
      </div>
      <div className="w-1/2">
        <MediaContent />
      </div>
    </div>
  );

  const Layout2 = () => (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex-1 flex gap-6">
        <QueueCard 
          type="TELLER" 
          number={tellerNumber} 
          flash={flashTeller}
          waiting={Math.max(0, queueState.tellerQueue - queueState.tellerServing)}
          total={queueState.tellerQueue}
        />
        <QueueCard 
          type="CS" 
          number={csNumber} 
          flash={flashCS}
          waiting={Math.max(0, queueState.csQueue - queueState.csServing)}
          total={queueState.csQueue}
        />
      </div>
      <div className="h-1/3">
        <MediaContent />
      </div>
    </div>
  );

  const Layout3 = () => (
    <div className="flex gap-6 h-full">
      <div className="w-1/2">
        <MediaContent />
      </div>
      <div className="flex-1 flex flex-col gap-6">
        <QueueCard 
          type="TELLER" 
          number={tellerNumber} 
          flash={flashTeller}
          waiting={Math.max(0, queueState.tellerQueue - queueState.tellerServing)}
          total={queueState.tellerQueue}
        />
        <QueueCard 
          type="CS" 
          number={csNumber} 
          flash={flashCS}
          waiting={Math.max(0, queueState.csQueue - queueState.csServing)}
          total={queueState.csQueue}
        />
      </div>
    </div>
  );

  const Layout4 = () => (
    <div className="flex gap-6 h-full">
      <QueueCard 
        type="TELLER" 
        number={tellerNumber} 
        flash={flashTeller}
        waiting={Math.max(0, queueState.tellerQueue - queueState.tellerServing)}
        total={queueState.tellerQueue}
      />
      <QueueCard 
        type="CS" 
        number={csNumber} 
        flash={flashCS}
        waiting={Math.max(0, queueState.csQueue - queueState.csServing)}
        total={queueState.csQueue}
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
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <img src={logoBank} alt="Logo" className="h-12 md:h-16" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">{printConfig.bankName}</h1>
            <p className="text-sm md:text-base text-slate-300">{printConfig.branchName}</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            <p className="text-3xl md:text-5xl font-bold text-white">{time}</p>
            <p className="text-sm text-slate-300">{currentDate}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:text-white"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:text-white"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - responsive sizing */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderLayout()}
      </div>

      {/* Running Text */}
      {tvConfig.showRunningText && tvConfig.runningText && (
        <div className="mt-6 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl overflow-hidden">
          <div className="py-3 px-4">
            <motion.div
              className="whitespace-nowrap text-white text-lg font-medium"
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
