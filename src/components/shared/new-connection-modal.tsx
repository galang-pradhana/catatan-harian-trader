'use client'

import React, { useState } from 'react'
import { Copy, Check, Download, Info, Terminal, Key, Coins, Monitor, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/shared/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { EA_DOWNLOAD_FILENAME, EA_MT4_DOWNLOAD_FILENAME } from '@/constants/mt5'
import { AccountType, Platform } from '@/types/mt5'
import { cn } from '@/lib/utils'

export interface NewConnectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConnectionCreated: () => void
}

type ModalStep = 'configure' | 'token'

export function NewConnectionModal({
  isOpen,
  onClose,
  onConnectionCreated,
}: NewConnectionModalProps) {
  const [step, setStep] = useState<ModalStep>('configure')
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [platform, setPlatform] = useState<Platform>('mt5')
  const [accountType, setAccountType] = useState<AccountType>('standard')
  const [manualName, setManualName] = useState('')
  const [initialBalance, setInitialBalance] = useState('10000')

  // Reset semua state saat modal ditutup
  const handleClose = () => {
    setStep('configure')
    setToken('')
    setCopied(false)
    setIsLoadingToken(false)
    setPlatform('mt5')
    setAccountType('standard')
    setManualName('')
    setInitialBalance('10000')
    onClose()
  }

  // Token hanya dibuat saat user klik "Buat Token & Lanjutkan" — bukan otomatis
  const handleConfirmConfig = async () => {
    setIsLoadingToken(true)
    try {
      const payload: any = { accountType, platform }
      if (platform === 'manual') {
        payload.brokerName = manualName.trim() || 'Akun Manual'
        payload.initialBalance = Number(initialBalance) || 0
      }

      const res = await fetch('/api/mt5/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        if (platform === 'manual') {
          toast(`✅ Akun manual "${manualName.trim() || 'Akun Manual'}" berhasil dibuat!`, 'success')
          onConnectionCreated()
          handleClose()
        } else if (data.token) {
          setToken(data.token)
          setStep('token')
        }
      } else {
        toast(data.message || 'Gagal membuat koneksi baru', 'error')
      }
    } catch {
      toast('Terjadi kesalahan saat menghubungi server', 'error')
    } finally {
      setIsLoadingToken(false)
    }
  }

  const handleCopyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopied(true)
    toast('API Token telah disalin ke clipboard!', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadEA = async () => {
    const isMT4 = platform === 'mt4'
    const fileName = isMT4 ? EA_MT4_DOWNLOAD_FILENAME : EA_DOWNLOAD_FILENAME
    const fileUrl = isMT4 ? '/ea/CatatanHarianTrader_MT4.mq4' : '/ea/CatatanHarianTrader.mq5'

    try {
      toast(`Mendownload ${fileName}...`, 'info')
      const res = await fetch(fileUrl)
      if (!res.ok) throw new Error(`Gagal mengambil file EA ${isMT4 ? 'MQL4' : 'MQL5'} dari server`)
      const code = await res.text()

      const element = document.createElement('a')
      const file = new Blob([code], { type: 'text/plain' })
      element.href = URL.createObjectURL(file)
      element.download = fileName
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      onConnectionCreated()
    } catch (err: any) {
      toast(err?.message || 'Gagal mendownload EA', 'error')
    }
  }

  const isMT4 = platform === 'mt4'
  const isManual = platform === 'manual'
  const targetExtension = isMT4 ? '.mq4' : '.mq5'
  const targetFolder = isMT4 ? 'MQL4/Experts/' : 'MQL5/Experts/'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Hubungkan Akun Trading Baru"
      description={
        step === 'configure'
          ? (isManual ? 'Setup rincian akun manual Anda di bawah ini.' : 'Pilih platform MetaTrader dan tipe akun Anda terlebih dahulu.')
          : 'Salin token di bawah, lalu download dan pasang EA di terminal Anda.'
      }
      className="max-w-xl"
    >
      {/* Step Indicator */}
      {!isManual && (
        <div className="flex items-center gap-2 my-3 px-0.5">
          <div className={cn(
            'flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all',
            step === 'configure'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/40 text-muted-foreground border-border line-through opacity-60'
          )}>
            <span>1</span>
            <span>Konfigurasi</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className={cn(
            'flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all',
            step === 'token'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/40 text-muted-foreground border-border opacity-60'
          )}>
            <span>2</span>
            <span>Token &amp; Pasang EA</span>
          </div>
        </div>
      )}

      {/* ─── STEP 1: Configure Platform & Account Details ─── */}
      {step === 'configure' && (
        <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Platform Selection */}
          <div className="bg-card border border-border p-3.5 rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Monitor className="h-4 w-4 text-primary" /> Pilih Platform Trading Anda:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlatform('mt4')}
                className={cn(
                  'py-2.5 px-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  platform === 'mt4'
                    ? 'bg-blue-500/15 border-blue-500 text-foreground font-bold shadow-xs'
                    : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-mono text-[10px] font-black',
                    platform === 'mt4' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    MT4
                  </span>
                </div>
                <div>
                  <span className="text-xs font-extrabold block truncate">MetaTrader 4</span>
                  <span className="text-[9px] text-muted-foreground block truncate">MQL4 EA Sync</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('mt5')}
                className={cn(
                  'py-2.5 px-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  platform === 'mt5'
                    ? 'bg-primary/15 border-primary text-foreground font-bold shadow-xs'
                    : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-mono text-[10px] font-black',
                    platform === 'mt5' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    MT5
                  </span>
                </div>
                <div>
                  <span className="text-xs font-extrabold block truncate">MetaTrader 5</span>
                  <span className="text-[9px] text-muted-foreground block truncate">MQL5 EA Sync</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlatform('manual')}
                className={cn(
                  'py-2.5 px-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  platform === 'manual'
                    ? 'bg-purple-500/15 border-purple-500 text-foreground font-bold shadow-xs'
                    : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'px-1.5 py-0.5 rounded font-mono text-[10px] font-black',
                    platform === 'manual' ? 'bg-purple-500 text-white' : 'bg-muted text-muted-foreground'
                  )}>
                    MANUAL
                  </span>
                </div>
                <div>
                  <span className="text-xs font-extrabold block truncate">Manual Entry</span>
                  <span className="text-[9px] text-muted-foreground block truncate">Tanpa EA / Token</span>
                </div>
              </button>
            </div>
          </div>

          {/* Setup Field Khusus Manual */}
          {isManual && (
            <div className="bg-card border border-purple-500/30 p-3.5 rounded-xl space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Nama Akun Trading Manual:
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Demo Prop Firm X / Akun Broker Y"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Balance / Modal Awal ({accountType === 'cent' ? 'USC' : 'USD'}):
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                  placeholder="10000"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Account Type Selector */}
          <div className="bg-card border border-border p-3.5 rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-500" /> Tipe Akun {platform.toUpperCase()}:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('standard')}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center',
                  accountType === 'standard'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                )}
              >
                Akun Standar (USD)
              </button>
              <button
                type="button"
                onClick={() => setAccountType('cent')}
                className={cn(
                  'py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center',
                  accountType === 'cent'
                    ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-xs'
                    : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                )}
              >
                Akun Cent (USC)
              </button>
            </div>
            {accountType === 'cent' && (
              <p className="text-[11px] text-amber-400 font-medium pt-1">
                💡 Akun Cent melaporkan saldo 100x USD. Aplikasi akan mengonversi otomatis (100 USC = $1.00 USD) untuk target compounding.
              </p>
            )}
          </div>

          {/* Note Info */}
          <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span>
              {isManual
                ? 'Akun manual langsung terhubung begitu dibuat. Anda dapat menambahkan trade dan memperbarui balance kapan saja.'
                : 'Token API baru akan dibuat setelah Anda mengklik "Buat Token & Lanjutkan".'}
            </span>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Token + Instructions ─── */}
      {step === 'token' && (
        <div className="space-y-4 my-2 max-h-[60vh] overflow-y-auto pr-1">
          {/* Token Display */}
          <div className="bg-secondary/40 border border-border p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-primary">
                <Key className="h-4 w-4" /> API Token Unik Anda:
              </span>
              <span className="text-[10px] text-muted-foreground bg-card border border-border px-2 py-0.5 rounded">
                Hanya tampil sekali — simpan sekarang!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-card border border-border p-2.5 rounded-lg text-xs font-mono text-foreground overflow-x-auto select-all">
                {token}
              </code>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyToken}
                className="shrink-0 px-3"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-profit" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-amber-400 font-medium">
              ⚠️ Token ini hanya ditampilkan satu kali. Jika Anda menutup modal sekarang tanpa menyalin, koneksi ini perlu dihapus dan dibuat ulang.
            </p>
          </div>

          {/* Setup Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-primary" /> Petunjuk Pemasangan di {platform.toUpperCase()}:
            </h4>

            <ol className="space-y-2.5 text-xs text-muted-foreground">
              <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="text-foreground font-semibold">Download File EA:</strong> Klik tombol &quot;Download EA ({targetExtension})&quot; di bawah ini.
                </div>
              </li>
              <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-foreground font-semibold">Salin ke Folder {platform.toUpperCase()}:</strong> Buka {platform.toUpperCase()} → <code className="text-primary font-mono">File</code> → <code className="text-primary font-mono">Open Data Folder</code> → masuk folder <code className="text-primary font-mono">{targetFolder}</code> dan paste file EA di sana.
                </div>
              </li>
              <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="text-foreground font-semibold">Izinkan WebRequest:</strong> {platform.toUpperCase()} → <code className="text-primary font-mono">Tools</code> → <code className="text-primary font-mono">Options</code> → tab <code className="text-primary font-mono">Expert Advisors</code> → centang <em>&quot;Allow WebRequest for listed URL&quot;</em> dan tambahkan URL aplikasi ini.
                </div>
              </li>
              <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                <div>
                  <strong className="text-foreground font-semibold">Pasang EA &amp; Input Token:</strong> Drag EA ke chart, tempelkan token di atas ke kolom input EA. Status akan berubah jadi <span className="text-profit font-semibold">&quot;Terhubung&quot;</span> setelah handshake pertama.
                </div>
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border">
        <Button variant="outline" onClick={handleClose}>
          {step === 'token' ? 'Selesai' : 'Batal'}
        </Button>

        {step === 'configure' && (
          <Button
            variant="primary"
            onClick={handleConfirmConfig}
            isLoading={isLoadingToken}
            disabled={isLoadingToken}
          >
            {isManual ? 'Buat Akun Manual' : 'Buat Token & Lanjutkan'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {step === 'token' && (
          <Button variant="primary" onClick={handleDownloadEA}>
            <Download className="h-4 w-4 mr-2" /> Download EA ({targetExtension})
          </Button>
        )}
      </div>
    </Modal>
  )
}
