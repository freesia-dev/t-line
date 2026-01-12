import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getQueueState, saveQueueState, formatQueueNumber, QueueState } from '@/lib/queueStore';
import { toast } from '@/hooks/use-toast';
import { PhoneCall, Users, CheckCircle } from 'lucide-react';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { playDingSound, announceQueue } from '@/lib/audioUtils';

const CSCaller = () => {
  const [queueState, setQueueState] = useState<QueueState>(getQueueState());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handleFocus = () => {
      setQueueState(getQueueState());
    };
    window.addEventListener('focus', handleFocus);
    
    const interval = setInterval(() => {
      setQueueState(getQueueState());
    }, 2000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  const handleCallNext = () => {
    const state = getQueueState();
    if (state.csServing >= state.csQueue) {
      toast({
        title: "Tidak ada antrian",
        description: "Semua antrian sudah dipanggil",
        variant: "destructive",
      });
      return;
    }

    state.csServing += 1;
    saveQueueState(state);
    setQueueState(state);
    setIsAnimating(true);

    const queueNumber = formatQueueNumber('CS', state.csServing);
    
    // Play sound and announce
    announceQueue(queueNumber, 'Customer Service');

    toast({
      title: "Memanggil Antrian",
      description: `Nomor ${queueNumber} silakan menuju Customer Service`,
    });

    setTimeout(() => setIsAnimating(false), 1000);
  };

  const waiting = Math.max(0, queueState.csQueue - queueState.csServing);
  const currentServing = queueState.csServing > 0 ? formatQueueNumber('CS', queueState.csServing) : '---';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <img 
            src={logoBank} 
            alt="Logo Bankaltimtara" 
            className="h-16 mx-auto"
          />
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Customer Service
          </h1>
          <p className="text-blue-200">Panel Pemanggil Antrian</p>
        </div>

        {/* Current Serving */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-blue-200 text-lg">Sedang Dilayani</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentServing}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className={`text-6xl md:text-8xl font-bold text-white ${isAnimating ? 'animate-pulse' : ''}`}
              >
                {currentServing}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-blue-200 text-sm">Menunggu</p>
              <p className="text-3xl font-bold text-white">{waiting}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-blue-200 text-sm">Total Antrian</p>
              <p className="text-3xl font-bold text-white">{queueState.csQueue}</p>
            </CardContent>
          </Card>
        </div>

        {/* Call Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleCallNext}
            disabled={waiting === 0}
            className="w-full h-20 text-xl font-bold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600"
          >
            <PhoneCall className="h-8 w-8 mr-3" />
            Panggil Berikutnya
          </Button>
        </motion.div>

        {waiting === 0 && (
          <p className="text-center text-blue-300 text-sm">
            Tidak ada antrian yang menunggu
          </p>
        )}
      </div>
    </div>
  );
};

export default CSCaller;
