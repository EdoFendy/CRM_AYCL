import { pool } from '../../db/pool.js';
import { recordAuditLog } from '../../services/auditService.js';

export interface ProposalService {
  name: string;
  description: string;
  price: number;
}

export interface ProposalInput {
  customer_type: 'contact' | 'company';
  customer_id: string;
  services: ProposalService[];
  title?: string;
  introduction?: string;
  notes?: string;
  terms?: string;
  valid_until?: string;
  template_id?: string;
}

export interface CustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vat?: string;
  pec?: string;
  company_name?: string;
}

/**
 * Recupera dati cliente dal database
 */
async function getCustomerData(
  customer_type: 'contact' | 'company',
  customer_id: string
): Promise<CustomerData> {
  if (customer_type === 'contact') {
    const { rows } = await pool.query(
      `SELECT 
        c.first_name, c.last_name, c.email, c.phone, c.role,
        co.ragione_sociale as company_name, co.website, co.vat_number, co.pec, co.address
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.id = $1 AND c.deleted_at IS NULL`,
      [customer_id]
    );

    if (rows.length === 0) {
      throw new Error('Contact not found');
    }

    const contact = rows[0];
    return {
      name: `${contact.first_name} ${contact.last_name}`,
      email: contact.email,
      phone: contact.phone,
      company_name: contact.company_name,
      address: contact.address,
      vat: contact.vat_number,
      pec: contact.pec
    };
  } else {
    const { rows } = await pool.query(
      `SELECT ragione_sociale, website, vat_number, pec, address, phone, email
      FROM companies
      WHERE id = $1 AND deleted_at IS NULL`,
      [customer_id]
    );

    if (rows.length === 0) {
      throw new Error('Company not found');
    }

    const company = rows[0];
    return {
      name: company.ragione_sociale,
      email: company.email,
      phone: company.phone,
      address: company.address,
      vat: company.vat_number,
      pec: company.pec
    };
  }
}

/**
 * Genera numero proposta univoco
 */
function generateProposalNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `PROP-${year}-${timestamp}`;
}

/**
 * Crea una nuova proposta
 */
export async function createProposal(input: ProposalInput, actorId: string) {
  // Recupera dati cliente
  const customerData = await getCustomerData(input.customer_type, input.customer_id);

  // Calcola totale
  const total = input.services.reduce((sum, service) => sum + service.price, 0);

  // Genera numero proposta
  const number = generateProposalNumber();

  // Valida data scadenza
  const validUntil = input.valid_until || 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Inserisci proposta
  const { rows } = await pool.query(
    `INSERT INTO proposals (
      number, date, customer_type, contact_id, company_id, customer_data,
      services, total, currency, title, introduction, notes, terms, valid_until,
      status, template_id, created_by
    ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      number,
      input.customer_type,
      input.customer_type === 'contact' ? input.customer_id : null,
      input.customer_type === 'company' ? input.customer_id : null,
      JSON.stringify(customerData),
      JSON.stringify(input.services),
      total,
      'EUR',
      input.title || 'Proposta Commerciale',
      input.introduction || null,
      input.notes || null,
      input.terms || null,
      validUntil,
      'draft',
      input.template_id || null,
      actorId
    ]
  );

  const proposal = rows[0];

  // Audit log
  await recordAuditLog({
    actorId,
    action: 'proposal.create',
    entity: 'proposal',
    entityId: proposal.id,
    afterState: { number, total, customer: customerData.name }
  });

  return proposal;
}

/**
 * Recupera proposta per ID
 */
export async function getProposal(id: string) {
  const { rows } = await pool.query(
    `SELECT p.*, 
      u.first_name || ' ' || u.last_name as creator_name
    FROM proposals p
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = $1`,
    [id]
  );

  if (rows.length === 0) {
    throw new Error('Proposal not found');
  }

  return rows[0];
}

/**
 * Lista proposte con filtri
 */
export async function listProposals(filters: {
  created_by?: string;
  status?: string;
  customer_type?: string;
  customer_id?: string;
  limit?: number;
  offset?: number;
}) {
  let query = `
    SELECT p.*, 
      u.first_name || ' ' || u.last_name as creator_name,
      CASE 
        WHEN p.customer_type = 'contact' THEN c.first_name || ' ' || c.last_name
        WHEN p.customer_type = 'company' THEN co.ragione_sociale
      END as customer_name
    FROM proposals p
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN contacts c ON p.contact_id = c.id
    LEFT JOIN companies co ON p.company_id = co.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramCount = 1;

  if (filters.created_by) {
    query += ` AND p.created_by = $${paramCount}`;
    params.push(filters.created_by);
    paramCount++;
  }

  if (filters.status) {
    query += ` AND p.status = $${paramCount}`;
    params.push(filters.status);
    paramCount++;
  }

  if (filters.customer_type) {
    query += ` AND p.customer_type = $${paramCount}`;
    params.push(filters.customer_type);
    paramCount++;
  }

  if (filters.customer_id) {
    if (filters.customer_type === 'contact') {
      query += ` AND p.contact_id = $${paramCount}`;
    } else {
      query += ` AND p.company_id = $${paramCount}`;
    }
    params.push(filters.customer_id);
    paramCount++;
  }

  query += ` ORDER BY p.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    params.push(filters.limit);
    paramCount++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramCount}`;
    params.push(filters.offset);
  }

  const { rows } = await pool.query(query, params);
  return rows;
}

/**
 * Aggiorna status proposta
 */
export async function updateProposalStatus(
  id: string,
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired',
  actorId: string
) {
  const statusField = status === 'sent' ? 'sent_at' :
                      status === 'accepted' ? 'accepted_at' :
                      status === 'rejected' ? 'rejected_at' : null;

  let query = `UPDATE proposals SET status = $1, updated_at = NOW()`;
  const params: any[] = [status];
  let paramCount = 2;

  if (statusField) {
    query += `, ${statusField} = NOW()`;
  }

  query += ` WHERE id = $${paramCount} RETURNING *`;
  params.push(id);

  const { rows } = await pool.query(query, params);

  if (rows.length === 0) {
    throw new Error('Proposal not found');
  }

  await recordAuditLog({
    actorId,
    action: 'proposal.update_status',
    entity: 'proposal',
    entityId: id,
    afterState: { status }
  });

  return rows[0];
}

/**
 * Aggiorna URL PDF proposta
 */
export async function updateProposalPDF(id: string, pdfUrl: string) {
  const { rows } = await pool.query(
    `UPDATE proposals SET pdf_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [pdfUrl, id]
  );

  if (rows.length === 0) {
    throw new Error('Proposal not found');
  }

  return rows[0];
}

/**
 * Incrementa contatore visualizzazioni
 */
export async function incrementProposalViews(id: string) {
  await pool.query(
    `UPDATE proposals 
     SET view_count = view_count + 1, last_viewed_at = NOW() 
     WHERE id = $1`,
    [id]
  );
}


