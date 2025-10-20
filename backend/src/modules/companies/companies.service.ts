import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { parseCursorPagination } from '../../utils/pagination.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT_LIST = `c.id, c.ragione_sociale, c.website, c.linkedin, c.geo, c.industry, c.revenue_range, c.owner_id, u.reseller_team_id as reseller_id, c.created_at, c.updated_at, c.deleted_at`;
const SELECT_SINGLE = `id, ragione_sociale, website, linkedin, geo, industry, revenue_range, owner_id, created_at, updated_at, deleted_at`;

export async function listCompanies(query: Record<string, unknown>) {
  const { limit, cursor } = parseCursorPagination(query);
  const filters: string[] = ['c.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (query.owner) {
    params.push(query.owner);
    filters.push(`c.owner_id = $${params.length}`);
  }
  if (query.reseller_id) {
    params.push(query.reseller_id);
    filters.push(`u.reseller_team_id = $${params.length}`);
  }
  if (query.industry) {
    params.push(query.industry);
    filters.push(`c.industry = $${params.length}`);
  }
  if (query.geo) {
    params.push(query.geo);
    filters.push(`c.geo = $${params.length}`);
  }
  if (query.query) {
    params.push(`%${query.query}%`);
    filters.push(`(c.ragione_sociale ILIKE $${params.length} OR c.website ILIKE $${params.length})`);
  }

  const sql = `SELECT ${SELECT_LIST} FROM companies c LEFT JOIN users u ON c.owner_id = u.id WHERE ${filters.join(' AND ')} ORDER BY c.created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);
  const { rows } = await pool.query(sql, params);

  return {
    data: rows.slice(0, limit),
    nextCursor: rows.length > limit ? cursor ?? null : null
  };
}

interface CompanyInput {
  ragione_sociale: string;
  website?: string | null;
  linkedin?: string | null;
  geo?: string | null;
  industry?: string | null;
  revenue_range?: string | null;
  owner_id?: string | null;
}

export async function createCompany(input: CompanyInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO companies (ragione_sociale, website, linkedin, geo, industry, revenue_range, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SELECT_SINGLE}`,
    [
      input.ragione_sociale,
      input.website ?? null,
      input.linkedin ?? null,
      input.geo ?? null,
      input.industry ?? null,
      input.revenue_range ?? null,
      input.owner_id ?? actorId
    ]
  );
  const company = rows[0];
  await recordAuditLog({ actorId, action: 'company.create', entity: 'company', entityId: company.id, afterState: company });
  return company;
}

export async function getCompany(id: string) {
  const { rows } = await pool.query(`SELECT ${SELECT_SINGLE} FROM companies WHERE id = $1`, [id]);
  const company = rows[0];
  if (!company) {
    throw new HttpError(404, 'COMPANY_NOT_FOUND', 'Company not found');
  }
  return company;
}

export async function updateCompany(id: string, input: Partial<CompanyInput>, actorId: string) {
  const existing = await getCompany(id);
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
  const sql = `UPDATE companies SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${SELECT_SINGLE}`;
  const { rows } = await pool.query(sql, params);
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'company.update', entity: 'company', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function deleteCompany(id: string, actorId: string) {
  const existing = await getCompany(id);
  await pool.query('UPDATE companies SET deleted_at = NOW() WHERE id = $1', [id]);
  await recordAuditLog({ actorId, action: 'company.delete', entity: 'company', entityId: id, beforeState: existing });
}
