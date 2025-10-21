import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { recordAuditLog } from '../../services/auditService.js';
import { pool } from '../../db/pool.js';

export const docsRouter = Router();

docsRouter.use(requireAuth);

docsRouter.post('/render', async (req, res) => {
  const schema = z.object({ template_id: z.string().uuid(), data: z.record(z.any()) });
  const payload = schema.parse(req.body);
  await recordAuditLog({ actorId: req.user!.id, action: 'docs.render', entity: 'doc_template', entityId: payload.template_id, metadata: payload.data });
  res.json({
    pdfUrl: null,
    todo: 'Integrate HTML->PDF rendering provider',
    templateId: payload.template_id
  });
});

// POST /docs/generate - Genera preventivo, fattura o ricevuta
docsRouter.post('/generate', async (req, res) => {
  const lineItemSchema = z.object({
    id: z.string(),
    productId: z.number().optional(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number()
  });

  const customerSchema = z.object({
    name: z.string(),
    address: z.string().optional(),
    vat: z.string().optional(),
    pec: z.string().optional()
  });

  const payloadSchema = z.object({
    kind: z.enum(['quote', 'invoice', 'receipt']),
    number: z.string().optional(),
    date: z.string(),
    customer: customerSchema,
    lines: z.array(lineItemSchema),
    notes: z.string().optional(),
    taxRate: z.number().optional(),
    showTax: z.boolean().optional(),
    dueDate: z.string().optional(),
    currency: z.string().optional(),
    // Nuovi campi per collegamento a contatto/azienda
    customerType: z.enum(['contact', 'company']).optional(),
    customerId: z.string().uuid().optional()
  });

  const schema = z.object({
    kind: z.enum(['quote', 'invoice', 'receipt']),
    payload: payloadSchema
  });

  const data = schema.parse(req.body);
  const { kind, payload } = data;

  // Calcola totali
  const subtotal = payload.lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice), 0);
  const taxRate = payload.taxRate || 0;
  const taxAmount = payload.showTax ? (subtotal * taxRate / 100) : 0;
  const total = subtotal + taxAmount;

  let savedId: string;
  let pdfUrl: string;

  try {
    if (kind === 'quote') {
      // Salva preventivo
      const number = payload.number || `PRV-${Date.now()}`;
      const { rows } = await pool.query(
        `INSERT INTO quotes (
          number, date, customer_type, contact_id, company_id, customer_data, 
          line_items, subtotal, tax_rate, tax_amount, total, currency, notes, due_date, 
          status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id`,
        [
          number,
          payload.date,
          payload.customerType || null,
          payload.customerType === 'contact' ? payload.customerId : null,
          payload.customerType === 'company' ? payload.customerId : null,
          JSON.stringify(payload.customer),
          JSON.stringify(payload.lines),
          subtotal,
          taxRate,
          taxAmount,
          total,
          payload.currency || 'EUR',
          payload.notes || null,
          payload.dueDate || null,
          'draft',
          req.user!.id
        ]
      );
      savedId = rows[0].id;
      pdfUrl = `/api/quotes/${savedId}/pdf`;

      // Aggiorna con PDF URL (in produzione generare PDF reale)
      await pool.query('UPDATE quotes SET pdf_url = $1 WHERE id = $2', [pdfUrl, savedId]);

      await recordAuditLog({
        actorId: req.user!.id,
        action: 'quote.create',
        entity: 'quote',
        entityId: savedId,
        afterState: { number, total, currency: payload.currency }
      });

    } else if (kind === 'invoice') {
      // Salva fattura
      const number = payload.number || `INV-${Date.now()}`;
      const { rows } = await pool.query(
        `INSERT INTO invoices (
          number, status, amount, currency, issued_at, due_date, notes,
          customer_type, contact_id, company_id, customer_data, line_items,
          subtotal, tax_rate, tax_amount, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id`,
        [
          number,
          'pending',
          total,
          payload.currency || 'EUR',
          payload.date,
          payload.dueDate || null,
          payload.notes || null,
          payload.customerType || null,
          payload.customerType === 'contact' ? payload.customerId : null,
          payload.customerType === 'company' ? payload.customerId : null,
          JSON.stringify(payload.customer),
          JSON.stringify(payload.lines),
          subtotal,
          taxRate,
          taxAmount,
          JSON.stringify({ showTax: payload.showTax })
        ]
      );
      savedId = rows[0].id;
      pdfUrl = `/api/invoices/${savedId}/pdf`;

      await pool.query('UPDATE invoices SET pdf_url = $1 WHERE id = $2', [pdfUrl, savedId]);

      await recordAuditLog({
        actorId: req.user!.id,
        action: 'invoice.create',
        entity: 'invoice',
        entityId: savedId,
        afterState: { number, amount: total }
      });

    } else if (kind === 'receipt') {
      // Salva ricevuta
      const number = payload.number || `RCT-${Date.now()}`;
      const { rows } = await pool.query(
        `INSERT INTO receipts (
          number, date, status, amount, currency, issued_at, notes,
          customer_type, contact_id, company_id, customer_data, line_items,
          subtotal, tax_rate, tax_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id`,
        [
          number,
          payload.date,
          'issued',
          total,
          payload.currency || 'EUR',
          payload.date,
          payload.notes || null,
          payload.customerType || null,
          payload.customerType === 'contact' ? payload.customerId : null,
          payload.customerType === 'company' ? payload.customerId : null,
          JSON.stringify(payload.customer),
          JSON.stringify(payload.lines),
          subtotal,
          taxRate,
          taxAmount
        ]
      );
      savedId = rows[0].id;
      pdfUrl = `/api/receipts/${savedId}/pdf`;

      await pool.query('UPDATE receipts SET pdf_url = $1 WHERE id = $2', [pdfUrl, savedId]);

      await recordAuditLog({
        actorId: req.user!.id,
        action: 'receipt.create',
        entity: 'receipt',
        entityId: savedId,
        afterState: { number, amount: total }
      });
    } else {
      return res.status(400).json({ error: 'Tipo documento non valido' });
    }

    res.status(201).json({
      success: true,
      id: savedId,
      file_url: pdfUrl,
      message: `${kind === 'quote' ? 'Preventivo' : kind === 'invoice' ? 'Fattura' : 'Ricevuta'} creato con successo`
    });

  } catch (error: any) {
    console.error('Errore generazione documento:', error);
    res.status(500).json({
      error: 'Errore durante la generazione del documento',
      details: error.message
    });
  }
});
