import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { ensureDirSync, generatePDFToFile, writeCertificateFile } from '../../services/pdfService.js';
import { mailer } from '../../services/mailerService.js';
import { timelineService } from '../../services/timelineService.js';

export const signaturesRouter = Router();

const callbackSchema = z.object({
  contract_id: z.string().uuid(),
  signer_email: z.string().email(),
  status: z.enum(['pending', 'signed', 'declined']),
  signed_at: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional()
});

signaturesRouter.post('/callback', async (req, res) => {
  const payload = callbackSchema.parse(req.body);
  await pool.query(
    `UPDATE signatures SET status = $1, signed_at = COALESCE($2::timestamptz, signed_at), updated_at = NOW()
     WHERE contract_id = $3 AND signer_email = $4`,
    [payload.status, payload.signed_at ?? null, payload.contract_id, payload.signer_email]
  );
  await recordAuditLog({
    action: 'signature.callback',
    entity: 'contract',
    entityId: payload.contract_id,
    metadata: payload.metadata ?? {},
    afterState: { status: payload.status, signerEmail: payload.signer_email }
  });
  if (payload.status === 'signed') {
    await pool.query('UPDATE contracts SET status = $1, signed_at = NOW() WHERE id = $2', ['Signed', payload.contract_id]);
  }
  logger.info({ contractId: payload.contract_id, status: payload.status }, 'Signature callback processed');
  res.json({ received: true });
});

export const signaturesRouterPublic = signaturesRouter;

// Create signature request
const createReqSchema = z.object({
  contractId: z.string().uuid(),
  signerName: z.string(),
  signerEmail: z.string().email(),
  signerPhone: z.string().optional(),
  requireOtp: z.boolean().optional(),
  expiresInHours: z.number().int().min(1).max(720).default(72),
});

signaturesRouter.post('/requests', async (req, res) => {
  const data = createReqSchema.parse(req.body);
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + data.expiresInHours * 3600 * 1000);

  const { rows } = await pool.query(
    `INSERT INTO signature_requests (
      contract_id, token, status, signer_name, signer_email, signer_phone,
      require_otp, expires_at
    ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)
    RETURNING id, token, expires_at`,
    [
      data.contractId,
      token,
      data.signerName,
      data.signerEmail,
      data.signerPhone ?? null,
      data.requireOtp ?? false,
      expiresAt,
    ]
  );

  await recordAuditLog({
    action: 'signature.request.create',
    entity: 'contract',
    entityId: data.contractId,
    metadata: { token, signerEmail: data.signerEmail },
  });

  // Invia email di richiesta firma
  try {
    const signatureUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/sign/${rows[0].token}`;
    await mailer.sendSignatureRequest(
      data.signerEmail,
      data.signerName,
      `Contratto ${data.contractId.substring(0, 8)}`,
      signatureUrl,
      new Date(rows[0].expires_at),
      data.requireOtp
    );
  } catch (error) {
    logger.error({ error }, 'Failed to send signature request email');
  }

  res.json({
    id: rows[0].id,
    token: rows[0].token,
    expires_at: rows[0].expires_at,
    public_url: `/public/sign/${rows[0].token}`,
  });
});

// Public get request info
signaturesRouter.get('/public/:token', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT sr.id, sr.token, sr.status, sr.expires_at, sr.require_otp,
            c.id as contract_id, c.status as contract_status, c.company_id
     FROM signature_requests sr
     JOIN contracts c ON c.id = sr.contract_id
     WHERE sr.token = $1`,
    [req.params.token]
  );
  const r = rows[0];
  if (!r) return res.status(404).json({ error: 'Invalid token' });
  if (new Date(r.expires_at) < new Date()) return res.status(410).json({ error: 'Link scaduto' });
  res.json(r);
});

// Public sign
const signSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  otp: z.string().optional(),
  signature: z.record(z.any()).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

signaturesRouter.post('/public/:token/sign', async (req, res) => {
  const payload = signSchema.parse(req.body);
  const { rows } = await pool.query(
    `SELECT sr.*, c.*
     FROM signature_requests sr
     JOIN contracts c ON c.id = sr.contract_id
     WHERE sr.token = $1`,
    [req.params.token]
  );
  const r = rows[0];
  if (!r) return res.status(404).json({ error: 'Invalid token' });
  if (r.status !== 'pending') return res.status(400).json({ error: 'Request not pending' });
  if (new Date(r.expires_at) < new Date()) return res.status(410).json({ error: 'Link scaduto' });

  // TODO: verify OTP when required

  // Generate "final contract" PDF snapshot (simple placeholder using invoice layout)
  const uploadsDir = path.join(process.cwd(), 'uploads', 'contracts');
  ensureDirSync(uploadsDir);
  const pdfPath = path.join(uploadsDir, `${r.id}-signed.pdf`);
  await generatePDFToFile('contract', {
    number: r.id,
    date: new Date().toISOString(),
    customer: { name: 'Cliente' },
    lines: [{ description: 'Contratto', quantity: 1, unitPrice: 0 }],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    total: 0,
    currency: 'EUR',
    notes: 'Documento contratto firmato',
  }, pdfPath);

  const certificatePath = path.join(uploadsDir, `${r.id}-certificate.json`);
  writeCertificateFile(certificatePath, {
    signedAt: new Date().toISOString(),
    ip: payload.ip,
    userAgent: payload.userAgent,
    signer: { name: payload.name, email: payload.email },
    requestId: r.id,
  });

  await pool.query(
    `UPDATE signature_requests 
     SET status = 'completed', signed_at = NOW(), ip_address = $1, user_agent = $2, 
         signature_data = $3::jsonb, certificate_url = $4, document_hash = $5, updated_at = NOW()
     WHERE id = $6`,
    [
      payload.ip ?? null,
      payload.userAgent ?? null,
      JSON.stringify(payload.signature ?? {}),
      `/uploads/contracts/${r.id}-certificate.json`,
      crypto.createHash('sha256').update(fs.readFileSync(pdfPath)).digest('hex'),
      r.id,
    ]
  );

  await pool.query('UPDATE contracts SET status = $1, signed_at = NOW() WHERE id = $2', ['Signed', r.contract_id]);

  // Aggiungi evento timeline
  await timelineService.onContractSigned(r.contract_id, payload.name, payload.email);

  await recordAuditLog({
    action: 'signature.completed',
    entity: 'contract',
    entityId: r.contract_id,
    metadata: { pdf: `/uploads/contracts/${r.id}-signed.pdf`, certificate: `/uploads/contracts/${r.id}-certificate.json` },
  });

  // Invia email di conferma firma
  try {
    const signedPdfUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/contracts/${r.id}-signed.pdf`;
    const certificateUrl = `${process.env.API_URL || 'http://localhost:3001'}/uploads/contracts/${r.id}-certificate.json`;
    
    await mailer.sendSignatureConfirmation(
      payload.email,
      payload.name,
      `Contratto ${r.contract_id.substring(0, 8)}`,
      signedPdfUrl,
      certificateUrl
    );
  } catch (error) {
    logger.error({ error }, 'Failed to send signature confirmation email');
  }

  res.json({ signed: true, pdf_url: `/uploads/contracts/${r.id}-signed.pdf` });
});
