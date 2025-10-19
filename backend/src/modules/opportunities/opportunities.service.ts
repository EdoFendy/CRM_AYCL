import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { parseCursorPagination } from '../../utils/pagination.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `id, company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, referral_id, created_at, updated_at, deleted_at`;

export async function listOpportunities(query: Record<string, unknown>) {
  const { limit, cursor } = parseCursorPagination(query);
  const filters: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (query.company_id) {
    params.push(query.company_id);
    filters.push(`company_id = $${params.length}`);
  }
  if (query.owner) {
    params.push(query.owner);
    filters.push(`owner_id = $${params.length}`);
  }
  if (query.stage) {
    params.push(query.stage);
    filters.push(`stage = $${params.length}`);
  }
  if (query.date_from) {
    params.push(query.date_from);
    filters.push(`created_at >= $${params.length}`);
  }
  if (query.date_to) {
    params.push(query.date_to);
    filters.push(`created_at <= $${params.length}`);
  }
  if (query.query) {
    params.push(`%${query.query}%`);
    filters.push(`title ILIKE $${params.length}`);
  }

  const sql = `SELECT ${SELECT} FROM opportunities WHERE ${filters.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);
  const { rows } = await pool.query(sql, params);
  return { items: rows.slice(0, limit), nextCursor: rows.length > limit ? cursor ?? null : null };
}

interface OpportunityInput {
  company_id: string;
  title: string;
  value: number;
  currency?: string;
  stage: string;
  probability?: number;
  owner_id?: string | null;
  expected_close_date?: string | null;
  source?: string | null;
  referral_id?: string | null;
}

export async function createOpportunity(input: OpportunityInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, referral_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${SELECT}`,
    [
      input.company_id,
      input.title,
      input.value,
      input.currency ?? 'EUR',
      input.stage,
      input.probability ?? null,
      input.owner_id ?? actorId,
      input.expected_close_date ?? null,
      input.source ?? null,
      input.referral_id ?? null
    ]
  );
  const opportunity = rows[0];
  await recordAuditLog({ actorId, action: 'opportunity.create', entity: 'opportunity', entityId: opportunity.id, afterState: opportunity });
  return opportunity;
}

export async function getOpportunity(id: string) {
  const { rows } = await pool.query(`SELECT ${SELECT} FROM opportunities WHERE id = $1`, [id]);
  const opportunity = rows[0];
  if (!opportunity) {
    throw new HttpError(404, 'OPPORTUNITY_NOT_FOUND', 'Opportunity not found');
  }
  return opportunity;
}

export async function updateOpportunity(id: string, input: Partial<OpportunityInput>, actorId: string) {
  const existing = await getOpportunity(id);
  const fields: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${key} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  const sql = `UPDATE opportunities SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${SELECT}`;
  const { rows } = await pool.query(sql, params);
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'opportunity.update', entity: 'opportunity', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function deleteOpportunity(id: string, actorId: string) {
  const existing = await getOpportunity(id);
  await pool.query('UPDATE opportunities SET deleted_at = NOW() WHERE id = $1', [id]);
  await recordAuditLog({ actorId, action: 'opportunity.delete', entity: 'opportunity', entityId: id, beforeState: existing });
}

export async function moveOpportunityStage(id: string, nextStage: string, actorId: string, nextStep?: string | null) {
  if (!nextStep) {
    throw new HttpError(400, 'NEXT_STEP_REQUIRED', 'next_step is required to move stage');
  }
  const existing = await getOpportunity(id);
  const { rows } = await pool.query(
    `UPDATE opportunities SET stage = $1, updated_at = NOW() WHERE id = $2 RETURNING ${SELECT}`,
    [nextStage, id]
  );
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'opportunity.move-stage', entity: 'opportunity', entityId: id, beforeState: existing, afterState: { ...updated, nextStep } });
  // TODO: create follow-up task based on nextStep
  return updated;
}

export async function opportunityMetrics(query: Record<string, unknown>) {
  // TODO implement pipeline velocity, forecast, win-rate calculations
  return {
    velocity: null,
    forecast: null,
    winRate: null,
    filters: query,
    todo: true
  };
}
