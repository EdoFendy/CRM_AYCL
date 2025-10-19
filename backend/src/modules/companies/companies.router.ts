import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { createCompany, deleteCompany, getCompany, listCompanies, updateCompany } from './companies.service.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { listContacts } from '../contacts/contacts.service.js';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

companiesRouter.get('/', async (req, res) => {
  const companies = await listCompanies(req.query);
  res.json(companies);
});

companiesRouter.post('/', async (req, res) => {
  const schema = z.object({
    ragione_sociale: z.string().min(3),
    website: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    geo: z.string().optional(),
    industry: z.string().optional(),
    revenue_range: z.string().optional(),
    owner_id: z.string().uuid().optional()
  });
  const payload = schema.parse(req.body);
  const company = await createCompany(payload, req.user!.id);
  res.status(201).json(company);
});

companiesRouter.get('/:id', async (req, res) => {
  const company = await getCompany(req.params.id);
  res.json(company);
});

companiesRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    ragione_sociale: z.string().min(3).optional(),
    website: z.string().url().nullable().optional(),
    linkedin: z.string().url().nullable().optional(),
    geo: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    revenue_range: z.string().nullable().optional(),
    owner_id: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);
  const company = await updateCompany(req.params.id, payload, req.user!.id);
  res.json(company);
});

companiesRouter.delete('/:id', async (req, res) => {
  await deleteCompany(req.params.id, req.user!.id);
  res.status(204).send();
});

companiesRouter.get('/:id/contacts', async (req, res) => {
  const contacts = await listContacts({ company_id: req.params.id });
  res.json(contacts);
});

companiesRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'COMPANY_ROUTE_NOT_FOUND', 'Route not found'));
});
