import { motion } from 'framer-motion';
import { Users, CreditCard } from 'lucide-react';
import { DisplayConfig } from '@/lib/queueStore';

interface QueueButtonProps {
  type: 'CS' | 'TELLER';
  currentQueue: number;
  displayConfig: DisplayConfig;
  onClick: () => void;
  disabled?: boolean;
}

const QueueButton = ({ type, currentQueue, displayConfig, onClick, disabled }: QueueButtonProps) => {
  const isCS = type === 'CS';
  
  const getSizeClasses = () => {
    switch (displayConfig.buttonSize) {
      case 'medium': return 'w-48 h-36 text-lg sm:w-56 sm:h-44 sm:text-xl md:w-64 md:h-48';
      case 'large': return 'w-56 h-44 text-xl sm:w-64 sm:h-52 sm:text-2xl md:w-80 md:h-60';
      case 'xlarge': return 'w-64 h-52 text-2xl sm:w-80 sm:h-60 sm:text-3xl md:w-96 md:h-72';
      default: return 'w-56 h-44 text-xl sm:w-64 sm:h-52 sm:text-2xl md:w-80 md:h-60';
    }
  };

  const getIconSize = () => {
    switch (displayConfig.buttonSize) {
      case 'medium': return 32;
      case 'large': return 40;
      case 'xlarge': return 48;
      default: return 40;
    }
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`btn-kiosk ${isCS ? 'btn-kiosk-cs' : 'btn-kiosk-teller'} ${getSizeClasses()} flex flex-col items-center justify-center gap-2 sm:gap-3 md:gap-4 ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
      whileHover={displayConfig.showAnimation && !disabled ? { scale: 1.05 } : {}}
      whileTap={displayConfig.showAnimation && !disabled ? { scale: 0.95 } : {}}
      initial={displayConfig.showAnimation ? { opacity: 0, y: 20 } : {}}
      animate={displayConfig.showAnimation ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
    >
      {isCS ? (
        <Users size={getIconSize()} strokeWidth={2} className="flex-shrink-0" />
      ) : (
        <CreditCard size={getIconSize()} strokeWidth={2} className="flex-shrink-0" />
      )}
      
      <span className="font-bold text-sm sm:text-base md:text-lg lg:text-xl">
        {isCS ? 'Customer Service' : 'Teller'}
      </span>
      
      {displayConfig.showQueueCount && (
        <div className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium backdrop-blur-sm sm:px-4 sm:py-1 sm:text-sm">
          Antrian: {currentQueue}
        </div>
      )}
    </motion.button>
  );
};

export default QueueButton;
