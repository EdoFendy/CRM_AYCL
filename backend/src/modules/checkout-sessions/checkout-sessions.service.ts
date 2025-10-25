import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import { randomBytes } from 'crypto';

const SELECT = `
  id, request_id, session_token, checkout_url, woo_product_id,
  woo_payment_url, status, expires_at, created_at, updated_at
`;

interface CheckoutSessionInput {
  request_id: string;
  checkout_url: string;
  woo_product_id?: number;
  woo_payment_url?: string;
  expires_at: string;
}

export async function createCheckoutSession(input: CheckoutSessionInput) {
  const sessionToken = randomBytes(32).toString('hex');
  
  const { rows } = await pool.query(
    `INSERT INTO checkout_sessions (
      request_id, session_token, checkout_url, woo_product_id,
      woo_payment_url, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING ${SELECT}`,
    [
      input.request_id,
      sessionToken,
      input.checkout_url,
      input.woo_product_id || null,
      input.woo_payment_url || null,
      new Date(input.expires_at)
    ]
  );

  return rows[0];
}

export async function getCheckoutSession(sessionToken: string) {
  const { rows } = await pool.query(
    `SELECT cs.*, cr.customer_name, cr.customer_email, cr.request_type, cr.product_data, cr.pricing_data
     FROM checkout_sessions cs
     JOIN checkout_requests cr ON cs.request_id = cr.id
     WHERE cs.session_token = $1`,
    [sessionToken]
  );
  return rows[0] || null;
}

export async function updateCheckoutSession(
  sessionToken: string,
  updates: { status?: string; woo_payment_url?: string },
  actorId: string
) {
  const existing = await getCheckoutSession(sessionToken);
  if (!existing) throw new Error('Checkout session not found');

  const updateFields: string[] = [];
  const params: unknown[] = [];

  if (updates.status !== undefined) {
    params.push(updates.status);
    updateFields.push(`status = $${params.length}`);
  }

  if (updates.woo_payment_url !== undefined) {
    params.push(updates.woo_payment_url);
    updateFields.push(`woo_payment_url = $${params.length}`);
  }

  if (updateFields.length === 0) return existing;

  params.push(new Date());
  updateFields.push(`updated_at = $${params.length}`);
  params.push(sessionToken);

  const { rows } = await pool.query(
    `UPDATE checkout_sessions SET ${updateFields.join(', ')} 
     WHERE session_token = $${params.length} 
     RETURNING ${SELECT}`,
    params
  );

  await recordAuditLog({
    actorId,
    action: 'checkout_session.update',
    entity: 'checkout_session',
    entityId: existing.id,
    beforeState: existing,
    afterState: rows[0]
  });

  return rows[0];
}

export async function getActiveSessionsForSeller(sellerId: string) {
  const { rows } = await pool.query(
    `SELECT cs.*, cr.customer_name, cr.customer_email, cr.request_type
     FROM checkout_sessions cs
     JOIN checkout_requests cr ON cs.request_id = cr.id
     WHERE cr.seller_id = $1 AND cs.status = 'active'
     ORDER BY cs.created_at DESC`,
    [sellerId]
  );
  return rows;
}

export async function expireSession(sessionToken: string, actorId: string) {
  const session = await getCheckoutSession(sessionToken);
  if (!session) throw new Error('Checkout session not found');

  await pool.query(
    'UPDATE checkout_sessions SET status = $1, updated_at = NOW() WHERE session_token = $2',
    ['expired', sessionToken]
  );

  await recordAuditLog({
    actorId,
    action: 'checkout_session.expire',
    entity: 'checkout_session',
    entityId: session.id,
    beforeState: session
  });
}

export async function completeSession(sessionToken: string, actorId: string) {
  const session = await getCheckoutSession(sessionToken);
  if (!session) throw new Error('Checkout session not found');

  await pool.query(
    'UPDATE checkout_sessions SET status = $1, updated_at = NOW() WHERE session_token = $2',
    ['completed', sessionToken]
  );

  // Also update the related checkout request
  await pool.query(
    'UPDATE checkout_requests SET status = $1, updated_at = NOW() WHERE id = $2',
    ['accepted', session.request_id]
  );

  await recordAuditLog({
    actorId,
    action: 'checkout_session.complete',
    entity: 'checkout_session',
    entityId: session.id,
    beforeState: session
  });
}
