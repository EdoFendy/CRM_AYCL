import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { pool, withClient } from '../../db/pool.js';
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { config } from '../../config.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { recordAuditLog } from '../../services/auditService.js';
import { logger } from '../../utils/logger.js';

interface LoginPayload {
  code11: string;
  password: string;
}

export async function login({ code11, password }: LoginPayload) {
  const { rows } = await pool.query(
    `SELECT id, code11, password_hash, role, status FROM users WHERE code11 = $1`,
    [code11]
  );

  const user = rows[0];
  if (!user || user.status !== 'active') {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid login credentials');
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid login credentials');
  }

  const payload = {
    sub: user.id,
    code11: user.code11,
    role: user.role as 'admin' | 'seller' | 'reseller' | 'customer'
  };

  const accessToken = createAccessToken(payload);
  const refreshToken = createRefreshToken(payload);

  await pool.query(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, NOW() + $3::interval)',
    [user.id, refreshToken, config.refreshTokenExpiresIn]
  );

  await recordAuditLog({
    actorId: user.id,
    action: 'auth.login',
    entity: 'user',
    entityId: user.id,
    afterState: { lastLogin: new Date().toISOString() }
  });

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  return {
    accessToken,
    refreshToken,
    role: user.role,
    userId: user.id
  };
}

export async function refreshToken(token: string) {
  const payload = verifyRefreshToken(token);
  const { rows } = await pool.query(
    'SELECT id, refresh_token FROM sessions WHERE refresh_token = $1 AND revoked_at IS NULL AND expires_at > NOW()',
    [token]
  );

  if (rows.length === 0) {
    throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token invalid or expired');
  }

  const newPayload = {
    sub: payload.sub,
    code11: payload.code11,
    role: payload.role
  } as const;

  const accessToken = createAccessToken(newPayload);
  const refreshTokenValue = createRefreshToken(newPayload);

  await withClient(async (client) => {
    await client.query('BEGIN');
    await client.query('UPDATE sessions SET revoked_at = NOW() WHERE refresh_token = $1', [token]);
    await client.query(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, NOW() + $3::interval)',
      [payload.sub, refreshTokenValue, config.refreshTokenExpiresIn]
    );
    await client.query('COMMIT');
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

export async function logout(refreshTokenValue: string, userId: string) {
  await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE refresh_token = $1 AND user_id = $2', [refreshTokenValue, userId]);
  await recordAuditLog({
    actorId: userId,
    action: 'auth.logout',
    entity: 'user',
    entityId: userId
  });
}

export async function me(userId: string) {
  const { rows } = await pool.query(
    `SELECT id, code11, email, role, status, team_id, reseller_team_id, last_login_at
     FROM users WHERE id = $1`,
    [userId]
  );

  const user = rows[0];
  if (!user) {
    throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return {
    id: user.id,
    code11: user.code11,
    email: user.email,
    role: user.role,
    status: user.status,
    teamId: user.team_id,
    resellerTeamId: user.reseller_team_id,
    lastLoginAt: user.last_login_at,
    permissions: [], // TODO load permissions by role/team
    scopes: {} // TODO implement scoped access resolution
  };
}

export async function requestPasswordReset(code11: string) {
  const { rows } = await pool.query('SELECT id FROM users WHERE code11 = $1', [code11]);
  const user = rows[0];
  if (!user) {
    return; // avoid user enumeration
  }
  const token = crypto.randomUUID();
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + $3::interval)',
    [user.id, token, config.passwordResetTokenTtl]
  );
  logger.info({ userId: user.id }, 'Password reset token created');
  // TODO send email with token
}

export async function confirmPasswordReset(token: string, newPasswordHash: string) {
  const { rows } = await pool.query(
    'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()',
    [token]
  );
  const record = rows[0];
  if (!record) {
    throw new HttpError(400, 'INVALID_RESET_TOKEN', 'Reset token invalid or expired');
  }

  await withClient(async (client) => {
    await client.query('BEGIN');
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, record.user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [token]);
    await client.query('COMMIT');
  });

  await recordAuditLog({
    actorId: record.user_id,
    action: 'auth.reset-password',
    entity: 'user',
    entityId: record.user_id
  });
}
