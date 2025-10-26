import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import axios from 'axios';

const WC_URL = process.env.WC_URL || 'https://checkout.allyoucanleads.com';
const WC_KEY = process.env.WC_KEY || '';
const WC_SECRET = process.env.WC_SECRET || '';

const wooClient = axios.create({
  baseURL: `${WC_URL}/wp-json/wc/v3`,
  auth: {
    username: WC_KEY,
    password: WC_SECRET
  },
  timeout: 30000
});

const SELECT_BUNDLE = `
  id, name, description, company_id, contact_id, seller_user_id,
  discount_type, discount_value, subtotal, discount_amount, total, currency,
  includes_upsell, upsell_name, upsell_description, upsell_price,
  status, valid_until, woo_product_id, woo_payment_url,
  checkout_url, checkout_token, metadata,
  created_at, updated_at
`;

const SELECT_BUNDLE_PRODUCT = `
  id, bundle_id, woo_product_id, product_name, product_sku, product_description,
  quantity, unit_price, total_price,
  product_discount_type, product_discount_value, metadata,
  created_at, updated_at
`;

interface BundleInput {
  name: string;
  description?: string;
  company_id?: string;
  contact_id?: string;
  seller_user_id?: string;
  discount_type: 'percentage' | 'fixed' | 'none';
  discount_value?: number;
  currency?: string;
  includes_upsell?: boolean;
  upsell_name?: string;
  upsell_description?: string;
  upsell_price?: number;
  valid_until?: string;
  products: BundleProductInput[];
}

interface BundleProductInput {
  woo_product_id?: number;
  product_name: string;
  product_sku?: string;
  product_description?: string;
  quantity: number;
  unit_price: number;
  product_discount_type?: 'percentage' | 'fixed' | 'none';
  product_discount_value?: number;
}

export async function createBundle(input: BundleInput, actorId: string) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Crea bundle con valori di default espliciti
    const { rows: bundleRows } = await client.query(
      `INSERT INTO bundles (
        name, description, company_id, contact_id, seller_user_id,
        discount_type, discount_value, currency,
        includes_upsell, upsell_name, upsell_description, upsell_price,
        valid_until, status, subtotal, total, discount_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING ${SELECT_BUNDLE}`,
      [
        input.name,
        input.description || null,
        input.company_id || null,
        input.contact_id || null,
        input.seller_user_id || null,
        input.discount_type || 'none',
        input.discount_value || 0,
        input.currency || 'EUR',
        input.includes_upsell || false,
        input.upsell_name || null,
        input.upsell_description || null,
        input.upsell_price || null,
        input.valid_until || null,
        'draft',
        0, // subtotal - will be calculated by trigger
        0, // total - will be calculated by trigger
        0  // discount_amount - will be calculated by trigger
      ]
    );
    
    const bundle = bundleRows[0];
    
    // Aggiungi prodotti
    for (const product of input.products) {
      const totalPrice = product.quantity * product.unit_price;
      
      await client.query(
        `INSERT INTO bundle_products (
          bundle_id, woo_product_id, product_name, product_sku, product_description,
          quantity, unit_price, total_price,
          product_discount_type, product_discount_value
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          bundle.id,
          product.woo_product_id || null,
          product.product_name,
          product.product_sku || null,
          product.product_description || null,
          product.quantity,
          product.unit_price,
          totalPrice,
          product.product_discount_type || null,
          product.product_discount_value || null
        ]
      );
    }
    
    // Ricalcola totali (il trigger lo fa automaticamente, ma forziamo per sicurezza)
    await client.query('SELECT calculate_bundle_totals($1)', [bundle.id]);
    
    // Ottieni bundle aggiornato con prodotti
    const { rows: updatedBundleRows } = await client.query(
      `SELECT ${SELECT_BUNDLE} FROM bundles WHERE id = $1`,
      [bundle.id]
    );
    
    const { rows: productsRows } = await client.query(
      `SELECT ${SELECT_BUNDLE_PRODUCT} FROM bundle_products WHERE bundle_id = $1`,
      [bundle.id]
    );
    
    await client.query('COMMIT');
    
    const result = {
      ...updatedBundleRows[0],
      products: productsRows
    };
    
    await recordAuditLog({
      actorId,
      action: 'bundle.create',
      entity: 'bundle',
      entityId: bundle.id,
      afterState: result
    });
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getBundle(bundleId: string) {
  const { rows: bundleRows } = await pool.query(
    `SELECT ${SELECT_BUNDLE} FROM bundles WHERE id = $1`,
    [bundleId]
  );
  
  if (bundleRows.length === 0) {
    return null;
  }
  
  const { rows: productsRows } = await pool.query(
    `SELECT ${SELECT_BUNDLE_PRODUCT} FROM bundle_products WHERE bundle_id = $1 ORDER BY created_at`,
    [bundleId]
  );
  
  return {
    ...bundleRows[0],
    products: productsRows
  };
}

export async function getBundleByToken(token: string) {
  const { rows: bundleRows } = await pool.query(
    `SELECT ${SELECT_BUNDLE} FROM bundles WHERE checkout_token = $1`,
    [token]
  );
  
  if (bundleRows.length === 0) {
    return null;
  }
  
  const { rows: productsRows } = await pool.query(
    `SELECT ${SELECT_BUNDLE_PRODUCT} FROM bundle_products WHERE bundle_id = $1 ORDER BY created_at`,
    [bundleRows[0].id]
  );
  
  return {
    ...bundleRows[0],
    products: productsRows
  };
}

export async function listBundles(filters: {
  seller_user_id?: string;
  company_id?: string;
  contact_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;
  
  if (filters.seller_user_id) {
    conditions.push(`seller_user_id = $${paramIndex++}`);
    params.push(filters.seller_user_id);
  }
  
  if (filters.company_id) {
    conditions.push(`company_id = $${paramIndex++}`);
    params.push(filters.company_id);
  }
  
  if (filters.contact_id) {
    conditions.push(`contact_id = $${paramIndex++}`);
    params.push(filters.contact_id);
  }
  
  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const { rows } = await pool.query(
    `SELECT ${SELECT_BUNDLE} FROM bundles ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit || 50, filters.offset || 0]
  );
  
  return rows;
}

export async function updateBundle(
  bundleId: string,
  updates: Partial<BundleInput>,
  actorId: string
) {
  const existing = await getBundle(bundleId);
  if (!existing) {
    throw new Error('Bundle not found');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Aggiorna bundle
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }
    
    if (updates.discount_type !== undefined) {
      updateFields.push(`discount_type = $${paramIndex++}`);
      params.push(updates.discount_type);
    }
    
    if (updates.discount_value !== undefined) {
      updateFields.push(`discount_value = $${paramIndex++}`);
      params.push(updates.discount_value);
    }
    
    if (updates.includes_upsell !== undefined) {
      updateFields.push(`includes_upsell = $${paramIndex++}`);
      params.push(updates.includes_upsell);
    }
    
    if (updates.upsell_name !== undefined) {
      updateFields.push(`upsell_name = $${paramIndex++}`);
      params.push(updates.upsell_name);
    }
    
    if (updates.upsell_description !== undefined) {
      updateFields.push(`upsell_description = $${paramIndex++}`);
      params.push(updates.upsell_description);
    }
    
    if (updates.upsell_price !== undefined) {
      updateFields.push(`upsell_price = $${paramIndex++}`);
      params.push(updates.upsell_price);
    }
    
    if (updates.valid_until !== undefined) {
      updateFields.push(`valid_until = $${paramIndex++}`);
      params.push(updates.valid_until);
    }
    
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      params.push(bundleId);
      
      await client.query(
        `UPDATE bundles SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
    }
    
    // Aggiorna prodotti se forniti
    if (updates.products) {
      // Elimina prodotti esistenti
      await client.query('DELETE FROM bundle_products WHERE bundle_id = $1', [bundleId]);
      
      // Inserisci nuovi prodotti
      for (const product of updates.products) {
        const totalPrice = product.quantity * product.unit_price;
        
        await client.query(
          `INSERT INTO bundle_products (
            bundle_id, woo_product_id, product_name, product_sku, product_description,
            quantity, unit_price, total_price,
            product_discount_type, product_discount_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            bundleId,
            product.woo_product_id || null,
            product.product_name,
            product.product_sku || null,
            product.product_description || null,
            product.quantity,
            product.unit_price,
            totalPrice,
            product.product_discount_type || null,
            product.product_discount_value || null
          ]
        );
      }
      
      // Ricalcola totali
      await client.query('SELECT calculate_bundle_totals($1)', [bundleId]);
    }
    
    await client.query('COMMIT');
    
    const updated = await getBundle(bundleId);
    
    await recordAuditLog({
      actorId,
      action: 'bundle.update',
      entity: 'bundle',
      entityId: bundleId,
      beforeState: existing,
      afterState: updated
    });
    
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function generateBundleCheckoutUrl(
  bundleId: string,
  baseUrl: string = 'https://allyoucanleads.com'
) {
  // Verifica che il bundle esista
  const bundle = await getBundle(bundleId);
  if (!bundle) {
    throw new Error('Bundle not found');
  }
  
  // Usa la funzione SQL che gestisce tutto (token, URL, referral code)
  const { rows } = await pool.query(
    'SELECT create_bundle_checkout_url($1, $2) as checkout_url',
    [bundleId, baseUrl]
  );
  
  return rows[0].checkout_url;
}

export async function createBundleWooProduct(bundleId: string) {
  const bundle = await getBundle(bundleId);
  if (!bundle) {
    throw new Error('Bundle not found');
  }
  
  // Crea descrizione prodotto WooCommerce
  const productLines = bundle.products.map((p: any) => 
    `• ${p.product_name} (x${p.quantity}) - €${p.unit_price}`
  ).join('\n');
  
  let description = `Bundle: ${bundle.name}\n\n${productLines}\n\n`;
  
  if (bundle.discount_type !== 'none' && bundle.discount_value > 0) {
    const discountText = bundle.discount_type === 'percentage' 
      ? `${bundle.discount_value}%` 
      : `€${bundle.discount_value}`;
    description += `Sconto: ${discountText}\n`;
  }
  
  if (bundle.includes_upsell && bundle.upsell_name) {
    description += `\nUpSell disponibile: ${bundle.upsell_name} (+€${bundle.upsell_price})`;
  }
  
  // Crea prodotto su WooCommerce
  const productData = {
    name: bundle.name,
    type: 'simple',
    regular_price: bundle.total.toString(),
    status: 'publish',
    virtual: true,
    description,
    short_description: bundle.description || `Bundle con ${bundle.products.length} prodotti`,
    meta_data: [
      { key: '_bundle_id', value: bundle.id },
      { key: '_currency', value: bundle.currency }
    ]
  };
  
  const response = await wooClient.post('/products', productData);
  
  // Aggiorna bundle con woo_product_id
  await pool.query(
    'UPDATE bundles SET woo_product_id = $1, updated_at = NOW() WHERE id = $2',
    [response.data.id, bundleId]
  );
  
  return response.data;
}

export async function deleteBundle(bundleId: string, actorId: string) {
  const existing = await getBundle(bundleId);
  if (!existing) {
    throw new Error('Bundle not found');
  }
  
  await pool.query('DELETE FROM bundles WHERE id = $1', [bundleId]);
  
  await recordAuditLog({
    actorId,
    action: 'bundle.delete',
    entity: 'bundle',
    entityId: bundleId,
    beforeState: existing
  });
}

export async function updateBundleStatus(
  bundleId: string,
  status: string,
  actorId: string
) {
  const existing = await getBundle(bundleId);
  if (!existing) {
    throw new Error('Bundle not found');
  }
  
  await pool.query(
    'UPDATE bundles SET status = $1, updated_at = NOW() WHERE id = $2',
    [status, bundleId]
  );
  
  const updated = await getBundle(bundleId);
  
  await recordAuditLog({
    actorId,
    action: 'bundle.update_status',
    entity: 'bundle',
    entityId: bundleId,
    beforeState: existing,
    afterState: updated
  });
  
  return updated;
}
