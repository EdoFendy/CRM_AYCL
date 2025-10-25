import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `
  id, referral_code, customer_name, customer_email, customer_phone,
  company_name, request_type, product_data, pricing_data, status,
  expires_at, seller_id, notes, created_at, updated_at
`;

interface CheckoutRequestInput {
  referral_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
  request_type: 'drive_test' | 'custom' | 'bundle';
  product_data: Record<string, any>;
  pricing_data: Record<string, any>;
  expires_at?: string;
  notes?: string;
}

export async function listCheckoutRequests(query: Record<string, unknown>) {
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.seller_id) {
    params.push(query.seller_id);
    filters.push(`seller_id = $${params.length}`);
  }

  if (query.referral_code) {
    params.push(query.referral_code);
    filters.push(`referral_code = $${params.length}`);
  }

  if (query.status) {
    params.push(query.status);
    filters.push(`status = $${params.length}`);
  }

  if (query.request_type) {
    params.push(query.request_type);
    filters.push(`request_type = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `SELECT ${SELECT} FROM checkout_requests ${where} ORDER BY created_at DESC`;
  
  const { rows } = await pool.query(sql, params);
  return { data: rows };
}

export async function getCheckoutRequest(id: string) {
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM checkout_requests WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createCheckoutRequest(input: CheckoutRequestInput) {
  const expiresAt = input.expires_at 
    ? new Date(input.expires_at)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

  const { rows } = await pool.query(
    `INSERT INTO checkout_requests (
      referral_code, customer_name, customer_email, customer_phone,
      company_name, request_type, product_data, pricing_data,
      expires_at, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING ${SELECT}`,
    [
      input.referral_code,
      input.customer_name,
      input.customer_email,
      input.customer_phone || null,
      input.company_name || null,
      input.request_type,
      JSON.stringify(input.product_data),
      JSON.stringify(input.pricing_data),
      expiresAt,
      input.notes || null
    ]
  );

  return rows[0];
}

export async function updateCheckoutRequest(
  id: string,
  input: Partial<CheckoutRequestInput> & { seller_id?: string; status?: string },
  actorId: string
) {
  const existing = await getCheckoutRequest(id);
  if (!existing) throw new Error('Checkout request not found');

  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.status !== undefined) {
    params.push(input.status);
    updates.push(`status = $${params.length}`);
  }

  if (input.seller_id !== undefined) {
    params.push(input.seller_id);
    updates.push(`seller_id = $${params.length}`);
  }

  if (input.notes !== undefined) {
    params.push(input.notes);
    updates.push(`notes = $${params.length}`);
  }

  if (updates.length === 0) return existing;

  params.push(new Date());
  updates.push(`updated_at = $${params.length}`);
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE checkout_requests SET ${updates.join(', ')} 
     WHERE id = $${params.length} 
     RETURNING ${SELECT}`,
    params
  );

  await recordAuditLog({
    actorId,
    action: 'checkout_request.update',
    entity: 'checkout_request',
    entityId: id,
    beforeState: existing,
    afterState: rows[0]
  });

  return rows[0];
}

export async function deleteCheckoutRequest(id: string, actorId: string) {
  const existing = await getCheckoutRequest(id);
  if (!existing) throw new Error('Checkout request not found');

  await pool.query('DELETE FROM checkout_requests WHERE id = $1', [id]);

  await recordAuditLog({
    actorId,
    action: 'checkout_request.delete',
    entity: 'checkout_request',
    entityId: id,
    beforeState: existing
  });
}

export async function getRequestsForSeller(sellerId: string) {
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM checkout_requests 
     WHERE seller_id = $1 
     ORDER BY created_at DESC`,
    [sellerId]
  );
  return rows;
}

export async function getPendingRequestsForReferral(referralCode: string) {
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM checkout_requests 
     WHERE referral_code = $1 AND status = 'pending' 
     ORDER BY created_at DESC`,
    [referralCode]
  );
  return rows;
}
