import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PrintConfig, formatQueueNumber } from '@/lib/queueStore';
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

const buildStandalonePrintHtml = (ticketOuterHtml: string, config: PrintConfig) => {
  const paperWidth = config.paperSize === '58mm' ? '58mm' : '80mm';
  const ticketWidth = config.paperSize === '58mm' ? '54mm' : '76mm';

  // Minimal, self-contained print page to avoid blank/partial output on some thermal drivers.
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
    <title>Print Ticket</title>
    <style>${css}</style>
  </head>
  <body>
    ${ticketOuterHtml}
    <script>
      (function(){
        function waitImages(){
          var imgs = Array.prototype.slice.call(document.images || []);
          if (!imgs.length) return Promise.resolve();
          return Promise.all(imgs.map(function(img){
            if (img.complete) return Promise.resolve();
            return new Promise(function(res){
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
            });
          }));
        }
        waitImages().then(function(){
          setTimeout(function(){
            window.focus();
            window.print();
          }, 250);
        });
      })();
    </script>
  </body>
</html>`;
};

const PrintTicket = ({ type, number, remaining, config, onPrinted }: PrintTicketProps) => {
  const hasTriggeredPrint = useRef(false);

  useEffect(() => {
    if (hasTriggeredPrint.current) return;
    hasTriggeredPrint.current = true;

    const t = window.setTimeout(() => {
      const ticketEl = document.getElementById('print-ticket-container');
      if (!ticketEl) {
        window.print();
        onPrinted?.();
        return;
      }

      // Print via hidden iframe with standalone HTML (more reliable on thermal printer drivers)
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

      const html = buildStandalonePrintHtml(ticketEl.outerHTML, config);
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

      const fallback = window.setTimeout(cleanup, 1500);
      iframe.contentWindow?.addEventListener(
        'afterprint',
        () => {
          window.clearTimeout(fallback);
          cleanup();
        },
        { once: true }
      );
    }, 250);

    return () => window.clearTimeout(t);
  }, [config, onPrinted]);

  return createPortal(
    <PrintTicketContent type={type} number={number} remaining={remaining} config={config} />,
    document.body
  );
};

export default PrintTicket;
