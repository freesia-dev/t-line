import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, CheckCircle, Monitor, Tv, ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const logo = "/icon-512x512.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallDisplay = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const displayUrl = `${window.location.origin}/display?kiosk=true`;

  useEffect(() => {
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(displayUrl);
    toast.success("URL disalin ke clipboard!");
  };

  const openInNewTab = () => {
    window.open(displayUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="Logo" className="w-16 h-16" />
            <Tv className="w-12 h-12 text-purple-600" />
          </div>
          <CardTitle className="text-2xl text-purple-700">Install Display untuk TV</CardTitle>
          <CardDescription>
            Setup tampilan antrian khusus untuk TV atau monitor besar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Akses Cepat Display Mode
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={openInNewTab}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Buka Display Sekarang
              </Button>
              <Button 
                onClick={copyUrl}
                variant="outline"
                className="flex-1 border-purple-300"
              >
                <Copy className="mr-2 h-4 w-4" />
                Salin URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 break-all">
              {displayUrl}
            </p>
          </div>

          {/* Install as PWA */}
          {deferredPrompt && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Download className="w-5 h-5" />
                Install sebagai Aplikasi
              </h3>
              <Button
                onClick={handleInstallClick}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Install T-Line
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Setelah install, tekan lama ikon app untuk akses shortcut "Display Antrian"
              </p>
            </div>
          )}

          {(isInstalled || isStandalone) && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold text-green-700">Aplikasi Terinstall!</p>
              <p className="text-sm text-muted-foreground">
                Tekan lama ikon app untuk mengakses shortcut "Display Antrian"
              </p>
            </div>
          )}

          {/* Setup Guide for Desktop/TV */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-3">🖥️ Setup untuk PC + TV</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Hubungkan PC ke TV melalui HDMI</li>
              <li>Buka Chrome di PC</li>
              <li>
                Kunjungi URL display:
                <code className="bg-gray-200 px-1 rounded text-xs ml-1 break-all">
                  /display?kiosk=true
                </code>
              </li>
              <li>Tekan <strong>F11</strong> untuk fullscreen</li>
              <li>Layar akan otomatis tetap menyala (Wake Lock)</li>
            </ol>
          </div>

          {/* Chrome Kiosk Mode */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h3 className="font-semibold text-amber-700 mb-3">⚡ Mode Kiosk (Profesional)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Untuk setup permanen, buat shortcut Chrome dengan parameter:
            </p>
            <code className="block bg-amber-100 p-2 rounded text-xs break-all mb-2">
              chrome.exe --kiosk "{displayUrl}"
            </code>
            <p className="text-xs text-muted-foreground">
              Mode ini akan menjalankan Chrome fullscreen tanpa UI browser
            </p>
          </div>

          {/* Features */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 text-center">Fitur Display Mode:</h4>
            <ul className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Auto fullscreen
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Layar tidak mati
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Suara panggilan
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Slideshow media
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Auto-reconnect
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                Realtime sync
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Link to="/install" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Install Biasa
              </Button>
            </Link>
            <Link to="/" className="flex-1">
              <Button variant="ghost" className="w-full">
                Kembali ke Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallDisplay;
