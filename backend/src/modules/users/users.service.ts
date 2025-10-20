import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { recordAuditLog } from '../../services/auditService.js';
import { parseCursorPagination } from '../../utils/pagination.js';
import bcrypt from 'bcryptjs';

const DEFAULT_SELECT = 'id, code11, email, role, status, full_name, team_id, reseller_team_id, created_at, updated_at';

export async function listUsers(query: Record<string, unknown>) {
  const { limit, cursor } = parseCursorPagination(query);
  const status = query.status as string | undefined;
  const role = query.role as string | undefined;

  const params: unknown[] = [];
  const where: string[] = [];

  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }

  // TODO implement cursor-based pagination
  const sql = `SELECT ${DEFAULT_SELECT} FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1);
  const { rows } = await pool.query(sql, params);

  return {
    data: rows.slice(0, limit),
    nextCursor: rows.length > limit ? cursor ?? null : null
  };
}

interface CreateUserInput {
  code11: string;
  email: string;
  password: string;
  role: 'admin' | 'seller' | 'reseller' | 'customer';
  status?: 'active' | 'invited' | 'suspended' | 'deleted';
  fullName?: string;
  teamId?: string | null;
  resellerTeamId?: string | null;
}

export async function createUser(input: CreateUserInput, actorId: string) {
  const hash = await bcrypt.hash(input.password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (code11, email, password_hash, role, status, full_name, team_id, reseller_team_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${DEFAULT_SELECT}`,
    [
      input.code11,
      input.email,
      hash,
      input.role,
      input.status ?? 'active',
      input.fullName ?? null,
      input.teamId ?? null,
      input.resellerTeamId ?? null
    ]
  );

  const user = rows[0];
  await recordAuditLog({ actorId, action: 'user.create', entity: 'user', entityId: user.id, afterState: user });
  return user;
}

export async function getUser(id: string) {
  const { rows } = await pool.query(`SELECT ${DEFAULT_SELECT} FROM users WHERE id = $1`, [id]);
  const user = rows[0];
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return user;
}

export async function updateUser(id: string, payload: Partial<CreateUserInput>, actorId: string) {
  const existing = await getUser(id);
  const fields: string[] = [];
  const params: unknown[] = [];

  if (payload.email) {
    params.push(payload.email);
    fields.push(`email = $${params.length}`);
  }
  if (payload.role) {
    params.push(payload.role);
    fields.push(`role = $${params.length}`);
  }
  if (payload.status) {
    params.push(payload.status);
    fields.push(`status = $${params.length}`);
  }
  if (payload.fullName !== undefined) {
    params.push(payload.fullName);
    fields.push(`full_name = $${params.length}`);
  }
  if (payload.teamId !== undefined) {
    params.push(payload.teamId);
    fields.push(`team_id = $${params.length}`);
  }
  if (payload.resellerTeamId !== undefined) {
    params.push(payload.resellerTeamId);
    fields.push(`reseller_team_id = $${params.length}`);
  }

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${DEFAULT_SELECT}`;
  const { rows } = await pool.query(sql, params);
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'user.update', entity: 'user', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function deleteUser(id: string, actorId: string) {
  const existing = await getUser(id);
  await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', ['deleted', id]);
  await recordAuditLog({ actorId, action: 'user.delete', entity: 'user', entityId: id, beforeState: existing });
}

export async function resetUserPassword(id: string, actorId: string) {
  const existing = await getUser(id);
  const tempPassword = Math.random().toString(36).slice(-10);
  const hash = await bcrypt.hash(tempPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
  await recordAuditLog({ actorId, action: 'user.reset-password', entity: 'user', entityId: id });
  return { temporaryPassword: tempPassword, user: existing };
}

export async function listRoles() {
  const { rows } = await pool.query('SELECT id, name, description, permissions FROM roles ORDER BY name');
  return rows;
}

export async function createRole(name: string, description: string | undefined, permissions: unknown) {
  const { rows } = await pool.query(
    'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3::jsonb) RETURNING id, name, description, permissions',
    [name, description ?? null, JSON.stringify(permissions ?? {})]
  );
  return rows[0];
}

export async function listTeams(type?: string) {
  const { rows } = await pool.query(
    `SELECT id, name, type, parent_team_id, metadata FROM teams ${type ? 'WHERE type = $1' : ''} ORDER BY created_at DESC`,
    type ? [type] : []
  );
  return rows;
}

export async function createTeam(name: string, type: string, parentTeamId?: string | null) {
  const { rows } = await pool.query(
    'INSERT INTO teams (name, type, parent_team_id) VALUES ($1, $2, $3) RETURNING id, name, type, parent_team_id',
    [name, type, parentTeamId ?? null]
  );
  return rows[0];
}
