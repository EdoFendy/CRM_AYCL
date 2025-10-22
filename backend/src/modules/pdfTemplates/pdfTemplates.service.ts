/**
 * PDF Templates Service
 * Logica per gestione template PDF con pdf-lib
 */

import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, rgb, StandardFonts } from 'pdf-lib';
import { pool } from '../../db/pool.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UploadTemplateParams {
  buffer: Buffer;
  name: string;
  description?: string;
  type?: string;
  userId?: string;
}

interface FieldMapping {
  id: string;
  type: 'text' | 'date' | 'checkbox' | 'signature';
  dataKey: string;
  pdfFieldName?: string; // Se AcroForm
  page: number;
  x: number; // Coordinate normalizzate 0-1
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  align?: 'left' | 'center' | 'right';
}

export class PDFTemplatesService {
  private uploadsDir = path.join(__dirname, '../../../uploads/pdf-templates');

  constructor() {
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Errore creazione directory uploads:', error);
    }
  }

  /**
   * Upload template PDF
   */
  async uploadTemplate(params: UploadTemplateParams) {
    const { buffer, name, description, type, userId } = params;

    // Valida che sia un PDF
    const pdfDoc = await PDFDocument.load(buffer);
    const pageCount = pdfDoc.getPageCount();

    // Salva file
    const filename = `${Date.now()}-${name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(this.uploadsDir, filename);
    await fs.writeFile(filePath, buffer);

    // Salva nel DB
    const result = await pool.query(
      `INSERT INTO pdf_templates (name, description, type, filename, page_count, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, type, page_count, created_at`,
      [name, description, type || 'contract', filename, pageCount, userId]
    );

    const template = result.rows[0];

    // Leggi campi AcroForm se presenti
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const hasAcroForm = fields.length > 0;

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      type: template.type,
      pageCount: template.page_count,
      hasAcroForm,
      fieldCount: fields.length,
      createdAt: template.created_at
    };
  }

  /**
   * Legge i campi AcroForm dal PDF
   */
  async getTemplateFields(templateId: string) {
    // Recupera template
    const result = await pool.query(
      'SELECT * FROM pdf_templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      throw new Error('Template non trovato');
    }

    const template = result.rows[0];
    const filePath = path.join(this.uploadsDir, template.filename);
    const buffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    return fields.map(field => {
      const name = field.getName();
      const type = this.getFieldType(field);
      
      return {
        name,
        type,
        // Cerca di ottenere coordinate se possibile
        // (questo è complicato con pdf-lib, serve per UI)
      };
    });
  }

  private getFieldType(field: any): string {
    if (field instanceof PDFTextField) return 'text';
    if (field instanceof PDFCheckBox) return 'checkbox';
    return 'unknown';
  }

  /**
   * Salva mappatura campi
   */
  async saveMapping(templateId: string, fields: FieldMapping[]) {
    await pool.query(
      `UPDATE pdf_templates 
       SET field_mapping = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(fields), templateId]
    );

    return { success: true, fieldCount: fields.length };
  }

  /**
   * Recupera mappatura campi
   */
  async getMapping(templateId: string) {
    const result = await pool.query(
      'SELECT field_mapping FROM pdf_templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      throw new Error('Template non trovato');
    }

    const mapping = result.rows[0].field_mapping;
    return { fields: mapping || [] };
  }

  /**
   * Genera PDF compilato
   */
  async generatePDF(templateId: string, data: Record<string, any>): Promise<Buffer> {
    // Carica template
    const result = await pool.query(
      'SELECT * FROM pdf_templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      throw new Error('Template non trovato');
    }

    const template = result.rows[0];
    const filePath = path.join(this.uploadsDir, template.filename);
    const buffer = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();
    const fields: FieldMapping[] = template.field_mapping || [];

    // 1. Compila campi AcroForm se presenti
    for (const field of fields) {
      if (field.pdfFieldName && data[field.dataKey]) {
        try {
          const pdfField = form.getField(field.pdfFieldName);
          
          if (pdfField instanceof PDFTextField) {
            pdfField.setText(String(data[field.dataKey]));
          } else if (pdfField instanceof PDFCheckBox) {
            if (data[field.dataKey]) {
              pdfField.check();
            } else {
              pdfField.uncheck();
            }
          }
        } catch (error) {
          console.warn(`Campo AcroForm ${field.pdfFieldName} non trovato`);
        }
      }
    }

    // Flatten form (rende i campi non editabili)
    try {
      form.flatten();
    } catch (error) {
      console.warn('Impossibile flattare il form:', error);
    }

    // 2. Disegna campi custom alle coordinate mappate
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const field of fields) {
      if (!data[field.dataKey]) continue;

      const page = pages[field.page];
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Converti coordinate normalizzate (0-1) in punti PDF
      // Frontend usa coordinate con origine in alto a sinistra
      // pdf-lib usa origine in basso a sinistra
      const x = field.x * pageWidth;
      const yFromTop = field.y * pageHeight;
      const fieldHeight = field.height * pageHeight;
      
      // Converti da top-origin a bottom-origin e aggiungi padding per centrare il testo
      const fontSize = field.fontSize || 11;
      const textBaseline = (fieldHeight - fontSize) / 2; // Centra verticalmente
      const y = pageHeight - yFromTop - textBaseline - fontSize;

      const text = String(data[field.dataKey]);
      const fieldWidth = field.width * pageWidth;

      switch (field.type) {
        case 'text':
        case 'date':
          // Calcola dimensione font ottimale per evitare che il testo vada a capo
          let adjustedFontSize = fontSize;
          let textWidth = font.widthOfTextAtSize(text, adjustedFontSize);
          const maxWidth = fieldWidth - 4; // Padding totale (2px su ogni lato)
          
          // Riduci font size finché il testo non entra nel campo
          while (textWidth > maxWidth && adjustedFontSize > 6) {
            adjustedFontSize -= 0.5;
            textWidth = font.widthOfTextAtSize(text, adjustedFontSize);
          }
          
          // Ricalcola Y con il nuovo font size
          const adjustedTextBaseline = (fieldHeight - adjustedFontSize) / 2;
          const adjustedY = pageHeight - yFromTop - adjustedTextBaseline - adjustedFontSize;
          
          page.drawText(text, {
            x: x + 2, // Piccolo padding a sinistra
            y: adjustedY,
            size: adjustedFontSize,
            font,
            color: rgb(0, 0, 0),
            maxWidth: maxWidth, // Limita la larghezza
          });
          break;

        case 'checkbox':
          if (data[field.dataKey]) {
            page.drawText('✓', {
              x: x + 2,
              y,
              size: fontSize + 2,
              font,
              color: rgb(0, 0, 0),
            });
          }
          break;

        case 'signature':
          // Per ora solo testo, in futuro potrebbe essere un'immagine
          // Applica stesso auto-resize del testo
          let sigFontSize = fontSize;
          let sigTextWidth = font.widthOfTextAtSize(text, sigFontSize);
          const sigMaxWidth = fieldWidth - 4;
          
          while (sigTextWidth > sigMaxWidth && sigFontSize > 6) {
            sigFontSize -= 0.5;
            sigTextWidth = font.widthOfTextAtSize(text, sigFontSize);
          }
          
          const sigTextBaseline = (fieldHeight - sigFontSize) / 2;
          const sigY = pageHeight - yFromTop - sigTextBaseline - sigFontSize;
          
          page.drawText(text, {
            x: x + 2,
            y: sigY,
            size: sigFontSize,
            font,
            color: rgb(0, 0.5, 0),
            maxWidth: sigMaxWidth,
          });
          break;
      }
    }

    // Salva PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Lista tutti i template
   */
  async listTemplates() {
    const result = await pool.query(
      `SELECT id, name, description, type, page_count, created_at, updated_at,
              (field_mapping IS NOT NULL) as has_mapping
       FROM pdf_templates
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Download template originale
   */
  async downloadTemplate(templateId: string) {
    const result = await pool.query(
      'SELECT * FROM pdf_templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      throw new Error('Template non trovato');
    }

    const template = result.rows[0];
    const filePath = path.join(this.uploadsDir, template.filename);
    const buffer = await fs.readFile(filePath);

    return {
      buffer,
      name: template.name
    };
  }
}

