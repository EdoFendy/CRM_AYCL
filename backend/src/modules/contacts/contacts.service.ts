import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { parseCursorPagination } from '../../utils/pagination.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `id, company_id, first_name, last_name, email, phone, role, linkedin, owner_id, created_at, updated_at, deleted_at`;

export async function listContacts(query: Record<string, unknown>) {
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
  if (query.query) {
    params.push(`%${query.query}%`);
    filters.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }

  const sql = `SELECT ${SELECT} FROM contacts WHERE ${filters.join(' AND ')} ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);
  const { rows } = await pool.query(sql, params);

  return {
    items: rows.slice(0, limit),
    nextCursor: rows.length > limit ? cursor ?? null : null
  };
}

interface ContactInput {
  company_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  linkedin?: string | null;
  owner_id?: string | null;
}

export async function createContact(input: ContactInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO contacts (company_id, first_name, last_name, email, phone, role, linkedin, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${SELECT}`,
    [
      input.company_id,
      input.first_name,
      input.last_name,
      input.email ?? null,
      input.phone ?? null,
      input.role ?? null,
      input.linkedin ?? null,
      input.owner_id ?? actorId
    ]
  );
  const contact = rows[0];
  await recordAuditLog({ actorId, action: 'contact.create', entity: 'contact', entityId: contact.id, afterState: contact });
  return contact;
}

export async function getContact(id: string) {
  const { rows } = await pool.query(`SELECT ${SELECT} FROM contacts WHERE id = $1`, [id]);
  const contact = rows[0];
  if (!contact) {
    throw new HttpError(404, 'CONTACT_NOT_FOUND', 'Contact not found');
  }
  return contact;
}

export async function updateContact(id: string, input: Partial<ContactInput>, actorId: string) {
  const existing = await getContact(id);
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
  const sql = `UPDATE contacts SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${SELECT}`;
  const { rows } = await pool.query(sql, params);
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'contact.update', entity: 'contact', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function deleteContact(id: string, actorId: string) {
  const existing = await getContact(id);
  await pool.query('UPDATE contacts SET deleted_at = NOW() WHERE id = $1', [id]);
  await recordAuditLog({ actorId, action: 'contact.delete', entity: 'contact', entityId: id, beforeState: existing });
}
