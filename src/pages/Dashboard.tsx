import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QueueButton from '@/components/QueueButton';
import PrintTicket from '@/components/PrintTicket';
import Navigation from '@/components/Navigation';
import {
  getQueueState,
  getPrintConfig,
  getDisplayConfig,
  takeCSQueue,
  takeTellerQueue,
  QueueState,
  PrintConfig,
  DisplayConfig,
} from '@/lib/queueStore';
import { toast } from 'sonner';

interface PrintData {
  type: 'CS' | 'TELLER';
  number: number;
  remaining: number;
}

const Dashboard = () => {
  const [queueState, setQueueState] = useState<QueueState>(getQueueState());
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(getDisplayConfig());
  const [printData, setPrintData] = useState<PrintData | null>(null);

  // Refresh state on focus (for multi-tab sync)
  useEffect(() => {
    const handleFocus = () => {
      setQueueState(getQueueState());
      setPrintConfig(getPrintConfig());
      setDisplayConfig(getDisplayConfig());
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Check for daily reset every minute
    const interval = setInterval(() => {
      setQueueState(getQueueState());
    }, 60000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleTakeCS = useCallback(() => {
    const result = takeCSQueue();
    setQueueState(getQueueState());
    setPrintData({
      type: 'CS',
      number: result.number,
      remaining: result.remaining,
    });
    toast.success(`Nomor antrian CS: A${String(result.number).padStart(3, '0')}`);
  }, []);

  const handleTakeTeller = useCallback(() => {
    const result = takeTellerQueue();
    setQueueState(getQueueState());
    setPrintData({
      type: 'TELLER',
      number: result.number,
      remaining: result.remaining,
    });
    toast.success(`Nomor antrian Teller: B${String(result.number).padStart(3, '0')}`);
  }, []);

  const handlePrinted = useCallback(() => {
    setPrintData(null);
  }, []);

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div className="no-print relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-24 pt-8">
          {/* Header */}
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-gradient-primary mb-2 text-4xl font-extrabold tracking-tight md:text-5xl">
              Bankaltimtara
            </h1>
            <p className="text-lg font-medium text-muted-foreground">
              KCP Kelas 2 Telihan
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              {currentDate}
            </p>
          </motion.div>

          {/* Queue Buttons */}
          <div className="flex flex-col gap-8 md:flex-row md:gap-12">
            <QueueButton
              type="CS"
              currentQueue={queueState.csQueue}
              displayConfig={displayConfig}
              onClick={handleTakeCS}
            />
            <QueueButton
              type="TELLER"
              currentQueue={queueState.tellerQueue}
              displayConfig={displayConfig}
              onClick={handleTakeTeller}
            />
          </div>

          {/* Instructions */}
          <motion.p
            className="mt-12 text-center text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Silakan tekan tombol untuk mengambil nomor antrian
          </motion.p>
        </div>

        <Navigation />
      </div>

      {/* Print ticket (hidden, only shown when printing) */}
      <AnimatePresence>
        {printData && (
          <PrintTicket
            type={printData.type}
            number={printData.number}
            remaining={printData.remaining}
            config={printConfig}
            onPrinted={handlePrinted}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
