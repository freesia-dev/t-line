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
    <div className="w-full h-full relative overflow-hidden">
      <AnimatePresence initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
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
  // Auto-shrink font based on row count so all rows always fit without being clipped.
  const rowCount = Math.max(rows.length, 1);
  // Use cqh (container-query height) so rows scale with the table's own height.
  const rowFontSize =
    rowCount <= 3
      ? 'clamp(0.7rem, 9cqh, 2rem)'
      : rowCount <= 5
      ? 'clamp(0.55rem, 6.5cqh, 1.5rem)'
      : rowCount <= 7
      ? 'clamp(0.5rem, 5cqh, 1.2rem)'
      : 'clamp(0.45rem, 4cqh, 1rem)';

  return (
    <div
      className={`relative w-full h-full rounded-2xl bg-gradient-to-br ${gradient} shadow-2xl flex flex-col overflow-hidden`}
      style={{ containerType: 'size' } as React.CSSProperties}
    >
      {/* Decorative silhouette */}
      <svg
        className="absolute -right-6 -bottom-6 w-1/2 h-1/2 text-white/5 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
        aria-hidden
      >
        <circle cx="160" cy="160" r="120" />
        <circle cx="160" cy="160" r="80" className="text-white/5" />
      </svg>
      {/* Header */}
      <div
        className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 bg-black/25 backdrop-blur-sm text-white shrink-0 border-b border-white/10"
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
      <div className="relative flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-hidden">
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

        {/* Rows: each row flexes equally so they always fit */}
        <div className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-hidden">
          {rows.length === 0 ? (
            <div className="text-center text-white/70 py-4" style={{ fontSize: 'clamp(0.75rem, 1.5vmin, 1rem)' }}>
              Belum ada data
            </div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={idx}
                className="grid items-center text-white px-2 rounded-md odd:bg-white/10 flex-1 min-h-0 overflow-hidden leading-none"
                style={{
                  gridTemplateColumns: `1.5fr repeat(${row.length - 1}, 1fr)`,
                  fontSize: rowFontSize,
                }}
              >
                {row.map((cell, i) => (
                  <span
                    key={i}
                    className={`${i === 0 ? 'text-left font-medium' : 'text-right font-bold tabular-nums'} truncate leading-none`}
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