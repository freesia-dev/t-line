// Thermal Printer Integration
// Supports: Web Bluetooth (BLE), RawBT App Fallback, Desktop ESC/POS Raw

/// <reference types="web-bluetooth" />

import { PrintConfig, formatQueueNumber } from './queueStore';

// ESC/POS Commands
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const ESCPOS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x11], // Double width & height
  NORMAL_SIZE: [GS, 0x21, 0x00],
  TRIPLE_SIZE: [GS, 0x21, 0x22], // Triple width & height
  UNDERLINE_ON: [ESC, 0x2d, 0x01],
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],
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
  platform: 'desktop' | 'android';
  deviceId?: string;
  deviceName?: string;
  paperSize: '58mm' | '80mm';
  /** Desktop mode: use raw ESC/POS via RawBT Desktop bridge instead of browser print */
  useDesktopEscPos?: boolean;
}

// Bluetooth printer state
let connectedDevice: BluetoothDevice | null = null;
let writerCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

// Standard Bluetooth Printer Service UUIDs
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';

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
      return [
        {
          id: device.id,
          name: device.name || 'Unknown Printer',
          type: 'bluetooth',
        },
      ];
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
    throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome.');
  }

  try {
    let device: BluetoothDevice;

    if (deviceId && connectedDevice?.id === deviceId && connectedDevice.gatt?.connected) {
      // Already connected to this device
      return true;
    }
    
    // Request device with acceptAllDevices for broader compatibility
    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ALT_SERVICE_UUIDS,
      });
    } catch (requestError) {
      // User cancelled or no devices found
      if ((requestError as Error).name === 'NotFoundError') {
        throw new Error('Tidak ada printer yang dipilih');
      }
      throw requestError;
    }

    if (!device) {
      throw new Error('Tidak ada printer yang dipilih');
    }

    if (!device.gatt) {
      throw new Error('GATT tidak tersedia pada perangkat ini');
    }

    console.log('Connecting to device:', device.name);
    const server = await device.gatt.connect();
    console.log('Connected to GATT server');

    // Try different service UUIDs
    let service: BluetoothRemoteGATTService | null = null;
    for (const uuid of ALT_SERVICE_UUIDS) {
      try {
        service = await server.getPrimaryService(uuid);
        console.log('Found service:', uuid);
        if (service) break;
      } catch {
        continue;
      }
    }

    if (!service) {
      // Try to get any available service
      try {
        const services = await server.getPrimaryServices();
        if (services.length > 0) {
          service = services[0];
          console.log('Using first available service:', service.uuid);
        }
      } catch {
        throw new Error('Tidak dapat menemukan service printer. Pastikan printer mendukung BLE.');
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
        console.log('Found characteristic:', uuid);
        if (characteristic) break;
      } catch {
        continue;
      }
    }

    if (!characteristic) {
      // Try to get any writable characteristic
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char;
            console.log('Using writable characteristic:', char.uuid);
            break;
          }
        }
      } catch {
        throw new Error('Tidak dapat menemukan characteristic printer.');
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

    console.log('Printer connected successfully:', device.name);
    return true;
  } catch (error) {
    console.error('Error connecting to printer:', error);
    // Clean up on error
    connectedDevice = null;
    writerCharacteristic = null;
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
  bankNameLines.forEach((line) => {
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
  footerLines.forEach((line) => {
    commands.push(...encoder.encode(line), LF);
  });

  // Feed minimal untuk sobek manual.
  commands.push(...ESCPOS.FEED_LINES(2));

  return new Uint8Array(commands);
};

// Helper to wrap text
const wrapText = (text: string, maxChars: number): string[] => {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
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
    const chunkSize = 20;
    const totalChunks = Math.ceil(data.length / chunkSize);

    console.log(`Printing ${data.length} bytes in ${totalChunks} chunks...`);

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      try {
        await writerCharacteristic.writeValueWithoutResponse(chunk);
      } catch {
        await writerCharacteristic.writeValue(chunk);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('Print completed successfully');
    return true;
  } catch (error) {
    console.error('Error printing via Bluetooth:', error);
    if ((error as Error).message?.includes('GATT')) {
      connectedDevice = null;
      writerCharacteristic = null;
    }
    throw error;
  }
};

// Print via RawBT (Android or Desktop bridge)
// Uses hidden iframe to trigger intent without navigating away from PWA
export const printViaRawBT = (data: Uint8Array): void => {
  const base64 = bytesToBase64(data);
  const intentUrl = `rawbt:base64,${base64}`;
  
  // Try iframe method first (keeps PWA in foreground)
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute;';
  iframe.src = intentUrl;
  document.body.appendChild(iframe);
  
  // Cleanup after intent is triggered (fast cleanup)
  setTimeout(() => {
    iframe.remove();
  }, 100);
};

// Print ticket (auto-select method based on platform)
export const printTicket = async (
  type: 'CS' | 'TELLER',
  number: number,
  remaining: number,
  config: PrintConfig,
  printerConfig: PrinterConfig
): Promise<boolean> => {
  const ticketData = generateTicketData(type, number, remaining, config);

  // Mode DESKTOP
  if (printerConfig.platform === 'desktop') {
    // Desktop ESC/POS Raw mode - send via RawBT Desktop bridge
    if (printerConfig.useDesktopEscPos) {
      printViaRawBT(ticketData);
      return true;
    }
    // Standard browser print
    window.print();
    return true;
  }

  // Mode ANDROID: prioritas Web Bluetooth > RawBT
  if (printerConfig.platform === 'android') {
    if (
      printerConfig.method === 'webBluetooth' ||
      (printerConfig.method === 'auto' && isPrinterConnected())
    ) {
      if (!isPrinterConnected()) {
        await connectToPrinter(printerConfig.deviceId);
      }
      return await printViaBluetooth(ticketData);
    }

    // RawBT
    if (printerConfig.method === 'rawbt' || printerConfig.method === 'auto') {
      printViaRawBT(ticketData);
      return true;
    }
  }

  // Fallback: browser print
  window.print();
  return true;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Printer config storage
export const getPrinterConfig = (): PrinterConfig => {
  const stored = localStorage.getItem('printerConfig');
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migration: add default platform if missing
    if (!parsed.platform) {
      parsed.platform = 'desktop';
      localStorage.setItem('printerConfig', JSON.stringify(parsed));
    }
    return parsed;
  }
  // Default: desktop mode
  const defaultConfig: PrinterConfig = {
    method: 'auto',
    platform: 'desktop',
    paperSize: '80mm',
    useDesktopEscPos: false,
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
