import { useEffect, useRef } from 'react';
import { PrintConfig, formatQueueNumber } from '@/lib/queueStore';

interface PrintTicketProps {
  type: 'CS' | 'TELLER';
  number: number;
  remaining: number;
  config: PrintConfig;
  onPrinted?: () => void;
}

const PrintTicket = ({ type, number, remaining, config, onPrinted }: PrintTicketProps) => {
  const hasTriggeredPrint = useRef(false);
  const formattedNumber = formatQueueNumber(type, number);
  const visitTime = new Date().toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const getFontSize = () => {
    switch (config.fontSize) {
      case 'small': return '36pt';
      case 'medium': return '42pt';
      case 'large': return '48pt';
      default: return '48pt';
    }
  };

  useEffect(() => {
    if (!hasTriggeredPrint.current) {
      hasTriggeredPrint.current = true;
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.print();
        if (onPrinted) {
          onPrinted();
        }
      }, 100);
    }
  }, [onPrinted]);

  return (
    <div className="print-only print-ticket">
      {config.showLogo && (
        <div className="print-ticket-header" style={{ marginBottom: '3mm' }}>
          <div style={{ fontSize: '12pt', fontWeight: 800 }}>{config.branchType}</div>
        </div>
      )}
      
      <div className="print-ticket-subheader">
        {config.bankName}
      </div>
      
      <div className="print-ticket-subheader" style={{ fontWeight: 600 }}>
        {config.branchName}
      </div>

      <div style={{ 
        borderTop: '1px dashed #000', 
        borderBottom: '1px dashed #000',
        margin: '3mm 0',
        padding: '2mm 0'
      }}>
        <div className="print-ticket-time">
          {visitTime}
        </div>
      </div>

      <div style={{ margin: '4mm 0' }}>
        <div style={{ fontSize: '10pt', fontWeight: 500 }}>
          {type === 'CS' ? 'CUSTOMER SERVICE' : 'TELLER'}
        </div>
        <div 
          className="print-ticket-number"
          style={{ fontSize: getFontSize() }}
        >
          {formattedNumber}
        </div>
        <div style={{ fontSize: '9pt' }}>
          Sisa antrian: <strong>{remaining}</strong> orang
        </div>
      </div>

      <div className="print-ticket-footer">
        {config.footerMessage}
      </div>
    </div>
  );
};

export default PrintTicket;
