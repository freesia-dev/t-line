import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchQueueState, callNextTeller, formatQueueNumber, subscribeToQueueState, QueueState } from '@/lib/supabaseQueueStore';
import { toast } from '@/hooks/use-toast';
import { PhoneCall, Users, CheckCircle, Loader2 } from 'lucide-react';
import logoBank from '@/assets/logo-bankaltimtara.png';

const TellerCaller = () => {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallLoading, setIsCallLoading] = useState(false);

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

    return () => unsubscribe();
  }, []);

  const handleCallNext = async () => {
    if (!queueState) return;
    
    setIsCallLoading(true);
    const result = await callNextTeller();
    setIsCallLoading(false);

    if (!result) {
      toast({
        title: "Tidak ada antrian",
        description: "Semua antrian sudah dipanggil",
        variant: "destructive",
      });
      return;
    }

    setIsAnimating(true);
    const queueNumber = formatQueueNumber('TELLER', result.number);

    // NO SOUND HERE - Sound only plays on /display
    toast({
      title: "Memanggil Antrian",
      description: `Nomor ${queueNumber} silakan menuju Teller`,
    });

    setTimeout(() => setIsAnimating(false), 1000);
  };

  if (isLoading || !queueState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </div>
    );
  }

  const waiting = Math.max(0, queueState.teller_queue - queueState.teller_serving);
  const currentServing = queueState.teller_serving > 0 ? formatQueueNumber('TELLER', queueState.teller_serving) : '---';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <img 
            src={logoBank} 
            alt="Logo Bankaltimtara" 
            className="h-16 mx-auto"
          />
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Teller
          </h1>
          <p className="text-emerald-200">Panel Pemanggil Antrian</p>
        </div>

        {/* Current Serving */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-emerald-200 text-lg">Sedang Dilayani</CardTitle>
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
              <p className="text-emerald-200 text-sm">Menunggu</p>
              <p className="text-3xl font-bold text-white">{waiting}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-emerald-200 text-sm">Total Antrian</p>
              <p className="text-3xl font-bold text-white">{queueState.teller_queue}</p>
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
            disabled={waiting === 0 || isCallLoading}
            className="w-full h-20 text-xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600"
          >
            {isCallLoading ? (
              <Loader2 className="h-8 w-8 mr-3 animate-spin" />
            ) : (
              <PhoneCall className="h-8 w-8 mr-3" />
            )}
            Panggil Berikutnya
          </Button>
        </motion.div>

        {waiting === 0 && (
          <p className="text-center text-emerald-300 text-sm">
            Tidak ada antrian yang menunggu
          </p>
        )}
      </div>
    </div>
  );
};

export default TellerCaller;
