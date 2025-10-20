import { pool } from '../../db/pool.js';
import { parseCursorPagination } from '../../utils/pagination.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `id, opportunity_id, version, items, total, currency, status, created_at, updated_at`;

interface OfferInput {
  opportunity_id: string;
  version: number;
  items: unknown[];
  total: number;
  currency?: string;
  status?: string;
}

export async function listOffers(query: Record<string, unknown>) {
  const { limit, cursor } = parseCursorPagination(query);
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.opportunity_id) {
    params.push(query.opportunity_id);
    filters.push(`opportunity_id = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `SELECT ${SELECT} FROM offers ${where} ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);
  const { rows } = await pool.query(sql, params);
  return { data: rows.slice(0, limit), nextCursor: rows.length > limit ? cursor ?? null : null };
}

export async function createOffer(input: OfferInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO offers (opportunity_id, version, items, total, currency, status)
     VALUES ($1, $2, $3::jsonb, $4, $5, COALESCE($6, 'draft'))
     RETURNING ${SELECT}`,
    [
      input.opportunity_id,
      input.version,
      JSON.stringify(input.items ?? []),
      input.total,
      input.currency ?? 'EUR',
      input.status ?? null
    ]
  );
  const offer = rows[0];
  await recordAuditLog({ actorId, action: 'offer.create', entity: 'offer', entityId: offer.id, afterState: offer });
  return offer;
}

export async function updateOffer(id: string, input: Partial<OfferInput>, actorId: string) {
  const existing = await getOffer(id);
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.version !== undefined) {
    params.push(input.version);
    fields.push(`version = $${params.length}`);
  }
  if (input.items !== undefined) {
    params.push(JSON.stringify(input.items));
    fields.push(`items = $${params.length}::jsonb`);
  }
  if (input.total !== undefined) {
    params.push(input.total);
    fields.push(`total = $${params.length}`);
  }
  if (input.currency !== undefined) {
    params.push(input.currency);
    fields.push(`currency = $${params.length}`);
  }
  if (input.status !== undefined) {
    params.push(input.status);
    fields.push(`status = $${params.length}`);
  }

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  const sql = `UPDATE offers SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${SELECT}`;
  const { rows } = await pool.query(sql, params);
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'offer.update', entity: 'offer', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function getOffer(id: string) {
  const { rows } = await pool.query(`SELECT ${SELECT} FROM offers WHERE id = $1`, [id]);
  const offer = rows[0];
  if (!offer) {
    throw new HttpError(404, 'OFFER_NOT_FOUND', 'Offer not found');
  }
  return offer;
}

export async function changeOfferStatus(id: string, status: string, actorId: string, metadata?: Record<string, unknown>) {
  const existing = await getOffer(id);
  const { rows } = await pool.query(
    `UPDATE offers SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING ${SELECT}`,
    [status, id]
  );
  const updated = rows[0];
  await recordAuditLog({ actorId, action: `offer.status.${status}`, entity: 'offer', entityId: id, beforeState: existing, afterState: { ...updated, metadata } });
  return updated;
}
