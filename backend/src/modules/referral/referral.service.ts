import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

const SELECT = `
  id, user_id, referral_code, checkout_url, is_active,
  created_at, updated_at
`;

export async function getUserReferralLink(userId: string) {
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM referral_links WHERE user_id = $1 AND is_active = true`,
    [userId]
  );
  return rows[0] || null;
}

export async function createReferralLink(userId: string, baseUrl?: string) {
  // Check if user already has a referral link
  const existing = await getUserReferralLink(userId);
  if (existing) {
    return existing;
  }

  // Update user's checkout base URL if provided
  if (baseUrl) {
    await pool.query(
      'UPDATE users SET checkout_base_url = $1 WHERE id = $2',
      [baseUrl, userId]
    );
  }

  // Create referral link using database function
  const { rows } = await pool.query(
    'SELECT create_user_referral_link($1) as checkout_url',
    [userId]
  );

  const checkoutUrl = rows[0].checkout_url;
  
  // Get the created referral link
  const referralLink = await getUserReferralLink(userId);
  
  await recordAuditLog({
    actorId: userId,
    action: 'referral_link.create',
    entity: 'referral_link',
    entityId: referralLink?.id,
    afterState: referralLink
  });

  return referralLink;
}

export async function getReferralByCode(referralCode: string) {
  const { rows } = await pool.query(
    `SELECT rl.*, u.full_name, u.email 
     FROM referral_links rl
     JOIN users u ON rl.user_id = u.id
     WHERE rl.referral_code = $1 AND rl.is_active = true`,
    [referralCode]
  );
  return rows[0] || null;
}

export async function deactivateReferralLink(userId: string, actorId: string) {
  const existing = await getUserReferralLink(userId);
  if (!existing) {
    throw new Error('Referral link not found');
  }

  await pool.query(
    'UPDATE referral_links SET is_active = false, updated_at = NOW() WHERE user_id = $1',
    [userId]
  );

  await pool.query(
    'UPDATE users SET referral_code = NULL, referral_link = NULL WHERE id = $1',
    [userId]
  );

  await recordAuditLog({
    actorId,
    action: 'referral_link.deactivate',
    entity: 'referral_link',
    entityId: existing.id,
    beforeState: existing
  });
}

export async function getReferralStats(userId: string) {
  const { rows } = await pool.query(
    `SELECT 
      COUNT(*) as total_requests,
      COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_requests,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
      COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_requests
     FROM checkout_requests 
     WHERE referral_code IN (
       SELECT referral_code FROM referral_links WHERE user_id = $1
     )`,
    [userId]
  );
  
  return rows[0] || { total_requests: 0, accepted_requests: 0, pending_requests: 0, expired_requests: 0 };
}
