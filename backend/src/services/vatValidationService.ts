import { logger } from '../utils/logger.js';

export interface VatValidationResult {
  isValid: boolean;
  companyName?: string;
  address?: string;
  vatNumber: string;
  countryCode: string;
  error?: string;
}

/**
 * Servizio per validazione P.IVA italiana
 * In produzione si integrerà con API ufficiali (Agenzia delle Entrate)
 */
export class VatValidationService {
  private readonly vatRegex = /^IT\d{11}$/;
  private readonly checkDigitTable = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];

  /**
   * Valida formato P.IVA italiana
   */
  validateVatFormat(vatNumber: string): boolean {
    if (!this.vatRegex.test(vatNumber)) {
      return false;
    }

    // Estrai numero senza prefisso IT
    const number = vatNumber.substring(2);
    
    // Calcola cifra di controllo
    const checkDigit = this.calculateCheckDigit(number);
    return checkDigit === parseInt(number.charAt(10));
  }

  /**
   * Calcola cifra di controllo per P.IVA italiana
   */
  private calculateCheckDigit(number: string): number {
    let sum = 0;
    
    for (let i = 0; i < 10; i++) {
      const digit = parseInt(number.charAt(i));
      sum += digit * this.checkDigitTable[i];
    }
    
    return sum % 26;
  }

  /**
   * Valida P.IVA e recupera dati azienda (simulazione)
   * In produzione si integrerà con API Agenzia delle Entrate
   */
  async validateVat(vatNumber: string): Promise<VatValidationResult> {
    try {
      // Normalizza P.IVA
      const normalizedVat = vatNumber.toUpperCase().replace(/\s/g, '');
      
      // Valida formato
      if (!this.validateVatFormat(normalizedVat)) {
        return {
          isValid: false,
          vatNumber: normalizedVat,
          countryCode: 'IT',
          error: 'Formato P.IVA non valido'
        };
      }

      // Simula chiamata API (in produzione si userà API reale)
      const result = await this.simulateVatLookup(normalizedVat);
      
      logger.info({ vatNumber: normalizedVat, result }, 'VAT validation completed');
      
      return result;
      
    } catch (error) {
      logger.error({ error, vatNumber }, 'VAT validation failed');
      
      return {
        isValid: false,
        vatNumber,
        countryCode: 'IT',
        error: 'Errore durante la validazione'
      };
    }
  }

  /**
   * Simula lookup P.IVA (da sostituire con API reale)
   */
  private async simulateVatLookup(vatNumber: string): Promise<VatValidationResult> {
    // Simula delay di rete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simula database aziende (in produzione si userà API Agenzia delle Entrate)
    const mockCompanies: Record<string, { name: string; address: string }> = {
      'IT12345678901': {
        name: 'ACME SRL',
        address: 'Via Roma 123, 00100 Roma (RM)'
      },
      'IT98765432109': {
        name: 'TECH SOLUTIONS SPA',
        address: 'Corso Italia 456, 20100 Milano (MI)'
      },
      'IT11223344556': {
        name: 'INNOVATION LAB SRL',
        address: 'Piazza Duomo 789, 50100 Firenze (FI)'
      }
    };

    const company = mockCompanies[vatNumber];
    
    if (company) {
      return {
        isValid: true,
        companyName: company.name,
        address: company.address,
        vatNumber,
        countryCode: 'IT'
      };
    } else {
      // Simula azienda generica per P.IVA valide ma non nel database
      return {
        isValid: true,
        companyName: `Azienda ${vatNumber}`,
        address: 'Indirizzo non disponibile',
        vatNumber,
        countryCode: 'IT'
      };
    }
  }

  /**
   * Valida e normalizza P.IVA per salvataggio
   */
  async validateAndNormalizeVat(vatNumber: string): Promise<{
    isValid: boolean;
    normalizedVat?: string;
    error?: string;
  }> {
    try {
      const normalizedVat = vatNumber.toUpperCase().replace(/\s/g, '');
      
      if (!this.validateVatFormat(normalizedVat)) {
        return {
          isValid: false,
          error: 'Formato P.IVA non valido. Formato atteso: IT12345678901'
        };
      }

      return {
        isValid: true,
        normalizedVat
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: 'Errore durante la validazione P.IVA'
      };
    }
  }

  /**
   * Verifica se P.IVA esiste già nel sistema
   */
  async checkVatExists(vatNumber: string, excludeCompanyId?: string): Promise<boolean> {
    try {
      const { pool } = await import('../db/pool.js');
      
      let query = 'SELECT id FROM companies WHERE partita_iva = $1';
      const params: unknown[] = [vatNumber];
      
      if (excludeCompanyId) {
        query += ' AND id != $2';
        params.push(excludeCompanyId);
      }
      
      const { rows } = await pool.query(query, params);
      
      return rows.length > 0;
      
    } catch (error) {
      logger.error({ error, vatNumber }, 'Failed to check VAT existence');
      return false;
    }
  }

  /**
   * Valida codice fiscale italiano
   */
  validateFiscalCode(fiscalCode: string): boolean {
    const fiscalCodeRegex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
    return fiscalCodeRegex.test(fiscalCode.toUpperCase());
  }

  /**
   * Estrae informazioni da P.IVA
   */
  extractVatInfo(vatNumber: string): {
    countryCode: string;
    number: string;
    checkDigit: string;
  } | null {
    const match = vatNumber.match(/^([A-Z]{2})(\d{9})(\d{1})$/);
    
    if (!match) return null;
    
    return {
      countryCode: match[1],
      number: match[2],
      checkDigit: match[3]
    };
  }

  /**
   * Lista P.IVA di test per sviluppo
   */
  getTestVatNumbers(): string[] {
    return [
      'IT12345678901', // ACME SRL
      'IT98765432109', // TECH SOLUTIONS SPA
      'IT11223344556', // INNOVATION LAB SRL
      'IT00000000000', // P.IVA valida ma inesistente
    ];
  }
}

export const vatValidationService = new VatValidationService();
