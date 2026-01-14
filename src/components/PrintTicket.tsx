import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PrintConfig, formatQueueNumber } from '@/lib/queueStore';
import { 
  getPrinterConfig, 
  generateTicketData, 
  printViaRawBT, 
  printViaBluetooth, 
  isPrinterConnected 
} from '@/lib/thermalPrinter';
import { Button } from '@/components/ui/button';
import { Printer, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoBank from '@/assets/logo-bankaltimtara.png';

interface PrintTicketProps {
  type: 'CS' | 'TELLER';
  number: number;
  remaining: number;
  config: PrintConfig;
  onPrinted?: () => void;
}

const PrintTicketContent = ({ type, number, config, remaining }: Omit<PrintTicketProps, 'onPrinted'>) => {
  const formattedNumber = formatQueueNumber(type, number);

  const now = new Date();
  const visitDate = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const visitTime = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const getFontSize = () => {
    switch (config.fontSize) {
      case 'small':
        return '24pt';
      case 'medium':
        return '28pt';
      case 'large':
        return '32pt';
      default:
        return '28pt';
    }
  };

  const paperClass = config.paperSize === '58mm' ? 'print-ticket-58mm' : 'print-ticket-80mm';

  return (
    <div id="print-ticket-container" className="print-only" data-paper-size={config.paperSize}>
      <div className={`print-ticket ${paperClass}`}>
        {config.showLogo && (
          <div className="print-header-section">
            <img src={logoBank} alt="Logo Bank" className="print-logo" />
          </div>
        )}

        <div className="print-bank-name">{config.bankName}</div>
        <div className="print-branch-name">{config.branchName}</div>

        <div className="print-separator" />

        <div className="print-datetime-section">
          <div className="print-date">{visitDate}</div>
          <div className="print-time">{visitTime}</div>
        </div>

        <div className="print-separator" />

        <div className="print-queue-section">
          <div className="print-queue-type">{type === 'CS' ? 'CUSTOMER SERVICE' : 'TELLER'}</div>
          <div className="print-queue-number" style={{ fontSize: getFontSize() }}>
            {formattedNumber}
          </div>
          <div className="print-remaining">
            Sisa antrian: <strong>{remaining}</strong> orang
          </div>
        </div>

        <div className="print-separator" />

        <div className="print-footer">{config.footerMessage}</div>
      </div>
    </div>
  );
};

const buildStandalonePrintHtml = (ticketOuterHtml: string, config: PrintConfig, baseHref: string) => {
  const paperWidth = config.paperSize === '58mm' ? '58mm' : '80mm';
  const ticketWidth = config.paperSize === '58mm' ? '54mm' : '76mm';

  // Minimal, self-contained print page to avoid blank/partial output on some thermal drivers.
  // NOTE: include <base> so asset URLs (e.g. /assets/...) resolve inside about:blank iframe.
  const css = `
    @page { size: ${paperWidth} auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { width: ${paperWidth}; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.2; }
    #print-ticket-container { width: ${paperWidth}; margin: 0; padding: 0; }
    .print-ticket { width: ${ticketWidth}; margin: 0; padding: 1mm 2mm; text-align: center; }

    .print-header-section { margin-bottom: 1mm; }
    .print-logo { height: ${config.paperSize === '58mm' ? '7mm' : '8mm'}; width: auto; max-width: 100%; display: block; margin: 0 auto 1mm auto; }

    .print-bank-name { font-size: ${config.paperSize === '58mm' ? '6pt' : '7pt'}; font-weight: 400; margin-bottom: .5mm; }
    .print-branch-name { font-size: ${config.paperSize === '58mm' ? '7pt' : '8pt'}; font-weight: 700; margin-bottom: 1mm; }

    .print-separator { border: 0; border-top: 1px dashed #000; margin: 1mm 0; height: 0; }

    .print-datetime-section { padding: 1mm 0; }
    .print-date { font-size: ${config.paperSize === '58mm' ? '7pt' : '8pt'}; margin-bottom: .5mm; font-weight: 400; }
    .print-time { font-size: ${config.paperSize === '58mm' ? '8pt' : '10pt'}; font-weight: 700; }

    .print-queue-section { padding: 1mm 0; }
    .print-queue-type { font-size: ${config.paperSize === '58mm' ? '8pt' : '9pt'}; font-weight: 700; letter-spacing: .5px; margin-bottom: 1mm; }
    .print-queue-number { font-weight: 900; line-height: 1; margin: 2mm 0; letter-spacing: 2px; }
    .print-remaining { font-size: ${config.paperSize === '58mm' ? '7pt' : '8pt'}; margin-top: 1mm; font-weight: 400; }
    .print-remaining strong { font-weight: 800; }

    .print-footer { font-size: ${config.paperSize === '58mm' ? '6pt' : '7pt'}; line-height: 1.2; padding-top: 1mm; }
  `;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${baseHref}" />
    <title>Print Ticket</title>
    <style>${css}</style>
  </head>
  <body>
    ${ticketOuterHtml}
  </body>
</html>`;
};

// Print confirmation dialog overlay
interface PrintDialogProps {
  type: 'CS' | 'TELLER';
  number: number;
  remaining: number;
  config: PrintConfig;
  onPrint: () => void;
  onClose: () => void;
}

const PrintDialog = ({ type, number, remaining, config, onPrint, onClose }: PrintDialogProps) => {
  const formattedNumber = formatQueueNumber(type, number);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-center text-primary-foreground">
          <p className="text-sm opacity-90 mb-1">Nomor Antrian</p>
          <p className="text-lg font-medium mb-2">{type === 'CS' ? 'Customer Service' : 'Teller'}</p>
          <p className="text-5xl font-black tracking-wider">{formattedNumber}</p>
        </div>

        {/* Info */}
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-1">Sisa antrian di depan Anda:</p>
          <p className="text-3xl font-bold text-foreground">{remaining} <span className="text-lg font-normal">orang</span></p>
        </div>

        {/* Actions */}
        <div className="p-4 bg-muted/30 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14"
            onClick={onClose}
          >
            <X className="mr-2 h-5 w-5" />
            Tutup
          </Button>
          <Button
            className="flex-1 h-14 text-lg font-semibold"
            onClick={onPrint}
          >
            <Printer className="mr-2 h-5 w-5" />
            CETAK
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

const PrintTicket = ({ type, number, remaining, config, onPrinted }: PrintTicketProps) => {
  const [showDialog, setShowDialog] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const hasTriggeredBrowserPrint = useRef(false);
  const printerConfig = getPrinterConfig();

  // Determine if we should use ESC/POS (1-tap button) or browser print (auto)
  const isEscPosMode = 
    (printerConfig.platform === 'desktop' && printerConfig.useDesktopEscPos) ||
    printerConfig.platform === 'android';

  // Handle print action (called from button tap)
  const handlePrint = useCallback(async () => {
    setIsPrinting(true);
    
    try {
      const ticketData = generateTicketData(type, number, remaining, config);
      
      if (printerConfig.platform === 'android') {
        if (printerConfig.method === 'webBluetooth' && isPrinterConnected()) {
          try {
            await printViaBluetooth(ticketData);
          } catch (err) {
            console.error('Bluetooth print failed, falling back to RawBT:', err);
            printViaRawBT(ticketData);
          }
        } else {
          printViaRawBT(ticketData);
        }
      } else if (printerConfig.useDesktopEscPos) {
        printViaRawBT(ticketData);
      }
      
      // Close dialog after triggering print
      setTimeout(() => {
        setShowDialog(false);
        onPrinted?.();
      }, 300);
    } catch (err) {
      console.error('Print error:', err);
      setIsPrinting(false);
    }
  }, [type, number, remaining, config, printerConfig, onPrinted]);

  // Handle close without printing
  const handleClose = useCallback(() => {
    setShowDialog(false);
    onPrinted?.();
  }, [onPrinted]);

  // For browser print mode (desktop without ESC/POS), use auto-print
  useEffect(() => {
    if (isEscPosMode) return; // ESC/POS uses button tap
    if (hasTriggeredBrowserPrint.current) return;
    hasTriggeredBrowserPrint.current = true;

    // Browser print fallback for desktop without ESC/POS
    const waitImages = (doc: Document) => {
      const imgs = Array.from(doc.images || []);
      if (!imgs.length) return Promise.resolve();
      return Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((res) => {
              if (img.complete) return res();
              img.addEventListener('load', () => res(), { once: true });
              img.addEventListener('error', () => res(), { once: true });
            })
        )
      );
    };

    const t = window.setTimeout(() => {
      const ticketEl = document.getElementById('print-ticket-container');
      if (!ticketEl) {
        window.print();
        onPrinted?.();
        return;
      }

      // Print via hidden iframe with standalone HTML
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';

      document.body.appendChild(iframe);

      const baseHref = `${window.location.origin}/`;
      const html = buildStandalonePrintHtml(ticketEl.outerHTML, config, baseHref);
      const doc = iframe.contentDocument;
      if (!doc) {
        window.print();
        onPrinted?.();
        iframe.remove();
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      const cleanup = () => {
        iframe.remove();
        onPrinted?.();
      };

      const fallback = window.setTimeout(() => {
        try {
          window.print();
        } catch {
          // ignore
        }
        cleanup();
      }, 2000);

      const win = iframe.contentWindow;
      if (!win) {
        window.clearTimeout(fallback);
        window.print();
        cleanup();
        return;
      }

      waitImages(doc)
        .catch(() => undefined)
        .then(() => {
          window.setTimeout(() => {
            try {
              win.focus();
              win.print();
            } catch {
              // ignore
            }
          }, 150);
        });

      win.addEventListener(
        'afterprint',
        () => {
          window.clearTimeout(fallback);
          cleanup();
        },
        { once: true }
      );
    }, 50);

    return () => window.clearTimeout(t);
  }, [config, onPrinted, isEscPosMode]);

  // ESC/POS mode: show print dialog with 1-tap button
  if (isEscPosMode) {
    return (
      <AnimatePresence>
        {showDialog && (
          <PrintDialog
            type={type}
            number={number}
            remaining={remaining}
            config={config}
            onPrint={handlePrint}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    );
  }

  // Browser print mode: render hidden ticket for print
  return createPortal(
    <PrintTicketContent type={type} number={number} remaining={remaining} config={config} />, 
    document.body
  );
};

export default PrintTicket;
