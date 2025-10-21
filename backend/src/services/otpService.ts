import crypto from 'crypto';
import { pool } from '../db/pool.js';

export interface OTPResult {
  code: string;
  expiresAt: Date;
}

/**
 * Genera un codice OTP a 6 cifre
 */
export function generateOTPCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Crea e salva un OTP per una signature request
 */
export async function createOTP(
  signatureRequestId: string,
  type: 'email' | 'sms',
  sentTo: string,
  validityMinutes: number = 10
): Promise<OTPResult> {
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

  await pool.query(
    `INSERT INTO otp_codes (signature_request_id, code, type, sent_to, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [signatureRequestId, code, type, sentTo, expiresAt]
  );

  return { code, expiresAt };
}

/**
 * Verifica un codice OTP
 */
export async function verifyOTP(
  signatureRequestId: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const { rows } = await pool.query(
    `SELECT id, expires_at, verified_at, attempts, max_attempts
     FROM otp_codes
     WHERE signature_request_id = $1 AND code = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [signatureRequestId, code]
  );

  if (rows.length === 0) {
    return { valid: false, error: 'Codice OTP non valido' };
  }

  const otp = rows[0];

  // Già verificato
  if (otp.verified_at) {
    return { valid: false, error: 'Codice OTP già utilizzato' };
  }

  // Scaduto
  if (new Date(otp.expires_at) < new Date()) {
    return { valid: false, error: 'Codice OTP scaduto' };
  }

  // Troppi tentativi
  if (otp.attempts >= otp.max_attempts) {
    return { valid: false, error: 'Troppi tentativi falliti' };
  }

  // Marca come verificato
  await pool.query(
    `UPDATE otp_codes 
     SET verified_at = NOW(), attempts = attempts + 1
     WHERE id = $1`,
    [otp.id]
  );

  return { valid: true };
}

/**
 * Incrementa il contatore tentativi OTP
 */
export async function incrementOTPAttempts(
  signatureRequestId: string,
  code: string
): Promise<void> {
  await pool.query(
    `UPDATE otp_codes 
     SET attempts = attempts + 1
     WHERE signature_request_id = $1 AND code = $2`,
    [signatureRequestId, code]
  );
}

/**
 * Pulisce OTP scaduti
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM otp_codes 
     WHERE expires_at < NOW() AND verified_at IS NULL`
  );
  return rowCount || 0;
}

