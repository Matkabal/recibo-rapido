import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import type { IssuerSettings, Person, Receipt, Signature } from '../types'
import { formatCpf, formatCurrency, formatLongDate, monthName } from '../utils/format'
import { moneyToWords } from '../utils/words'

export interface PdfReceiptInput {
  number: string
  issuedAt: Date
  referenceYear: number
  referenceMonth: number
  person: Person
  amountCents: number
  issuer: IssuerSettings
  signature?: Signature
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ')
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate
      else {
        if (line) lines.push(line)
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function drawWrapped(page: PDFPage, lines: string[], font: PDFFont, size: number, x: number, y: number, lineHeight: number): number {
  for (const line of lines) {
    page.drawText(line, { x, y, font, size, color: rgb(0.06, 0.09, 0.16) })
    y -= lineHeight
  }
  return y
}

export async function generateReceiptPdf(input: PdfReceiptInput): Promise<Blob> {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const semibold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([595.28, 841.89])
  const { width, height } = page.getSize()
  const margin = 58
  const contentWidth = width - margin * 2

  page.drawText('RECIBO DE ALUGUEL', {
    x: (width - semibold.widthOfTextAtSize('RECIBO DE ALUGUEL', 20)) / 2,
    y: height - 82,
    font: semibold,
    size: 20,
    color: rgb(0.06, 0.09, 0.16)
  })
  const numberText = `Nº ${input.number}`
  page.drawText(numberText, { x: width - margin - regular.widthOfTextAtSize(numberText, 10), y: height - 112, font: regular, size: 10 })

  page.drawRectangle({ x: margin, y: height - 178, width: contentWidth, height: 45, color: rgb(0.96, 0.97, 0.98), borderColor: rgb(0.85, 0.87, 0.9), borderWidth: 1 })
  page.drawText(`Valor: ${formatCurrency(input.amountCents)}`, { x: margin + 16, y: height - 162, font: semibold, size: 16 })

  const body = `Recebi de ${input.person.name.toLocaleUpperCase('pt-BR')}, CPF ${formatCpf(input.person.cpf)}, a importância de ${formatCurrency(input.amountCents)} (${moneyToWords(input.amountCents)}), referente ao pagamento do aluguel residencial correspondente ao mês de ${monthName(input.referenceMonth)} de ${input.referenceYear}.`
  let y = height - 225
  y = drawWrapped(page, wrapText(body, regular, 11, contentWidth), regular, 11, margin, y, 18)
  y -= 20
  y = drawWrapped(page, wrapText('Declaro recebido e quitado o valor do aluguel acima discriminado.', regular, 11, contentWidth), regular, 11, margin, y, 18)
  y -= 38
  page.drawText(`${input.issuer.city}, ${formatLongDate(input.issuedAt)}.`, { x: margin, y, font: regular, size: 11 })

  const signatureTop = y - 45
  if (input.signature) {
    const bytes = await input.signature.blob.arrayBuffer()
    const image = await pdf.embedPng(bytes)
    const maxW = 190
    const maxH = 70
    const scale = Math.min(maxW / image.width, maxH / image.height, 1)
    const imageW = image.width * scale
    const imageH = image.height * scale
    page.drawImage(image, { x: (width - imageW) / 2, y: signatureTop - imageH + 12, width: imageW, height: imageH })
  }
  const lineY = signatureTop - 63
  page.drawLine({ start: { x: width / 2 - 120, y: lineY }, end: { x: width / 2 + 120, y: lineY }, thickness: 0.8, color: rgb(0.3, 0.33, 0.38) })
  const issuerName = input.issuer.name.toLocaleUpperCase('pt-BR')
  page.drawText(issuerName, { x: (width - semibold.widthOfTextAtSize(issuerName, 10)) / 2, y: lineY - 18, font: semibold, size: 10 })
  if (input.issuer.cpf) {
    const cpf = `CPF: ${formatCpf(input.issuer.cpf)}`
    page.drawText(cpf, { x: (width - regular.widthOfTextAtSize(cpf, 9)) / 2, y: lineY - 34, font: regular, size: 9 })
  }
  page.drawText('Documento gerado e armazenado localmente pelo Recibo Rápido.', { x: margin, y: 35, font: regular, size: 7, color: rgb(0.4, 0.45, 0.5) })
  const bytes = await pdf.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

export function receiptPdfText(receipt: Pick<Receipt, 'tenantName' | 'tenantCpf' | 'amountCents' | 'referenceMonth' | 'referenceYear'>): string {
  return `${receipt.tenantName} ${formatCpf(receipt.tenantCpf)} ${formatCurrency(receipt.amountCents)} ${monthName(receipt.referenceMonth)} de ${receipt.referenceYear}`
}
