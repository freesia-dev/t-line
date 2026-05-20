import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TVDisplayConfig, InfoPanelType } from '@/lib/queueStore';
import { TrendingUp, PiggyBank, Banknote, ImageIcon } from 'lucide-react';

interface InfoPanelProps {
  config: TVDisplayConfig;
  /** Render media panel (slideshow/video/image) supplied by parent. */
  renderMedia: () => React.ReactNode;
}

const PANEL_ORDER: Exclude<InfoPanelType, 'rotate'>[] = [
  'media',
  'product_rates',
  'deposit_rates',
  'exchange_rates',
];

const DisplayInfoPanel = ({ config, renderMedia }: InfoPanelProps) => {
  const [rotateIdx, setRotateIdx] = useState(0);

  // Determine which panels participate in rotation (those that have data / are enabled)
  const activePanels = PANEL_ORDER.filter((p) => {
    if (p === 'media') return config.showMedia;
    if (p === 'product_rates') return (config.productRates?.length || 0) > 0;
    if (p === 'deposit_rates') return (config.depositRates?.length || 0) > 0;
    if (p === 'exchange_rates') return (config.exchangeRates?.length || 0) > 0;
    return false;
  });

  const isRotate = config.infoPanelType === 'rotate' && activePanels.length > 1;

  useEffect(() => {
    if (!isRotate) return;
    const intervalMs = Math.max(3, config.infoPanelRotateInterval || 10) * 1000;
    const id = setInterval(() => {
      setRotateIdx((i) => (i + 1) % activePanels.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [isRotate, config.infoPanelRotateInterval, activePanels.length]);

  const current: Exclude<InfoPanelType, 'rotate'> = isRotate
    ? activePanels[rotateIdx % activePanels.length]
    : (config.infoPanelType === 'rotate' ? activePanels[0] || 'media' : config.infoPanelType);

  return (
    <div className="w-full h-full relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {current === 'media' && (
            <div className="w-full h-full">{renderMedia()}</div>
          )}
          {current === 'product_rates' && (
            <RatesTable
              title="Suku Bunga Produk"
              icon={<PiggyBank />}
              gradient="from-blue-600 to-blue-800"
              headers={['Produk', 'Bunga', 'Ket.']}
              rows={(config.productRates || []).map((r) => [r.name, r.rate, r.note || '-'])}
            />
          )}
          {current === 'deposit_rates' && (
            <RatesTable
              title="Suku Bunga Deposito"
              icon={<TrendingUp />}
              gradient="from-emerald-600 to-emerald-800"
              headers={['Tenor', 'Bunga p.a']}
              rows={(config.depositRates || []).map((r) => [r.tenor, r.rate])}
            />
          )}
          {current === 'exchange_rates' && (
            <RatesTable
              title="Kurs Valuta Asing"
              icon={<Banknote />}
              gradient="from-amber-600 to-amber-800"
              headers={['Mata Uang', 'Beli', 'Jual']}
              rows={(config.exchangeRates || []).map((r) => [r.currency, r.buy, r.sell])}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {isRotate && activePanels.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {activePanels.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === rotateIdx ? 'bg-white scale-125 shadow' : 'bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface RatesTableProps {
  title: string;
  icon: React.ReactNode;
  gradient: string;
  headers: string[];
  rows: string[][];
}

export const RatesTable = ({ title, icon, gradient, headers, rows }: RatesTableProps) => {
  return (
    <div className={`w-full h-full rounded-xl bg-gradient-to-br ${gradient} shadow-2xl flex flex-col overflow-hidden`}>
      {/* Header */}
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-black/20 text-white shrink-0"
      >
        <div style={{ fontSize: 'clamp(1rem, 2.5vmin, 2rem)' }} className="flex items-center">
          {icon}
        </div>
        <h3
          className="font-bold uppercase tracking-wide drop-shadow"
          style={{ fontSize: 'clamp(0.875rem, 2.2vmin, 1.75rem)' }}
        >
          {title}
        </h3>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-hidden">
        {/* Column headers */}
        <div
          className="grid border-b border-white/30 pb-1 sm:pb-2 mb-1 sm:mb-2 text-white/80 font-semibold uppercase tracking-wide shrink-0"
          style={{
            gridTemplateColumns: `1.5fr repeat(${headers.length - 1}, 1fr)`,
            fontSize: 'clamp(0.6rem, 1.3vmin, 0.95rem)',
          }}
        >
          {headers.map((h, i) => (
            <span key={i} className={i === 0 ? 'text-left' : 'text-right'}>
              {h}
            </span>
          ))}
        </div>

        {/* Rows: distribute available space evenly */}
        <div className="flex-1 min-h-0 flex flex-col justify-around gap-0.5">
          {rows.length === 0 ? (
            <div className="text-center text-white/70 py-4" style={{ fontSize: 'clamp(0.75rem, 1.5vmin, 1rem)' }}>
              Belum ada data
            </div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={idx}
                className="grid items-center text-white py-1 px-1 rounded-md odd:bg-white/5"
                style={{
                  gridTemplateColumns: `1.5fr repeat(${row.length - 1}, 1fr)`,
                  fontSize: 'clamp(0.75rem, 2vmin, 1.5rem)',
                }}
              >
                {row.map((cell, i) => (
                  <span
                    key={i}
                    className={`${i === 0 ? 'text-left font-medium' : 'text-right font-bold tabular-nums'} truncate`}
                  >
                    {cell}
                  </span>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DisplayInfoPanel;