import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const Navigation = () => {
  return (
    <motion.nav 
      className="no-print fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4 }}
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
  );
};

export default Navigation;
