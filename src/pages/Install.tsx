import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, CheckCircle, Smartphone, Monitor, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo-bankaltimtara.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const checkStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for appinstalled event
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

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <img src={logo} alt="Logo" className="w-20 h-20 mx-auto mb-4" />
            <CardTitle className="text-2xl text-blue-700">Sudah Terinstall!</CardTitle>
            <CardDescription>
              Aplikasi T-Line sudah berjalan dalam mode standalone
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <Link to="/">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Aplikasi
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <img src={logo} alt="Logo" className="w-20 h-20 mx-auto mb-4" />
            <CardTitle className="text-2xl text-blue-700">Berhasil Terinstall!</CardTitle>
            <CardDescription>
              Aplikasi T-Line sudah terinstall di perangkat Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-center text-muted-foreground">
              Anda sekarang bisa membuka T-Line dari home screen perangkat Anda
            </p>
            <Link to="/">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Aplikasi
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <img src={logo} alt="Logo" className="w-24 h-24 mx-auto mb-4" />
          <CardTitle className="text-2xl text-blue-700">Install T-Line</CardTitle>
          <CardDescription>
            Install aplikasi di perangkat Anda untuk pengalaman terbaik
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Android / Chrome */}
          {deferredPrompt && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold text-blue-700">Android / Chrome</h3>
              </div>
              <Button
                onClick={handleInstallClick}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Install Sekarang
              </Button>
            </div>
          )}

          {/* iOS Instructions */}
          {isIOS && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="w-6 h-6 text-gray-600" />
                <h3 className="font-semibold text-gray-700">iPhone / iPad</h3>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas)</li>
                <li>Scroll ke bawah dan ketuk <strong>"Add to Home Screen"</strong></li>
                <li>Ketuk <strong>"Add"</strong> di pojok kanan atas</li>
              </ol>
            </div>
          )}

          {/* Desktop Instructions */}
          {!isIOS && !deferredPrompt && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <Monitor className="w-6 h-6 text-gray-600" />
                <h3 className="font-semibold text-gray-700">Desktop / Browser Lain</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Untuk menginstall aplikasi:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Buka menu browser (titik tiga di pojok kanan atas)</li>
                <li>Cari opsi <strong>"Install app"</strong> atau <strong>"Add to Home Screen"</strong></li>
                <li>Klik untuk menginstall</li>
              </ol>
            </div>
          )}

          {/* Features */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 text-center">Keuntungan Install Aplikasi:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Berjalan fullscreen seperti native app
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Akses cepat dari home screen
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Bekerja offline (fitur terbatas)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Performa lebih cepat
              </li>
            </ul>
          </div>

          <Link to="/" className="block">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Aplikasi
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
