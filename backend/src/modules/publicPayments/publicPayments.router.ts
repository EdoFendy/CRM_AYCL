import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool.js';
import { paymentService } from '../../services/paymentService.js';
import { logger } from '../../utils/logger.js';

export const publicPaymentsRouter = Router();

// GET /public/payments/:token - Dettagli pagamento pubblico
publicPaymentsRouter.get('/:token', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
      pi.*, c.number as contract_number, c.pack,
      comp.ragione_sociale as company_name
     FROM payment_links pl
     JOIN payment_intents pi ON pi.id = pl.payment_intent_id
     LEFT JOIN contracts c ON c.id = pi.contract_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE pl.token = $1 AND (pl.expires_at IS NULL OR pl.expires_at > NOW())`,
    [req.params.token]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Link di pagamento non valido o scaduto' });
  }
  
  res.json(rows[0]);
});

// POST /public/payments/:token/process - Processa pagamento pubblico
publicPaymentsRouter.post('/:token/process', async (req, res) => {
  const schema = z.object({
    method: z.string(),
    cardToken: z.string().optional(),
    bankAccount: z.any().optional(),
    customerEmail: z.string().email(),
  });
  
  const data = schema.parse(req.body);
  
  try {
    // Verifica che il link sia valido
    const { rows: linkRows } = await pool.query(
      `SELECT pl.*, pi.*
       FROM payment_links pl
       JOIN payment_intents pi ON pi.id = pl.payment_intent_id
       WHERE pl.token = $1 AND (pl.expires_at IS NULL OR pl.expires_at > NOW())`,
      [req.params.token]
    );
    
    if (linkRows.length === 0) {
      return res.status(404).json({ error: 'Link di pagamento non valido o scaduto' });
    }
    
    const paymentIntent = linkRows[0];
    
    if (paymentIntent.status !== 'pending') {
      return res.status(400).json({ error: 'Pagamento già processato' });
    }
    
    // Processa pagamento
    const result = await paymentService.processPayment(paymentIntent.id, data);
    
    if (result.success) {
      res.json({ 
        success: true, 
        transactionId: result.transactionId,
        message: 'Pagamento processato con successo'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: result.error 
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process public payment');
    res.status(500).json({ error: 'Errore nel processing del pagamento' });
  }
});

// GET /public/payments/:token/status - Stato pagamento
publicPaymentsRouter.get('/:token/status', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT pi.status, pi.updated_at
     FROM payment_links pl
     JOIN payment_intents pi ON pi.id = pl.payment_intent_id
     WHERE pl.token = $1`,
    [req.params.token]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Link di pagamento non trovato' });
  }
  
  res.json({
    status: rows[0].status,
    updated_at: rows[0].updated_at
  });
});
