import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import logoBank from '@/assets/logo-bankaltimtara.png';
import { formatQueueNumber, QueueState, QueueStatus } from '@/lib/supabaseQueueStore';
import { TVDisplayConfig } from '@/lib/queueStore';
import { batikPattern } from './batik';
import { CSSilhouette, TellerSilhouette } from './ornaments';
import './papan-telihan.css';

export interface CallSpotlight {
  type: 'CS' | 'TELLER';
  number: number;
  key: string;
}

interface PapanTelihanProps {
  queueState: QueueState | null;
  tvConfig: TVDisplayConfig;
  bankName: string;
  branchName: string;
  time: string;
  date: string;
  isOnline: boolean;
  currentSlide: number;
  spotlight: CallSpotlight | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const STAGE_W = 1920;
const STAGE_H = 1080;

const BG_PAPER = batikPattern('#4481C0', 0.075, 180);
const BG_ON_BLUE_CARD = batikPattern('#FFFFFF', 0.06, 150);
const BG_ON_BLUE_FULL = batikPattern('#FFFFFF', 0.07, 220);

/** Skala panggung 1920x1080 agar pas di layar (letterbox kalau rasio beda). */
const useStageScale = () => {
  const calc = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
};

const ACRONYMS = new Set(['PT', 'KCP', 'KC', 'KK', 'BPD', 'II', 'III', 'IV', 'UUS', 'ATM', 'CS']);
const LOWER = new Set(['dan', 'di', 'ke', 'dari', 'atau']);

/** "KCP KELAS 2 TELIHAN" -> "KCP Kelas 2 Telihan" (singkatan tetap kapital). */
const toDisplayCase = (text: string) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const up = w.toUpperCase();
      if (ACRONYMS.has(up)) return up;
      const low = w.toLowerCase();
      if (i > 0 && LOWER.has(low)) return low;
      return low.charAt(0).toUpperCase() + low.slice(1);
    })
    .join(' ');

/** "2.25%" -> { value: "2,25", pct: true } — format angka Indonesia. */
const formatRate = (raw: string) => {
  const trimmed = (raw || '').trim();
  const core = trimmed.replace('%', '').trim();
  // Angka tanpa "%" (mis. "1.50") tetap dianggap persen.
  if (/^\d+([.,]\d+)?$/.test(core)) {
    return { value: core.replace('.', ','), pct: true, num: parseFloat(core.replace(',', '.')) };
  }
  return { value: trimmed, pct: false, num: NaN };
};

const tickerItems = (text: string) =>
  text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

const SPEED_PER_CHAR = { slow: 0.32, medium: 0.22, fast: 0.14 } as const;

interface CardInfo {
  type: 'TELLER' | 'CS';
  serving: number;
  queue: number;
  status: QueueStatus;
}

const QueueCard = ({ info }: { info: CardInfo }) => {
  const isTeller = info.type === 'TELLER';
  const name = isTeller ? 'Teller' : 'Customer Service';
  const number = info.serving > 0 ? formatQueueNumber(info.type, info.serving) : '—';
  const waiting = Math.max(0, info.queue - info.serving);
  const calling = info.status === 'calling' || info.status === 'repeat';
  const onBreak = info.status === 'break';

  let label = 'Nomor terakhir';
  let foot: JSX.Element = <span>Menunggu panggilan berikutnya</span>;
  if (info.serving === 0) {
    label = 'Belum ada panggilan';
    foot = <span>Silakan ambil nomor antrian</span>;
  }
  if (info.status === 'serving') {
    label = 'Sedang dilayani';
    foot = <span>Sedang melayani nasabah</span>;
  }
  if (calling) {
    label = info.status === 'repeat' ? 'Panggilan ulang' : 'Sedang dipanggil';
    foot = (
      <>
        <span className="pt-dot" />
        <b>{isTeller ? 'Silakan menuju loket Teller' : 'Silakan menuju meja Customer Service'}</b>
      </>
    );
  }
  if (onBreak) {
    label = 'Loket istirahat';
    foot = <span>Loket sedang istirahat, mohon menunggu</span>;
  }

  const Silh = isTeller ? TellerSilhouette : CSSilhouette;

  return (
    <article
      className={`pt-q${calling ? ' pt-calling' : ''}${onBreak ? ' pt-break' : ''}`}
      style={calling ? { backgroundImage: BG_ON_BLUE_CARD } : undefined}
    >
      <Silh className="pt-silh" />
      <div className="pt-top">
        <span className="pt-name">{name}</span>
        <span className="pt-wait">
          Menunggu <strong>{waiting}</strong>
        </span>
      </div>
      <div className="pt-label">{label}</div>
      <div className="pt-num">{number}</div>
      <div className="pt-foot">
        {foot}
      </div>
    </article>
  );
};

const RateRow = ({ title, items }: { title: JSX.Element | string; items: { label: string; rate: string }[] }) => {
  const parsed = items.map((it) => ({ ...it, f: formatRate(it.rate) }));
  const nums = parsed.map((p) => p.f.num).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : NaN;
  const bestCount = nums.filter((n) => n === max).length;
  const n = parsed.length;
  const fontSize = n <= 5 ? 46 : n === 6 ? 40 : 34;
  const labelSize = n <= 4 ? 19 : n === 5 ? 17 : 15;
  return (
    <div className="pt-rrow">
      <h3>{title}</h3>
      <div className="pt-rcols" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {parsed.map((p, i) => {
          const best = typeof title === 'string' && title === 'Deposito' && bestCount === 1 && n > 1 && p.f.num === max;
          return (
            <div key={i} className={`pt-rc${best ? ' pt-best' : ''}`}>
              <span style={{ fontSize: labelSize }}>
                {p.label}
                {best && <em>Tertinggi</em>}
              </span>
              <strong style={{ fontSize }}>
                {p.f.value}
                {p.f.pct && <small>%</small>}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Media = ({ tvConfig, currentSlide }: { tvConfig: TVDisplayConfig; currentSlide: number }) => {
  const images = tvConfig.slideshowImages || [];

  if (tvConfig.mediaMode === 'video' && tvConfig.mediaUrl) {
    return (
      <aside className="pt-media">
        <video src={tvConfig.mediaUrl} autoPlay loop muted playsInline />
      </aside>
    );
  }

  if (tvConfig.mediaMode === 'slideshow' && images.length > 0) {
    const idx = currentSlide % images.length;
    return (
      <aside className="pt-media">
        <AnimatePresence initial={false}>
          <motion.img
            key={idx}
            src={images[idx]}
            alt={`Slide ${idx + 1}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
          />
        </AnimatePresence>
        {images.length > 1 && (
          <div className="pt-prog">
            {images.map((_, i) => (
              <i key={i} className={i === idx ? 'pt-on' : undefined} />
            ))}
          </div>
        )}
      </aside>
    );
  }

  if (tvConfig.mediaMode === 'single' && tvConfig.mediaUrl) {
    return (
      <aside className="pt-media">
        <img src={tvConfig.mediaUrl} alt="Promo" />
      </aside>
    );
  }

  return (
    <aside className="pt-media">
      <div className="pt-media-empty" style={{ backgroundImage: BG_ON_BLUE_CARD }}>
        <img src={logoBank} alt="" />
      </div>
    </aside>
  );
};

const PapanTelihan = ({
  queueState,
  tvConfig,
  bankName,
  branchName,
  time,
  date,
  isOnline,
  currentSlide,
  spotlight,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
}: PapanTelihanProps) => {
  const scale = useStageScale();

  const teller: CardInfo = {
    type: 'TELLER',
    serving: queueState?.teller_serving ?? 0,
    queue: queueState?.teller_queue ?? 0,
    status: queueState?.teller_status ?? 'idle',
  };
  const cs: CardInfo = {
    type: 'CS',
    serving: queueState?.cs_serving ?? 0,
    queue: queueState?.cs_queue ?? 0,
    status: queueState?.cs_status ?? 'idle',
  };

  const branch = toDisplayCase(branchName || 'KCP Kelas II Telihan');
  const bank = toDisplayCase(bankName || '');

  const items = useMemo(() => tickerItems(tvConfig.runningText || ''), [tvConfig.runningText]);
  const tickerChars = items.join('').length + items.length * 6;
  const tickerDuration = Math.max(15, tickerChars * SPEED_PER_CHAR[tvConfig.runningTextSpeed || 'medium']);
  const showTicker = tvConfig.showRunningText && items.length > 0;

  const productRates = tvConfig.productRates || [];
  const depositRates = tvConfig.depositRates || [];
  const showRates = productRates.length > 0 || depositRates.length > 0;

  const spotTeller = spotlight?.type === 'TELLER';
  const otherInfo = spotTeller ? cs : teller;
  const otherNumber = otherInfo.serving > 0 ? formatQueueNumber(otherInfo.type, otherInfo.serving) : null;

  const tickerRun = (
    <span>
      {items.map((t, i) => (
        <span key={i}>
          {t}
          <i>•</i>
        </span>
      ))}
    </span>
  );

  return (
    <div className="pt-viewport" style={{ backgroundImage: BG_PAPER }}>
      <div className={`pt-stage${showTicker ? '' : ' pt-no-ticker'}`} style={{ transform: `scale(${scale})` }}>
        <header className="pt-header">
          <div className="pt-brand">
            <img src={logoBank} alt="Bankaltimtara" />
            <div className="pt-sep" />
            <div>
              <h1>{branch}</h1>
              {bank && <p>{bank}</p>}
            </div>
          </div>
          <div className="pt-time">
            <span className="pt-date">{date}</span>
            <span className="pt-clock">{time}</span>
            <span className={`pt-live${isOnline ? '' : ' pt-off'}`}>
              <i />
              {isOnline ? 'Langsung' : 'Terputus'}
            </span>
            <div className="pt-controls">
              <button type="button" onClick={onToggleSound} title={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}>
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
              <button type="button" onClick={onToggleFullscreen} title="Layar penuh">
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </header>

        <main className={`pt-main${tvConfig.showMedia ? '' : ' pt-no-media'}`}>
          <div className="pt-left" style={showRates ? undefined : { gridTemplateRows: 'minmax(0,1fr)' }}>
            <section className="pt-queues">
              <QueueCard info={teller} />
              <QueueCard info={cs} />
            </section>

            {showRates && (
              <section className="pt-rates">
                <div className="pt-hd">
                  <h2>Suku Bunga</h2>
                  <span className="pt-note">% per tahun &nbsp;·&nbsp; dapat berubah sewaktu-waktu</span>
                </div>
                {productRates.length > 0 && (
                  <RateRow
                    title={
                      <>
                        Tabungan
                        <br />
                        &amp; Giro
                      </>
                    }
                    items={productRates.map((p) => ({ label: p.name, rate: p.rate }))}
                  />
                )}
                {depositRates.length > 0 && (
                  <RateRow title="Deposito" items={depositRates.map((d) => ({ label: d.tenor.toLowerCase(), rate: d.rate }))} />
                )}
              </section>
            )}
          </div>

          {tvConfig.showMedia && <Media tvConfig={tvConfig} currentSlide={currentSlide} />}
        </main>

        {showTicker && (
          <footer className="pt-ticker">
            <span className="pt-tag">Info</span>
            <div className="pt-track">
              <div className="pt-run" style={{ animationDuration: `${tickerDuration}s` }}>
                {tickerRun}
                {tickerRun}
              </div>
            </div>
          </footer>
        )}

        <AnimatePresence>
          {spotlight && (
            <motion.div
              key={spotlight.key}
              className="pt-call"
              style={{ backgroundImage: BG_ON_BLUE_FULL }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {spotTeller ? <TellerSilhouette className="pt-silh" /> : <CSSilhouette className="pt-silh" />}
              <img className="pt-logo" src={logoBank} alt="" />
              <div className="pt-k">Nomor antrian</div>
              <motion.div
                className="pt-n"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              >
                {formatQueueNumber(spotlight.type, spotlight.number)}
              </motion.div>
              <div className="pt-sm">Silakan menuju</div>
              <div className="pt-to">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                {spotTeller ? 'Teller' : 'Customer Service'}
              </div>
              <div className="pt-meta">
                <span>
                  {otherNumber ? (
                    <>
                      {spotTeller ? 'Customer Service' : 'Teller'} melayani <b>{otherNumber}</b>
                    </>
                  ) : (
                    ' '
                  )}
                </span>
                <span>
                  {time} &nbsp;·&nbsp; {branch}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PapanTelihan;
