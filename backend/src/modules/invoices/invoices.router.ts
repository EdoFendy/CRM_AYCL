import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { generatePDF } from '../../services/pdfService.js';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

invoicesRouter.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100');
  res.json({ data: rows });
});

invoicesRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (rows.length === 0) {
    throw new HttpError(404, 'NOT_FOUND', 'Fattura non trovata');
  }
  res.json(rows[0]);
});

invoicesRouter.get('/:id/pdf', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT number, issued_at as date, customer_data, line_items,
            subtotal, tax_rate, tax_amount, amount as total, currency, notes, due_date
     FROM invoices WHERE id = $1`,
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Fattura non trovata' });
  }
  
  const invoice = rows[0];
  
  // Se non ha customer_data strutturato, creare un fallback
  const customerData = invoice.customer_data || { name: 'Cliente non specificato' };
  const lineItems = invoice.line_items || [];
  
  generatePDF(res, 'invoice', {
    number: invoice.number || 'N/A',
    date: invoice.date || new Date().toISOString(),
    customer: customerData,
    lines: lineItems,
    subtotal: parseFloat(invoice.subtotal || invoice.total || 0),
    taxRate: parseFloat(invoice.tax_rate || 0),
    taxAmount: parseFloat(invoice.tax_amount || 0),
    total: parseFloat(invoice.total),
    currency: invoice.currency || 'EUR',
    notes: invoice.notes,
    dueDate: invoice.due_date
  });
});

invoicesRouter.post('/', async (req, res) => {
  const schema = z.object({
    contract_id: z.string().uuid().optional(),
    number: z.string().optional(),
    status: z.string().default('draft'),
    provider: z.string().optional(),
    amount: z.number(),
    currency: z.string().length(3).optional(),
    issued_at: z.string().optional(),
    due_date: z.string().optional(),
    metadata: z.record(z.any()).optional()
  });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query(
    `INSERT INTO invoices (contract_id, number, status, provider, amount, currency, issued_at, due_date, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9::jsonb)
     RETURNING *`,
    [
      payload.contract_id ?? null,
      payload.number ?? null,
      payload.status,
      payload.provider ?? null,
      payload.amount,
      payload.currency ?? 'EUR',
      payload.issued_at ?? null,
      payload.due_date ?? null,
      JSON.stringify(payload.metadata ?? {})
    ]
  );
  const invoice = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'invoice.create', entity: 'invoice', entityId: invoice.id, afterState: invoice });
  res.status(201).json(invoice);
});

invoicesRouter.patch('/:id', async (req, res) => {
  const schema = z.object({ status: z.string().optional(), provider: z.string().nullable().optional(), pdf_url: z.string().url().nullable().optional(), metadata: z.record(z.any()).nullable().optional() });
  const payload = schema.parse(req.body);
  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined) {
      params.push(key === 'metadata' ? JSON.stringify(value) : value);
      fields.push(`${key} = $${params.length}${key === 'metadata' ? '::jsonb' : ''}`);
    }
  }
  if (fields.length === 0) {
    throw new HttpError(400, 'NO_UPDATE', 'No fields to update');
  }
  params.push(req.params.id);
  const { rows } = await pool.query(`UPDATE invoices SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`, params);
  const invoice = rows[0];
  await recordAuditLog({ actorId: req.user!.id, action: 'invoice.update', entity: 'invoice', entityId: invoice.id, afterState: invoice });
  res.json(invoice);
});

// Configurazione multer per upload prova pagamento
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'payment-proofs');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Usa JPG, PNG o PDF'));
    }
  }
});

// POST /invoices/seller-request - Richiesta fattura da seller
invoicesRouter.post('/seller-request', upload.single('payment_proof'), async (req, res) => {
  try {
    const schema = z.object({
      contract_id: z.string().uuid(),
      amount: z.string().transform(val => parseFloat(val)),
      notes: z.string().optional(),
      requires_approval: z.string().transform(val => val === 'true')
    });

    const data = schema.parse(req.body);

    // Verifica che il contratto esista
    const { rows: contractRows } = await pool.query(
      'SELECT id, company_id FROM contracts WHERE id = $1',
      [data.contract_id]
    );

    if (contractRows.length === 0) {
      return res.status(404).json({ error: 'Contratto non trovato' });
    }

    // URL prova pagamento se caricata
    const paymentProofUrl = req.file 
      ? `/uploads/payment-proofs/${req.file.filename}`
      : null;

    // Genera numero fattura
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Determina status e approval_status
    let status = 'draft';
    let approvalStatus = null;

    if (data.requires_approval) {
      // Richiede approvazione admin
      approvalStatus = 'pending';
      status = 'pending';
    } else if (paymentProofUrl) {
      // Ha prova pagamento, può essere approvata automaticamente
      status = 'paid';
      approvalStatus = 'approved';
    }

    // Inserisci fattura
    const { rows } = await pool.query(
      `INSERT INTO invoices (
        contract_id, number, status, amount, currency, issued_at,
        payment_proof_url, seller_notes, approval_status
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
      RETURNING *`,
      [
        data.contract_id,
        invoiceNumber,
        status,
        data.amount,
        'EUR',
        paymentProofUrl,
        data.notes || null,
        approvalStatus
      ]
    );

    const invoice = rows[0];

    // Audit log
    await recordAuditLog({
      actorId: req.user!.id,
      action: 'invoice.seller_request',
      entity: 'invoice',
      entityId: invoice.id,
      afterState: {
        number: invoiceNumber,
        amount: data.amount,
        has_proof: !!paymentProofUrl,
        requires_approval: data.requires_approval
      }
    });

    // Se richiede approvazione, crea notifica per admin
    if (data.requires_approval) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
         SELECT id, 'invoice_approval', 'Richiesta Approvazione Fattura', 
                $1, 'invoice', $2
         FROM users WHERE role = 'admin'`,
        [
          `Il seller ${req.user!.first_name} ${req.user!.last_name} ha richiesto l'approvazione per la fattura ${invoiceNumber}`,
          invoice.id
        ]
      );
    }

    res.status(201).json({
      success: true,
      invoice,
      message: data.requires_approval 
        ? 'Richiesta inviata all\'admin per approvazione'
        : 'Fattura generata con successo'
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /invoices/:id/approve - Approva fattura seller (solo admin)
invoicesRouter.patch('/:id/approve', async (req, res) => {
  try {
    // Verifica ruolo admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Solo gli admin possono approvare fatture' });
    }

    const schema = z.object({
      approved: z.boolean(),
      admin_notes: z.string().optional()
    });

    const data = schema.parse(req.body);

    const { rows } = await pool.query(
      `UPDATE invoices 
       SET approval_status = $1,
           status = $2,
           approved_by = $3,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $4 AND approval_status = 'pending'
       RETURNING *`,
      [
        data.approved ? 'approved' : 'rejected',
        data.approved ? 'paid' : 'rejected',
        req.user!.id,
        req.params.id
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Fattura non trovata o già processata' });
    }

    const invoice = rows[0];

    // Audit log
    await recordAuditLog({
      actorId: req.user!.id,
      action: data.approved ? 'invoice.approve' : 'invoice.reject',
      entity: 'invoice',
      entityId: invoice.id,
      afterState: { approval_status: invoice.approval_status }
    });

    res.json({ success: true, invoice });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /invoices/pending-approval - Lista fatture in attesa di approvazione (solo admin)
invoicesRouter.get('/pending-approval', async (req, res) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Accesso negato' });
    }

    const { rows } = await pool.query(
      `SELECT i.*, 
        c.id as contract_id,
        u.first_name || ' ' || u.last_name as seller_name
       FROM invoices i
       LEFT JOIN contracts c ON i.contract_id = c.id
       LEFT JOIN users u ON c.created_by = u.id
       WHERE i.approval_status = 'pending'
       ORDER BY i.created_at DESC`
    );

    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
