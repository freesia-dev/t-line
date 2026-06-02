import { useEffect, useMemo, useState } from "react";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { fetchQueueHistory, QueueHistoryEntry } from "@/lib/queueHistory";
import { Calendar, Download, TrendingUp, Users, Loader2, FileSpreadsheet, FileText, FileType2 } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoBank from "@/assets/logo-bankaltimtara.png";
import { toast } from "sonner";

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

  const rangeLabel =
    RANGE_OPTIONS.find((r) => r.value === range)?.label ?? `${range} hari terakhir`;

  const todayStr = new Date().toISOString().split("T")[0];
  const fileBase = `riwayat-antrian-${todayStr}`;

  const downloadCSV = () => {
    const header = "Tanggal,Total CS,CS Dilayani,Total Teller,Teller Dilayani,Total\n";
    const rows = history
      .map(
        (h) =>
          `${h.business_date},${h.cs_total},${h.cs_served},${h.teller_total},${h.teller_served},${h.cs_total + h.teller_total}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diunduh");
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Ringkasan
    const summaryRows: (string | number)[][] = [
      ["LAPORAN RIWAYAT ANTRIAN"],
      ["Bankaltimtara — KCP Kelas 2 Telihan"],
      [],
      ["Periode", rangeLabel],
      ["Dicetak", new Date().toLocaleString("id-ID")],
      ["Jumlah hari", history.length],
      [],
      ["RINGKASAN"],
      ["Kategori", "Total Antrian", "Dilayani", "Tingkat Layanan"],
      [
        "Customer Service",
        stats.totalCS,
        stats.totalServedCS,
        stats.totalCS ? stats.totalServedCS / stats.totalCS : 0,
      ],
      [
        "Teller",
        stats.totalTeller,
        stats.totalServedTeller,
        stats.totalTeller ? stats.totalServedTeller / stats.totalTeller : 0,
      ],
      [
        "TOTAL",
        stats.totalCS + stats.totalTeller,
        stats.totalServedCS + stats.totalServedTeller,
        stats.totalCS + stats.totalTeller
          ? (stats.totalServedCS + stats.totalServedTeller) /
            (stats.totalCS + stats.totalTeller)
          : 0,
      ],
      [],
      ["Rata-rata per hari", stats.avgPerDay, "antrian"],
      [
        "Hari tersibuk",
        stats.busiest
          ? new Date(stats.busiest.business_date + "T00:00:00").toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "-",
        stats.busiest ? stats.busiest.cs_total + stats.busiest.teller_total : 0,
      ],
    ];
    const wsSum = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSum["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 18 }];
    wsSum["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ];
    // Percent format on service rate column
    ["D10", "D11", "D12"].forEach((cell) => {
      if (wsSum[cell]) wsSum[cell].z = "0.0%";
    });
    XLSX.utils.book_append_sheet(wb, wsSum, "Ringkasan");

    // Sheet 2 — Detail Harian
    const detailHeader = [
      "Tanggal",
      "Hari",
      "CS",
      "CS Dilayani",
      "Teller",
      "Teller Dilayani",
      "Total",
    ];
    const detailRows = history.map((h) => {
      const d = new Date(h.business_date + "T00:00:00");
      return [
        h.business_date,
        d.toLocaleDateString("id-ID", { weekday: "long" }),
        h.cs_total,
        h.cs_served,
        h.teller_total,
        h.teller_served,
        h.cs_total + h.teller_total,
      ];
    });
    const totalRow = [
      "TOTAL",
      "",
      stats.totalCS,
      stats.totalServedCS,
      stats.totalTeller,
      stats.totalServedTeller,
      stats.totalCS + stats.totalTeller,
    ];
    const wsDetail = XLSX.utils.aoa_to_sheet([detailHeader, ...detailRows, totalRow]);
    wsDetail["!cols"] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 8 },
      { wch: 14 },
      { wch: 10 },
    ];
    // Freeze header
    wsDetail["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Harian");

    XLSX.writeFile(wb, `${fileBase}.xlsx`);
    toast.success("Excel berhasil diunduh");
  };

  const downloadPDF = async () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    // Header band
    doc.setFillColor(30, 64, 175); // primary blue
    doc.rect(0, 0, pageWidth, 90, "F");

    // Logo
    try {
      doc.addImage(logoBank, "PNG", margin, 20, 50, 50);
    } catch {
      /* ignore */
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Laporan Riwayat Antrian", margin + 65, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Bankaltimtara — KCP Kelas 2 Telihan", margin + 65, 60);
    doc.setFontSize(9);
    doc.text(
      `Periode: ${rangeLabel}  •  Dicetak: ${new Date().toLocaleString("id-ID")}`,
      margin + 65,
      76
    );

    // Reset color
    doc.setTextColor(20, 20, 20);

    // Summary cards
    let y = 115;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Ringkasan", margin, y);
    y += 10;

    const cardW = (pageWidth - margin * 2 - 24) / 4;
    const cardH = 60;
    const cardY = y + 6;
    const cards = [
      { label: "Total CS", value: stats.totalCS, sub: `${stats.totalServedCS} dilayani` },
      { label: "Total Teller", value: stats.totalTeller, sub: `${stats.totalServedTeller} dilayani` },
      { label: "Rata-rata/Hari", value: stats.avgPerDay, sub: "antrian" },
      {
        label: "Hari Tersibuk",
        value: stats.busiest ? stats.busiest.cs_total + stats.busiest.teller_total : 0,
        sub: stats.busiest
          ? new Date(stats.busiest.business_date + "T00:00:00").toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            })
          : "-",
      },
    ];
    cards.forEach((c, i) => {
      const x = margin + i * (cardW + 8);
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(x, cardY, cardW, cardH, 6, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(c.label, x + 10, cardY + 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.text(String(c.value), x + 10, cardY + 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(c.sub, x + 10, cardY + 52);
    });

    // Detail table
    autoTable(doc, {
      startY: cardY + cardH + 20,
      head: [["Tanggal", "Hari", "CS", "CS Dilayani", "Teller", "Teller Dilayani", "Total"]],
      body: history.map((h) => {
        const d = new Date(h.business_date + "T00:00:00");
        return [
          d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
          d.toLocaleDateString("id-ID", { weekday: "long" }),
          String(h.cs_total),
          String(h.cs_served),
          String(h.teller_total),
          String(h.teller_served),
          String(h.cs_total + h.teller_total),
        ];
      }),
      foot: [
        [
          "TOTAL",
          "",
          String(stats.totalCS),
          String(stats.totalServedCS),
          String(stats.totalTeller),
          String(stats.totalServedTeller),
          String(stats.totalCS + stats.totalTeller),
        ],
      ],
      styles: { font: "helvetica", fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      footStyles: { fillColor: [243, 244, 246], textColor: 17, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 70 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        const pageCount = doc.getNumberOfPages();
        const pageCurrent = doc.getCurrentPageInfo().pageNumber;
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Halaman ${pageCurrent} dari ${pageCount}  •  T-Line Antrian`,
          pageWidth / 2,
          pageH - 15,
          { align: "center" }
        );
      },
    });

    doc.save(`${fileBase}.pdf`);
    toast.success("PDF berhasil diunduh");
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