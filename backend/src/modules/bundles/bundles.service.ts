import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `
  id, name, description, products, subtotal, discount_type,
  discount_value, total, currency, valid_from, valid_until,
  includes_upsell, upsell_details, status,
  created_by, company_id, created_at, updated_at
`;

interface BundleProduct {
  product_id?: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface BundleInput {
  name: string;
  description?: string;
  products: BundleProduct[];
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  currency?: string;
  valid_from?: string;
  valid_until?: string;
  includes_upsell?: boolean;
  upsell_details?: {
    name: string;
    description: string;
    price: number;
  };
  company_id?: string;
}

function calculateBundleTotal(
  products: BundleProduct[],
  discountType: 'percentage' | 'fixed',
  discountValue: number
): { subtotal: number; total: number } {
  const subtotal = products.reduce((sum, p) => sum + p.total, 0);
  
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discountValue) / 100;
  } else {
    discountAmount = discountValue;
  }

  const total = Math.max(0, subtotal - discountAmount);
  
  return { subtotal, total };
}

export async function listBundles(query: Record<string, unknown>) {
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.company_id) {
    params.push(query.company_id);
    filters.push(`company_id = $${params.length}`);
  }

  if (query.created_by) {
    params.push(query.created_by);
    filters.push(`created_by = $${params.length}`);
  }

  if (query.status) {
    params.push(query.status);
    filters.push(`status = $${params.length}`);
  }

  if (query.search) {
    params.push(`%${query.search}%`);
    filters.push(`name ILIKE $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `SELECT ${SELECT} FROM bundles ${where} ORDER BY created_at DESC`;
  
  const { rows } = await pool.query(sql, params);
  return { data: rows };
}

export async function getBundle(id: string) {
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM bundles WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function createBundle(input: BundleInput, actorId: string) {
  const { subtotal, total } = calculateBundleTotal(
    input.products,
    input.discount_type,
    input.discount_value
  );

  const { rows } = await pool.query(
    `INSERT INTO bundles (
      name, description, products, subtotal, discount_type,
      discount_value, total, currency, valid_from, valid_until,
      includes_upsell, upsell_details, company_id, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING ${SELECT}`,
    [
      input.name,
      input.description || null,
      JSON.stringify(input.products),
      subtotal,
      input.discount_type,
      input.discount_value,
      total,
      input.currency || 'EUR',
      input.valid_from || null,
      input.valid_until || null,
      input.includes_upsell || false,
      input.upsell_details ? JSON.stringify(input.upsell_details) : null,
      input.company_id || null,
      actorId
    ]
  );

  const bundle = rows[0];
  await recordAuditLog({
    actorId,
    action: 'bundle.create',
    entity: 'bundle',
    entityId: bundle.id,
    afterState: bundle
  });

  return bundle;
}

export async function updateBundle(
  id: string,
  input: Partial<BundleInput>,
  actorId: string
) {
  const existing = await getBundle(id);
  if (!existing) throw new Error('Bundle not found');

  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.name !== undefined) {
    params.push(input.name);
    updates.push(`name = $${params.length}`);
  }

  if (input.description !== undefined) {
    params.push(input.description);
    updates.push(`description = $${params.length}`);
  }

  if (input.products !== undefined) {
    // Recalculate totals if products changed
    const discountType = input.discount_type || existing.discount_type;
    const discountValue = input.discount_value !== undefined 
      ? input.discount_value 
      : existing.discount_value;
    
    const { subtotal, total } = calculateBundleTotal(
      input.products,
      discountType,
      discountValue
    );

    params.push(JSON.stringify(input.products));
    updates.push(`products = $${params.length}`);
    
    params.push(subtotal);
    updates.push(`subtotal = $${params.length}`);
    
    params.push(total);
    updates.push(`total = $${params.length}`);
  }

  if (input.discount_value !== undefined) {
    params.push(input.discount_value);
    updates.push(`discount_value = $${params.length}`);
  }

  if (input.valid_until !== undefined) {
    params.push(input.valid_until);
    updates.push(`valid_until = $${params.length}`);
  }

  if (input.status !== undefined) {
    params.push(input.status);
    updates.push(`status = $${params.length}`);
  }

  if (updates.length === 0) return existing;

  params.push(new Date());
  updates.push(`updated_at = $${params.length}`);
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE bundles SET ${updates.join(', ')} 
     WHERE id = $${params.length} 
     RETURNING ${SELECT}`,
    params
  );

  await recordAuditLog({
    actorId,
    action: 'bundle.update',
    entity: 'bundle',
    entityId: id,
    beforeState: existing,
    afterState: rows[0]
  });

  return rows[0];
}

export async function deleteBundle(id: string, actorId: string) {
  const existing = await getBundle(id);
  if (!existing) throw new Error('Bundle not found');

  await pool.query('DELETE FROM bundles WHERE id = $1', [id]);

  await recordAuditLog({
    actorId,
    action: 'bundle.delete',
    entity: 'bundle',
    entityId: id,
    beforeState: existing
  });
}

export async function generateBundlePDF(id: string) {
  const bundle = await getBundle(id);
  if (!bundle) throw new Error('Bundle not found');

  // TODO: Implement PDF generation using existing PDF service
  // For now, return bundle data that can be used by frontend
  return {
    success: true,
    bundle,
    message: 'Bundle PDF generation placeholder'
  };
}

