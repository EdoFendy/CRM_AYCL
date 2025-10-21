import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';

export interface TimelineEvent {
  id: string;
  contract_id: string;
  event_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  created_by?: string;
}

export type EventType = 
  | 'contract_created'
  | 'contract_sent_for_signature'
  | 'contract_signed'
  | 'payment_created'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_generated'
  | 'receipt_generated'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'contract_completed'
  | 'contract_expired';

/**
 * Servizio per gestione timeline eventi contratti
 */
export class TimelineService {
  /**
   * Aggiunge un evento alla timeline
   */
  async addEvent(
    contractId: string,
    eventType: EventType,
    title: string,
    description?: string,
    metadata?: Record<string, any>,
    createdBy?: string
  ): Promise<TimelineEvent> {
    const { rows } = await pool.query(
      `INSERT INTO timeline_events (
        contract_id, event_type, title, description, metadata, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *`,
      [contractId, eventType, title, description, JSON.stringify(metadata || {}), createdBy]
    );

    logger.info({ 
      contractId, 
      eventType, 
      title 
    }, 'Timeline event added');

    return rows[0];
  }

  /**
   * Recupera timeline per un contratto
   */
  async getTimeline(contractId: string): Promise<TimelineEvent[]> {
    const { rows } = await pool.query(
      `SELECT te.*, u.name as created_by_name
       FROM timeline_events te
       LEFT JOIN users u ON u.id = te.created_by
       WHERE te.contract_id = $1
       ORDER BY te.created_at DESC`,
      [contractId]
    );

    return rows;
  }

  /**
   * Eventi predefiniti per contratti
   */
  async onContractCreated(contractId: string, contractNumber: string, createdBy?: string): Promise<void> {
    await this.addEvent(
      contractId,
      'contract_created',
      'Contratto Creato',
      `Contratto ${contractNumber} è stato creato`,
      { contract_number: contractNumber },
      createdBy
    );
  }

  async onContractSentForSignature(
    contractId: string, 
    signerEmail: string, 
    createdBy?: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'contract_sent_for_signature',
      'Inviato per Firma',
      `Contratto inviato per firma a ${signerEmail}`,
      { signer_email: signerEmail },
      createdBy
    );
  }

  async onContractSigned(
    contractId: string, 
    signerName: string, 
    signerEmail: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'contract_signed',
      'Contratto Firmato',
      `Firmato da ${signerName} (${signerEmail})`,
      { signer_name: signerName, signer_email: signerEmail }
    );
  }

  async onPaymentCreated(
    contractId: string, 
    amount: number, 
    currency: string, 
    createdBy?: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'payment_created',
      'Pagamento Creato',
      `Pagamento di ${amount} ${currency} creato`,
      { amount, currency },
      createdBy
    );
  }

  async onPaymentSucceeded(
    contractId: string, 
    amount: number, 
    currency: string, 
    transactionId?: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'payment_succeeded',
      'Pagamento Completato',
      `Pagamento di ${amount} ${currency} completato con successo`,
      { amount, currency, transaction_id: transactionId }
    );
  }

  async onPaymentFailed(
    contractId: string, 
    amount: number, 
    currency: string, 
    error?: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'payment_failed',
      'Pagamento Fallito',
      `Pagamento di ${amount} ${currency} fallito: ${error || 'Errore sconosciuto'}`,
      { amount, currency, error }
    );
  }

  async onInvoiceGenerated(
    contractId: string, 
    invoiceNumber: string, 
    amount: number, 
    currency: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'invoice_generated',
      'Fattura Generata',
      `Fattura ${invoiceNumber} per ${amount} ${currency} generata automaticamente`,
      { invoice_number: invoiceNumber, amount, currency }
    );
  }

  async onReceiptGenerated(
    contractId: string, 
    receiptNumber: string, 
    amount: number, 
    currency: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'receipt_generated',
      'Ricevuta Generata',
      `Ricevuta ${receiptNumber} per ${amount} ${currency} generata automaticamente`,
      { receipt_number: receiptNumber, amount, currency }
    );
  }

  async onSubscriptionCreated(
    contractId: string, 
    amount: number, 
    currency: string, 
    interval: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'subscription_created',
      'Abbonamento Creato',
      `Abbonamento ricorrente di ${amount} ${currency} ogni ${interval} creato`,
      { amount, currency, interval }
    );
  }

  async onSubscriptionCancelled(
    contractId: string, 
    reason?: string
  ): Promise<void> {
    await this.addEvent(
      contractId,
      'subscription_cancelled',
      'Abbonamento Cancellato',
      `Abbonamento cancellato${reason ? `: ${reason}` : ''}`,
      { reason }
    );
  }

  async onContractCompleted(contractId: string): Promise<void> {
    await this.addEvent(
      contractId,
      'contract_completed',
      'Contratto Completato',
      'Contratto completato con successo'
    );
  }

  async onContractExpired(contractId: string): Promise<void> {
    await this.addEvent(
      contractId,
      'contract_expired',
      'Contratto Scaduto',
      'Contratto scaduto senza essere firmato'
    );
  }

  /**
   * Recupera statistiche timeline per dashboard
   */
  async getTimelineStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    recentEvents: TimelineEvent[];
  }> {
    const { rows: totalRows } = await pool.query(
      'SELECT COUNT(*) as total FROM timeline_events'
    );
    
    const { rows: typeRows } = await pool.query(
      `SELECT event_type, COUNT(*) as count 
       FROM timeline_events 
       GROUP BY event_type 
       ORDER BY count DESC`
    );
    
    const { rows: recentRows } = await pool.query(
      `SELECT te.*, u.name as created_by_name
       FROM timeline_events te
       LEFT JOIN users u ON u.id = te.created_by
       ORDER BY te.created_at DESC
       LIMIT 10`
    );

    const eventsByType = typeRows.reduce((acc, row) => {
      acc[row.event_type] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: parseInt(totalRows[0].total),
      eventsByType,
      recentEvents: recentRows
    };
  }
}

export const timelineService = new TimelineService();
