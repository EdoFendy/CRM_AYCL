import crypto from 'node:crypto';
import type pg from 'pg';
import { pool, withClient } from '../db/pool.js';

const REFERRAL_BASE_URL =
  (process.env.REFERRAL_BASE_URL && process.env.REFERRAL_BASE_URL.trim() !== ''
    ? process.env.REFERRAL_BASE_URL.trim()
    : process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim() !== ''
      ? process.env.FRONTEND_URL.trim()
      : 'http://localhost:5173');

function buildReferralLink(code: string): string {
  const base = REFERRAL_BASE_URL.endsWith('/') ? REFERRAL_BASE_URL.slice(0, -1) : REFERRAL_BASE_URL;
  return `${base}/r/${code}`;
}

async function generateUniqueReferralCode(client: pg.PoolClient): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const code = `AYCL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { rows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM referrals WHERE code = $1
         UNION
         SELECT 1 FROM users WHERE referral_code = $1
       ) AS exists`,
      [code]
    );
    if (!rows[0]?.exists) {
      return code;
    }
    attempts += 1;
  }
  throw new Error('Unable to generate unique referral code');
}

async function ensureReferralForUserWithClient(
  client: pg.PoolClient,
  userId: string
): Promise<{ id: string; code: string; link: string }> {
  const { rows: existingUserRows } = await client.query<{
    referral_id: string | null;
    referral_code: string | null;
  }>(
    'SELECT referral_id, referral_code FROM users WHERE id = $1 FOR UPDATE',
    [userId]
  );

  if (existingUserRows.length === 0) {
    throw new Error(`User ${userId} not found`);
  }

  let referralId = existingUserRows[0].referral_id;
  let referralCode = existingUserRows[0].referral_code;

  if (!referralId || !referralCode) {
    if (!referralId) {
      const { rows: referralRows } = await client.query<{ id: string; code: string }>(
        'SELECT id, code FROM referrals WHERE owner_user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      if (referralRows.length > 0) {
        referralId = referralRows[0].id;
        referralCode = referralRows[0].code;
      }
    }
  }

  if (!referralId || !referralCode) {
    referralCode = await generateUniqueReferralCode(client);
    const { rows: insertedReferral } = await client.query<{ id: string; code: string }>(
      `INSERT INTO referrals (code, owner_user_id)
       VALUES ($1, $2)
       RETURNING id, code`,
      [referralCode, userId]
    );
    referralId = insertedReferral[0].id;
  }

  const link = buildReferralLink(referralCode);

  await client.query(
    `UPDATE users
     SET referral_id = $1,
         referral_code = $2,
         referral_link = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [referralId, referralCode, link, userId]
  );

  return { id: referralId, code: referralCode, link };
}

export async function ensureReferralForUser(
  userId: string,
  client?: pg.PoolClient
): Promise<{ id: string; code: string; link: string }> {
  if (client) {
    return ensureReferralForUserWithClient(client, userId);
  }

  return withClient(async (pooledClient) => ensureReferralForUserWithClient(pooledClient, userId));
}

export async function getReferralForUser(userId: string): Promise<{ id: string; code: string; link: string } | null> {
  const { rows } = await pool.query<{ referral_id: string | null; referral_code: string | null; referral_link: string | null }>(
    'SELECT referral_id, referral_code, referral_link FROM users WHERE id = $1',
    [userId]
  );
  if (rows.length === 0 || !rows[0].referral_id || !rows[0].referral_code) {
    return null;
  }
  const link = rows[0].referral_link ?? buildReferralLink(rows[0].referral_code);
  return { id: rows[0].referral_id, code: rows[0].referral_code, link };
}

export { buildReferralLink };
