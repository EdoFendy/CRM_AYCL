import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { parseCursorPagination } from '../../utils/pagination.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `id, title, description, due_date, owner_id, company_id, contact_id, opportunity_id, status, priority, metadata, created_at, updated_at, completed_at`;

interface TaskInput {
  title: string;
  description?: string | null;
  due_date?: string | null;
  owner_id?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  opportunity_id?: string | null;
  status?: string;
  priority?: string;
  metadata?: Record<string, unknown> | null;
}

export async function listTasks(query: Record<string, unknown>) {
  const { limit, cursor } = parseCursorPagination(query);
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.owner) {
    params.push(query.owner);
    filters.push(`owner_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    filters.push(`status = $${params.length}`);
  }
  if (query.priority) {
    params.push(query.priority);
    filters.push(`priority = $${params.length}`);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const sql = `SELECT ${SELECT} FROM tasks ${where} ORDER BY due_date NULLS LAST LIMIT $${params.length + 1}`;
  params.push(limit + 1);
  const { rows } = await pool.query(sql, params);
  return { data: rows.slice(0, limit), nextCursor: rows.length > limit ? cursor ?? null : null };
}

export async function createTask(input: TaskInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO tasks (title, description, due_date, owner_id, company_id, contact_id, opportunity_id, status, priority, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'open'), COALESCE($9, 'medium'), $10::jsonb)
     RETURNING ${SELECT}`,
    [
      input.title,
      input.description ?? null,
      input.due_date ?? null,
      input.owner_id ?? actorId,
      input.company_id ?? null,
      input.contact_id ?? null,
      input.opportunity_id ?? null,
      input.status ?? null,
      input.priority ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
  const task = rows[0];
  await recordAuditLog({ actorId, action: 'task.create', entity: 'task', entityId: task.id, afterState: task });
  return task;
}

export async function getTask(id: string) {
  const { rows } = await pool.query(`SELECT ${SELECT} FROM tasks WHERE id = $1`, [id]);
  const task = rows[0];
  if (!task) {
    throw new HttpError(404, 'TASK_NOT_FOUND', 'Task not found');
  }
  return task;
}

export async function updateTask(id: string, input: Partial<TaskInput>, actorId: string) {
  const existing = await getTask(id);
  const fields: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      if (key === 'metadata') {
        params.push(JSON.stringify(value));
        fields.push(`metadata = $${params.length}::jsonb`);
      } else {
        params.push(value);
        fields.push(`${key} = $${params.length}`);
      }
    }
  }

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  const sql = `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING ${SELECT}`;
  const { rows } = await pool.query(sql, params);
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'task.update', entity: 'task', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function completeTask(id: string, actorId: string) {
  const existing = await getTask(id);
  const { rows } = await pool.query(
    `UPDATE tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING ${SELECT}`,
    [id]
  );
  const updated = rows[0];
  await recordAuditLog({ actorId, action: 'task.complete', entity: 'task', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function deleteTask(id: string, actorId: string) {
  const existing = await getTask(id);
  await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  await recordAuditLog({ actorId, action: 'task.delete', entity: 'task', entityId: id, beforeState: existing });
}
