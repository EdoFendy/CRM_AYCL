import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { recordAuditLog } from './auditService.js';
import { mailer } from './mailerService.js';
import { timelineService } from './timelineService.js';
import crypto from 'crypto';

export interface PaymentIntent {
  id: string;
  contract_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
  payment_method: string;
  stripe_payment_intent_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'sepa' | 'paypal' | 'bank_transfer';
  name: string;
  description: string;
  enabled: boolean;
}

/**
 * Servizio generico per gestione pagamenti
 * In futuro si integrerà con provider specifici (Stripe, PayPal, etc.)
 */
export class PaymentService {
  private paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      type: 'card',
      name: 'Carta di Credito',
      description: 'Visa, Mastercard, American Express',
      enabled: true,
    },
    {
      id: 'sepa',
      type: 'sepa',
      name: 'Bonifico SEPA',
      description: 'Bonifico bancario europeo',
      enabled: true,
    },
    {
      id: 'paypal',
      type: 'paypal',
      name: 'PayPal',
      description: 'Pagamento tramite PayPal',
      enabled: false, // Da abilitare quando integrato
    },
    {
      id: 'bank_transfer',
      type: 'bank_transfer',
      name: 'Bonifico Bancario',
      description: 'Bonifico tradizionale',
      enabled: true,
    },
  ];

  /**
   * Crea un payment intent per un contratto
   */
  async createPaymentIntent(
    contractId: string,
    amount: number,
    currency: string = 'EUR',
    paymentMethod: string = 'card'
  ): Promise<PaymentIntent> {
    const paymentIntentId = crypto.randomUUID();
    
    const { rows } = await pool.query(
      `INSERT INTO payment_intents (
        id, contract_id, amount, currency, status, payment_method, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [paymentIntentId, contractId, amount, currency, 'pending', paymentMethod]
    );

    await recordAuditLog({
      action: 'payment_intent.create',
      entity: 'contract',
      entityId: contractId,
      metadata: { payment_intent_id: paymentIntentId, amount, currency }
    });

    // Aggiungi evento timeline
    await timelineService.onPaymentCreated(contractId, amount, currency);

    logger.info({ 
      paymentIntentId, 
      contractId, 
      amount, 
      currency 
    }, 'Payment intent created');

    return rows[0];
  }

  /**
   * Aggiorna stato payment intent
   */
  async updatePaymentIntentStatus(
    paymentIntentId: string,
    status: PaymentIntent['status'],
    metadata?: Record<string, any>
  ): Promise<void> {
    await pool.query(
      'UPDATE payment_intents SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, paymentIntentId]
    );

    await recordAuditLog({
      action: 'payment_intent.update_status',
      entity: 'payment_intent',
      entityId: paymentIntentId,
      metadata: { status, ...metadata }
    });

    logger.info({ paymentIntentId, status }, 'Payment intent status updated');
  }

  /**
   * Processa pagamento (simulazione)
   * In produzione si integrerà con provider reali
   */
  async processPayment(
    paymentIntentId: string,
    paymentData: {
      method: string;
      cardToken?: string;
      bankAccount?: any;
      customerEmail: string;
    }
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Simula processing
      await this.updatePaymentIntentStatus(paymentIntentId, 'processing');
      
      // Simula delay di processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simula successo (90% success rate)
      const success = Math.random() > 0.1;
      
      if (success) {
        const transactionId = `txn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        
        await this.updatePaymentIntentStatus(paymentIntentId, 'succeeded', {
          transactionId,
          processedAt: new Date().toISOString(),
          method: paymentData.method
        });

        // Aggiungi evento timeline
        await timelineService.onPaymentSucceeded(payment.payment_intent_id, payment.amount, payment.currency, transactionId);

        // Trigger generazione automatica fattura/ricevuta
        await this.triggerPostPaymentActions(paymentIntentId);

        return { success: true, transactionId };
      } else {
        await this.updatePaymentIntentStatus(paymentIntentId, 'failed', {
          error: 'Payment declined by bank',
          failedAt: new Date().toISOString()
        });

        // Aggiungi evento timeline
        await timelineService.onPaymentFailed(payment.payment_intent_id, payment.amount, payment.currency, 'Payment declined by bank');

        return { success: false, error: 'Payment declined' };
      }
    } catch (error) {
      await this.updatePaymentIntentStatus(paymentIntentId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      logger.error({ paymentIntentId, error }, 'Payment processing failed');
      return { success: false, error: 'Processing failed' };
    }
  }

  /**
   * Trigger azioni post-pagamento (fattura, ricevuta, etc.)
   */
  private async triggerPostPaymentActions(paymentIntentId: string): Promise<void> {
    try {
      // Recupera dati payment intent
      const { rows: paymentRows } = await pool.query(
        'SELECT * FROM payment_intents WHERE id = $1',
        [paymentIntentId]
      );
      
      if (paymentRows.length === 0) return;
      
      const payment = paymentRows[0];
      
      // Recupera dati contratto
      const { rows: contractRows } = await pool.query(
        `SELECT c.*, comp.ragione_sociale as company_name, comp.email as company_email
         FROM contracts c
         LEFT JOIN companies comp ON comp.id = c.company_id
         WHERE c.id = $1`,
        [payment.contract_id]
      );
      
      if (contractRows.length === 0) return;
      
      const contract = contractRows[0];
      
      // Genera ricevuta automaticamente
      await this.generateReceipt(payment, contract);
      
      // Genera fattura se richiesta
      if (contract.requires_payment && contract.payment_amount) {
        await this.generateInvoice(payment, contract);
      }
      
      // Aggiorna stato contratto
      await pool.query(
        'UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2',
        ['paid', contract.id]
      );
      
      logger.info({ paymentIntentId, contractId: contract.id }, 'Post-payment actions completed');
      
    } catch (error) {
      logger.error({ paymentIntentId, error }, 'Failed to trigger post-payment actions');
    }
  }

  /**
   * Genera ricevuta automaticamente
   */
  private async generateReceipt(payment: any, contract: any): Promise<void> {
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const { rows } = await pool.query(
      `INSERT INTO receipts (
        number, date, amount, currency, payment_method, status,
        customer_data, line_items, subtotal, tax_rate, tax_amount, total,
        contract_id, payment_intent_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING id`,
      [
        receiptNumber,
        new Date().toISOString(),
        payment.amount,
        payment.currency,
        payment.payment_method,
        'paid',
        JSON.stringify({
          name: contract.company_name,
          email: contract.company_email,
          type: 'company'
        }),
        JSON.stringify([{
          description: `Pagamento contratto ${contract.number}`,
          quantity: 1,
          unitPrice: payment.amount
        }]),
        payment.amount,
        0, // No tax for receipts
        0,
        payment.amount,
        contract.id,
        payment.id
      ]
    );

    // Invia email ricevuta
    try {
      await mailer.sendEmail({
        to: contract.company_email,
        subject: `Ricevuta di Pagamento - ${receiptNumber}`,
        html: `
          <h2>Ricevuta di Pagamento</h2>
          <p>Gentile ${contract.company_name},</p>
          <p>Abbiamo ricevuto il pagamento per il contratto ${contract.number}.</p>
          <p><strong>Importo:</strong> ${payment.amount} ${payment.currency}</p>
          <p><strong>Metodo:</strong> ${payment.payment_method}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
        `
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send receipt email');
    }

    // Aggiungi evento timeline
    await timelineService.onReceiptGenerated(contract.id, receiptNumber, payment.amount, payment.currency);

    logger.info({ receiptId: rows[0].id, receiptNumber }, 'Receipt generated');
  }

  /**
   * Genera fattura automaticamente
   */
  private async generateInvoice(payment: any, contract: any): Promise<void> {
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 giorni di scadenza
    
    const taxRate = 22; // 22% IVA
    const taxAmount = payment.amount * (taxRate / 100);
    const total = payment.amount + taxAmount;
    
    const { rows } = await pool.query(
      `INSERT INTO invoices (
        number, date, due_date, amount, currency, status,
        customer_data, line_items, subtotal, tax_rate, tax_amount, total,
        contract_id, payment_intent_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING id`,
      [
        invoiceNumber,
        new Date().toISOString(),
        dueDate.toISOString(),
        payment.amount,
        payment.currency,
        'paid',
        JSON.stringify({
          name: contract.company_name,
          email: contract.company_email,
          type: 'company'
        }),
        JSON.stringify([{
          description: `Servizio ${contract.pack}`,
          quantity: 1,
          unitPrice: payment.amount
        }]),
        payment.amount,
        taxRate,
        taxAmount,
        total,
        contract.id,
        payment.id
      ]
    );

    // Invia email fattura
    try {
      await mailer.sendEmail({
        to: contract.company_email,
        subject: `Fattura - ${invoiceNumber}`,
        html: `
          <h2>Fattura</h2>
          <p>Gentile ${contract.company_name},</p>
          <p>In allegato la fattura per il servizio ${contract.pack}.</p>
          <p><strong>Numero:</strong> ${invoiceNumber}</p>
          <p><strong>Importo:</strong> ${total.toFixed(2)} ${payment.currency}</p>
          <p><strong>Scadenza:</strong> ${dueDate.toLocaleDateString('it-IT')}</p>
        `
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send invoice email');
    }

    // Aggiungi evento timeline
    await timelineService.onInvoiceGenerated(contract.id, invoiceNumber, payment.amount, payment.currency);

    logger.info({ invoiceId: rows[0].id, invoiceNumber }, 'Invoice generated');
  }

  /**
   * Lista metodi di pagamento disponibili
   */
  getAvailablePaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(method => method.enabled);
  }

  /**
   * Crea link di pagamento pubblico
   */
  async createPaymentLink(
    paymentIntentId: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<{ paymentUrl: string; expiresAt: Date }> {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore
    
    // Salva token nel database
    await pool.query(
      `INSERT INTO payment_links (token, payment_intent_id, return_url, cancel_url, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [token, paymentIntentId, returnUrl, cancelUrl, expiresAt]
    );
    
    const paymentUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/public/pay/${token}`;
    
    return { paymentUrl, expiresAt };
  }
}

export const paymentService = new PaymentService();
