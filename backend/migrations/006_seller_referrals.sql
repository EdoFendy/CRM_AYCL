-- Seller referral integration and checkout association

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referrals(id),
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_link TEXT;

ALTER TABLE checkouts
  ADD COLUMN IF NOT EXISTS seller_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referral_link TEXT;

CREATE INDEX IF NOT EXISTS idx_checkouts_seller_user_id ON checkouts(seller_user_id);

DO $$
DECLARE
  seller RECORD;
  generated_code TEXT;
  v_referral_id UUID;
  v_referral_code TEXT;
BEGIN
  FOR seller IN SELECT id FROM users WHERE role = 'seller' LOOP
    -- Ensure referral exists or create a new one
    SELECT id, code
    INTO v_referral_id, v_referral_code
    FROM referrals
    WHERE owner_user_id = seller.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_referral_id IS NULL THEN
      LOOP
        generated_code := 'AYCL-' || upper(substring(encode(gen_random_bytes(6), 'hex') FROM 1 FOR 10));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM referrals WHERE code = generated_code);
      END LOOP;

      INSERT INTO referrals (code, owner_user_id)
      VALUES (generated_code, seller.id)
      RETURNING id, code
      INTO v_referral_id, v_referral_code;
    END IF;

    UPDATE users
    SET referral_id = v_referral_id,
        referral_code = v_referral_code,
        referral_link = 'https://allyoucanleads.com/r/' || v_referral_code
    WHERE id = seller.id;
  END LOOP;
END $$;

UPDATE checkouts c
SET seller_user_id = o.owner_id
FROM opportunities o
WHERE c.opportunity_id = o.id
  AND c.seller_user_id IS NULL;

UPDATE checkouts c
SET referral_code = r.code,
    referral_link = 'https://allyoucanleads.com/r/' || r.code
FROM referrals r
WHERE c.referral_id = r.id
  AND (c.referral_code IS NULL OR c.referral_code <> r.code);
