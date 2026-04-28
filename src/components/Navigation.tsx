import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Info, ChevronUp, ChevronDown, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex flex-col items-center gap-2">
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-lg"
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </Button>

      {/* Navigation Menu */}
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="card-glass flex items-center gap-1 p-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </NavLink>

              <NavLink
                to="/konfigurasi"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Settings size={20} />
                <span>Konfigurasi</span>
              </NavLink>

              <NavLink
                to="/riwayat"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <History size={20} />
                <span>Riwayat</span>
              </NavLink>

              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-5 py-3 font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Info size={20} />
                <span>About</span>
              </NavLink>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navigation;
