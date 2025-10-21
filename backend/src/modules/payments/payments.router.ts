import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { paymentService } from '../../services/paymentService.js';
import { logger } from '../../utils/logger.js';

export const paymentsRouter = Router();

// GET /payments - Lista pagamenti
paymentsRouter.get('/', async (req, res) => {
  const searchParam = req.query.search as string;
  const statusParam = req.query.status as string;
  const methodParam = req.query.method as string;
  
  const conditions: string[] = [];
  const params: unknown[] = [];
  
  if (searchParam) {
    params.push(`%${searchParam}%`);
    conditions.push(`(pi.id::text ILIKE $${params.length} OR c.number ILIKE $${params.length})`);
  }
  
  if (statusParam) {
    params.push(statusParam);
    conditions.push(`pi.status = $${params.length}`);
  }
  
  if (methodParam) {
    params.push(methodParam);
    conditions.push(`pi.payment_method = $${params.length}`);
  }
  
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const { rows } = await pool.query(
    `SELECT 
      pi.*, c.number as contract_number, c.pack,
      comp.ragione_sociale as company_name
     FROM payment_intents pi
     LEFT JOIN contracts c ON c.id = pi.contract_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     ${where}
     ORDER BY pi.created_at DESC`,
    params
  );
  
  res.json({ data: rows });
});

// GET /payments/:id - Dettaglio pagamento
paymentsRouter.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
      pi.*, c.number as contract_number, c.pack, c.status as contract_status,
      comp.ragione_sociale as company_name, comp.email as company_email
     FROM payment_intents pi
     LEFT JOIN contracts c ON c.id = pi.contract_id
     LEFT JOIN companies comp ON comp.id = c.company_id
     WHERE pi.id = $1`,
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Pagamento non trovato' });
  }
  
  res.json(rows[0]);
});

// POST /payments - Crea payment intent
paymentsRouter.post('/', async (req, res) => {
  const schema = z.object({
    contract_id: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().default('EUR'),
    payment_method: z.string().default('card'),
  });
  
  const data = schema.parse(req.body);
  
  try {
    const paymentIntent = await paymentService.createPaymentIntent(
      data.contract_id,
      data.amount,
      data.currency,
      data.payment_method
    );
    
    res.json(paymentIntent);
  } catch (error) {
    logger.error({ error }, 'Failed to create payment intent');
    res.status(500).json({ error: 'Errore nella creazione del payment intent' });
  }
});

// POST /payments/:id/process - Processa pagamento
paymentsRouter.post('/:id/process', async (req, res) => {
  const schema = z.object({
    method: z.string(),
    cardToken: z.string().optional(),
    bankAccount: z.any().optional(),
    customerEmail: z.string().email(),
  });
  
  const data = schema.parse(req.body);
  
  try {
    const result = await paymentService.processPayment(req.params.id, data);
    
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
    logger.error({ error }, 'Failed to process payment');
    res.status(500).json({ error: 'Errore nel processing del pagamento' });
  }
});

// POST /payments/:id/create-link - Crea link di pagamento
paymentsRouter.post('/:id/create-link', async (req, res) => {
  const schema = z.object({
    return_url: z.string().url(),
    cancel_url: z.string().url(),
  });
  
  const data = schema.parse(req.body);
  
  try {
    const { paymentUrl, expiresAt } = await paymentService.createPaymentLink(
      req.params.id,
      data.return_url,
      data.cancel_url
    );
    
    res.json({
      payment_url: paymentUrl,
      expires_at: expiresAt,
      message: 'Link di pagamento creato con successo'
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create payment link');
    res.status(500).json({ error: 'Errore nella creazione del link di pagamento' });
  }
});

// GET /payments/methods - Lista metodi di pagamento
paymentsRouter.get('/methods', async (req, res) => {
  const methods = paymentService.getAvailablePaymentMethods();
  res.json({ data: methods });
});

// PATCH /payments/:id - Aggiorna pagamento
paymentsRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    status: z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled']).optional(),
    metadata: z.record(z.any()).optional(),
  });
  
  const data = schema.parse(req.body);
  
  if (data.status) {
    await paymentService.updatePaymentIntentStatus(req.params.id, data.status, data.metadata);
  }
  
  res.json({ success: true });
});

// DELETE /payments/:id - Cancella pagamento
paymentsRouter.delete('/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM payment_intents WHERE id = $1',
    [req.params.id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Pagamento non trovato' });
  }
  
  if (rows[0].status === 'succeeded') {
    return res.status(400).json({ error: 'Non è possibile cancellare un pagamento completato' });
  }
  
  await pool.query('DELETE FROM payment_intents WHERE id = $1', [req.params.id]);
  
  res.json({ success: true });
});