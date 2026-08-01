'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RefreshCw,
  Table as TableIcon,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'

type WizardStep = 'upload' | 'mapping' | 'results'

interface ColumnMapping {
  ticket: string
  symbol: string
  direction: string
  volume: string
  openPrice: string
  closePrice: string
  openTime: string
  closeTime: string
  pnl: string
  sl: string
  tp: string
}

const DEFAULT_MAPPING: ColumnMapping = {
  ticket:     'Ticket',
  symbol:     'Item / Symbol',
  direction:  'Type',
  volume:     'Volume / Size',
  openPrice:  'Price Open',
  closePrice: 'Price Close',
  openTime:   'Time Open',
  closeTime:  'Time Close',
  pnl:        'Profit / PnL',
  sl:         'S / L',
  tp:         'T / P',
}

const DUMMY_PREVIEW_ROWS = [
  { ticket: '51294821', symbol: 'XAUUSD', direction: 'buy',  volume: '0.10', openPrice: '2415.50', closePrice: '2422.30', openTime: '2026-07-28 14:30:00', closeTime: '2026-07-28 16:45:00', pnl: '68.00',  sl: '2410.00', tp: '2430.00' },
  { ticket: '51294822', symbol: 'EURUSD', direction: 'sell', volume: '0.50', openPrice: '1.08850', closePrice: '1.08620', openTime: '2026-07-29 09:15:00', closeTime: '2026-07-29 11:20:00', pnl: '115.00', sl: '1.09100', tp: '1.08400' },
  { ticket: '51294823', symbol: 'GBPUSD', direction: 'buy',  volume: '0.25', openPrice: '1.28400', closePrice: '1.28150', openTime: '2026-07-29 15:00:00', closeTime: '2026-07-29 15:45:00', pnl: '-62.50', sl: '1.28150', tp: '1.28900' },
  { ticket: '51294824', symbol: 'USDJPY', direction: 'sell', volume: '0.30', openPrice: '154.200', closePrice: '153.650', openTime: '2026-07-30 08:30:00', closeTime: '2026-07-30 13:10:00', pnl: '110.00', sl: '154.800', tp: '153.200' },
]

export default function ImportCsvPage() {
  const router = useRouter()
  const [step, setStep] = useState<WizardStep>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showErrorDetails, setShowErrorDetails] = useState(false)

  // Dummy result stats
  const [importSummary, setImportSummary] = useState({
    totalRows:    15,
    imported:     11,
    skipped:      3,
    failed:       1,
    failedDetail: [
      { row: 12, data: '51294830, UNKNOWN, buy, N/A', reason: 'Format harga Open Price tidak valid' },
    ],
  })

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSelectFile(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSelectFile(file)
  }

  const validateAndSelectFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.name.endsWith('.txt')) {
      toast('Format file harus berupa CSV (.csv)', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast('Ukuran file maksimal 10MB', 'error')
      return
    }
    setSelectedFile(file)
    toast(`File "${file.name}" berhasil diunggah!`, 'success')
    setStep('mapping')
  }

  const handleConfirmImport = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      toast('Proses import CSV selesai!', 'success')
      setStep('results')
    }, 1200)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Nav Back */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Link
          href="/mt5"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Hubungkan MT5
        </Link>
        <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
          Import Fallback CSV v2.0
        </span>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Import Statement CSV / Broker</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Unggah file statement ekspor CSV dari MT5 sebagai data historis atau cadangan jika koneksi EA terputus.
        </p>
      </div>

      {/* Wizard Stepper Progress */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 border-b border-border pb-4">
        {[
          { id: 'upload',  num: '1', title: 'Upload File CSV' },
          { id: 'mapping', num: '2', title: 'Preview & Mapping' },
          { id: 'results', num: '3', title: 'Ringkasan Hasil' },
        ].map((s, idx) => {
          const isActive   = step === s.id
          const isDone     = (step === 'mapping' && idx === 0) || (step === 'results' && idx <= 1)
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-2 p-2.5 sm:p-3 rounded-xl border transition-all text-xs font-medium',
                isActive
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                  : isDone
                  ? 'bg-profit/10 border-profit/30 text-profit font-semibold'
                  : 'bg-card border-border text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isDone
                    ? 'bg-profit text-profit-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className="truncate hidden sm:inline">{s.title}</span>
              <span className="truncate sm:hidden">Step {s.num}</span>
            </div>
          )
        })}
      </div>

      {/* STEP 1: Upload File */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={cn(
              'border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer bg-card',
              isDragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border hover:border-primary/50 hover:bg-muted/10'
            )}
          >
            <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center text-primary shadow-inner">
              <UploadCloud className="h-8 w-8" />
            </div>

            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Tarik &amp; Lepas File CSV MT5 di Sini
              </h3>
              <p className="text-xs text-muted-foreground">
                atau klik tombol di bawah untuk memilih file dari komputer Anda
              </p>
            </div>

            <label className="mt-2 inline-flex">
              <span className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Pilih File CSV (.csv)
              </span>
              <input
                type="file"
                accept=".csv, .txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground border-t border-border/40 w-full mt-2">
              <span>Format: <strong>.CSV</strong> (Export Terminal MT5)</span>
              <span>Batas Ukuran: <strong>Maks 10 MB</strong></span>
              <span>Dedup: <strong>Otomatis Skip Duplikat</strong></span>
            </div>
          </div>

          {/* Tutorial Ekspor MT5 */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" /> Cara Ekspor File CSV dari MetaTrader 5 (MT5):
            </h4>
            <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1.5 leading-relaxed pl-1">
              <li>Buka terminal MT5 ➔ buka jendela <strong>Toolbox</strong> di bagian bawah (`Ctrl + T`).</li>
              <li>Pilih tab <strong>History</strong> ➔ Klik kanan pada area history.</li>
              <li>Pilih rentang waktu ➔ Klik kanan ➔ Pilih **Report** ➔ **Open XML (Excel)** atau **HTML**.</li>
              <li>Simpan report dan konversi/save as ke format `.csv`.</li>
            </ol>
          </div>
        </div>
      )}

      {/* STEP 2: Preview & Mapping Kolom */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    File: {selectedFile?.name || 'mt5_statement_export.csv'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Ukuran: {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : '14.2 KB'} • 15 baris terdeteksi
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                Ganti File
              </Button>
            </div>

            {/* Column Mapping Selectors */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-primary" /> Konfirmasi Mapping Kolom Header CSV
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  { key: 'ticket',     label: 'Ticket ID (*)' },
                  { key: 'symbol',     label: 'Simbol / Pair (*)' },
                  { key: 'direction',  label: 'Arah Buy/Sell (*)' },
                  { key: 'volume',     label: 'Lot Volume (*)' },
                  { key: 'openPrice',  label: 'Harga Open (*)' },
                  { key: 'closePrice', label: 'Harga Close' },
                  { key: 'openTime',   label: 'Waktu Open (*)' },
                  { key: 'closeTime',  label: 'Waktu Close' },
                  { key: 'pnl',        label: 'PnL Profit ($)' },
                  { key: 'sl',         label: 'Stop Loss (SL)' },
                  { key: 'tp',         label: 'Take Profit (TP)' },
                ].map((col) => (
                  <div key={col.key} className="space-y-1 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                    <label className="text-[11px] font-semibold text-muted-foreground block truncate">
                      {col.label}
                    </label>
                    <select
                      value={mapping[col.key as keyof ColumnMapping]}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [col.key]: e.target.value }))}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={mapping[col.key as keyof ColumnMapping]}>
                        {mapping[col.key as keyof ColumnMapping]}
                      </option>
                      <option value="Ticket">Ticket</option>
                      <option value="Item / Symbol">Item / Symbol</option>
                      <option value="Type">Type</option>
                      <option value="Volume / Size">Volume / Size</option>
                      <option value="Price Open">Price Open</option>
                      <option value="Price Close">Price Close</option>
                      <option value="Time Open">Time Open</option>
                      <option value="Time Close">Time Close</option>
                      <option value="Profit / PnL">Profit / PnL</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Preview Table */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-foreground">Preview 4 Baris Pertama</h4>
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
                    <tr>
                      <th className="p-2.5">Ticket</th>
                      <th className="p-2.5">Symbol</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Volume</th>
                      <th className="p-2.5">Open Price</th>
                      <th className="p-2.5">Close Price</th>
                      <th className="p-2.5">Open Time</th>
                      <th className="p-2.5">PnL ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {DUMMY_PREVIEW_ROWS.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="p-2.5 font-mono">{r.ticket}</td>
                        <td className="p-2.5 font-bold">{r.symbol}</td>
                        <td className="p-2.5 font-semibold uppercase text-primary">{r.direction}</td>
                        <td className="p-2.5 font-mono">{r.volume}</td>
                        <td className="p-2.5 font-mono">{r.openPrice}</td>
                        <td className="p-2.5 font-mono">{r.closePrice}</td>
                        <td className="p-2.5 text-muted-foreground text-[11px]">{r.openTime}</td>
                        <td className={cn('p-2.5 font-mono font-bold', Number(r.pnl) >= 0 ? 'text-profit' : 'text-loss')}>
                          {Number(r.pnl) >= 0 ? `+${r.pnl}` : r.pnl}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmImport} isLoading={isProcessing}>
                Proses Import Data ({DUMMY_PREVIEW_ROWS.length} trade preview) <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Ringkasan Hasil */}
      {step === 'results' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-md space-y-6 text-center">
            <div className="h-16 w-16 rounded-full bg-profit/15 text-profit border border-profit/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-foreground">Import Statement CSV Selesai!</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Data trade dari file CSV telah diproses dan dimasukkan ke dalam database jurnal Anda.
              </p>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className="bg-profit/10 border border-profit/30 p-3.5 rounded-xl text-center space-y-0.5">
                <span className="text-profit text-xl font-extrabold font-mono block">
                  {importSummary.imported}
                </span>
                <span className="text-[11px] font-semibold text-profit">Berhasil Import</span>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-center space-y-0.5">
                <span className="text-amber-500 text-xl font-extrabold font-mono block">
                  {importSummary.skipped}
                </span>
                <span className="text-[11px] font-semibold text-amber-500">Skipped (Duplikat)</span>
              </div>

              <div className="bg-loss/10 border border-loss/30 p-3.5 rounded-xl text-center space-y-0.5">
                <span className="text-loss text-xl font-extrabold font-mono block">
                  {importSummary.failed}
                </span>
                <span className="text-[11px] font-semibold text-loss">Gagal</span>
              </div>
            </div>

            {/* Failed Rows Detail Collapsible */}
            {importSummary.failed > 0 && (
              <div className="text-left border border-destructive/30 rounded-xl p-4 bg-destructive/5 space-y-2">
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="flex items-center justify-between w-full text-xs font-bold text-destructive cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" /> Lihat Detail {importSummary.failed} Baris Gagal
                  </span>
                  {showErrorDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showErrorDetails && (
                  <div className="pt-2 border-t border-destructive/20 space-y-1.5 text-[11px]">
                    {importSummary.failedDetail.map((f, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-background p-2 rounded-lg border border-border">
                        <span className="font-mono text-foreground font-semibold">Baris #{f.row}: {f.data}</span>
                        <span className="text-destructive font-medium mt-0.5 sm:mt-0">{f.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-border">
              <Button variant="secondary" size="sm" onClick={() => { setStep('upload'); setSelectedFile(null) }}>
                <RefreshCw className="h-4 w-4 mr-1.5" /> Import File Lain
              </Button>
              <Button variant="primary" size="sm" onClick={() => router.push('/trades')}>
                Lihat Riwayat Trade <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
