import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  fetchQueueState, 
  callNextCS, 
  repeatLastCall, 
  formatQueueNumber, 
  subscribeToQueueState, 
  QueueState,
  skipCSQueue,
  startServingCS,
  finishServingCS,
  setCSBreak,
  getStatusText
} from '@/lib/supabaseQueueStore';
import { toast } from '@/hooks/use-toast';
import { 
  PhoneCall, 
  Users, 
  CheckCircle, 
  Loader2, 
  RotateCcw, 
  SkipForward, 
  Play, 
  Square, 
  Coffee 
} from 'lucide-react';
import logoBank from '@/assets/logo-bankaltimtara.png';

const CSCaller = () => {
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [isRepeatLoading, setIsRepeatLoading] = useState(false);
  const [isSkipLoading, setIsSkipLoading] = useState(false);
  const [isServingLoading, setIsServingLoading] = useState(false);
  const [isBreakLoading, setIsBreakLoading] = useState(false);

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
    
    // Must finish current service before calling next
    if (queueState.cs_status === 'serving' || queueState.cs_status === 'calling') {
      toast({
        title: "Selesaikan layanan dulu",
        description: "Tekan 'Selesai Melayani' sebelum memanggil antrian berikutnya",
        variant: "destructive",
      });
      return;
    }

    if (queueState.cs_status === 'break') {
      toast({
        title: "Sedang istirahat",
        description: "Akhiri istirahat terlebih dahulu",
        variant: "destructive",
      });
      return;
    }
    
    setIsCallLoading(true);
    const result = await callNextCS();
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
    const queueNumber = formatQueueNumber('CS', result.number);

    toast({
      title: "Memanggil Antrian",
      description: `Nomor ${queueNumber} silakan menuju Customer Service`,
    });

    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handleRepeat = async () => {
    if (!queueState || queueState.cs_serving === 0) {
      toast({
        title: "Tidak ada panggilan",
        description: "Belum ada antrian yang dipanggil",
        variant: "destructive",
      });
      return;
    }

    setIsRepeatLoading(true);
    const success = await repeatLastCall('CS', queueState.cs_serving);
    setIsRepeatLoading(false);

    if (success) {
      setIsAnimating(true);
      const queueNumber = formatQueueNumber('CS', queueState.cs_serving);
      toast({
        title: "Mengulang Panggilan",
        description: `Nomor ${queueNumber} dipanggil ulang`,
      });
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  const handleSkip = async () => {
    if (!queueState || queueState.cs_serving >= queueState.cs_queue) {
      toast({
        title: "Tidak ada antrian",
        description: "Tidak ada antrian untuk dilewati",
        variant: "destructive",
      });
      return;
    }

    setIsSkipLoading(true);
    const success = await skipCSQueue();
    setIsSkipLoading(false);

    if (success) {
      toast({
        title: "Antrian Dilewati",
        description: "Nasabah tidak hadir, lanjut ke antrian berikutnya",
      });
    }
  };

  const handleStartServing = async () => {
    if (!queueState) return;

    setIsServingLoading(true);
    const success = await startServingCS();
    setIsServingLoading(false);

    if (success) {
      toast({
        title: "Mulai Melayani",
        description: `Melayani nomor ${formatQueueNumber('CS', queueState.cs_serving)}`,
      });
    }
  };

  const handleFinishServing = async () => {
    if (!queueState) return;

    setIsServingLoading(true);
    const success = await finishServingCS();
    setIsServingLoading(false);

    if (success) {
      toast({
        title: "Selesai Melayani",
        description: "Silakan panggil antrian berikutnya",
      });
    }
  };

  const handleToggleBreak = async () => {
    if (!queueState) return;

    const isCurrentlyOnBreak = queueState.cs_status === 'break';

    setIsBreakLoading(true);
    const success = await setCSBreak(!isCurrentlyOnBreak);
    setIsBreakLoading(false);

    if (success) {
      toast({
        title: isCurrentlyOnBreak ? "Istirahat Selesai" : "Istirahat",
        description: isCurrentlyOnBreak ? "Siap melayani kembali" : "Status istirahat aktif",
      });
    }
  };

  if (isLoading || !queueState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-white animate-spin" />
      </div>
    );
  }

  const waiting = Math.max(0, queueState.cs_queue - queueState.cs_serving);
  const currentServing = queueState.cs_serving > 0 ? formatQueueNumber('CS', queueState.cs_serving) : '---';
  const isServing = queueState.cs_status === 'serving';
  const isCalling = queueState.cs_status === 'calling' || queueState.cs_status === 'repeat';
  const isOnBreak = queueState.cs_status === 'break';
  const canCallNext = !isServing && !isCalling && !isOnBreak && waiting > 0;

  const getStatusBadgeColor = () => {
    switch (queueState.cs_status) {
      case 'serving': return 'bg-green-500';
      case 'calling': return 'bg-yellow-500';
      case 'repeat': return 'bg-orange-500';
      case 'break': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 p-4 md:p-8">
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
          <p className="text-slate-300">Panel Pemanggil Antrian</p>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <span className={`px-4 py-2 rounded-full text-white font-semibold ${getStatusBadgeColor()}`}>
            {getStatusText(queueState.cs_status)}
          </span>
        </div>

        {/* Current Serving */}
        <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-600">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-slate-300 text-lg">Sedang Dilayani</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentServing}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className={`text-6xl md:text-8xl font-bold text-cyan-400 ${isAnimating ? 'animate-pulse' : ''}`}
              >
                {currentServing}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-600">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-amber-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Menunggu</p>
              <p className="text-3xl font-bold text-white">{waiting}</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900/50 backdrop-blur-sm border-slate-600">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Total Antrian</p>
              <p className="text-3xl font-bold text-white">{queueState.cs_queue}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Call Next */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleCallNext}
              disabled={!canCallNext || isCallLoading}
              className="w-full h-20 text-xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 disabled:from-slate-600 disabled:to-slate-700 text-white"
            >
              {isCallLoading ? (
                <Loader2 className="h-8 w-8 mr-3 animate-spin" />
              ) : (
                <PhoneCall className="h-8 w-8 mr-3" />
              )}
              Panggil Berikutnya
            </Button>
          </motion.div>

          {/* Serving Controls */}
          <div className="grid grid-cols-2 gap-3">
            {isCalling ? (
              <Button
                onClick={handleStartServing}
                disabled={isServingLoading}
                className="h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isServingLoading ? (
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                ) : (
                  <Play className="h-6 w-6 mr-2" />
                )}
                Mulai Melayani
              </Button>
            ) : (
              <Button
                onClick={handleFinishServing}
                disabled={!isServing || isServingLoading}
                className="h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white"
              >
                {isServingLoading ? (
                  <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                ) : (
                  <Square className="h-6 w-6 mr-2" />
                )}
                Selesai Melayani
              </Button>
            )}

            <Button
              onClick={handleSkip}
              disabled={waiting === 0 || isSkipLoading || isServing}
              className="h-14 text-lg font-semibold bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white"
            >
              {isSkipLoading ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <SkipForward className="h-6 w-6 mr-2" />
              )}
              Lewati Antrian
            </Button>
          </div>

          {/* Repeat and Break */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleRepeat}
              disabled={queueState.cs_serving === 0 || isRepeatLoading}
              variant="outline"
              className="h-14 text-lg font-semibold border-slate-500 bg-slate-700/50 text-white hover:bg-slate-600"
            >
              {isRepeatLoading ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-6 w-6 mr-2" />
              )}
              Ulang Panggilan
            </Button>

            <Button
              onClick={handleToggleBreak}
              disabled={isBreakLoading || isServing}
              className={`h-14 text-lg font-semibold ${
                isOnBreak 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {isBreakLoading ? (
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
              ) : (
                <Coffee className="h-6 w-6 mr-2" />
              )}
              {isOnBreak ? 'Selesai Istirahat' : 'Istirahat'}
            </Button>
          </div>
        </div>

        {waiting === 0 && !isOnBreak && (
          <p className="text-center text-slate-400 text-sm">
            Tidak ada antrian yang menunggu
          </p>
        )}
      </div>
    </div>
  );
};

export default CSCaller;
