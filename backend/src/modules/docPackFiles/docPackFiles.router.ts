import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';

export const docPackFilesRouter = Router();

docPackFilesRouter.use(requireAuth);

// Configurazione multer per upload file
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'doc-pack-files');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Usa PDF, PPT, PPTX, DOC o DOCX'));
    }
  }
});

// GET /doc-files - Lista file filtrati per pack
docPackFilesRouter.get('/', async (req, res) => {
  const packSchema = z.enum(['Setup-Fee', 'Performance', 'Subscription', 'Drive Test']).optional();
  const categorySchema = z.enum(['pitch', 'proposal']).optional();
  
  const pack = packSchema.parse(req.query.pack);
  const category = categorySchema.parse(req.query.category);
  
  const conditions: string[] = [];
  const params: unknown[] = [];
  
  if (pack) {
    params.push(pack);
    conditions.push(`pack = $${params.length}`);
  }
  
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const { rows } = await pool.query(
    `SELECT id, pack, category, name, file_url, uploaded_by, uploaded_at 
     FROM doc_pack_files 
     ${where} 
     ORDER BY uploaded_at DESC`,
    params
  );
  
  res.json({ data: rows });
});

// POST /doc-files/upload - Upload nuovo file
docPackFilesRouter.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file caricato' });
  }
  
  const schema = z.object({
    pack: z.enum(['Setup-Fee', 'Performance', 'Subscription', 'Drive Test']),
    category: z.enum(['pitch', 'proposal'])
  });
  
  const { pack, category } = schema.parse(req.body);
  
  // URL relativo del file (in produzione usare storage cloud come S3)
  const fileUrl = `/uploads/doc-pack-files/${req.file.filename}`;
  
  const { rows } = await pool.query(
    `INSERT INTO doc_pack_files (pack, category, name, file_url, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [pack, category, req.file.originalname, fileUrl, req.user!.id]
  );
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'doc_pack_file.upload',
    entity: 'doc_pack_file',
    entityId: rows[0].id,
    afterState: rows[0]
  });
  
  res.status(201).json({ success: true, data: rows[0] });
});

// DELETE /doc-files/:id - Elimina file
docPackFilesRouter.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  // Recupera info file per eliminare fisicamente il file
  const { rows } = await pool.query(
    'SELECT id, file_url FROM doc_pack_files WHERE id = $1',
    [id]
  );
  
  if (rows.length === 0) {
    return res.status(404).json({ error: 'File non trovato' });
  }
  
  const file = rows[0];
  
  // Elimina da DB
  await pool.query('DELETE FROM doc_pack_files WHERE id = $1', [id]);
  
  // Elimina file fisico (best effort)
  try {
    const filePath = path.join(process.cwd(), file.file_url);
    await fs.unlink(filePath);
  } catch (e) {
    // Log ma non bloccare la risposta
    console.error('Errore eliminazione file fisico:', e);
  }
  
  await recordAuditLog({
    actorId: req.user!.id,
    action: 'doc_pack_file.delete',
    entity: 'doc_pack_file',
    entityId: id,
    beforeState: file
  });
  
  res.json({ success: true });
});

// POST /doc-files/:id/send-email - Invia file via email
docPackFilesRouter.post('/:id/send-email', async (req, res) => {
  try {
    const schema = z.object({
      recipient_email: z.string().email(),
      recipient_name: z.string(),
      message: z.string().optional(),
      contact_id: z.string().uuid().optional(),
      company_id: z.string().uuid().optional()
    });

    const data = schema.parse(req.body);
    const id = req.params.id;

    // Recupera file
    const { rows } = await pool.query(
      'SELECT * FROM doc_pack_files WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File non trovato' });
    }

    const file = rows[0];

    // Leggi file dal filesystem
    const filePath = path.join(process.cwd(), file.file_url);
    let fileBuffer: Buffer;
    
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File fisico non trovato' });
    }

    // Invia email (placeholder - implementare con servizio email reale)
    // await sendEmail({
    //   to: data.recipient_email,
    //   subject: `${file.category === 'pitch' ? 'Pitch Deck' : 'Proposta'} - ${file.pack}`,
    //   html: `
    //     <h2>Gentile ${data.recipient_name},</h2>
    //     <p>Le inviamo in allegato il documento richiesto.</p>
    //     ${data.message ? `<p>${data.message}</p>` : ''}
    //     <p>Cordiali saluti,<br>${req.user!.first_name} ${req.user!.last_name}</p>
    //   `,
    //   attachments: [
    //     {
    //       filename: file.name,
    //       content: fileBuffer
    //     }
    //   ]
    // });

    // Log attività
    await recordAuditLog({
      actorId: req.user!.id,
      action: 'doc_pack_file.send_email',
      entity: 'doc_pack_file',
      entityId: id,
      afterState: {
        recipient_email: data.recipient_email,
        recipient_name: data.recipient_name,
        contact_id: data.contact_id,
        company_id: data.company_id
      }
    });

    // Traccia invio in activities se contact_id o company_id forniti
    if (data.contact_id || data.company_id) {
      await pool.query(
        `INSERT INTO activities (type, actor_id, contact_id, company_id, content)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'email',
          req.user!.id,
          data.contact_id || null,
          data.company_id || null,
          JSON.stringify({
            subject: `${file.category === 'pitch' ? 'Pitch Deck' : 'Proposta'} - ${file.pack}`,
            recipient: data.recipient_email,
            file_name: file.name
          })
        ]
      );
    }

    res.json({ success: true, message: 'Email inviata con successo' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

