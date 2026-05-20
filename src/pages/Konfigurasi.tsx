import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LayoutPreview from '@/components/DisplayLayoutPreview';
import MediaUploader from '@/components/MediaUploader';
import SlideshowSelector from '@/components/SlideshowSelector';
import AudioPhraseUploader from '@/components/AudioPhraseUploader';
import {
  getPrintConfig,
  savePrintConfig,
  getDisplayConfig,
  saveDisplayConfig,
  getTVDisplayConfig,
  getVoiceConfig,
  saveVoiceConfig,
  PrintConfig,
  DisplayConfig,
  TVDisplayConfig,
  VoiceConfig,
  PronunciationMapping,
} from '@/lib/queueStore';
import { fetchTVDisplayConfig, saveTVDisplayConfigToSupabase } from '@/lib/supabaseTVConfig';
import { fetchVoiceConfig, saveVoiceConfigToSupabase } from '@/lib/supabaseVoiceConfig';
import { fetchQueueState, resetQueue, QueueState } from '@/lib/supabaseQueueStore';
import { getAllVoices } from '@/lib/audioUtils';
import { toast } from 'sonner';
import { RotateCcw, Save, Printer, Monitor, Tv, ExternalLink, Volume2, Bluetooth, Plus, Trash2, Loader2 } from 'lucide-react';
import PrinterSetup from '@/components/PrinterSetup';

const Konfigurasi = () => {
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(getDisplayConfig());
  const [tvConfig, setTVConfig] = useState<TVDisplayConfig>(getTVDisplayConfig());
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig | null>(null);
  const [queueState, setQueueState] = useState<QueueState | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSavingTVConfig, setIsSavingTVConfig] = useState(false);
  const [isSavingVoiceConfig, setIsSavingVoiceConfig] = useState(false);

  useEffect(() => {
    fetchQueueState().then(setQueueState);
    
    // Load TV config from Supabase
    fetchTVDisplayConfig().then((config) => {
      console.log('[Konfigurasi] TV config loaded:', config);
      setTVConfig(config);
    });
    
    // Load Voice config from Supabase
    fetchVoiceConfig().then((config) => {
      console.log('[Konfigurasi] Voice config loaded:', config);
      setVoiceConfig(config);
    });
    
    // Load available voices
    const loadVoices = () => {
      const voices = getAllVoices();
      setAvailableVoices(voices);
    };
    
    loadVoices();
    
    // Voices may load asynchronously
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleSavePrintConfig = () => {
    savePrintConfig(printConfig);
    toast.success('Konfigurasi cetak berhasil disimpan');
  };

  const handleSaveDisplayConfig = () => {
    saveDisplayConfig(displayConfig);
    toast.success('Konfigurasi tampilan berhasil disimpan');
  };

  const handleSaveTVConfig = async () => {
    setIsSavingTVConfig(true);
    const success = await saveTVDisplayConfigToSupabase(tvConfig);
    setIsSavingTVConfig(false);
    if (success) {
      toast.success('Konfigurasi display TV berhasil disimpan dan akan otomatis diterapkan ke semua display');
    } else {
      toast.error('Gagal menyimpan konfigurasi display TV');
    }
  };
  const handleSaveVoiceConfig = async () => {
    if (!voiceConfig) return;
    setIsSavingVoiceConfig(true);
    console.log('[Konfigurasi] Saving voice config:', JSON.stringify(voiceConfig, null, 2));
    const success = await saveVoiceConfigToSupabase(voiceConfig);
    setIsSavingVoiceConfig(false);
    if (success) {
      console.log('[Konfigurasi] Voice config saved successfully');
      toast.success('Konfigurasi suara berhasil disimpan dan akan otomatis diterapkan ke semua display');
    } else {
      toast.error('Gagal menyimpan konfigurasi suara');
    }
  };

  const handleTestVoice = async () => {
    if (!voiceConfig) {
      toast.error('Konfigurasi suara belum dimuat');
      return;
    }
    const { announceQueueWithConfig } = await import('@/lib/audioUtils');
    await announceQueueWithConfig('A001', 'Teller 1', voiceConfig);
  };

  const handleResetQueue = async () => {
    if (confirm('Apakah Anda yakin ingin mereset semua antrian?')) {
      const success = await resetQueue();
      if (success) {
        const newState = await fetchQueueState();
        setQueueState(newState);
        toast.success('Antrian berhasil direset');
      } else {
        toast.error('Gagal mereset antrian');
      }
    }
  };

  return (
    <div className="no-print relative min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-2 text-3xl font-bold text-foreground">Konfigurasi</h1>
          <p className="mb-8 text-muted-foreground">
            Atur tampilan kiosk, display TV, dan format cetak tiket antrian
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs defaultValue="display" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="display" className="gap-2">
                <Monitor size={16} />
                <span className="hidden sm:inline">Kiosk</span>
              </TabsTrigger>
              <TabsTrigger value="tv" className="gap-2">
                <Tv size={16} />
                <span className="hidden sm:inline">Display TV</span>
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-2">
                <Volume2 size={16} />
                <span className="hidden sm:inline">Suara</span>
              </TabsTrigger>
              <TabsTrigger value="printer" className="gap-2">
                <Bluetooth size={16} />
                <span className="hidden sm:inline">Printer</span>
              </TabsTrigger>
              <TabsTrigger value="print" className="gap-2">
                <Printer size={16} />
                <span className="hidden sm:inline">Cetak</span>
              </TabsTrigger>
              <TabsTrigger value="queue" className="gap-2">
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Antrian</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="display">
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan Kiosk</CardTitle>
                  <CardDescription>
                    Kustomisasi tampilan kiosk pengambilan antrian
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="animation">Animasi</Label>
                      <p className="text-sm text-muted-foreground">
                        Aktifkan efek animasi pada tombol
                      </p>
                    </div>
                    <Switch
                      id="animation"
                      checked={displayConfig.showAnimation}
                      onCheckedChange={(checked) =>
                        setDisplayConfig({ ...displayConfig, showAnimation: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="queueCount">Tampilkan Jumlah Antrian</Label>
                      <p className="text-sm text-muted-foreground">
                        Tampilkan jumlah antrian saat ini di tombol
                      </p>
                    </div>
                    <Switch
                      id="queueCount"
                      checked={displayConfig.showQueueCount}
                      onCheckedChange={(checked) =>
                        setDisplayConfig({ ...displayConfig, showQueueCount: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="directPrint">Langsung Cetak</Label>
                      <p className="text-sm text-muted-foreground">
                        Langsung cetak tanpa menampilkan popup konfirmasi
                      </p>
                    </div>
                    <Switch
                      id="directPrint"
                      checked={displayConfig.directPrint}
                      onCheckedChange={(checked) =>
                        setDisplayConfig({ ...displayConfig, directPrint: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ukuran Tombol</Label>
                    <Select
                      value={displayConfig.buttonSize}
                      onValueChange={(value: 'medium' | 'large' | 'xlarge') =>
                        setDisplayConfig({ ...displayConfig, buttonSize: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="xlarge">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleSaveDisplayConfig} className="w-full gap-2">
                    <Save size={18} />
                    Simpan Pengaturan Kiosk
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tv">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pengaturan Display TV</CardTitle>
                      <CardDescription>
                        Kustomisasi tampilan display antrian untuk monitor/TV
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open('/display', '_blank')}
                    >
                      <ExternalLink size={16} />
                      Buka Display
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Layout Selection */}
                  <div className="space-y-3">
                    <Label>Pilih Layout</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(['layout1', 'layout2', 'layout3', 'layout4'] as const).map((layout) => (
                        <LayoutPreview
                          key={layout}
                          layout={layout}
                          isSelected={tvConfig.layout === layout}
                          onClick={() => setTVConfig({ ...tvConfig, layout })}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Media Settings */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="showMedia">Tampilkan Media</Label>
                        <p className="text-sm text-muted-foreground">
                          Tampilkan poster atau video promosi
                        </p>
                      </div>
                      <Switch
                        id="showMedia"
                        checked={tvConfig.showMedia}
                        onCheckedChange={(checked) =>
                          setTVConfig({ ...tvConfig, showMedia: checked })
                        }
                      />
                    </div>

                    {tvConfig.showMedia && (
                      <>
                        {/* Media Mode Selection */}
                        <div className="space-y-2">
                          <Label>Mode Media</Label>
                          <Select
                            value={tvConfig.mediaMode || 'single'}
                            onValueChange={(value: 'single' | 'slideshow' | 'video') =>
                              setTVConfig({ ...tvConfig, mediaMode: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Gambar Tunggal</SelectItem>
                              <SelectItem value="slideshow">Slideshow</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Single Image / Video Mode */}
                        {(tvConfig.mediaMode === 'single' || tvConfig.mediaMode === 'video') && (
                          <div className="space-y-3">
                            <Label>Pilih {tvConfig.mediaMode === 'video' ? 'Video' : 'Gambar'}</Label>
                            <MediaUploader
                              selectedUrl={tvConfig.mediaUrl}
                              onSelect={(url, type) =>
                                setTVConfig({ ...tvConfig, mediaUrl: url, mediaType: type })
                              }
                            />
                            <div className="space-y-2">
                              <Label htmlFor="mediaUrl">Atau masukkan URL</Label>
                              <Input
                                id="mediaUrl"
                                value={tvConfig.mediaUrl}
                                onChange={(e) =>
                                  setTVConfig({ ...tvConfig, mediaUrl: e.target.value })
                                }
                                placeholder={tvConfig.mediaMode === 'video' ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg'}
                              />
                            </div>
                          </div>
                        )}

                        {/* Slideshow Mode */}
                        {tvConfig.mediaMode === 'slideshow' && (
                          <div className="space-y-3">
                            <Label>Pilih Gambar untuk Slideshow</Label>
                            <SlideshowSelector
                              selectedImages={tvConfig.slideshowImages || []}
                              onSelect={(images) =>
                                setTVConfig({ ...tvConfig, slideshowImages: images })
                              }
                            />
                            <div className="space-y-2">
                              <Label>Interval Slideshow (detik)</Label>
                              <Select
                                value={String(tvConfig.slideshowInterval || 5)}
                                onValueChange={(value) =>
                                  setTVConfig({ ...tvConfig, slideshowInterval: parseInt(value) })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">3 detik</SelectItem>
                                  <SelectItem value="5">5 detik</SelectItem>
                                  <SelectItem value="10">10 detik</SelectItem>
                                  <SelectItem value="15">15 detik</SelectItem>
                                  <SelectItem value="30">30 detik</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Animasi Transisi</Label>
                              <Select
                                value={tvConfig.slideshowAnimation || 'fade'}
                                onValueChange={(value) =>
                                  setTVConfig({ ...tvConfig, slideshowAnimation: value as 'fade' | 'slide' | 'zoom' | 'slideUp' })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fade">Fade (Memudar)</SelectItem>
                                  <SelectItem value="slide">Slide Kiri-Kanan</SelectItem>
                                  <SelectItem value="slideUp">Slide Atas-Bawah</SelectItem>
                                  <SelectItem value="zoom">Zoom (Perbesar)</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Pilih efek transisi antar gambar slideshow
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Running Text Settings */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  </div>

                  {/* Info Panel Settings */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div className="space-y-2">
                      <Label>Konten Panel Info</Label>
                      <p className="text-sm text-muted-foreground">
                        Pilih apa yang ditampilkan di area panel (samping/bawah antrian) pada display.
                      </p>
                      <Select
                        value={tvConfig.infoPanelType || 'media'}
                        onValueChange={(value) =>
                          setTVConfig({ ...tvConfig, infoPanelType: value as TVDisplayConfig['infoPanelType'] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="media">Media (Gambar/Video/Slideshow)</SelectItem>
                          <SelectItem value="product_rates">Tabel Suku Bunga Produk</SelectItem>
                          <SelectItem value="deposit_rates">Tabel Suku Bunga Deposito</SelectItem>
                          <SelectItem value="exchange_rates">Tabel Kurs Mata Uang</SelectItem>
                          <SelectItem value="rotate">Rotasi Otomatis (semua aktif)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {tvConfig.infoPanelType === 'rotate' && (
                      <div className="space-y-2">
                        <Label>Interval Rotasi (detik)</Label>
                        <Select
                          value={String(tvConfig.infoPanelRotateInterval || 10)}
                          onValueChange={(value) =>
                            setTVConfig({ ...tvConfig, infoPanelRotateInterval: parseInt(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 detik</SelectItem>
                            <SelectItem value="10">10 detik</SelectItem>
                            <SelectItem value="15">15 detik</SelectItem>
                            <SelectItem value="20">20 detik</SelectItem>
                            <SelectItem value="30">30 detik</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Product Rates Editor */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Suku Bunga Produk</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            setTVConfig({
                              ...tvConfig,
                              productRates: [...(tvConfig.productRates || []), { name: '', rate: '', note: '' }],
                            })
                          }
                        >
                          <Plus size={16} /> Tambah
                        </Button>
                      </div>
                      <div className="grid grid-cols-[1.5fr_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground">
                        <span>Nama Produk</span><span>Bunga</span><span>Catatan</span><span></span>
                      </div>
                      {(tvConfig.productRates || []).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_40px] gap-2">
                          <Input
                            value={row.name}
                            placeholder="Tabungan Simpeda"
                            onChange={(e) => {
                              const arr = [...(tvConfig.productRates || [])];
                              arr[idx] = { ...row, name: e.target.value };
                              setTVConfig({ ...tvConfig, productRates: arr });
                            }}
                          />
                          <Input
                            value={row.rate}
                            placeholder="1.00%"
                            onChange={(e) => {
                              const arr = [...(tvConfig.productRates || [])];
                              arr[idx] = { ...row, rate: e.target.value };
                              setTVConfig({ ...tvConfig, productRates: arr });
                            }}
                          />
                          <Input
                            value={row.note || ''}
                            placeholder="p.a"
                            onChange={(e) => {
                              const arr = [...(tvConfig.productRates || [])];
                              arr[idx] = { ...row, note: e.target.value };
                              setTVConfig({ ...tvConfig, productRates: arr });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              setTVConfig({
                                ...tvConfig,
                                productRates: (tvConfig.productRates || []).filter((_, i) => i !== idx),
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Deposit Rates Editor */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Suku Bunga Deposito</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            setTVConfig({
                              ...tvConfig,
                              depositRates: [...(tvConfig.depositRates || []), { tenor: '', rate: '' }],
                            })
                          }
                        >
                          <Plus size={16} /> Tambah
                        </Button>
                      </div>
                      <div className="grid grid-cols-[1.5fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground">
                        <span>Tenor</span><span>Bunga</span><span></span>
                      </div>
                      {(tvConfig.depositRates || []).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1.5fr_1fr_40px] gap-2">
                          <Input
                            value={row.tenor}
                            placeholder="3 Bulan"
                            onChange={(e) => {
                              const arr = [...(tvConfig.depositRates || [])];
                              arr[idx] = { ...row, tenor: e.target.value };
                              setTVConfig({ ...tvConfig, depositRates: arr });
                            }}
                          />
                          <Input
                            value={row.rate}
                            placeholder="3.50%"
                            onChange={(e) => {
                              const arr = [...(tvConfig.depositRates || [])];
                              arr[idx] = { ...row, rate: e.target.value };
                              setTVConfig({ ...tvConfig, depositRates: arr });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              setTVConfig({
                                ...tvConfig,
                                depositRates: (tvConfig.depositRates || []).filter((_, i) => i !== idx),
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Exchange Rates Editor */}
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <Label>Kurs Mata Uang</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() =>
                            setTVConfig({
                              ...tvConfig,
                              exchangeRates: [...(tvConfig.exchangeRates || []), { currency: '', buy: '', sell: '' }],
                            })
                          }
                        >
                          <Plus size={16} /> Tambah
                        </Button>
                      </div>
                      <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground">
                        <span>Mata Uang</span><span>Beli</span><span>Jual</span><span></span>
                      </div>
                      {(tvConfig.exchangeRates || []).map((row, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2">
                          <Input
                            value={row.currency}
                            placeholder="USD"
                            onChange={(e) => {
                              const arr = [...(tvConfig.exchangeRates || [])];
                              arr[idx] = { ...row, currency: e.target.value };
                              setTVConfig({ ...tvConfig, exchangeRates: arr });
                            }}
                          />
                          <Input
                            value={row.buy}
                            placeholder="15.800"
                            onChange={(e) => {
                              const arr = [...(tvConfig.exchangeRates || [])];
                              arr[idx] = { ...row, buy: e.target.value };
                              setTVConfig({ ...tvConfig, exchangeRates: arr });
                            }}
                          />
                          <Input
                            value={row.sell}
                            placeholder="16.000"
                            onChange={(e) => {
                              const arr = [...(tvConfig.exchangeRates || [])];
                              arr[idx] = { ...row, sell: e.target.value };
                              setTVConfig({ ...tvConfig, exchangeRates: arr });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              setTVConfig({
                                ...tvConfig,
                                exchangeRates: (tvConfig.exchangeRates || []).filter((_, i) => i !== idx),
                              })
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Tambah baris untuk setiap mata uang (USD, SGD, EUR, dll). Tidak terbatas jumlahnya.
                      </p>
                    </div>
                  </div>

                  {/* Running Text Settings (continued) */}
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="showRunningText">Running Text</Label>
                        <p className="text-sm text-muted-foreground">
                          Tampilkan informasi berjalan di bawah layar
                        </p>
                      </div>
                      <Switch
                        id="showRunningText"
                        checked={tvConfig.showRunningText}
                        onCheckedChange={(checked) =>
                          setTVConfig({ ...tvConfig, showRunningText: checked })
                        }
                      />
                    </div>

                    {tvConfig.showRunningText && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="runningText">Isi Running Text</Label>
                          <Textarea
                            id="runningText"
                            value={tvConfig.runningText}
                            onChange={(e) =>
                              setTVConfig({ ...tvConfig, runningText: e.target.value })
                            }
                            placeholder="Suku Bunga Deposito: 1 Bulan 3.25% | 3 Bulan 3.50%..."
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Warna Teks</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={tvConfig.runningTextColor || '#ffffff'}
                                onChange={(e) =>
                                  setTVConfig({ ...tvConfig, runningTextColor: e.target.value })
                                }
                                className="w-10 h-10 rounded cursor-pointer border"
                              />
                              <Input
                                value={tvConfig.runningTextColor || '#ffffff'}
                                onChange={(e) =>
                                  setTVConfig({ ...tvConfig, runningTextColor: e.target.value })
                                }
                                placeholder="#ffffff"
                                className="flex-1"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Warna Background</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={tvConfig.runningTextBgColor || '#f59e0b'}
                                onChange={(e) =>
                                  setTVConfig({ ...tvConfig, runningTextBgColor: e.target.value })
                                }
                                className="w-10 h-10 rounded cursor-pointer border"
                              />
                              <Input
                                value={tvConfig.runningTextBgColor || '#f59e0b'}
                                onChange={(e) =>
                                  setTVConfig({ ...tvConfig, runningTextBgColor: e.target.value })
                                }
                                placeholder="#f59e0b"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Preview */}
                        <div className="space-y-2">
                          <Label>Preview Running Text</Label>
                          <div 
                            className="rounded-lg p-2 text-center font-bold"
                            style={{
                              backgroundColor: tvConfig.runningTextBgColor || '#f59e0b',
                              color: tvConfig.runningTextColor || '#ffffff',
                            }}
                          >
                            📢 Preview Running Text
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Kecepatan</Label>
                          <Select
                            value={tvConfig.runningTextSpeed}
                            onValueChange={(value: 'slow' | 'medium' | 'fast') =>
                              setTVConfig({ ...tvConfig, runningTextSpeed: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slow">Lambat</SelectItem>
                              <SelectItem value="medium">Sedang</SelectItem>
                              <SelectItem value="fast">Cepat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>

                  <Button onClick={handleSaveTVConfig} className="w-full gap-2">
                    <Save size={18} />
                    Simpan Pengaturan Display TV
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="voice">
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan Suara</CardTitle>
                  <CardDescription>
                    Kustomisasi suara panggilan antrian dengan pelafalan Indonesia yang benar (A001 → A nol nol satu)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!voiceConfig ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                        <div className="space-y-2">
                          <Label>Pilih Suara</Label>
                          <p className="text-sm text-muted-foreground mb-3">
                            Pilih suara dari browser Anda. Suara Indonesia direkomendasikan.
                          </p>
                          <Select
                            value={voiceConfig.voiceName || 'default'}
                            onValueChange={(value) => {
                              setVoiceConfig({
                                ...voiceConfig,
                                voiceName: value === 'default' ? '' : value,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih suara..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Otomatis (Indonesia)</SelectItem>
                              {availableVoices.map((voice) => (
                                <SelectItem key={voice.name} value={voice.name}>
                                  {voice.name} ({voice.lang})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Kecepatan Pelafalan</Label>
                        <Select
                          value={voiceConfig.speed}
                          onValueChange={(value: 'slow' | 'normal' | 'fast') =>
                            setVoiceConfig({ ...voiceConfig, speed: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="slow">Lambat</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="fast">Cepat</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Pronunciation Mapping Section */}
                      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Pengaturan Pelafalan</Label>
                            <p className="text-sm text-muted-foreground">
                              Ubah cara TTS membaca kata tertentu. Contoh: "Customer Service" → dibaca "Kastamer Servis"
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPronunciations = [...(voiceConfig.pronunciations || []), { original: '', spoken: '' }];
                              setVoiceConfig({ ...voiceConfig, pronunciations: newPronunciations });
                            }}
                            className="gap-1"
                          >
                            <Plus size={16} />
                            Tambah
                          </Button>
                        </div>

                        {/* Column Headers */}
                        <div className="grid grid-cols-[1fr_1fr_40px] gap-2 text-sm font-medium text-muted-foreground">
                          <span>Teks di Sistem</span>
                          <span>Diucapkan Sebagai</span>
                          <span></span>
                        </div>

                        <div className="space-y-3">
                          {(voiceConfig.pronunciations || []).map((mapping, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Contoh: Teller"
                                  value={mapping.original}
                                  onChange={(e) => {
                                    const newPronunciations = [...(voiceConfig.pronunciations || [])];
                                    newPronunciations[index] = { ...mapping, original: e.target.value };
                                    setVoiceConfig({ ...voiceConfig, pronunciations: newPronunciations });
                                  }}
                                />
                                <Input
                                  placeholder="Contoh: Teler"
                                  value={mapping.spoken}
                                  onChange={(e) => {
                                    const newPronunciations = [...(voiceConfig.pronunciations || [])];
                                    newPronunciations[index] = { ...mapping, spoken: e.target.value };
                                    setVoiceConfig({ ...voiceConfig, pronunciations: newPronunciations });
                                  }}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newPronunciations = (voiceConfig.pronunciations || []).filter((_, i) => i !== index);
                                  setVoiceConfig({ ...voiceConfig, pronunciations: newPronunciations });
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          ))}
                          {(!voiceConfig.pronunciations || voiceConfig.pronunciations.length === 0) && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Belum ada pengaturan pelafalan khusus. TTS akan membaca teks apa adanya.
                            </p>
                          )}
                        </div>

                        {/* Info box */}
                        <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
                          <strong>Tips:</strong> Jika ingin "Teller" dibaca persis "Teller" (bukan "Teler"), hapus baris Teller di atas dengan klik ikon sampah. Pengaturan ini mengubah pelafalan, bukan teks yang ditampilkan.
                        </div>
                      </div>

                      {/* Custom Audio Section */}
                      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="useCustomAudio">Gunakan Audio Rekaman</Label>
                            <p className="text-sm text-muted-foreground">
                              Gunakan rekaman suara untuk kata-kata tertentu, TTS hanya untuk nomor antrian
                            </p>
                          </div>
                          <Switch
                            id="useCustomAudio"
                            checked={voiceConfig.useCustomAudio}
                            onCheckedChange={(checked) =>
                              setVoiceConfig({ ...voiceConfig, useCustomAudio: checked })
                            }
                          />
                        </div>

                        {voiceConfig.useCustomAudio && (
                          <AudioPhraseUploader
                            phrases={voiceConfig.customAudioPhrases || []}
                            onUpdate={(phrases) =>
                              setVoiceConfig({ ...voiceConfig, customAudioPhrases: phrases })
                            }
                          />
                        )}
                      </div>

                      <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm text-foreground">
                          <strong>Contoh pelafalan:</strong><br />
                          A001 → "A nol nol satu"<br />
                          B123 → "B seratus dua puluh tiga"<br />
                          {voiceConfig.useCustomAudio ? (
                            <>Format: [Rekaman "Nomor Antrian"] + [TTS A001] + [Rekaman "Silakan Menuju ke"] + [Rekaman "Teller/CS"]</>
                          ) : (
                            <>Customer Service → "Kastamer Servis" (jika diatur)</>
                          )}
                        </p>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          onClick={handleTestVoice}
                          className="w-full gap-2"
                        >
                          <Volume2 size={18} />
                          Test Suara
                        </Button>
                      </div>

                      <Button 
                        onClick={handleSaveVoiceConfig} 
                        className="w-full gap-2"
                        disabled={isSavingVoiceConfig}
                      >
                        {isSavingVoiceConfig ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Save size={18} />
                        )}
                        Simpan Pengaturan Suara
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="printer">
              <PrinterSetup />
            </TabsContent>

            <TabsContent value="print">
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan Cetak</CardTitle>
                  <CardDescription>
                    Kustomisasi format tiket antrian
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Ukuran Kertas</Label>
                    <Select
                      value={printConfig.paperSize}
                      onValueChange={(value: '58mm' | '80mm') =>
                        setPrintConfig({ ...printConfig, paperSize: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58mm">58mm (Kecil)</SelectItem>
                        <SelectItem value="80mm">80mm (Standar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showLogo">Tampilkan Logo</Label>
                      <p className="text-sm text-muted-foreground">
                        Tampilkan nama bank di bagian atas tiket
                      </p>
                    </div>
                    <Switch
                      id="showLogo"
                      checked={printConfig.showLogo}
                      onCheckedChange={(checked) =>
                        setPrintConfig({ ...printConfig, showLogo: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchType">Nama Brand</Label>
                    <Input
                      id="branchType"
                      value={printConfig.branchType}
                      onChange={(e) =>
                        setPrintConfig({ ...printConfig, branchType: e.target.value })
                      }
                      placeholder="Bankaltimtara"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankName">Nama Bank Lengkap</Label>
                    <Textarea
                      id="bankName"
                      value={printConfig.bankName}
                      onChange={(e) =>
                        setPrintConfig({ ...printConfig, bankName: e.target.value })
                      }
                      placeholder="PT BANK PEMBANGUNAN DAERAH..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchName">Nama Cabang</Label>
                    <Input
                      id="branchName"
                      value={printConfig.branchName}
                      onChange={(e) =>
                        setPrintConfig({ ...printConfig, branchName: e.target.value })
                      }
                      placeholder="KCP KELAS 2 TELIHAN"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="footerMessage">Pesan Footer</Label>
                    <Textarea
                      id="footerMessage"
                      value={printConfig.footerMessage}
                      onChange={(e) =>
                        setPrintConfig({ ...printConfig, footerMessage: e.target.value })
                      }
                      placeholder="Jika nomor anda terlewat..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ukuran Font Nomor Antrian</Label>
                    <Select
                      value={printConfig.fontSize}
                      onValueChange={(value: 'small' | 'medium' | 'large') =>
                        setPrintConfig({ ...printConfig, fontSize: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Kecil (36pt)</SelectItem>
                        <SelectItem value="medium">Sedang (42pt)</SelectItem>
                        <SelectItem value="large">Besar (48pt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleSavePrintConfig} className="w-full gap-2">
                    <Save size={18} />
                    Simpan Pengaturan Cetak
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queue">
              <Card>
                <CardHeader>
                  <CardTitle>Pengaturan Antrian</CardTitle>
                  <CardDescription>
                    Kelola dan reset antrian secara manual
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-primary/10 p-6 text-center">
                      <p className="text-sm text-muted-foreground">Antrian CS</p>
                      <p className="mt-2 text-4xl font-bold text-primary">
                        {queueState?.cs_queue ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl bg-secondary/10 p-6 text-center">
                      <p className="text-sm text-muted-foreground">Antrian Teller</p>
                      <p className="mt-2 text-4xl font-bold text-secondary">
                        {queueState?.teller_queue ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <p className="mb-4 text-sm text-muted-foreground">
                      Reset akan menghapus semua antrian hari ini. Antrian akan direset otomatis setiap pergantian hari.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleResetQueue}
                      className="w-full gap-2"
                    >
                      <RotateCcw size={18} />
                      Reset Semua Antrian
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Navigation />
    </div>
  );
};

export default Konfigurasi;
