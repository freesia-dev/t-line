import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import QueueButton from '@/components/QueueButton';
import Navigation from '@/components/Navigation';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { fetchQueueState, takeCSQueue, takeTellerQueue, subscribeToQueueState, QueueState } from '@/lib/supabaseQueueStore';
import { getPrintConfig, getDisplayConfig, PrintConfig, DisplayConfig } from '@/lib/queueStore';
import { printTicketDirect, getPrinterConfig } from '@/lib/thermalPrinter';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(getDisplayConfig());
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
    
    if (result) {
      toast.success(`Nomor antrian CS: B${String(result.number).padStart(3, '0')}`);
      
      // Print langsung tanpa popup
      try {
        const printerConfig = getPrinterConfig();
        await printTicketDirect('CS', result.number, result.remaining, printConfig, printerConfig);
      } catch (error) {
        console.error('Print error:', error);
        toast.error('Gagal mencetak tiket');
      }
    } else {
      toast.error('Gagal mengambil nomor antrian');
    }
    setIsTakingQueue(false);
  }, [printConfig]);

  const handleTakeTeller = useCallback(async () => {
    setIsTakingQueue(true);
    const result = await takeTellerQueue();
    
    if (result) {
      toast.success(`Nomor antrian Teller: A${String(result.number).padStart(3, '0')}`);
      
      // Print langsung tanpa popup
      try {
        const printerConfig = getPrinterConfig();
        await printTicketDirect('TELLER', result.number, result.remaining, printConfig, printerConfig);
      } catch (error) {
        console.error('Print error:', error);
        toast.error('Gagal mencetak tiket');
      }
    } else {
      toast.error('Gagal mengambil nomor antrian');
    }
    setIsTakingQueue(false);
  }, [printConfig]);

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
            <img 
              src={logoBank} 
              alt="Logo Bankaltimtara" 
              className="mx-auto mb-4 h-20 w-auto"
            />
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
    </>
  );
};

export default Dashboard;
