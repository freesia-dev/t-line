import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bluetooth, 
  BluetoothConnected, 
  BluetoothOff, 
  Printer,
  Smartphone,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  isWebBluetoothSupported,
  connectToPrinter,
  disconnectPrinter,
  isPrinterConnected,
  getConnectedDeviceName,
  getPrinterConfig,
  savePrinterConfig,
  getLastPrinterDevice,
  PrinterConfig,
} from '@/lib/thermalPrinter';
import { toast } from '@/components/ui/sonner';

const PrinterSetup = () => {
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(getPrinterConfig());
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bluetoothSupported] = useState(isWebBluetoothSupported());

  useEffect(() => {
    setIsConnected(isPrinterConnected());
    setDeviceName(getConnectedDeviceName());
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectToPrinter();
      setIsConnected(true);
      setDeviceName(getConnectedDeviceName());
      toast.success('Printer terhubung!');
    } catch (error) {
      toast.error((error as Error).message || 'Gagal menghubungkan printer');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    setIsConnected(false);
    setDeviceName(null);
    toast.info('Printer terputus');
  };

  const handleMethodChange = (value: PrinterConfig['method']) => {
    const newConfig = { ...printerConfig, method: value };
    setPrinterConfig(newConfig);
    savePrinterConfig(newConfig);
    toast.success('Metode print diperbarui');
  };

  const handlePaperSizeChange = (value: '58mm' | '80mm') => {
    const newConfig = { ...printerConfig, paperSize: value };
    setPrinterConfig(newConfig);
    savePrinterConfig(newConfig);
    toast.success('Ukuran kertas diperbarui');
  };

  const lastDevice = getLastPrinterDevice();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Status Koneksi Printer
          </CardTitle>
          <CardDescription>
            Status koneksi dengan thermal printer Bluetooth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <BluetoothConnected className="h-8 w-8 text-green-500" />
              ) : (
                <BluetoothOff className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isConnected ? deviceName || 'Printer Terhubung' : 'Tidak Terhubung'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? 'Siap untuk mencetak' : 'Klik tombol untuk menghubungkan'}
                </p>
              </div>
            </div>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {lastDevice && !isConnected && (
            <Alert>
              <Bluetooth className="h-4 w-4" />
              <AlertDescription>
                Terakhir terhubung: <strong>{lastDevice.name}</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            {isConnected ? (
              <Button variant="outline" onClick={handleDisconnect}>
                <BluetoothOff className="mr-2 h-4 w-4" />
                Putuskan Koneksi
              </Button>
            ) : (
              <Button 
                onClick={handleConnect} 
                disabled={!bluetoothSupported || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Menghubungkan...
                  </>
                ) : (
                  <>
                    <Bluetooth className="mr-2 h-4 w-4" />
                    Hubungkan Printer
                  </>
                )}
              </Button>
            )}
          </div>

          {!bluetoothSupported && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Web Bluetooth tidak didukung di browser ini. Gunakan Chrome di Android untuk fitur ini.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Print Method */}
      <Card>
        <CardHeader>
          <CardTitle>Metode Print</CardTitle>
          <CardDescription>
            Pilih metode koneksi printer yang akan digunakan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={printerConfig.method}
            onValueChange={(value) => handleMethodChange(value as PrinterConfig['method'])}
          >
            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="auto" id="method-auto" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="method-auto" className="font-medium cursor-pointer">
                  Otomatis (Recommended)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Gunakan Web Bluetooth jika tersedia, fallback ke RawBT/sistem print
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="webBluetooth" id="method-bluetooth" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="method-bluetooth" className="font-medium cursor-pointer flex items-center gap-2">
                  Web Bluetooth
                  <Badge variant="outline" className="text-xs">BLE</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Koneksi langsung via browser (butuh printer dengan Bluetooth Low Energy)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="rawbt" id="method-rawbt" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="method-rawbt" className="font-medium cursor-pointer flex items-center gap-2">
                  RawBT / System Print
                </Label>
                <p className="text-sm text-muted-foreground">
                  Menggunakan app RawBT atau sistem print Android (support semua printer Bluetooth)
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Paper Size */}
      <Card>
        <CardHeader>
          <CardTitle>Ukuran Kertas</CardTitle>
          <CardDescription>
            Pilih ukuran kertas thermal printer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={printerConfig.paperSize}
            onValueChange={(value) => handlePaperSizeChange(value as '58mm' | '80mm')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 flex-1">
              <RadioGroupItem value="58mm" id="paper-58" />
              <Label htmlFor="paper-58" className="cursor-pointer">
                <span className="font-medium">58mm</span>
                <p className="text-xs text-muted-foreground">Printer portable</p>
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 flex-1">
              <RadioGroupItem value="80mm" id="paper-80" />
              <Label htmlFor="paper-80" className="cursor-pointer">
                <span className="font-medium">80mm</span>
                <p className="text-xs text-muted-foreground">Printer kasir</p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* RawBT Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Panduan Setup RawBT (Android)
          </CardTitle>
          <CardDescription>
            Cara setup printer Bluetooth dengan app RawBT untuk Android
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-3 list-decimal list-inside text-sm">
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[24px]">1.</span>
              <span>Install app <strong>RawBT</strong> dari Google Play Store (gratis)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[24px]">2.</span>
              <span>Buka RawBT dan pair dengan printer Bluetooth Anda</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[24px]">3.</span>
              <span>Di pengaturan RawBT, aktifkan "Default Printer"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-medium min-w-[24px]">4.</span>
              <span>Saat print dari aplikasi, pilih "RawBT" sebagai printer</span>
            </li>
          </ol>

          <Button variant="outline" className="w-full" asChild>
            <a 
              href="https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Download RawBT dari Play Store
            </a>
          </Button>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Tips:</strong> RawBT bekerja dengan hampir semua thermal printer Bluetooth klasik (SPP), 
              termasuk printer China murah yang tidak support BLE.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Test Print */}
      <Card>
        <CardHeader>
          <CardTitle>Test Print</CardTitle>
          <CardDescription>
            Cetak halaman test untuk memastikan printer berfungsi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.print()}
            className="w-full"
          >
            <Printer className="mr-2 h-4 w-4" />
            Test Print
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrinterSetup;
