import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchQueueHistory, QueueHistoryEntry } from "@/lib/queueHistory";
import { Calendar, Download, TrendingUp, Users, Loader2 } from "lucide-react";

const RANGE_OPTIONS = [
  { label: "7 hari terakhir", value: 7 },
  { label: "30 hari terakhir", value: 30 },
  { label: "90 hari terakhir", value: 90 },
  { label: "1 tahun terakhir", value: 365 },
];

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const QueueHistory = () => {
  const [history, setHistory] = useState<QueueHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetchQueueHistory(range)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [range]);

  const stats = useMemo(() => {
    const totalCS = history.reduce((s, h) => s + h.cs_total, 0);
    const totalTeller = history.reduce((s, h) => s + h.teller_total, 0);
    const totalServedCS = history.reduce((s, h) => s + h.cs_served, 0);
    const totalServedTeller = history.reduce((s, h) => s + h.teller_served, 0);
    const days = history.length || 1;
    return {
      totalCS,
      totalTeller,
      totalServedCS,
      totalServedTeller,
      avgPerDay: Math.round((totalCS + totalTeller) / days),
      busiest: history.reduce<QueueHistoryEntry | null>(
        (max, h) =>
          !max || h.cs_total + h.teller_total > max.cs_total + max.teller_total
            ? h
            : max,
        null
      ),
    };
  }, [history]);

  const downloadCSV = () => {
    const header = "Tanggal,Total CS,CS Dilayani,Total Teller,Teller Dilayani\n";
    const rows = history
      .map(
        (h) =>
          `${h.business_date},${h.cs_total},${h.cs_served},${h.teller_total},${h.teller_served}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `riwayat-antrian-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-32 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Riwayat Antrian</h1>
            <p className="text-muted-foreground">
              Arsip antrian harian (otomatis tersimpan sebelum reset jam 6 pagi)
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={String(range)} onValueChange={(v) => setRange(Number(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={downloadCSV} disabled={!history.length}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>
        </header>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total CS</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalCS}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalServedCS} dilayani
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total Teller</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.totalTeller}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalServedTeller} dilayani
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Rata-rata/Hari</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.avgPerDay}</p>
            <p className="text-xs text-muted-foreground">antrian</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Hari Tersibuk</span>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {stats.busiest
                ? stats.busiest.cs_total + stats.busiest.teller_total
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.busiest
                ? new Date(stats.busiest.business_date + "T00:00:00").toLocaleDateString(
                    "id-ID",
                    { day: "numeric", month: "short" }
                  )
                : "-"}
            </p>
          </Card>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>Belum ada riwayat antrian.</p>
              <p className="text-sm">
                Data akan otomatis tersimpan setiap hari sebelum reset jam 6 pagi.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">CS</TableHead>
                  <TableHead className="text-right">CS Dilayani</TableHead>
                  <TableHead className="text-right">Teller</TableHead>
                  <TableHead className="text-right">Teller Dilayani</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">
                      {formatDate(h.business_date)}
                    </TableCell>
                    <TableCell className="text-right">{h.cs_total}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {h.cs_served}
                    </TableCell>
                    <TableCell className="text-right">{h.teller_total}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {h.teller_served}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {h.cs_total + h.teller_total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
      <Navigation />
    </div>
  );
};

export default QueueHistory;