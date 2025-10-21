import fs from 'fs';
import path from 'path';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Servizio email semplice che scrive in uploads/outbox
 * In produzione sostituire con provider reale (SendGrid, AWS SES, etc.)
 */
export class MailerService {
  private outboxDir: string;

  constructor() {
    this.outboxDir = path.join(process.cwd(), 'uploads', 'outbox');
    this.ensureOutboxDir();
  }

  private ensureOutboxDir() {
    if (!fs.existsSync(this.outboxDir)) {
      fs.mkdirSync(this.outboxDir, { recursive: true });
    }
  }

  /**
   * Invia email (scrive in outbox per debug)
   */
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId: string }> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const emailFile = {
      messageId,
      timestamp,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments?.length || 0,
    };

    // Salva email in outbox
    const filename = `${timestamp.replace(/[:.]/g, '-')}_${messageId}.json`;
    const filepath = path.join(this.outboxDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(emailFile, null, 2), 'utf8');

    // Salva allegati se presenti
    if (emailData.attachments?.length) {
      const attachmentsDir = path.join(this.outboxDir, messageId);
      fs.mkdirSync(attachmentsDir, { recursive: true });
      
      emailData.attachments.forEach((attachment, index) => {
        const attachmentPath = path.join(attachmentsDir, `${index}_${attachment.filename}`);
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content 
          : Buffer.from(attachment.content, 'utf8');
        fs.writeFileSync(attachmentPath, content);
      });
    }

    console.log(`📧 Email saved to outbox: ${messageId}`);
    return { success: true, messageId };
  }

  /**
   * Invia email di richiesta firma
   */
  async sendSignatureRequest(
    to: string,
    signerName: string,
    contractTitle: string,
    signatureUrl: string,
    expiresAt: Date,
    requireOtp: boolean = false
  ): Promise<{ success: boolean; messageId: string }> {
    const subject = `Richiesta Firma Digitale - ${contractTitle}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Richiesta Firma Digitale</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e293b; color: white; padding: 20px; text-align: center; }
          .content { background: #f8fafc; padding: 30px; }
          .button { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { background: #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Richiesta Firma Digitale</h1>
          </div>
          
          <div class="content">
            <p>Ciao <strong>${signerName}</strong>,</p>
            
            <p>Ti è stata richiesta la firma digitale del documento:</p>
            <strong>${contractTitle}</strong>
            
            <p>Per firmare il documento, clicca sul pulsante qui sotto:</p>
            
            <div style="text-align: center;">
              <a href="${signatureUrl}" class="button">Firma Documento</a>
            </div>
            
            ${requireOtp ? `
              <div class="warning">
                <strong>⚠️ Verifica OTP Richiesta</strong><br>
                Ti verrà richiesto un codice OTP per completare la firma. 
                Controlla la tua email o SMS per il codice.
              </div>
            ` : ''}
            
            <div class="warning">
              <strong>⏰ Scadenza Link</strong><br>
              Questo link scade il: <strong>${expiresAt.toLocaleString('it-IT')}</strong>
            </div>
            
            <p>La firma digitale è legalmente valida e ha lo stesso valore di una firma autografa.</p>
            
            <p>Se non hai richiesto questa firma, ignora questa email.</p>
          </div>
          
          <div class="footer">
            <p>AYCL CRM - Sistema di Firma Digitale</p>
            <p>Link diretto: <a href="${signatureUrl}">${signatureUrl}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Richiesta Firma Digitale - ${contractTitle}

Ciao ${signerName},

Ti è stata richiesta la firma digitale del documento: ${contractTitle}

Per firmare il documento, visita questo link:
${signatureUrl}

${requireOtp ? 'NOTA: Ti verrà richiesto un codice OTP per completare la firma.' : ''}

Scadenza link: ${expiresAt.toLocaleString('it-IT')}

La firma digitale è legalmente valida e ha lo stesso valore di una firma autografa.

Se non hai richiesto questa firma, ignora questa email.

---
AYCL CRM - Sistema di Firma Digitale
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Invia email di conferma firma
   */
  async sendSignatureConfirmation(
    to: string,
    signerName: string,
    contractTitle: string,
    signedPdfUrl: string,
    certificateUrl: string
  ): Promise<{ success: boolean; messageId: string }> {
    const subject = `Documento Firmato - ${contractTitle}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Documento Firmato</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background: #f8fafc; padding: 30px; }
          .button { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 10px 5px;
          }
          .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { background: #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Documento Firmato con Successo</h1>
          </div>
          
          <div class="content">
            <p>Ciao <strong>${signerName}</strong>,</p>
            
            <div class="success">
              <strong>🎉 Firma Completata!</strong><br>
              Il documento "${contractTitle}" è stato firmato digitalmente con successo.
            </div>
            
            <p>Puoi scaricare i seguenti documenti:</p>
            
            <div style="text-align: center;">
              <a href="${signedPdfUrl}" class="button">📄 PDF Firmato</a>
              <a href="${certificateUrl}" class="button">🔒 Certificato Firma</a>
            </div>
            
            <p><strong>Dettagli Firma:</strong></p>
            <ul>
              <li>Data e Ora: ${new Date().toLocaleString('it-IT')}</li>
              <li>Metodo: Firma Digitale Sicura</li>
              <li>Validità Legale: Certificata</li>
            </ul>
            
            <p>Conserva questi documenti per i tuoi archivi.</p>
          </div>
          
          <div class="footer">
            <p>AYCL CRM - Sistema di Firma Digitale</p>
            <p>PDF: <a href="${signedPdfUrl}">${signedPdfUrl}</a></p>
            <p>Certificato: <a href="${certificateUrl}">${certificateUrl}</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject,
      html,
    });
  }

  /**
   * Lista email in outbox (per debug)
   */
  listOutboxEmails(): Array<{ filename: string; email: any }> {
    if (!fs.existsSync(this.outboxDir)) return [];
    
    return fs.readdirSync(this.outboxDir)
      .filter(file => file.endsWith('.json'))
      .map(filename => {
        const filepath = path.join(this.outboxDir, filename);
        const content = fs.readFileSync(filepath, 'utf8');
        return { filename, email: JSON.parse(content) };
      })
      .sort((a, b) => new Date(b.email.timestamp).getTime() - new Date(a.email.timestamp).getTime());
  }
}

export const mailer = new MailerService();
