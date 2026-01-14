import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Printer,
  Monitor,
  Smartphone,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Zap,
} from 'lucide-react';
import { savePrinterConfig, PrinterConfig } from '@/lib/thermalPrinter';
import { toast } from '@/components/ui/sonner';

// Predefined printer models with optimal settings
const PRINTER_MODELS = [
  {
    id: 'jk5802',
    name: 'JK-5802P / JK-58',
    brand: 'Generic',
    paperSize: '58mm' as const,
    recommendedMethod: 'desktopEscPos' as const,
    description: 'Printer thermal portable 58mm via USB',
    tags: ['58mm', 'USB', 'Portable'],
  },
  {
    id: 'pos80',
    name: 'POS-80 / TM-T82',
    brand: 'Epson Compatible',
    paperSize: '80mm' as const,
    recommendedMethod: 'desktop' as const,
    description: 'Printer kasir 80mm dengan driver lengkap',
    tags: ['80mm', 'USB/Network', 'Kasir'],
  },
  {
    id: 'zj5890',
    name: 'ZJ-5890K / ZJ-5802',
    brand: 'Zjiang',
    paperSize: '58mm' as const,
    recommendedMethod: 'desktopEscPos' as const,
    description: 'Printer thermal murah 58mm',
    tags: ['58mm', 'USB', 'Budget'],
  },
  {
    id: 'bt58',
    name: 'Mini Printer Bluetooth 58mm',
    brand: 'Generic',
    paperSize: '58mm' as const,
    recommendedMethod: 'rawbt' as const,
    description: 'Printer portable Bluetooth untuk Android',
    tags: ['58mm', 'Bluetooth', 'Android'],
  },
  {
    id: 'bt80',
    name: 'Bluetooth Printer 80mm',
    brand: 'Generic',
    paperSize: '80mm' as const,
    recommendedMethod: 'rawbt' as const,
    description: 'Printer Bluetooth 80mm untuk Android',
    tags: ['80mm', 'Bluetooth', 'Android'],
  },
  {
    id: 'custom',
    name: 'Printer Lain / Manual',
    brand: 'Custom',
    paperSize: '58mm' as const,
    recommendedMethod: 'desktop' as const,
    description: 'Konfigurasi manual untuk printer lain',
    tags: ['Custom'],
  },
];

interface PrinterWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (config: PrinterConfig) => void;
}

type WizardStep = 'model' | 'platform' | 'confirm';

const PrinterWizard = ({ open, onOpenChange, onComplete }: PrinterWizardProps) => {
  const [step, setStep] = useState<WizardStep>('model');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [platform, setPlatform] = useState<'desktop' | 'android'>('desktop');
  const [method, setMethod] = useState<PrinterConfig['method']>('auto');
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [useDesktopEscPos, setUseDesktopEscPos] = useState(false);

  const selectedPrinter = PRINTER_MODELS.find((p) => p.id === selectedModel);

  const handleModelSelect = (modelId: string) => {
    const printer = PRINTER_MODELS.find((p) => p.id === modelId);
    if (printer) {
      setSelectedModel(modelId);
      setPaperSize(printer.paperSize);

      // Auto-set platform and method based on recommendation
      if (printer.recommendedMethod === 'rawbt') {
        setPlatform('android');
        setMethod('rawbt');
        setUseDesktopEscPos(false);
      } else if (printer.recommendedMethod === 'desktopEscPos') {
        setPlatform('desktop');
        setMethod('auto');
        setUseDesktopEscPos(true);
      } else {
        setPlatform('desktop');
        setMethod('auto');
        setUseDesktopEscPos(false);
      }
    }
  };

  const handleNext = () => {
    if (step === 'model' && selectedModel) {
      setStep('platform');
    } else if (step === 'platform') {
      setStep('confirm');
    }
  };

  const handleBack = () => {
    if (step === 'platform') {
      setStep('model');
    } else if (step === 'confirm') {
      setStep('platform');
    }
  };

  const handleComplete = () => {
    const config: PrinterConfig = {
      method,
      platform,
      paperSize,
      useDesktopEscPos,
    };

    savePrinterConfig(config);
    onComplete(config);
    toast.success(`Printer dikonfigurasi: ${selectedPrinter?.name || 'Custom'}`);
    onOpenChange(false);

    // Reset wizard
    setStep('model');
    setSelectedModel('');
  };

  const handlePlatformChange = (value: 'desktop' | 'android') => {
    setPlatform(value);
    if (value === 'android') {
      setMethod('rawbt');
      setUseDesktopEscPos(false);
    } else {
      setMethod('auto');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Wizard Konfigurasi Printer
          </DialogTitle>
          <DialogDescription>
            {step === 'model' && 'Pilih model printer yang Anda gunakan'}
            {step === 'platform' && 'Pilih platform kiosk Anda'}
            {step === 'confirm' && 'Konfirmasi pengaturan printer'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {['model', 'platform', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : i < ['model', 'platform', 'confirm'].indexOf(step)
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i < ['model', 'platform', 'confirm'].indexOf(step) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="w-12 h-0.5 bg-muted mx-1" />}
            </div>
          ))}
        </div>

        {/* Step: Model Selection */}
        {step === 'model' && (
          <div className="space-y-3">
            <RadioGroup value={selectedModel} onValueChange={handleModelSelect}>
              {PRINTER_MODELS.map((printer) => (
                <div
                  key={printer.id}
                  className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedModel === printer.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => handleModelSelect(printer.id)}
                >
                  <RadioGroupItem value={printer.id} id={printer.id} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={printer.id} className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{printer.name}</span>
                        {printer.recommendedMethod === 'desktopEscPos' && (
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            ESC/POS
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{printer.description}</p>
                      <div className="flex gap-1 mt-2">
                        {printer.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step: Platform Selection */}
        {step === 'platform' && (
          <div className="space-y-4">
            <RadioGroup
              value={platform}
              onValueChange={(v) => handlePlatformChange(v as 'desktop' | 'android')}
              className="space-y-3"
            >
              <div
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  platform === 'desktop'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="desktop" id="wiz-desktop" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="wiz-desktop" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      <span className="font-medium">Desktop (PC / Windows)</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Printer terhubung via USB atau Network ke PC/Laptop
                    </p>
                  </Label>
                </div>
              </div>

              <div
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  platform === 'android'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value="android" id="wiz-android" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="wiz-android" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      <span className="font-medium">Android</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Printer Bluetooth terhubung ke tablet/HP Android via RawBT
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {/* Desktop ESC/POS option */}
            {platform === 'desktop' && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">Mode Print Desktop</span>
                </div>
                <RadioGroup
                  value={useDesktopEscPos ? 'escpos' : 'browser'}
                  onValueChange={(v) => setUseDesktopEscPos(v === 'escpos')}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="browser" id="mode-browser" />
                    <Label htmlFor="mode-browser" className="text-sm cursor-pointer">
                      Browser Print (standar, perlu driver printer)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="escpos" id="mode-escpos" />
                    <Label htmlFor="mode-escpos" className="text-sm cursor-pointer">
                      <span>ESC/POS Raw (untuk printer thermal tanpa driver yang baik)</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Recommended untuk JK-5802P
                      </Badge>
                    </Label>
                  </div>
                </RadioGroup>

                {useDesktopEscPos && (
                  <Alert className="mt-3">
                    <Zap className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Mode ESC/POS Raw mengirim data langsung ke printer via RawBT Desktop atau USB RAW
                      port. Hasil print tidak tergantung driver browser.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium mb-3">Ringkasan Konfigurasi</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model Printer:</span>
                  <span className="font-medium">{selectedPrinter?.name || 'Custom'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-medium">
                    {platform === 'desktop' ? 'Desktop (PC)' : 'Android'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ukuran Kertas:</span>
                  <span className="font-medium">{paperSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Metode Print:</span>
                  <span className="font-medium">
                    {platform === 'android'
                      ? 'RawBT (ESC/POS)'
                      : useDesktopEscPos
                      ? 'ESC/POS Raw'
                      : 'Browser Print'}
                  </span>
                </div>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Konfigurasi ini dapat diubah kapan saja di halaman Konfigurasi → Printer.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step !== 'model' && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Kembali
            </Button>
          )}
          {step === 'confirm' ? (
            <Button onClick={handleComplete}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Terapkan Konfigurasi
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={step === 'model' && !selectedModel}>
              Lanjut
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrinterWizard;
