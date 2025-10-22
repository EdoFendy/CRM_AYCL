import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { ensureReferralForUser, buildReferralLink } from '../../services/referralService.js';

export const checkoutsRouter = Router();

checkoutsRouter.use(requireAuth);

checkoutsRouter.get('/', async (req, res) => {
  const params: unknown[] = [];
  let whereClause = '';

  if (req.user?.role === 'seller') {
    params.push(req.user.id);
    whereClause = 'WHERE seller_user_id = $1';
  }

  const { rows } = await pool.query(
    `SELECT * FROM checkouts ${whereClause} ORDER BY created_at DESC LIMIT 100`,
    params
  );
  res.json({ data: rows });
});

checkoutsRouter.post('/', async (req, res) => {
  const schema = z.object({
    session: z.string().min(5),
    referral_id: z.string().uuid().nullable().optional(),
    opportunity_id: z.string().uuid().nullable().optional(),
    seller_user_id: z.string().uuid().nullable().optional(),
    status: z.string().default('pending')
  });
  const payload = schema.parse(req.body);

  let sellerUserId = payload.seller_user_id ?? null;
  let referralId = payload.referral_id ?? null;
  let referralCode: string | null = null;
  let referralLink: string | null = null;

  if (req.user?.role === 'seller') {
    if (sellerUserId && sellerUserId !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Cannot assign checkout to another seller');
    }
    sellerUserId = req.user.id;
    const referral = await ensureReferralForUser(req.user.id);
    referralId = referral.id;
    referralCode = referral.code;
    referralLink = referral.link;
  } else if (referralId) {
    const { rows: referralRows } = await pool.query<{ id: string; code: string; owner_user_id: string | null }>(
      'SELECT id, code, owner_user_id FROM referrals WHERE id = $1',
      [referralId]
    );
    if (referralRows.length === 0) {
      throw new HttpError(400, 'REFERRAL_NOT_FOUND', 'Referral not found');
    }
    referralCode = referralRows[0].code;
    referralLink = buildReferralLink(referralCode);
    sellerUserId = sellerUserId ?? referralRows[0].owner_user_id ?? null;
  } else if (sellerUserId) {
    const { rows: userRows } = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [sellerUserId, 'seller']
    );
    if (userRows.length === 0) {
      throw new HttpError(400, 'SELLER_NOT_FOUND', 'Seller not found');
    }
    const referral = await ensureReferralForUser(sellerUserId);
    referralId = referral.id;
    referralCode = referral.code;
    referralLink = referral.link;
  }

  const { rows } = await pool.query(
    `INSERT INTO checkouts (session, referral_id, referral_code, referral_link, seller_user_id, opportunity_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.session,
      referralId,
      referralCode,
      referralLink,
      sellerUserId,
      payload.opportunity_id ?? null,
      payload.status
    ]
  );
  res.status(201).json(rows[0]);
});

checkoutsRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    status: z.string().optional(),
    referral_id: z.string().uuid().nullable().optional(),
    opportunity_id: z.string().uuid().nullable().optional(),
    seller_user_id: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);

  const { rows: existingRows } = await pool.query(
    'SELECT * FROM checkouts WHERE id = $1',
    [req.params.id]
  );
  if (existingRows.length === 0) {
    throw new HttpError(404, 'CHECKOUT_NOT_FOUND', 'Checkout not found');
  }

  const current = existingRows[0];

  let status = payload.status ?? current.status;
  let referralId = payload.referral_id !== undefined ? payload.referral_id : current.referral_id;
  let sellerUserId =
    payload.seller_user_id !== undefined ? payload.seller_user_id : current.seller_user_id;
  let opportunityId =
    payload.opportunity_id !== undefined ? payload.opportunity_id : current.opportunity_id;
  let referralCode: string | null = current.referral_code;
  let referralLink: string | null = current.referral_link;

  if (req.user?.role === 'seller') {
    if (sellerUserId && sellerUserId !== req.user.id) {
      throw new HttpError(403, 'FORBIDDEN', 'Cannot reassign checkout to another seller');
    }
    sellerUserId = req.user.id;
  }

  if (referralId) {
    const { rows: referralRows } = await pool.query<{ id: string; code: string; owner_user_id: string | null }>(
      'SELECT id, code, owner_user_id FROM referrals WHERE id = $1',
      [referralId]
    );
    if (referralRows.length === 0) {
      throw new HttpError(400, 'REFERRAL_NOT_FOUND', 'Referral not found');
    }
    referralCode = referralRows[0].code;
    referralLink = buildReferralLink(referralCode);
    sellerUserId = sellerUserId ?? referralRows[0].owner_user_id ?? sellerUserId;
  } else if (sellerUserId) {
    const { rows: userRows } = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE id = $1 AND role = $2',
      [sellerUserId, 'seller']
    );
    if (userRows.length === 0) {
      throw new HttpError(400, 'SELLER_NOT_FOUND', 'Seller not found');
    }
    const referral = await ensureReferralForUser(sellerUserId);
    referralId = referral.id;
    referralCode = referral.code;
    referralLink = referral.link;
  } else {
    referralCode = null;
    referralLink = null;
  }

  const { rows } = await pool.query(
    `UPDATE checkouts
     SET status = $1,
         referral_id = $2,
         referral_code = $3,
         referral_link = $4,
         seller_user_id = $5,
         opportunity_id = $6,
         updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [status, referralId, referralCode, referralLink, sellerUserId, opportunityId, req.params.id]
  );

  res.json(rows[0]);
});
