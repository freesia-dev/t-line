import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QueueButton from '@/components/QueueButton';
import PrintTicket from '@/components/PrintTicket';
import Navigation from '@/components/Navigation';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { fetchQueueState, takeCSQueue, takeTellerQueue, subscribeToQueueState, QueueState } from '@/lib/supabaseQueueStore';
import { getPrintConfig, getDisplayConfig, PrintConfig, DisplayConfig } from '@/lib/queueStore';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PrintData {
  type: 'CS' | 'TELLER';
  number: number;
  remaining: number;
}

const Dashboard = () => {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(getDisplayConfig());
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTakingQueue, setIsTakingQueue] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchQueueState().then((state) => {
      setQueueState(state);
      setIsLoading(false);
    });

    // Subscribe to real-time updates
    const unsubscribe = subscribeToQueueState((newState) => {
      setQueueState(newState);
    });

    // Refresh local configs on focus
    const handleFocus = () => {
      setPrintConfig(getPrintConfig());
      setDisplayConfig(getDisplayConfig());
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleTakeCS = useCallback(async () => {
    setIsTakingQueue(true);
    const result = await takeCSQueue();
    setIsTakingQueue(false);
    
    if (result) {
      setPrintData({
        type: 'CS',
        number: result.number,
        remaining: result.remaining,
      });
      toast.success(`Nomor antrian CS: B${String(result.number).padStart(3, '0')}`);
    } else {
      toast.error('Gagal mengambil nomor antrian');
    }
  }, []);

  const handleTakeTeller = useCallback(async () => {
    setIsTakingQueue(true);
    const result = await takeTellerQueue();
    setIsTakingQueue(false);
    
    if (result) {
      setPrintData({
        type: 'TELLER',
        number: result.number,
        remaining: result.remaining,
      });
      toast.success(`Nomor antrian Teller: A${String(result.number).padStart(3, '0')}`);
    } else {
      toast.error('Gagal mengambil nomor antrian');
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="no-print relative h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
        </div>

        <div className="relative flex h-full flex-col items-center justify-center px-4 pb-20 pt-4">
          {/* Header */}
          <motion.div
            className="mb-6 text-center flex-shrink-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src={logoBank} 
              alt="Logo Bankaltimtara" 
              className="mx-auto mb-2 h-14 w-auto sm:h-16 md:h-20"
            />
            <h1 className="text-gradient-primary mb-1 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
              Bankaltimtara
            </h1>
            <p className="text-sm font-medium text-muted-foreground sm:text-base md:text-lg">
              KCP Kelas 2 Telihan
            </p>
            <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
              {currentDate}
            </p>
          </motion.div>

          {/* Queue Buttons */}
          <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:gap-8 lg:gap-12 flex-shrink-0">
            <QueueButton
              type="CS"
              currentQueue={queueState?.cs_queue || 0}
              displayConfig={displayConfig}
              onClick={handleTakeCS}
              disabled={isTakingQueue}
            />
            <QueueButton
              type="TELLER"
              currentQueue={queueState?.teller_queue || 0}
              displayConfig={displayConfig}
              onClick={handleTakeTeller}
              disabled={isTakingQueue}
            />
          </div>

          {/* Instructions */}
          <motion.p
            className="mt-4 text-center text-xs text-muted-foreground sm:text-sm md:mt-6 flex-shrink-0"
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
          <motion.div key={`${printData.type}-${printData.number}`} initial={false}>
            <PrintTicket
              type={printData.type}
              number={printData.number}
              remaining={printData.remaining}
              config={printConfig}
              onPrinted={handlePrinted}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
