import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { generatePDF } from '../../services/pdfService.js';
import { mailer } from '../../services/mailerService.js';
import { timelineService } from '../../services/timelineService.js';
import crypto from 'crypto';

export const contractsRouter = Router();

contractsRouter.use(requireAuth);

// GET /contracts - Lista contratti
contractsRouter.get('/', async (req, res) => {
  const searchParam = req.query.search as string;
  const statusParam = req.query.status as string;
  const packParam = req.query.pack as string;
  
  const conditions: string[] = [];
  const params: unknown[] = [];
  
  if (searchParam) {
    params.push(`%${searchParam}%`);
    conditions.push(`(number ILIKE $${params.length} OR company_name ILIKE $${params.length})`);
  }
  
  if (statusParam) {
    params.push(statusParam);
    conditions.push(`status = $${params.length}`);
  }
  
  if (packParam) {
    params.push(packParam);
    conditions.push(`pack = $${params.length}`);
  }
  
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const { rows } = await pool.query(
    `SELECT 
      c.id, c.number, c.status, c.pack, c.signed_at, c.created_at, c.updated_at,
      c.company_id, c.requires_payment, c.payment_amount, c.payment_currency,
      c.is_subscription, c.finalized_at, c.document_hash,
      comp.ragione_sociale as company_name
     FROM contracts c
     LEFT JOIN companies comp ON comp.id = c.company_id
     ${where}
     ORDER BY c.created_at DESC`,
    params
  );
  
  res.json({ data: rows });
});

// GET /contracts/:id - Dettaglio contratto
contractsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
      c.*, comp.ragione_sociale as company_name
     FROM contracts c
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE c.id = $1`,
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Contratto non trovato' });
  }
  
  res.json(rows[0]);
});

// POST /contracts - Crea contratto
contractsRouter.post('/', async (req, res) => {
  try {
    const schema = z.object({
      company_id: z.string().uuid(),
      pack: z.enum(['Setup-Fee', 'Performance', 'Subscription', 'Drive Test']),
      proposal_file_id: z.string().uuid().optional(),
      requires_payment: z.boolean().default(false),
      payment_amount: z.number().optional(),
      payment_currency: z.string().default('EUR'),
      is_subscription: z.boolean().default(false),
      notes: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
  
  const contractNumber = `CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  
  const { rows } = await pool.query(
    `INSERT INTO contracts (
      company_id, number, status, pack, proposal_file_id,
      requires_payment, payment_amount, payment_currency, is_subscription, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.company_id,
      contractNumber,
      'draft',
      data.pack,
      data.proposal_file_id || null,
      data.requires_payment,
      data.payment_amount || null,
      data.payment_currency,
      data.is_subscription,
      data.notes || null,
    ]
  );
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'contract.create',
    entity: 'contract',
    entityId: rows[0].id,
    afterState: rows[0]
  });

    // Aggiungi evento timeline
    await timelineService.onContractCreated(rows[0].id, contractNumber, req.user!.id);
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Contract creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Dati non validi', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Errore nella creazione del contratto' });
  }
});

// PATCH /contracts/:id - Aggiorna contratto
contractsRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    status: z.enum(['draft', 'sent', 'signed', 'expired', 'terminated']).optional(),
    notes: z.string().optional(),
    finalized_at: z.string().optional(),
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
  
  if (data.finalized_at) {
    params.push(new Date(data.finalized_at));
    setClauses.push(`finalized_at = $${params.length}`);
  }
  
  if (setClauses.length === 0) {
    return res.status(400).json({ error: 'Nessun campo da aggiornare' });
  }
  
  params.push(new Date());
  setClauses.push(`updated_at = $${params.length}`);
  
  params.push(req.params.id);
  
  const { rows } = await pool.query(
    `UPDATE contracts 
     SET ${setClauses.join(', ')}
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Contratto non trovato' });
  }
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'contract.update',
    entity: 'contract',
    entityId: req.params.id,
    afterState: rows[0]
  });
  
  res.json(rows[0]);
});

// POST /contracts/:id/send-for-signature - Invia per firma
contractsRouter.post('/:id/send-for-signature', async (req, res) => {
  const schema = z.object({
    signer_name: z.string(),
    signer_email: z.string().email(),
    signer_phone: z.string().optional(),
    require_otp: z.boolean().default(false),
    expires_in_hours: z.number().int().min(1).max(720).default(72),
  });
  
  const data = schema.parse(req.body);
  
  // Verifica che il contratto esista e sia in stato draft
  const { rows: contractRows } = await pool.query(
    'SELECT * FROM contracts WHERE id = $1',
    [req.params.id]
  );
  
  if (contractRows.length === 0) {
    return res.status(404).json({ error: 'Contratto non trovato' });
  }
  
  const contract = contractRows[0];
  
  if (contract.status !== 'draft') {
    return res.status(400).json({ error: 'Il contratto deve essere in stato bozza per essere inviato per firma' });
  }
  
  // Crea richiesta firma
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + data.expires_in_hours * 3600 * 1000);
  
  const { rows: signatureRows } = await pool.query(
    `INSERT INTO signature_requests (
      contract_id, token, status, signer_name, signer_email, signer_phone,
      require_otp, expires_at
    ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)
    RETURNING id, token, expires_at`,
    [
      contract.id,
      token,
      data.signer_name,
      data.signer_email,
      data.signer_phone || null,
      data.require_otp,
      expiresAt,
    ]
  );
  
  // Aggiorna stato contratto
  await pool.query(
    'UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2',
    ['sent', contract.id]
  );
  
  // Invia email di richiesta firma
  try {
    const signatureUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/sign/${token}`;
    await mailer.sendSignatureRequest(
      data.signer_email,
      data.signer_name,
      `Contratto ${contract.number}`,
      signatureUrl,
      expiresAt,
      data.require_otp
    );
  } catch (error) {
    console.error('Failed to send signature request email:', error);
  }
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'contract.send_for_signature',
    entity: 'contract',
    entityId: contract.id,
    metadata: { 
      signature_request_id: signatureRows[0].id,
      signer_email: data.signer_email,
      expires_at: expiresAt
    }
  });

  // Aggiungi evento timeline
  await timelineService.onContractSentForSignature(contract.id, data.signer_email, req.user!.id);
  
  res.json({
    success: true,
    signature_request_id: signatureRows[0].id,
    token: signatureRows[0].token,
    expires_at: signatureRows[0].expires_at,
    public_url: `/public/sign/${signatureRows[0].token}`,
    message: 'Contratto inviato per firma con successo'
  });
});

// GET /contracts/:id/pdf - Download PDF contratto
contractsRouter.get('/:id/pdf', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
      c.*, comp.ragione_sociale as company_name
     FROM contracts c
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE c.id = $1`,
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Contratto non trovato' });
  }
  
  const contract = rows[0];
  
  // Genera PDF del contratto
  generatePDF(res, 'contract', {
    number: contract.number,
    date: contract.created_at,
    customer: {
      name: contract.company_name || 'Cliente',
      address: '',
      vat: '',
    },
    lines: [{
      description: `Contratto ${contract.pack}`,
      quantity: 1,
      unitPrice: contract.payment_amount || 0,
    }],
    subtotal: contract.payment_amount || 0,
    taxRate: 22,
    taxAmount: (contract.payment_amount || 0) * 0.22,
    total: (contract.payment_amount || 0) * 1.22,
    currency: contract.payment_currency || 'EUR',
    notes: contract.notes || '',
  });
});

// DELETE /contracts/:id - Elimina contratto
contractsRouter.delete('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM contracts WHERE id = $1',
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Contratto non trovato' });
  }
  
  await pool.query('DELETE FROM contracts WHERE id = $1', [req.params.id]);
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'contract.delete',
    entity: 'contract',
    entityId: req.params.id,
    beforeState: rows[0]
  });
  
  res.json({ success: true });
});

// GET /contracts/:id/timeline - Timeline del contratto
contractsRouter.get('/:id/timeline', async (req, res) => {
  try {
    const timeline = await timelineService.getTimeline(req.params.id);
    res.json({ data: timeline });
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero della timeline' });
  }
});