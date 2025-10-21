import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { generatePDF } from '../../services/pdfService.js';

export const quotesRouter = Router();

quotesRouter.use(requireAuth);

// GET /quotes - Lista preventivi
quotesRouter.get('/', async (req, res) => {
  const searchParam = req.query.search as string;
  const statusParam = req.query.status as string;
  
  const conditions: string[] = [];
  const params: unknown[] = [];
  
  if (searchParam) {
    params.push(`%${searchParam}%`);
    conditions.push(`(number ILIKE $${params.length} OR customer_data->>'name' ILIKE $${params.length})`);
  }
  
  if (statusParam) {
    params.push(statusParam);
    conditions.push(`status = $${params.length}`);
  }
  
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const { rows } = await pool.query(
    `SELECT 
      id, number, date, customer_type, contact_id, company_id, 
      customer_data, total, currency, status, pdf_url, 
      created_at, updated_at
     FROM quotes 
     ${where}
     ORDER BY created_at DESC`,
    params
  );
  
  res.json({ data: rows });
});

// GET /quotes/:id - Dettaglio preventivo
quotesRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
      id, number, date, customer_type, contact_id, company_id,
      customer_data, line_items, subtotal, tax_rate, tax_amount, total, currency,
      notes, due_date, status, pdf_url, converted_to_invoice_id,
      created_by, created_at, updated_at
     FROM quotes 
     WHERE id = $1`,
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Preventivo non trovato' });
  }
  
  res.json(rows[0]);
});

// GET /quotes/:id/pdf - Download PDF preventivo
quotesRouter.get('/:id/pdf', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
      number, date, customer_data, line_items, 
      subtotal, tax_rate, tax_amount, total, currency, notes, due_date
     FROM quotes 
     WHERE id = $1`,
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Preventivo non trovato' });
  }
  
  const quote = rows[0];
  
  generatePDF(res, 'quote', {
    number: quote.number,
    date: quote.date,
    customer: quote.customer_data,
    lines: quote.line_items,
    subtotal: parseFloat(quote.subtotal),
    taxRate: parseFloat(quote.tax_rate),
    taxAmount: parseFloat(quote.tax_amount),
    total: parseFloat(quote.total),
    currency: quote.currency,
    notes: quote.notes,
    dueDate: quote.due_date
  });
});

// PATCH /quotes/:id - Aggiorna stato preventivo
quotesRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'converted']).optional(),
    notes: z.string().optional(),
  });
  
  const data = schema.parse(req.body);
  
  const setClauses: string[] = [];
  const params: unknown[] = [];
  
  if (data.status) {
    params.push(data.status);
    setClauses.push(`status = $${params.length}`);
  }
  
  if (data.notes !== undefined) {
    params.push(data.notes);
    setClauses.push(`notes = $${params.length}`);
  }
  
  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  }
  
  params.push(new Date());
  setClauses.push(`updated_at = $${params.length}`);
  
  params.push(req.params.id);
  
  const { rows } = await pool.query(
    `UPDATE quotes 
     SET ${setClauses.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Preventivo non trovato' });
  }
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'quote.update',
    entity: 'quote',
    entityId: req.params.id,
    afterState: rows[0]
  });
  
  res.json(rows[0]);
});

// DELETE /quotes/:id - Elimina preventivo
quotesRouter.delete('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM quotes WHERE id = $1',
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Preventivo non trovato' });
  }
  
  await pool.query('DELETE FROM quotes WHERE id = $1', [req.params.id]);
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'quote.delete',
    entity: 'quote',
    entityId: req.params.id,
    beforeState: rows[0]
  });
  
  res.json({ success: true });
});

// POST /quotes/:id/confirm - Conferma preventivo e genera fattura + ricevuta
quotesRouter.post('/:id/confirm', async (req, res) => {
  try {
    const schema = z.object({
      invoiceNumber: z.string().optional(),
      invoiceDueDate: z.string().optional(),
      receiptNumber: z.string().optional(),
      receiptProvider: z.string().optional(),
      paymentDate: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    
    const { rows: quoteRows } = await pool.query(
      'SELECT * FROM quotes WHERE id = $1',
      [req.params.id]
    );
    
    if (quoteRows.length === 0) {
      return res.status(404).json({ error: 'Preventivo non trovato' });
    }
    
    const quote = quoteRows[0];
    
    if (quote.status === 'converted') {
      return res.status(400).json({ error: 'Preventivo già confermato' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Crea fattura
      const invoiceNumber = data.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const dueDate = data.invoiceDueDate ? new Date(data.invoiceDueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const { rows: invoiceRows } = await client.query(
        `INSERT INTO invoices (
          quote_id, number, status, amount, currency, issued_at, due_date,
          customer_type, contact_id, company_id, customer_data, line_items,
          subtotal, tax_rate, tax_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15, $16)
        RETURNING id`,
        [
          quote.id,
          invoiceNumber,
          'pending',
          quote.total,
          quote.currency,
          new Date(),
          dueDate,
          quote.customer_type || null,
          quote.contact_id || null,
          quote.company_id || null,
          JSON.stringify(quote.customer_data || {}),
          JSON.stringify(quote.line_items || []),
          quote.subtotal || 0,
          quote.tax_rate || 0,
          quote.tax_amount || 0,
          quote.notes || null
        ]
      );
      
      const invoiceId = invoiceRows[0].id;
      
      // 2. Crea ricevuta
      const receiptNumber = data.receiptNumber || `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
      
      const { rows: receiptRows } = await client.query(
        `INSERT INTO receipts (
          invoice_id, number, status, amount, currency, date, issued_at, provider,
          customer_type, contact_id, company_id, customer_data, line_items,
          subtotal, tax_rate, tax_amount, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16, $17)
        RETURNING id`,
        [
          invoiceId,
          receiptNumber,
          'issued',
          quote.total,
          quote.currency,
          paymentDate,
          new Date(),
          data.receiptProvider || 'AYCL',
          quote.customer_type || null,
          quote.contact_id || null,
          quote.company_id || null,
          JSON.stringify(quote.customer_data || {}),
          JSON.stringify(quote.line_items || []),
          quote.subtotal || 0,
          quote.tax_rate || 0,
          quote.tax_amount || 0,
          quote.notes || null
        ]
      );
      
      const receiptId = receiptRows[0].id;
      
      // 3. Aggiorna preventivo
      await client.query(
        `UPDATE quotes 
         SET status = 'converted', converted_to_invoice_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [invoiceId, quote.id]
      );
      
      await client.query('COMMIT');
      
      await recordAuditLog({
        actorId: req.user!.id,
        action: 'quote.confirm',
        entity: 'quote',
        entityId: quote.id,
        metadata: { 
          invoice_id: invoiceId,
          receipt_id: receiptId
        }
      });
      
      res.json({ 
        success: true, 
        invoice_id: invoiceId,
        receipt_id: receiptId,
        message: 'Preventivo confermato. Fattura e ricevuta generate con successo.'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error confirming quote:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Quote confirm error:', error);
    res.status(500).json({ 
      error: 'Errore durante la conferma del preventivo',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

