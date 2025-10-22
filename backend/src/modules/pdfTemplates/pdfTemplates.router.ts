/**
 * PDF Templates Router
 * Gestione template PDF con mappatura campi dinamica
 */

import { Router } from 'express';
import multer from 'multer';
import { PDFTemplatesService } from './pdfTemplates.service.js';
import { requireAuth } from '../../middlewares/auth.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const service = new PDFTemplatesService();

/**
 * POST /api/pdf-templates/upload
 * Upload di un template PDF
 */
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const { name, description, type } = req.body;
    const userId = req.user?.id;

    const result = await service.uploadTemplate({
      buffer: req.file.buffer,
      name: name || req.file.originalname,
      description,
      type,
      userId
    });

    res.json(result);
  } catch (error: any) {
    console.error('Errore upload template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pdf-templates/:id/fields
 * Legge i campi AcroForm dal PDF
 */
router.get('/:id/fields', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = await service.getTemplateFields(id);
    res.json({ fields });
  } catch (error: any) {
    console.error('Errore lettura campi:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pdf-templates/:id/mapping
 * Salva la mappatura campi
 */
router.post('/:id/mapping', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fields } = req.body;

    const result = await service.saveMapping(id, fields);
    res.json(result);
  } catch (error: any) {
    console.error('Errore salvataggio mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pdf-templates/:id/mapping
 * Recupera la mappatura campi
 */
router.get('/:id/mapping', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = await service.getMapping(id);
    res.json(mapping);
  } catch (error: any) {
    console.error('Errore recupero mapping:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/pdf-templates/generate
 * Genera PDF compilato con dati
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { templateId, data } = req.body;

    if (!templateId || !data) {
      return res.status(400).json({ error: 'templateId e data sono richiesti' });
    }

    const pdfBuffer = await service.generatePDF(templateId, data);

    res.contentType('application/pdf');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Errore generazione PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pdf-templates
 * Lista tutti i template
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const templates = await service.listTemplates();
    res.json({ templates });
  } catch (error: any) {
    console.error('Errore lista template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/pdf-templates/:id/download
 * Download del template originale
 */
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { buffer, name } = await service.downloadTemplate(id);

    // Sanitizza il nome del file per evitare caratteri non validi
    const safeName = name.replace(/[^\w\s.-]/g, '_');

    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (error: any) {
    console.error('Errore download template:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

