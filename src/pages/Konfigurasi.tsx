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
import {
  getPrintConfig,
  savePrintConfig,
  getDisplayConfig,
  saveDisplayConfig,
  getTVDisplayConfig,
  saveTVDisplayConfig,
  getVoiceConfig,
  saveVoiceConfig,
  getQueueState,
  resetQueue,
  PrintConfig,
  DisplayConfig,
  TVDisplayConfig,
  VoiceConfig,
  ELEVENLABS_VOICES,
} from '@/lib/queueStore';
import { toast } from 'sonner';
import { RotateCcw, Save, Printer, Monitor, Tv, ExternalLink, Volume2 } from 'lucide-react';

const Konfigurasi = () => {
  const [printConfig, setPrintConfig] = useState<PrintConfig>(getPrintConfig());
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(getDisplayConfig());
  const [tvConfig, setTVConfig] = useState<TVDisplayConfig>(getTVDisplayConfig());
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(getVoiceConfig());
  const [queueState, setQueueState] = useState(getQueueState());

  useEffect(() => {
    setQueueState(getQueueState());
  }, []);

  const handleSavePrintConfig = () => {
    savePrintConfig(printConfig);
    toast.success('Konfigurasi cetak berhasil disimpan');
  };

  const handleSaveDisplayConfig = () => {
    saveDisplayConfig(displayConfig);
    toast.success('Konfigurasi tampilan berhasil disimpan');
  };

  const handleSaveTVConfig = () => {
    saveTVDisplayConfig(tvConfig);
    toast.success('Konfigurasi display TV berhasil disimpan');
  };

  const handleSaveVoiceConfig = () => {
    saveVoiceConfig(voiceConfig);
    toast.success('Konfigurasi suara berhasil disimpan');
  };

  const handleTestVoice = async () => {
    const { announceQueue } = await import('@/lib/audioUtils');
    await announceQueue('A001', 'Teller 1');
  };

  const handleResetQueue = () => {
    if (confirm('Apakah Anda yakin ingin mereset semua antrian?')) {
      resetQueue();
      setQueueState(getQueueState());
      toast.success('Antrian berhasil direset');
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="display" className="gap-2">
                <Monitor size={16} />
                Kiosk
              </TabsTrigger>
              <TabsTrigger value="tv" className="gap-2">
                <Tv size={16} />
                Display TV
              </TabsTrigger>
              <TabsTrigger value="voice" className="gap-2">
                <Volume2 size={16} />
                Suara
              </TabsTrigger>
              <TabsTrigger value="print" className="gap-2">
                <Printer size={16} />
                Cetak
              </TabsTrigger>
              <TabsTrigger value="queue" className="gap-2">
                <RotateCcw size={16} />
                Antrian
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
                        <div className="space-y-2">
                          <Label>Pilih Media</Label>
                          <MediaUploader
                            selectedUrl={tvConfig.mediaUrl}
                            onSelect={(url, type) =>
                              setTVConfig({ ...tvConfig, mediaUrl: url, mediaType: type })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tipe Media Terpilih</Label>
                          <Select
                            value={tvConfig.mediaType}
                            onValueChange={(value: 'image' | 'video') =>
                              setTVConfig({ ...tvConfig, mediaType: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="image">Gambar/Poster</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="mediaUrl">Atau masukkan URL Media</Label>
                          <Input
                            id="mediaUrl"
                            value={tvConfig.mediaUrl}
                            onChange={(e) =>
                              setTVConfig({ ...tvConfig, mediaUrl: e.target.value })
                            }
                            placeholder="https://example.com/poster.jpg"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Running Text Settings */}
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
                    Kustomisasi suara panggilan antrian menggunakan ElevenLabs TTS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="useBrowserTTS">Gunakan Browser TTS</Label>
                      <p className="text-sm text-muted-foreground">
                        Gunakan TTS bawaan browser (gratis, kualitas standar)
                      </p>
                    </div>
                    <Switch
                      id="useBrowserTTS"
                      checked={voiceConfig.useBrowserTTS}
                      onCheckedChange={(checked) =>
                        setVoiceConfig({ ...voiceConfig, useBrowserTTS: checked })
                      }
                    />
                  </div>

                  {!voiceConfig.useBrowserTTS && (
                    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-2">
                        <Label>Pilih Suara ElevenLabs</Label>
                        <p className="text-sm text-muted-foreground mb-3">
                          Suara AI berkualitas tinggi untuk panggilan antrian
                        </p>
                        <Select
                          value={voiceConfig.voiceId}
                          onValueChange={(value) => {
                            const voice = ELEVENLABS_VOICES.find(v => v.id === value);
                            setVoiceConfig({
                              ...voiceConfig,
                              voiceId: value,
                              voiceName: voice?.name || 'Unknown',
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih suara..." />
                          </SelectTrigger>
                          <SelectContent>
                            {ELEVENLABS_VOICES.map((voice) => (
                              <SelectItem key={voice.id} value={voice.id}>
                                {voice.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                    </div>
                  )}

                  <Button onClick={handleSaveVoiceConfig} className="w-full gap-2">
                    <Save size={18} />
                    Simpan Pengaturan Suara
                  </Button>
                </CardContent>
              </Card>
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
                        {queueState.csQueue}
                      </p>
                    </div>
                    <div className="rounded-xl bg-secondary/10 p-6 text-center">
                      <p className="text-sm text-muted-foreground">Antrian Teller</p>
                      <p className="mt-2 text-4xl font-bold text-secondary">
                        {queueState.tellerQueue}
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
