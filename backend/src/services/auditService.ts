import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';

interface AuditLogInput {
  actorId?: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog(entry: AuditLogInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, before_state, after_state, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)`,
      [
        entry.actorId ?? null,
        entry.action,
        entry.entity,
        entry.entityId ?? null,
        entry.beforeState ? JSON.stringify(entry.beforeState) : null,
        entry.afterState ? JSON.stringify(entry.afterState) : null,
        entry.metadata ? JSON.stringify(entry.metadata) : JSON.stringify({})
      ]
    );
  } catch (error) {
    logger.error({ error, entry }, 'Failed to record audit log');
  }
}
