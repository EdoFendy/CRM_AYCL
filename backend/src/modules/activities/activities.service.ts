import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { parseCursorPagination } from '../../utils/pagination.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `id, type, actor_id, company_id, contact_id, opportunity_id, content, metadata, occurred_at, created_at`;

interface ActivityInput {
  type: 'email' | 'call' | 'meeting' | 'note' | 'system';
  company_id?: string | null;
  contact_id?: string | null;
  opportunity_id?: string | null;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  occurred_at?: string | null;
}

export async function listActivities(query: Record<string, unknown>) {
  const { limit, cursor } = parseCursorPagination(query);
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.company_id) {
    params.push(query.company_id);
    filters.push(`company_id = $${params.length}`);
  }
  if (query.contact_id) {
    params.push(query.contact_id);
    filters.push(`contact_id = $${params.length}`);
  }
  if (query.opportunity_id) {
    params.push(query.opportunity_id);
    filters.push(`opportunity_id = $${params.length}`);
  }
  if (query.type) {
    params.push(query.type);
    filters.push(`type = $${params.length}`);
  }
  if (query.date_from) {
    params.push(query.date_from);
    filters.push(`occurred_at >= $${params.length}`);
  }
  if (query.date_to) {
    params.push(query.date_to);
    filters.push(`occurred_at <= $${params.length}`);
  }
  if (query.query) {
    params.push(`%${query.query}%`);
    filters.push(`content ILIKE $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `SELECT ${SELECT} FROM activities ${where} ORDER BY occurred_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);
  const { rows } = await pool.query(sql, params);
  return { items: rows.slice(0, limit), nextCursor: rows.length > limit ? cursor ?? null : null };
}

export async function createActivity(input: ActivityInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO activities (type, actor_id, company_id, contact_id, opportunity_id, content, metadata, occurred_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, COALESCE($8::timestamptz, NOW()))
     RETURNING ${SELECT}`,
    [
      input.type,
      actorId,
      input.company_id ?? null,
      input.contact_id ?? null,
      input.opportunity_id ?? null,
      input.content ?? null,
      input.metadata ? JSON.stringify(input.metadata) : JSON.stringify({}),
      input.occurred_at ?? null
    ]
  );
  const activity = rows[0];
  await recordAuditLog({ actorId, action: 'activity.create', entity: 'activity', entityId: activity.id, afterState: activity });
  return activity;
}

export async function updateActivity(id: string, input: Partial<ActivityInput>, actorId: string) {
  const existing = await getActivity(id);
  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.content !== undefined) {
    params.push(input.content);
    fields.push(`content = $${params.length}`);
  }
  if (input.metadata !== undefined) {
    params.push(JSON.stringify(input.metadata));
    fields.push(`metadata = $${params.length}::jsonb`);
  }
  if (input.occurred_at !== undefined) {
    params.push(input.occurred_at);
    fields.push(`occurred_at = $${params.length}`);
  }

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  const sql = `UPDATE activities SET ${fields.join(', ')}, actor_id = actor_id WHERE id = $${params.length} RETURNING ${SELECT}`;
  const { rows } = await pool.query(sql, params);
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'activity.update', entity: 'activity', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function deleteActivity(id: string, actorId: string) {
  const existing = await getActivity(id);
  await pool.query('DELETE FROM activities WHERE id = $1', [id]);
  await recordAuditLog({ actorId, action: 'activity.delete', entity: 'activity', entityId: id, beforeState: existing });
}

export async function getActivity(id: string) {
  const { rows } = await pool.query(`SELECT ${SELECT} FROM activities WHERE id = $1`, [id]);
  const activity = rows[0];
  if (!activity) {
    throw new HttpError(404, 'ACTIVITY_NOT_FOUND', 'Activity not found');
  }
  return activity;
}
