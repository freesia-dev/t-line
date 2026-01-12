import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Linkedin, Instagram, Building2, Users, CreditCard, Clock } from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: 'Antrian Customer Service',
      description: 'Kelola antrian nasabah yang membutuhkan layanan CS',
    },
    {
      icon: <CreditCard className="h-6 w-6 text-secondary" />,
      title: 'Antrian Teller',
      description: 'Kelola antrian transaksi perbankan di loket teller',
    },
    {
      icon: <Clock className="h-6 w-6 text-accent" />,
      title: 'Reset Otomatis',
      description: 'Sistem antrian direset secara otomatis setiap hari',
    },
    {
      icon: <Building2 className="h-6 w-6 text-muted-foreground" />,
      title: 'Kustomisasi Penuh',
      description: 'Tampilan dan format cetak dapat disesuaikan',
    },
  ];

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
          <h1 className="mb-2 text-3xl font-bold text-foreground">Tentang Aplikasi</h1>
          <p className="mb-8 text-muted-foreground">
            Sistem Antrian Digital Bankaltimtara KCP Telihan
          </p>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Sistem Antrian Digital</CardTitle>
                <CardDescription>
                  Solusi modern untuk manajemen antrian perbankan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Aplikasi ini dirancang khusus untuk PT Bank Pembangunan Daerah Kalimantan Timur 
                  dan Kalimantan Utara (Bankaltimtara) KCP Kelas 2 Telihan. Sistem antrian digital 
                  ini membantu mengoptimalkan pelayanan nasabah dengan manajemen antrian yang 
                  efisien dan terorganisir.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Fitur Utama</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 rounded-xl bg-muted/50 p-4"
                    >
                      <div className="rounded-lg bg-background p-2 shadow-sm">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Developer</CardTitle>
                <CardDescription>
                  Aplikasi ini dibuat oleh
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-3xl font-bold text-white">
                    HF
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Haris Fadilah</h3>
                    <p className="text-muted-foreground">Developer</p>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      onClick={() => window.open('https://linkedin.com/in/harisf', '_blank')}
                    >
                      <Linkedin size={20} />
                      LinkedIn
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      onClick={() => window.open('https://instagram.com/va.ys', '_blank')}
                    >
                      <Instagram size={20} />
                      Instagram
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Sistem Antrian Bankaltimtara KCP Telihan
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Versi 1.0.0
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <Navigation />
    </div>
  );
};

export default About;
