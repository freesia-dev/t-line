// Thermal Printer Integration
// Supports: Web Bluetooth (BLE), RawBT App Fallback

/// <reference types="web-bluetooth" />

import { PrintConfig, formatQueueNumber } from './queueStore';

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

const ESCPOS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x11], // Double width & height
  NORMAL_SIZE: [GS, 0x21, 0x00],
  TRIPLE_SIZE: [GS, 0x21, 0x22], // Triple width & height
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  CUT_PAPER: [GS, 0x56, 0x00], // Full cut
  CUT_PAPER_PARTIAL: [GS, 0x56, 0x01], // Partial cut
  FEED_LINES: (n: number) => [ESC, 0x64, n], // Feed n lines
  LINE_SPACING: (n: number) => [ESC, 0x33, n], // Set line spacing
};

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'rawbt';
}

export interface PrinterConfig {
  method: 'webBluetooth' | 'rawbt' | 'auto';
  deviceId?: string;
  deviceName?: string;
  paperSize: '58mm' | '80mm';
}

// Bluetooth printer state
let connectedDevice: BluetoothDevice | null = null;
let writerCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

// Standard Bluetooth Printer Service UUIDs
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const PRINTER_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Alternative UUIDs for different printer brands
const ALT_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

const ALT_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
];

// Check if Web Bluetooth is supported
export const isWebBluetoothSupported = (): boolean => {
  return 'bluetooth' in navigator;
};

// Scan for Bluetooth printers
export const scanForPrinters = async (): Promise<PrinterDevice[]> => {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth tidak didukung di browser ini');
  }

  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { services: [PRINTER_SERVICE_UUID] },
        { namePrefix: 'Printer' },
        { namePrefix: 'POS' },
        { namePrefix: 'RPP' },
        { namePrefix: 'MTP' },
        { namePrefix: 'Thermal' },
        { namePrefix: 'BlueTooth' },
        { namePrefix: 'BT' },
      ],
      optionalServices: ALT_SERVICE_UUIDS,
    });

    if (device) {
      return [{
        id: device.id,
        name: device.name || 'Unknown Printer',
        type: 'bluetooth',
      }];
    }
    return [];
  } catch (error) {
    if ((error as Error).name === 'NotFoundError') {
      throw new Error('Tidak ada printer yang ditemukan');
    }
    throw error;
  }
};

// Connect to a Bluetooth printer
export const connectToPrinter = async (deviceId?: string): Promise<boolean> => {
  if (!isWebBluetoothSupported()) {
    throw new Error('Web Bluetooth tidak didukung');
  }

  try {
    let device: BluetoothDevice;

    if (deviceId && connectedDevice?.id === deviceId) {
      device = connectedDevice;
    } else {
      device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [PRINTER_SERVICE_UUID] },
          { namePrefix: 'Printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'RPP' },
          { namePrefix: 'MTP' },
          { namePrefix: 'Thermal' },
          { namePrefix: 'BlueTooth' },
          { namePrefix: 'BT' },
        ],
        optionalServices: ALT_SERVICE_UUIDS,
      });
    }

    if (!device.gatt) {
      throw new Error('GATT tidak tersedia');
    }

    const server = await device.gatt.connect();
    
    // Try different service UUIDs
    let service: BluetoothRemoteGATTService | null = null;
    for (const uuid of ALT_SERVICE_UUIDS) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) break;
      } catch {
        continue;
      }
    }

    if (!service) {
      throw new Error('Printer service tidak ditemukan');
    }

    // Try different characteristic UUIDs
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    for (const uuid of ALT_CHAR_UUIDS) {
      try {
        characteristic = await service.getCharacteristic(uuid);
        if (characteristic) break;
      } catch {
        continue;
      }
    }

    if (!characteristic) {
      throw new Error('Printer characteristic tidak ditemukan');
    }

    connectedDevice = device;
    writerCharacteristic = characteristic;

    // Save device info
    savePrinterDevice({
      id: device.id,
      name: device.name || 'Bluetooth Printer',
      type: 'bluetooth',
    });

    return true;
  } catch (error) {
    console.error('Error connecting to printer:', error);
    throw error;
  }
};

// Disconnect from printer
export const disconnectPrinter = async (): Promise<void> => {
  if (connectedDevice?.gatt?.connected) {
    connectedDevice.gatt.disconnect();
  }
  connectedDevice = null;
  writerCharacteristic = null;
};

// Check if printer is connected
export const isPrinterConnected = (): boolean => {
  return connectedDevice?.gatt?.connected || false;
};

// Get connected device name
export const getConnectedDeviceName = (): string | null => {
  return connectedDevice?.name || null;
};

// Generate ESC/POS ticket data
export const generateTicketData = (
  type: 'CS' | 'TELLER',
  number: number,
  remaining: number,
  config: PrintConfig
): Uint8Array => {
  const commands: number[] = [];
  const encoder = new TextEncoder();
  
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

  // Max chars per line based on paper size
  const maxChars = config.paperSize === '58mm' ? 32 : 48;
  const separator = '-'.repeat(maxChars);

  // Initialize printer
  commands.push(...ESCPOS.INIT);
  commands.push(...ESCPOS.ALIGN_CENTER);

  // Bank name
  commands.push(...ESCPOS.BOLD_ON);
  const bankNameLines = wrapText(config.bankName, maxChars);
  bankNameLines.forEach(line => {
    commands.push(...encoder.encode(line), LF);
  });
  commands.push(...ESCPOS.BOLD_OFF);

  // Branch name
  commands.push(...ESCPOS.BOLD_ON);
  commands.push(...encoder.encode(config.branchName), LF);
  commands.push(...ESCPOS.BOLD_OFF);

  // Separator
  commands.push(...encoder.encode(separator), LF);

  // Date & Time
  commands.push(...encoder.encode(visitDate), LF);
  commands.push(...ESCPOS.BOLD_ON);
  commands.push(...encoder.encode(visitTime), LF);
  commands.push(...ESCPOS.BOLD_OFF);

  // Separator
  commands.push(...encoder.encode(separator), LF);

  // Queue type
  commands.push(...ESCPOS.BOLD_ON);
  const queueType = type === 'CS' ? 'CUSTOMER SERVICE' : 'TELLER';
  commands.push(...encoder.encode(queueType), LF);
  commands.push(...ESCPOS.BOLD_OFF);

  // Queue number (large)
  commands.push(...ESCPOS.TRIPLE_SIZE);
  commands.push(...ESCPOS.BOLD_ON);
  commands.push(...encoder.encode(formattedNumber), LF);
  commands.push(...ESCPOS.BOLD_OFF);
  commands.push(...ESCPOS.NORMAL_SIZE);

  // Remaining queue
  commands.push(...encoder.encode(`Sisa antrian: ${remaining} orang`), LF);

  // Separator
  commands.push(...encoder.encode(separator), LF);

  // Footer
  const footerLines = wrapText(config.footerMessage, maxChars);
  footerLines.forEach(line => {
    commands.push(...encoder.encode(line), LF);
  });

  // Feed minimal dan cut (2 baris cukup untuk clearance pisau)
  commands.push(...ESCPOS.FEED_LINES(2));
  commands.push(...ESCPOS.CUT_PAPER_PARTIAL);

  return new Uint8Array(commands);
};

// Helper to wrap text
const wrapText = (text: string, maxChars: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
};

// Print via Web Bluetooth
export const printViaBluetooth = async (data: Uint8Array): Promise<boolean> => {
  if (!writerCharacteristic) {
    throw new Error('Printer tidak terhubung');
  }

  try {
    // POS58 and cheap thermal printers need small chunks (20-100 bytes)
    // Using 20 bytes for maximum compatibility
    const chunkSize = 20;
    const totalChunks = Math.ceil(data.length / chunkSize);
    
    console.log(`Printing ${data.length} bytes in ${totalChunks} chunks...`);
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      // Use writeValueWithoutResponse for faster printing if available
      try {
        await writerCharacteristic.writeValueWithoutResponse(chunk);
      } catch {
        await writerCharacteristic.writeValue(chunk);
      }
      
      // Longer delay for stability (100ms for POS58)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Print completed successfully');
    return true;
  } catch (error) {
    console.error('Error printing via Bluetooth:', error);
    // Try to reset connection on error
    if ((error as Error).message?.includes('GATT')) {
      connectedDevice = null;
      writerCharacteristic = null;
    }
    throw error;
  }
};

// Print ticket (auto-select method)
export const printTicket = async (
  type: 'CS' | 'TELLER',
  number: number,
  remaining: number,
  config: PrintConfig,
  printerConfig: PrinterConfig
): Promise<boolean> => {
  const ticketData = generateTicketData(type, number, remaining, config);

  if (printerConfig.method === 'webBluetooth' || 
      (printerConfig.method === 'auto' && isPrinterConnected())) {
    // Try Web Bluetooth first
    if (!isPrinterConnected()) {
      await connectToPrinter(printerConfig.deviceId);
    }
    return await printViaBluetooth(ticketData);
  }

  // Fallback to RawBT / window.print()
  return new Promise((resolve) => {
    window.print();
    resolve(true);
  });
};

// Print langsung tanpa popup - menggunakan RawBT intent atau Web Bluetooth
export const printTicketDirect = async (
  type: 'CS' | 'TELLER',
  number: number,
  remaining: number,
  config: PrintConfig,
  printerConfig: PrinterConfig
): Promise<boolean> => {
  const ticketData = generateTicketData(type, number, remaining, config);

  // Jika Web Bluetooth connected, gunakan itu
  if (printerConfig.method === 'webBluetooth' || 
      (printerConfig.method === 'auto' && isPrinterConnected())) {
    if (!isPrinterConnected()) {
      // Coba reconnect ke device terakhir
      const lastDevice = getLastPrinterDevice();
      if (lastDevice) {
        try {
          await connectToPrinter(lastDevice.id);
        } catch (error) {
          console.warn('Could not auto-reconnect to printer:', error);
        }
      }
    }
    
    if (isPrinterConnected()) {
      return await printViaBluetooth(ticketData);
    }
  }

  // Gunakan RawBT intent untuk Android
  if (printerConfig.method === 'rawbt' || printerConfig.method === 'auto') {
    return printViaRawBT(ticketData);
  }

  // Fallback terakhir: window.print() dengan silent print jika memungkinkan
  return printViaBrowserSilent(type, number, remaining, config);
};

// Print via RawBT Android app using intent
const printViaRawBT = (data: Uint8Array): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Convert Uint8Array to base64
      const base64Data = btoa(String.fromCharCode(...data));
      
      // RawBT intent URL scheme
      const rawbtUrl = `intent://rawbt.ru/esc?data=${encodeURIComponent(base64Data)}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end`;
      
      // Try RawBT intent
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = rawbtUrl;
      document.body.appendChild(iframe);
      
      // Cleanup after attempt
      setTimeout(() => {
        document.body.removeChild(iframe);
        resolve(true);
      }, 1000);
    } catch (error) {
      console.error('RawBT print error:', error);
      // Fallback: try alternative rawbt scheme
      try {
        const base64Data = btoa(String.fromCharCode(...data));
        window.location.href = `rawbt:base64,${base64Data}`;
        resolve(true);
      } catch {
        resolve(false);
      }
    }
  });
};

// Silent browser print using hidden iframe
const printViaBrowserSilent = async (
  type: 'CS' | 'TELLER',
  number: number,
  remaining: number,
  config: PrintConfig
): Promise<boolean> => {
  return new Promise((resolve) => {
    const formattedNumber = type === 'CS' ? `B${String(number).padStart(3, '0')}` : `A${String(number).padStart(3, '0')}`;
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

    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '58mm';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      window.print();
      resolve(true);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tiket Antrian</title>
        <style>
          @page { 
            size: 58mm auto; 
            margin: 0; 
          }
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 10pt;
            width: 58mm;
            padding: 2mm;
            text-align: center;
          }
          .separator { 
            border-top: 1px dashed #000; 
            margin: 2mm 0; 
          }
          .queue-number { 
            font-size: 24pt; 
            font-weight: bold; 
            margin: 3mm 0; 
          }
          .bank-name { 
            font-weight: bold; 
            font-size: 11pt; 
          }
          .queue-type { 
            font-weight: bold; 
            margin-top: 2mm; 
          }
          .footer { 
            font-size: 8pt; 
            margin-top: 2mm; 
          }
        </style>
      </head>
      <body>
        <div class="bank-name">${config.bankName}</div>
        <div>${config.branchName}</div>
        <div class="separator"></div>
        <div>${visitDate}</div>
        <div><strong>${visitTime}</strong></div>
        <div class="separator"></div>
        <div class="queue-type">${type === 'CS' ? 'CUSTOMER SERVICE' : 'TELLER'}</div>
        <div class="queue-number">${formattedNumber}</div>
        <div>Sisa antrian: <strong>${remaining}</strong> orang</div>
        <div class="separator"></div>
        <div class="footer">${config.footerMessage}</div>
      </body>
      </html>
    `);
    iframeDoc.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print error:', e);
        window.print();
      }
      
      // Cleanup after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      
      resolve(true);
    }, 100);
  });
};

// Printer config storage
export const getPrinterConfig = (): PrinterConfig => {
  const stored = localStorage.getItem('printerConfig');
  if (stored) {
    return JSON.parse(stored);
  }
  const defaultConfig: PrinterConfig = {
    method: 'auto',
    paperSize: '80mm',
  };
  localStorage.setItem('printerConfig', JSON.stringify(defaultConfig));
  return defaultConfig;
};

export const savePrinterConfig = (config: PrinterConfig): void => {
  localStorage.setItem('printerConfig', JSON.stringify(config));
};

// Save/get last connected device
export const savePrinterDevice = (device: PrinterDevice): void => {
  localStorage.setItem('lastPrinterDevice', JSON.stringify(device));
};

export const getLastPrinterDevice = (): PrinterDevice | null => {
  const stored = localStorage.getItem('lastPrinterDevice');
  return stored ? JSON.parse(stored) : null;
};
