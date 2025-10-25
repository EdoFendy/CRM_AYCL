import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `
  id, code, discount_type, discount_value, currency,
  expires_at, max_uses, current_uses, applicable_products,
  applicable_to, min_purchase_amount, is_active,
  created_by, created_at, updated_at
`;

interface DiscountCodeInput {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency?: string;
  expires_at?: string;
  max_uses?: number;
  applicable_products?: string[];
  applicable_to?: 'all' | 'specific';
  min_purchase_amount?: number;
}

export async function listDiscountCodes(query: Record<string, unknown>) {
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.is_active !== undefined) {
    params.push(query.is_active);
    filters.push(`is_active = $${params.length}`);
  }

  if (query.created_by) {
    params.push(query.created_by);
    filters.push(`created_by = $${params.length}`);
  }

  if (query.search) {
    params.push(`%${query.search}%`);
    filters.push(`code ILIKE $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `SELECT ${SELECT} FROM discount_codes ${where} ORDER BY created_at DESC`;
  
  const { rows } = await pool.query(sql, params);
  return { data: rows };
}

export async function getDiscountCode(id: string) {
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM discount_codes WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getDiscountCodeByCode(code: string) {
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM discount_codes WHERE code = $1`,
    [code]
  );
  return rows[0] || null;
}

export async function createDiscountCode(input: DiscountCodeInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO discount_codes (
      code, discount_type, discount_value, currency,
      expires_at, max_uses, applicable_products, applicable_to,
      min_purchase_amount, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING ${SELECT}`,
    [
      input.code.toUpperCase(),
      input.discount_type,
      input.discount_value,
      input.currency || 'EUR',
      input.expires_at || null,
      input.max_uses || null,
      JSON.stringify(input.applicable_products || []),
      input.applicable_to || 'all',
      input.min_purchase_amount || null,
      actorId
    ]
  );

  const discountCode = rows[0];
  await recordAuditLog({
    actorId,
    action: 'discount_code.create',
    entity: 'discount_code',
    entityId: discountCode.id,
    afterState: discountCode
  });

  return discountCode;
}

export async function updateDiscountCode(
  id: string,
  input: Partial<DiscountCodeInput>,
  actorId: string
) {
  const existing = await getDiscountCode(id);
  if (!existing) throw new Error('Discount code not found');

  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.discount_value !== undefined) {
    params.push(input.discount_value);
    updates.push(`discount_value = $${params.length}`);
  }

  if (input.expires_at !== undefined) {
    params.push(input.expires_at);
    updates.push(`expires_at = $${params.length}`);
  }

  if (input.max_uses !== undefined) {
    params.push(input.max_uses);
    updates.push(`max_uses = $${params.length}`);
  }

  if (input.is_active !== undefined) {
    params.push(input.is_active);
    updates.push(`is_active = $${params.length}`);
  }

  if (updates.length === 0) return existing;

  params.push(new Date());
  updates.push(`updated_at = $${params.length}`);
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE discount_codes SET ${updates.join(', ')} 
     WHERE id = $${params.length} 
     RETURNING ${SELECT}`,
    params
  );

  await recordAuditLog({
    actorId,
    action: 'discount_code.update',
    entity: 'discount_code',
    entityId: id,
    beforeState: existing,
    afterState: rows[0]
  });

  return rows[0];
}

export async function deleteDiscountCode(id: string, actorId: string) {
  const existing = await getDiscountCode(id);
  if (!existing) throw new Error('Discount code not found');

  await pool.query('DELETE FROM discount_codes WHERE id = $1', [id]);

  await recordAuditLog({
    actorId,
    action: 'discount_code.delete',
    entity: 'discount_code',
    entityId: id,
    beforeState: existing
  });
}

export async function incrementDiscountCodeUsage(id: string) {
  const { rows } = await pool.query(
    `UPDATE discount_codes 
     SET current_uses = current_uses + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING ${SELECT}`,
    [id]
  );
  return rows[0];
}

export async function validateDiscountCode(code: string, purchaseAmount?: number) {
  const discountCode = await getDiscountCodeByCode(code);
  
  if (!discountCode) {
    return { valid: false, error: 'Codice sconto non trovato' };
  }

  if (!discountCode.is_active) {
    return { valid: false, error: 'Codice sconto non attivo' };
  }

  if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
    return { valid: false, error: 'Codice sconto scaduto' };
  }

  if (discountCode.max_uses && discountCode.current_uses >= discountCode.max_uses) {
    return { valid: false, error: 'Codice sconto esaurito' };
  }

  if (discountCode.min_purchase_amount && purchaseAmount) {
    if (purchaseAmount < discountCode.min_purchase_amount) {
      return { 
        valid: false, 
        error: `Importo minimo richiesto: €${discountCode.min_purchase_amount}` 
      };
    }
  }

  return { valid: true, discountCode };
}

