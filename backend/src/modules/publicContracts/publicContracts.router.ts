import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const publicContractsRouter = Router();

publicContractsRouter.get('/:token', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pcs.token, c.id as contract_id, c.status, c.company_id
     FROM public_contract_sessions pcs
     JOIN contracts c ON c.id = pcs.contract_id
     WHERE pcs.token = $1 AND (pcs.expires_at IS NULL OR pcs.expires_at > NOW())`,
    [req.params.token]
  );
  const session = rows[0];
  if (!session) {
    throw new HttpError(404, 'CONTRACT_SESSION_NOT_FOUND', 'Invalid or expired link');
  }
  res.json(session);
});

publicContractsRouter.post('/:token/data', async (req, res) => {
  const schema = z.object({ data: z.record(z.any()) });
  const payload = schema.parse(req.body);
  await pool.query('UPDATE public_contract_sessions SET completed_at = NOW() WHERE token = $1', [req.params.token]);
  // TODO store payload data to contract profile
  res.json({ saved: true, todo: 'Persist data-entry payload' });
});

publicContractsRouter.post('/:token/sign', async (req, res) => {
  const schema = z.object({ signer_name: z.string(), signer_email: z.string().email() });
  const payload = schema.parse(req.body);
  const { rows } = await pool.query('SELECT contract_id FROM public_contract_sessions WHERE token = $1', [req.params.token]);
  const session = rows[0];
  if (!session) {
    throw new HttpError(404, 'CONTRACT_SESSION_NOT_FOUND', 'Invalid session');
  }
  await pool.query(
    `INSERT INTO signatures (contract_id, signer_name, signer_email, status, signed_at)
     VALUES ($1, $2, $3, 'signed', NOW())`,
    [session.contract_id, payload.signer_name, payload.signer_email]
  );
  await pool.query('UPDATE contracts SET status = $1, signed_at = NOW() WHERE id = $2', ['Signed', session.contract_id]);
  res.json({ signed: true });
});
