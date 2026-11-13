import type { Receipt } from '../types'
import { filenameForReceipt } from '../utils/format'

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export function openBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (!opened) downloadBlob(blob, 'recibo.pdf')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function shareReceipt(receipt: Receipt): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([receipt.pdfBlob], filenameForReceipt(receipt.number), { type: 'application/pdf' })
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ title: `Recibo ${receipt.number}`, text: `Recibo de aluguel de ${receipt.tenantName}`, files: [file] })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  downloadBlob(receipt.pdfBlob, file.name)
  return 'downloaded'
}
