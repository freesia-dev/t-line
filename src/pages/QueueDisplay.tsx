import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQueueState, formatQueueNumber, getPrintConfig, QueueState, PrintConfig } from '@/lib/queueStore';
import { playDingSound, announceQueue } from '@/lib/audioUtils';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QueueDisplay = () => {
  const [queueState, setQueueState] = useState<QueueState>(getQueueState());
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastCSServing, setLastCSServing] = useState(queueState.csServing);
  const [lastTellerServing, setLastTellerServing] = useState(queueState.tellerServing);
  const [flashCS, setFlashCS] = useState(false);
  const [flashTeller, setFlashTeller] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newState = getQueueState();
      setQueueState(newState);
      setPrintConfig(getPrintConfig());
      
      // Check if CS queue was called
      if (newState.csServing > lastCSServing && soundEnabled) {
        const queueNumber = formatQueueNumber('CS', newState.csServing);
        announceQueue(queueNumber, 'Customer Service');
        setFlashCS(true);
        setTimeout(() => setFlashCS(false), 3000);
      }
      
      // Check if Teller queue was called
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

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [time, setTime] = useState(currentTime);
  
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }));
    }, 1000);
    return () => clearInterval(timeInterval);
  }, []);

  const csNumber = queueState.csServing > 0 ? formatQueueNumber('CS', queueState.csServing) : '---';
  const tellerNumber = queueState.tellerServing > 0 ? formatQueueNumber('TELLER', queueState.tellerServing) : '---';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <img 
            src={logoBank} 
            alt="Logo Bankaltimtara" 
            className="h-16 md:h-20"
          />
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white">
              {printConfig.bankName}
            </h1>
            <p className="text-lg md:text-xl text-slate-300">
              {printConfig.branchName}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl md:text-6xl font-bold text-white">{time}</p>
          <p className="text-lg text-slate-300">{currentDate}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-slate-300 hover:text-white"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="h-6 w-6" />
            ) : (
              <VolumeX className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Queue Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Teller Queue */}
        <motion.div
          className={`rounded-3xl p-8 md:p-12 ${
            flashTeller 
              ? 'bg-gradient-to-br from-green-500 to-green-600' 
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700'
          } shadow-2xl`}
          animate={flashTeller ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: flashTeller ? Infinity : 0 }}
        >
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-emerald-100 mb-4">
              TELLER
            </h2>
            <p className="text-xl text-emerald-200 mb-6">Sedang Dilayani</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={tellerNumber}
                initial={{ scale: 0.5, opacity: 0, rotateX: -90 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotateX: 90 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="text-[8rem] md:text-[12rem] font-black text-white leading-none"
              >
                {tellerNumber}
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex justify-center gap-8">
              <div className="text-center">
                <p className="text-lg text-emerald-200">Menunggu</p>
                <p className="text-4xl font-bold text-white">
                  {Math.max(0, queueState.tellerQueue - queueState.tellerServing)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg text-emerald-200">Total</p>
                <p className="text-4xl font-bold text-white">{queueState.tellerQueue}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* CS Queue */}
        <motion.div
          className={`rounded-3xl p-8 md:p-12 ${
            flashCS 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
              : 'bg-gradient-to-br from-blue-600 to-blue-700'
          } shadow-2xl`}
          animate={flashCS ? { scale: [1, 1.02, 1] } : {}}
          transition={{ duration: 0.5, repeat: flashCS ? Infinity : 0 }}
        >
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-blue-100 mb-4">
              CUSTOMER SERVICE
            </h2>
            <p className="text-xl text-blue-200 mb-6">Sedang Dilayani</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={csNumber}
                initial={{ scale: 0.5, opacity: 0, rotateX: -90 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                exit={{ scale: 0.5, opacity: 0, rotateX: 90 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="text-[8rem] md:text-[12rem] font-black text-white leading-none"
              >
                {csNumber}
              </motion.div>
            </AnimatePresence>
            <div className="mt-6 flex justify-center gap-8">
              <div className="text-center">
                <p className="text-lg text-blue-200">Menunggu</p>
                <p className="text-4xl font-bold text-white">
                  {Math.max(0, queueState.csQueue - queueState.csServing)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg text-blue-200">Total</p>
                <p className="text-4xl font-bold text-white">{queueState.csQueue}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer Message */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-xl text-slate-400 italic">
          {printConfig.footerMessage}
        </p>
      </motion.div>
    </div>
  );
};

export default QueueDisplay;
