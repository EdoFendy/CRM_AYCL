import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import {
  createContract,
  createContractVersion,
  createDataEntryLink,
  getContract,
  getContractPdf,
  listContracts,
  listContractVersions,
  recordSignature,
  transitionContract,
  updateContractStatus
} from './contracts.service.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const contractsRouter = Router();

contractsRouter.use(requireAuth);

contractsRouter.get('/', async (req, res) => {
  const contracts = await listContracts(req.query);
  res.json(contracts);
});

contractsRouter.post('/', async (req, res) => {
  const schema = z.object({
    company_id: z.string().uuid(),
    opportunity_id: z.string().uuid().optional(),
    offer_id: z.string().uuid().optional(),
    template_id: z.string().uuid().optional(),
    status: z.string().optional()
  });
  const payload = schema.parse(req.body);
  const contract = await createContract(payload, req.user!.id);
  res.status(201).json(contract);
});

contractsRouter.get('/:id', async (req, res) => {
  const contract = await getContract(req.params.id);
  res.json(contract);
});

contractsRouter.post('/:id/send', async (req, res) => {
  const contract = await updateContractStatus(req.params.id, 'Sent', req.user!.id);
  res.json({ contract, todo: 'Integrate sending emails/documents' });
});

contractsRouter.post('/:id/data-entry-link', async (req, res) => {
  const link = await createDataEntryLink(req.params.id);
  res.json(link);
});

contractsRouter.post('/:id/request-signature', async (req, res) => {
  const schema = z.object({ signer_name: z.string(), signer_email: z.string().email() });
  const payload = schema.parse(req.body);
  const signature = await recordSignature(req.params.id, { name: payload.signer_name, email: payload.signer_email, status: 'pending' }, req.user!.id);
  res.json({ signature, todo: 'Trigger e-sign provider API' });
});

contractsRouter.post('/:id/transition', async (req, res) => {
  const schema = z.object({ status: z.string() });
  const payload = schema.parse(req.body);
  const contract = await transitionContract(req.params.id, payload.status, req.user!.id);
  res.json(contract);
});

contractsRouter.get('/:id/pdf', async (req, res, next) => {
  try {
    const pdf = await getContractPdf(req.params.id);
    res.json(pdf);
  } catch (error) {
    next(error);
  }
});

contractsRouter.get('/:id/versions', async (req, res) => {
  const versions = await listContractVersions(req.params.id);
  res.json(versions);
});

contractsRouter.post('/:id/versions', async (req, res) => {
  const version = await createContractVersion(req.params.id, req.body, req.user!.id);
  res.status(201).json(version);
});

contractsRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'CONTRACT_ROUTE_NOT_FOUND', 'Route not found'));
});
