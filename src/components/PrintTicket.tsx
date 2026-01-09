import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PrintConfig, formatQueueNumber } from '@/lib/queueStore';

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
      case 'small': return '32pt';
      case 'medium': return '40pt';
      case 'large': return '48pt';
      default: return '40pt';
    }
  };

  return (
    <div id="print-ticket-container" className="print-only">
      <div className="print-ticket">
        {/* Header - Bank Info */}
        {config.showLogo && (
          <div className="print-header-section">
            <div className="print-bank-type">{config.branchType}</div>
          </div>
        )}
        
        <div className="print-bank-name">{config.bankName}</div>
        <div className="print-branch-name">{config.branchName}</div>

        {/* Separator */}
        <div className="print-separator" />

        {/* Date & Time */}
        <div className="print-datetime-section">
          <div className="print-date">{visitDate}</div>
          <div className="print-time">{visitTime}</div>
        </div>

        {/* Separator */}
        <div className="print-separator" />

        {/* Queue Number Section */}
        <div className="print-queue-section">
          <div className="print-queue-type">
            {type === 'CS' ? 'CUSTOMER SERVICE' : 'TELLER'}
          </div>
          <div className="print-queue-number" style={{ fontSize: getFontSize() }}>
            {formattedNumber}
          </div>
          <div className="print-remaining">
            Sisa antrian: <strong>{remaining}</strong> orang
          </div>
        </div>

        {/* Separator */}
        <div className="print-separator" />

        {/* Footer */}
        <div className="print-footer">
          {config.footerMessage}
        </div>
      </div>
    </div>
  );
};

const PrintTicket = ({ type, number, remaining, config, onPrinted }: PrintTicketProps) => {
  const hasTriggeredPrint = useRef(false);

  useEffect(() => {
    if (!hasTriggeredPrint.current) {
      hasTriggeredPrint.current = true;
      // Delay to ensure portal content is rendered
      setTimeout(() => {
        window.print();
        if (onPrinted) {
          onPrinted();
        }
      }, 200);
    }
  }, [onPrinted]);

  // Use portal to render directly in body for better print isolation
  return createPortal(
    <PrintTicketContent 
      type={type} 
      number={number} 
      remaining={remaining} 
      config={config} 
    />,
    document.body
  );
};

export default PrintTicket;