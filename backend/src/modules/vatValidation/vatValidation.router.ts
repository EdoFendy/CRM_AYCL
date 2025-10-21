import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { vatValidationService } from '../../services/vatValidationService.js';
import { logger } from '../../utils/logger.js';

export const vatValidationRouter = Router();

vatValidationRouter.use(requireAuth);

// POST /vat-validation/validate - Valida P.IVA
vatValidationRouter.post('/validate', async (req, res) => {
  const schema = z.object({
    vatNumber: z.string().min(1).max(20),
  });
  
  const data = schema.parse(req.body);
  
  try {
    const result = await vatValidationService.validateVat(data.vatNumber);
    
    res.json(result);
  } catch (error) {
    logger.error({ error, vatNumber: data.vatNumber }, 'VAT validation endpoint failed');
    res.status(500).json({ 
      error: 'Errore durante la validazione P.IVA',
      vatNumber: data.vatNumber,
      isValid: false
    });
  }
});

// POST /vat-validation/check-exists - Verifica se P.IVA esiste già
vatValidationRouter.post('/check-exists', async (req, res) => {
  const schema = z.object({
    vatNumber: z.string().min(1).max(20),
    excludeCompanyId: z.string().uuid().optional(),
  });
  
  const data = schema.parse(req.body);
  
  try {
    const exists = await vatValidationService.checkVatExists(
      data.vatNumber, 
      data.excludeCompanyId
    );
    
    res.json({ exists });
  } catch (error) {
    logger.error({ error, vatNumber: data.vatNumber }, 'VAT existence check failed');
    res.status(500).json({ 
      error: 'Errore durante la verifica esistenza P.IVA',
      exists: false
    });
  }
});

// POST /vat-validation/validate-fiscal-code - Valida codice fiscale
vatValidationRouter.post('/validate-fiscal-code', async (req, res) => {
  const schema = z.object({
    fiscalCode: z.string().min(16).max(16),
  });
  
  const data = schema.parse(req.body);
  
  try {
    const isValid = vatValidationService.validateFiscalCode(data.fiscalCode);
    
    res.json({ 
      isValid,
      fiscalCode: data.fiscalCode.toUpperCase()
    });
  } catch (error) {
    logger.error({ error, fiscalCode: data.fiscalCode }, 'Fiscal code validation failed');
    res.status(500).json({ 
      error: 'Errore durante la validazione codice fiscale',
      isValid: false
    });
  }
});

// GET /vat-validation/test-numbers - Lista P.IVA di test
vatValidationRouter.get('/test-numbers', async (req, res) => {
  try {
    const testNumbers = vatValidationService.getTestVatNumbers();
    
    res.json({ 
      testNumbers,
      message: 'P.IVA di test per sviluppo (solo in ambiente di sviluppo)'
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get test VAT numbers');
    res.status(500).json({ 
      error: 'Errore nel recupero P.IVA di test'
    });
  }
});

// POST /vat-validation/extract-info - Estrae info da P.IVA
vatValidationRouter.post('/extract-info', async (req, res) => {
  const schema = z.object({
    vatNumber: z.string().min(1).max(20),
  });
  
  const data = schema.parse(req.body);
  
  try {
    const info = vatValidationService.extractVatInfo(data.vatNumber);
    
    if (!info) {
      return res.status(400).json({ 
        error: 'Formato P.IVA non valido',
        vatNumber: data.vatNumber
      });
    }
    
    res.json(info);
  } catch (error) {
    logger.error({ error, vatNumber: data.vatNumber }, 'VAT info extraction failed');
    res.status(500).json({ 
      error: 'Errore durante l\'estrazione informazioni P.IVA'
    });
  }
});
