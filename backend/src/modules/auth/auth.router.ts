import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { HttpError } from '../../middlewares/errorHandler.js';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { confirmPasswordReset, login, logout, me, refreshToken, requestPasswordReset } from './auth.service.js';

export const authRouter = Router();

const loginSchema = z.object({
  code11: z.string().length(11),
  password: z.string().min(8)
});

authRouter.post('/login', async (req, res) => {
  const payload = loginSchema.parse(req.body);
  const result = await login(payload);
  res.json(result);
});

authRouter.post('/refresh', async (req, res) => {
  const schema = z.object({ refreshToken: z.string().min(10) });
  const { refreshToken: token } = schema.parse(req.body);
  const result = await refreshToken(token);
  res.json(result);
});

authRouter.post('/logout', requireAuth, async (req, res) => {
  const schema = z.object({ refreshToken: z.string().min(10) });
  const { refreshToken: token } = schema.parse(req.body);
  await logout(token, req.user!.id);
  res.status(204).send();
});

authRouter.post('/reset-request', async (req, res) => {
  const schema = z.object({ code11: z.string().length(11) });
  const { code11 } = schema.parse(req.body);
  await requestPasswordReset(code11);
  res.status(202).json({ message: 'If the account exists, a reset link will be sent shortly.' });
});

authRouter.post('/reset-confirm', async (req, res) => {
  const schema = z.object({ token: z.string(), password: z.string().min(8) });
  const { token, password } = schema.parse(req.body);
  const hash = await bcrypt.hash(password, 10);
  await confirmPasswordReset(token, hash);
  res.json({ message: 'Password updated' });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const profile = await me(req.user!.id);
  res.json(profile);
});

authRouter.post('/logout-all', requireAuth, async (req, res) => {
  const { rowCount } = await logoutAll(req.user!.id);
  res.json({ revoked: rowCount });
});

async function logoutAll(userId: string) {
  const result = await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL RETURNING id', [userId]);
  if (result.rowCount === 0) {
    throw new HttpError(400, 'NO_SESSIONS_REVOKED', 'No active sessions found');
  }
  return result;
}
