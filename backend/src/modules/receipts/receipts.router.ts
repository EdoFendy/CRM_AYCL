import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { generatePDF } from '../../services/pdfService.js';

export const receiptsRouter = Router();

receiptsRouter.use(requireAuth);

receiptsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM receipts ORDER BY created_at DESC LIMIT 100');
  res.json({ data: rows });
});

receiptsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM receipts WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Ricevuta non trovata' });
  }
  res.json(rows[0]);
});

receiptsRouter.get('/:id/pdf', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT number, date, customer_data, line_items,
            subtotal, tax_rate, tax_amount, amount as total, currency, notes
     FROM receipts WHERE id = $1`,
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Ricevuta non trovata' });
  }
  
  const receipt = rows[0];
  
  // Fallback per dati mancanti
  const customerData = receipt.customer_data || { name: 'Cliente non specificato' };
  const lineItems = receipt.line_items || [];
  
  generatePDF(res, 'receipt', {
    number: receipt.number || 'N/A',
    date: receipt.date || new Date().toISOString(),
    customer: customerData,
    lines: lineItems,
    subtotal: parseFloat(receipt.subtotal || receipt.total || 0),
    taxRate: parseFloat(receipt.tax_rate || 0),
    taxAmount: parseFloat(receipt.tax_amount || 0),
    total: parseFloat(receipt.total),
    currency: receipt.currency || 'EUR',
    notes: receipt.notes
  });
});

receiptsRouter.post('/', async (req, res) => {
  const schema = z.object({
    invoice_id: z.string().uuid().optional(),
    status: z.string(),
    provider: z.string().optional(),
    amount: z.number(),
    currency: z.string().length(3).optional(),
    issued_at: z.string().optional(),
    pdf_url: z.string().url().optional()
  });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO receipts (invoice_id, status, provider, amount, currency, issued_at, pdf_url)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7)
     RETURNING *`,
    [payload.invoice_id ?? null, payload.status, payload.provider ?? null, payload.amount, payload.currency ?? 'EUR', payload.issued_at ?? null, payload.pdf_url ?? null]
  );
  const receipt = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'receipt.create', entity: 'receipt', entityId: receipt.id, afterState: receipt });
  res.status(201).json(receipt);
});
