import crypto from 'node:crypto';
import { pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { recordAuditLog } from '../../services/auditService.js';
import { buildPaginationResponse, parseCursorPagination } from '../../utils/pagination.js';

const SELECT = `id, company_id, opportunity_id, offer_id, template_id, status, signed_at, external_reference, created_at, updated_at`;

interface ContractInput {
  company_id: string;
  opportunity_id?: string | null;
  offer_id?: string | null;
  template_id?: string | null;
  status?: string;
}

export async function listContracts(query: Record<string, unknown>) {
  const { limit, cursor } = parseCursorPagination(query);
  const filters: string[] = [];
  const params: unknown[] = [];

  if (query.company_id) {
    params.push(query.company_id);
    filters.push(`company_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    filters.push(`status = $${params.length}`);
  }

  const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  params.push(limit! + 1);
  const { rows } = await pool.query(
    `SELECT ${SELECT} FROM contracts ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return buildPaginationResponse(rows, limit!);
}

export async function createContract(input: ContractInput, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO contracts (company_id, opportunity_id, offer_id, template_id, status)
     VALUES ($1, $2, $3, $4, COALESCE($5, 'Draft'))
     RETURNING ${SELECT}`,
    [input.company_id, input.opportunity_id ?? null, input.offer_id ?? null, input.template_id ?? null, input.status ?? null]
  );
  const contract = rows[0];
  await recordAuditLog({ actorId, action: 'contract.create', entity: 'contract', entityId: contract.id, afterState: contract });
  return contract;
}

export async function getContract(id: string) {
  const { rows } = await pool.query(`SELECT ${SELECT} FROM contracts WHERE id = $1`, [id]);
  const contract = rows[0];
  if (!contract) {
    throw new HttpError(404, 'CONTRACT_NOT_FOUND', 'Contract not found');
  }
  return contract;
}

export async function updateContractStatus(id: string, status: string, actorId: string) {
  const existing = await getContract(id);
  const { rows } = await pool.query(
    `UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING ${SELECT}`,
    [status, id]
  );
  const updated = rows[0];
  await recordAuditLog({ actorId, action: `contract.status.${status}`, entity: 'contract', entityId: id, beforeState: existing, afterState: updated });
  return updated;
}

export async function listContractVersions(contractId: string) {
  const { rows } = await pool.query(
    'SELECT id, data, pdf_url, checksum, created_at FROM contract_versions WHERE contract_id = $1 ORDER BY created_at DESC',
    [contractId]
  );
  return rows;
}

export async function createContractVersion(contractId: string, data: unknown, actorId: string) {
  const { rows } = await pool.query(
    `INSERT INTO contract_versions (contract_id, data, pdf_url, checksum)
     VALUES ($1, $2::jsonb, NULL, NULL)
     RETURNING id, data, pdf_url, checksum, created_at`,
    [contractId, JSON.stringify(data)]
  );
  const version = rows[0];
  await recordAuditLog({ actorId, action: 'contract.version.create', entity: 'contract', entityId: contractId, afterState: version });
  return version;
}

export async function recordSignature(contractId: string, signer: { name: string; email: string; status: string }, actorId?: string) {
  const { rows } = await pool.query(
    `INSERT INTO signatures (contract_id, signer_name, signer_email, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, contract_id, signer_name, signer_email, status, signed_at, created_at`,
    [contractId, signer.name, signer.email, signer.status]
  );
  const signature = rows[0];
  await recordAuditLog({ actorId, action: 'contract.signature.create', entity: 'contract', entityId: contractId, afterState: signature });
  return signature;
}

export async function getContractPdf(_id: string) {
  // TODO integrate with document storage service
  throw new HttpError(501, 'PDF_NOT_READY', 'PDF generation not implemented yet');
}

export async function createDataEntryLink(contractId: string) {
  const token = crypto.randomUUID();
  await pool.query(
    `INSERT INTO public_contract_sessions (contract_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')
     ON CONFLICT (token) DO NOTHING`,
    [contractId, token]
  );
  return { token, url: `/public/contracts/${token}` };
}

export async function transitionContract(id: string, nextStatus: string, actorId: string) {
  // TODO validate workflow transitions
  return updateContractStatus(id, nextStatus, actorId);
}
