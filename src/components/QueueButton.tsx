import { motion } from 'framer-motion';
import { Users, CreditCard } from 'lucide-react';
import { DisplayConfig } from '@/lib/queueStore';

interface QueueButtonProps {
  type: 'CS' | 'TELLER';
  currentQueue: number;
  displayConfig: DisplayConfig;
  onClick: () => void;
}

const QueueButton = ({ type, currentQueue, displayConfig, onClick }: QueueButtonProps) => {
  const isCS = type === 'CS';
  
  const getSizeClasses = () => {
    switch (displayConfig.buttonSize) {
      case 'medium': return 'px-8 py-6 text-xl';
      case 'large': return 'px-12 py-10 text-2xl';
      case 'xlarge': return 'px-16 py-14 text-3xl';
      default: return 'px-12 py-10 text-2xl';
    }
  };

  const getIconSize = () => {
    switch (displayConfig.buttonSize) {
      case 'medium': return 40;
      case 'large': return 56;
      case 'xlarge': return 72;
      default: return 56;
    }
  };

  return (
    <motion.button
      onClick={onClick}
      className={`btn-kiosk ${isCS ? 'btn-kiosk-cs' : 'btn-kiosk-teller'} ${getSizeClasses()} flex flex-col items-center gap-4`}
      whileHover={displayConfig.showAnimation ? { scale: 1.05 } : {}}
      whileTap={displayConfig.showAnimation ? { scale: 0.95 } : {}}
      initial={displayConfig.showAnimation ? { opacity: 0, y: 20 } : {}}
      animate={displayConfig.showAnimation ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
    >
      {isCS ? (
        <Users size={getIconSize()} strokeWidth={2} />
      ) : (
        <CreditCard size={getIconSize()} strokeWidth={2} />
      )}
      
      <span className="font-bold">
        {isCS ? 'Customer Service' : 'Teller'}
      </span>
      
      {displayConfig.showQueueCount && (
        <div className="mt-2 rounded-full bg-white/20 px-4 py-1 text-sm font-medium backdrop-blur-sm">
          Antrian saat ini: {currentQueue}
        </div>
      )}
    </motion.button>
  );
};

export default QueueButton;
