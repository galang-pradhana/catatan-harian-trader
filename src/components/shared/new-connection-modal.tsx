import React, { useState, useEffect } from 'react'
import { Copy, Check, Download, Info, Terminal, Key, Coins, Monitor } from 'lucide-react'
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

export function NewConnectionModal({
  isOpen,
  onClose,
  onConnectionCreated,
}: NewConnectionModalProps) {
  const [token, setToken] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoadingToken, setIsLoadingToken] = useState(false)
  const [platform, setPlatform] = useState<Platform>('mt5')
  const [accountType, setAccountType] = useState<AccountType>('standard')

  useEffect(() => {
    if (isOpen) {
      const createConnectionToken = async () => {
        setIsLoadingToken(true)
        try {
          const res = await fetch('/api/mt5/connections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountType, platform }),
          })
          const data = await res.json()
          if (res.ok && data.token) {
            setToken(data.token)
          } else {
            toast(data.message || 'Gagal membuat token API baru', 'error')
          }
        } catch (err: any) {
          toast('Terjadi kesalahan saat menghubungi server', 'error')
        } finally {
          setIsLoadingToken(false)
        }
      }
      createConnectionToken()
    }
  }, [isOpen, accountType, platform])

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
      if (!res.ok) {
        throw new Error(`Gagal mengambil file EA ${isMT4 ? 'MQL4' : 'MQL5'} dari server`)
      }
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
  const targetExtension = isMT4 ? '.mq4' : '.mq5'
  const targetFolder = isMT4 ? 'MQL4/Experts/' : 'MQL5/Experts/'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hubungkan Akun Trading Baru"
      description="Pilih platform MetaTrader, tipe akun, dan ikuti langkah berikut untuk menempelkan Expert Advisor (EA) di terminal Anda."
      className="max-w-xl"
    >
      <div className="space-y-4 my-2 max-h-[70vh] overflow-y-auto pr-1">
        {/* Step 0: Platform Selection (MT4 vs MT5) */}
        <div className="bg-card border border-border p-3.5 rounded-xl space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Monitor className="h-4 w-4 text-primary" /> 1. Pilih Platform Trading Anda:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPlatform('mt4')}
              className={cn(
                'py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5',
                platform === 'mt4'
                  ? 'bg-blue-500/15 border-blue-500 text-foreground font-bold shadow-xs'
                  : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'h-7 w-7 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0',
                platform === 'mt4' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
              )}>
                MT4
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold block truncate">MetaTrader 4</span>
                <span className="text-[10px] text-muted-foreground block truncate">MQL4 Read-Only</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPlatform('mt5')}
              className={cn(
                'py-2.5 px-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5',
                platform === 'mt5'
                  ? 'bg-primary/15 border-primary text-foreground font-bold shadow-xs'
                  : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'h-7 w-7 rounded-lg font-mono text-xs font-black flex items-center justify-center shrink-0',
                platform === 'mt5' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                MT5
              </div>
              <div className="min-w-0">
                <span className="text-xs font-extrabold block truncate">MetaTrader 5</span>
                <span className="text-[10px] text-muted-foreground block truncate">MQL5 Read-Only</span>
              </div>
            </button>
          </div>
        </div>

        {/* Account Type Selector */}
        <div className="bg-card border border-border p-3.5 rounded-xl space-y-2">
          <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-500" /> 2. Tipe Akun {platform.toUpperCase()}:
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

        {/* Step 1: Token Display */}
        <div className="bg-secondary/40 border border-border p-4 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5 text-primary">
              <Key className="h-4 w-4" /> API Token Unik Anda:
            </span>
            <span className="text-[10px] text-muted-foreground bg-card border border-border px-2 py-0.5 rounded">
              Hanya tampil sekali
            </span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-card border border-border p-2.5 rounded-lg text-xs font-mono text-foreground overflow-x-auto select-all">
              {isLoadingToken ? 'Membuat Token API Unik...' : token || 'Gagal membuat token'}
            </code>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyToken}
              disabled={isLoadingToken || !token}
              className="shrink-0 px-3"
            >
              {copied ? (
                <Check className="h-4 w-4 text-profit" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-primary" /> Petunjuk Pemasangan di {platform.toUpperCase()}:
          </h4>

          <ol className="space-y-2.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
              <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-foreground font-semibold">Download File EA:</strong> Click tombol &quot;Download EA ({targetExtension})&quot; di bawah ini.
              </div>
            </li>

            <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
              <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-foreground font-semibold">Salin ke Folder {platform.toUpperCase()}:</strong> Buka {platform.toUpperCase()} Desktop → Menu <code className="text-primary font-mono">File</code> → <code className="text-primary font-mono">Open Data Folder</code> → masuki folder <code className="text-primary font-mono">{targetFolder}</code> dan paste file EA di sana.
              </div>
            </li>

            <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
              <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-foreground font-semibold">Izinkan WebRequest:</strong> Buka {platform.toUpperCase()} → <code className="text-primary font-mono">Tools</code> → <code className="text-primary font-mono">Options</code> → tab <code className="text-primary font-mono">Expert Advisors</code> → centang <em>&quot;Allow WebRequest for listed URL&quot;</em> dan tambahkan URL aplikasi ini.
              </div>
            </li>

            <li className="flex items-start gap-2.5 bg-card border border-border/60 p-3 rounded-xl">
              <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-foreground font-semibold">Pasang EA & Input Token:</strong> Drag EA dari jendela Navigator ke sebarang chart, lalu tempelkan API Token di atas ke kolom input EA. Status akan otomatis berubah menjadi <span className="text-profit font-semibold">&quot;Terhubung&quot;</span> setelah handshake pertama.
              </div>
            </li>
          </ol>
        </div>

        {/* Security Note */}
        <div className="bg-muted/40 border border-border p-3 rounded-xl flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Aplikasi tidak pernah meminta username atau password broker Anda. Koneksi aman 100% menggunakan API Token terenkripsi.
          </span>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
        <Button variant="primary" onClick={handleDownloadEA} disabled={isLoadingToken || !token}>
          <Download className="h-4 w-4 mr-2" /> Download EA ({targetExtension})
        </Button>
      </div>
    </Modal>
  )
}

