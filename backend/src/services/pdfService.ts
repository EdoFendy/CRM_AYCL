import PDFDocument from 'pdfkit';
import { Response } from 'express';
import fs from 'fs';
import path from 'path';

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CustomerData {
  name: string;
  address?: string;
  vat?: string;
  pec?: string;
}

interface DocumentData {
  number: string;
  date: string;
  customer: CustomerData;
  lines: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string;
  dueDate?: string;
}

export function generatePDF(
  res: Response,
  documentType: 'quote' | 'invoice' | 'receipt',
  data: DocumentData
) {
  const doc = new PDFDocument({ margin: 50 });

  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${documentType}-${data.number}.pdf"`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: data.currency || 'EUR'
    }).format(amount);
  };

  // Header
  doc.fontSize(24).fillColor('#1e293b').text(
    documentType === 'quote' ? 'PREVENTIVO' : documentType === 'invoice' ? 'FATTURA' : 'RICEVUTA',
    { align: 'right' }
  );

  doc.moveDown();

  // Document number and date
  doc.fontSize(10).fillColor('#64748b');
  doc.text(`Numero: ${data.number}`, { align: 'right' });
  doc.text(`Data: ${new Date(data.date).toLocaleDateString('it-IT')}`, { align: 'right' });
  
  if (data.dueDate && documentType === 'invoice') {
    doc.text(`Scadenza: ${new Date(data.dueDate).toLocaleDateString('it-IT')}`, { align: 'right' });
  }

  doc.moveDown(2);

  // Customer info
  doc.fontSize(12).fillColor('#1e293b').text('DESTINATARIO', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#334155');
  doc.text(data.customer.name);
  if (data.customer.address) {
    doc.text(data.customer.address);
  }
  if (data.customer.vat) {
    doc.text(`P.IVA: ${data.customer.vat}`);
  }
  if (data.customer.pec && documentType === 'invoice') {
    doc.text(`PEC: ${data.customer.pec}`);
  }

  doc.moveDown(2);

  // Line items table
  const tableTop = doc.y;
  const colWidths = {
    description: 250,
    quantity: 60,
    unitPrice: 80,
    total: 80
  };

  // Table header
  doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold');
  doc.text('Descrizione', 50, tableTop, { width: colWidths.description });
  doc.text('Qtà', 300, tableTop, { width: colWidths.quantity, align: 'center' });
  doc.text('Prezzo Unit.', 360, tableTop, { width: colWidths.unitPrice, align: 'right' });
  doc.text('Totale', 440, tableTop, { width: colWidths.total, align: 'right' });

  // Draw line under header
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#cbd5e1');

  // Table rows
  doc.font('Helvetica').fillColor('#334155');
  let currentY = tableTop + 25;

  data.lines.forEach((line) => {
    const lineTotal = line.quantity * line.unitPrice;
    
    doc.text(line.description, 50, currentY, { width: colWidths.description });
    doc.text(line.quantity.toString(), 300, currentY, { width: colWidths.quantity, align: 'center' });
    doc.text(formatCurrency(line.unitPrice), 360, currentY, { width: colWidths.unitPrice, align: 'right' });
    doc.text(formatCurrency(lineTotal), 440, currentY, { width: colWidths.total, align: 'right' });
    
    currentY += 20;
  });

  // Draw line before totals
  currentY += 10;
  doc.moveTo(50, currentY).lineTo(550, currentY).stroke('#cbd5e1');
  currentY += 20;

  // Totals
  doc.fontSize(10).fillColor('#64748b');
  doc.text('Subtotale:', 360, currentY, { width: 80, align: 'right' });
  doc.fillColor('#1e293b');
  doc.text(formatCurrency(data.subtotal), 440, currentY, { width: 80, align: 'right' });

  currentY += 20;
  doc.fillColor('#64748b');
  doc.text(`IVA (${data.taxRate}%):`, 360, currentY, { width: 80, align: 'right' });
  doc.fillColor('#1e293b');
  doc.text(formatCurrency(data.taxAmount), 440, currentY, { width: 80, align: 'right' });

  currentY += 25;
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b');
  doc.text('TOTALE:', 360, currentY, { width: 80, align: 'right' });
  doc.text(formatCurrency(data.total), 440, currentY, { width: 80, align: 'right' });

  // Notes
  if (data.notes) {
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica').fillColor('#64748b');
    doc.text('Note:', { underline: true });
    doc.moveDown(0.5);
    doc.fillColor('#334155');
    doc.text(data.notes, { width: 500 });
  }

  // Footer
  doc.fontSize(8).fillColor('#94a3b8');
  const footerText = 'Documento generato da AYCL CRM';
  doc.text(
    footerText,
    50,
    doc.page.height - 50,
    { align: 'center', width: doc.page.width - 100 }
  );

  // Finalize PDF
  doc.end();
}

export function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function generatePDFToFile(
  documentType: 'quote' | 'invoice' | 'receipt' | 'contract',
  data: DocumentData,
  targetFilePath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      ensureDirSync(path.dirname(targetFilePath));
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(targetFilePath);
      stream.on('finish', () => resolve(targetFilePath));
      stream.on('error', reject);
      doc.pipe(stream);

      const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('it-IT', { style: 'currency', currency: data.currency || 'EUR' }).format(amount);

      doc.fontSize(24).fillColor('#1e293b').text(
        documentType === 'quote'
          ? 'PREVENTIVO'
          : documentType === 'invoice'
          ? 'FATTURA'
          : documentType === 'receipt'
          ? 'RICEVUTA'
          : 'CONTRATTO',
        { align: 'right' }
      );

      doc.moveDown();
      doc.fontSize(10).fillColor('#64748b');
      doc.text(`Numero: ${data.number}`, { align: 'right' });
      doc.text(`Data: ${new Date(data.date).toLocaleDateString('it-IT')}`, { align: 'right' });
      if (data.dueDate && documentType === 'invoice') {
        doc.text(`Scadenza: ${new Date(data.dueDate).toLocaleDateString('it-IT')}`, { align: 'right' });
      }

      doc.moveDown(2);
      doc.fontSize(12).fillColor('#1e293b').text('DESTINATARIO', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#334155');
      doc.text(data.customer.name);
      if (data.customer.address) doc.text(data.customer.address);
      if (data.customer.vat) doc.text(`P.IVA: ${data.customer.vat}`);
      if (data.customer.pec && documentType === 'invoice') doc.text(`PEC: ${data.customer.pec}`);

      doc.moveDown(2);

      const tableTop = doc.y;
      const colWidths = { description: 250, quantity: 60, unitPrice: 80, total: 80 } as const;
      doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold');
      doc.text('Descrizione', 50, tableTop, { width: colWidths.description });
      doc.text('Qtà', 300, tableTop, { width: colWidths.quantity, align: 'center' });
      doc.text('Prezzo Unit.', 360, tableTop, { width: colWidths.unitPrice, align: 'right' });
      doc.text('Totale', 440, tableTop, { width: colWidths.total, align: 'right' });
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke('#cbd5e1');

      doc.font('Helvetica').fillColor('#334155');
      let currentY = tableTop + 25;
      data.lines.forEach((line) => {
        const lineTotal = line.quantity * line.unitPrice;
        doc.text(line.description, 50, currentY, { width: colWidths.description });
        doc.text(String(line.quantity), 300, currentY, { width: colWidths.quantity, align: 'center' });
        doc.text(formatCurrency(line.unitPrice), 360, currentY, { width: colWidths.unitPrice, align: 'right' });
        doc.text(formatCurrency(lineTotal), 440, currentY, { width: colWidths.total, align: 'right' });
        currentY += 20;
      });

      currentY += 10;
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke('#cbd5e1');
      currentY += 20;

      doc.fontSize(10).fillColor('#64748b');
      doc.text('Subtotale:', 360, currentY, { width: 80, align: 'right' });
      doc.fillColor('#1e293b');
      doc.text(formatCurrency(data.subtotal), 440, currentY, { width: 80, align: 'right' });
      currentY += 20;
      doc.fillColor('#64748b');
      doc.text(`IVA (${data.taxRate}%):`, 360, currentY, { width: 80, align: 'right' });
      doc.fillColor('#1e293b');
      doc.text(formatCurrency(data.taxAmount), 440, currentY, { width: 80, align: 'right' });
      currentY += 25;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b');
      doc.text('TOTALE:', 360, currentY, { width: 80, align: 'right' });
      doc.text(formatCurrency(data.total), 440, currentY, { width: 80, align: 'right' });

      if (data.notes) {
        doc.moveDown(3);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b');
        doc.text('Note:', { underline: true });
        doc.moveDown(0.5);
        doc.fillColor('#334155');
        doc.text(data.notes, { width: 500 });
      }

      doc.fontSize(8).fillColor('#94a3b8');
      const footerText = 'Documento generato da AYCL CRM';
      doc.text(footerText, 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function writeCertificateFile(
  targetFilePath: string,
  certificate: Record<string, unknown>
): string {
  ensureDirSync(path.dirname(targetFilePath));
  fs.writeFileSync(targetFilePath, JSON.stringify(certificate, null, 2), 'utf8');
  return targetFilePath;
}

