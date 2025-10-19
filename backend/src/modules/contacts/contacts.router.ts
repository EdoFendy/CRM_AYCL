import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { createContact, deleteContact, getContact, listContacts, updateContact } from './contacts.service.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get('/', async (req, res) => {
  const contacts = await listContacts(req.query);
  res.json(contacts);
});

contactsRouter.post('/', async (req, res) => {
  const schema = z.object({
    company_id: z.string().uuid(),
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    role: z.string().optional(),
    linkedin: z.string().url().optional(),
    owner_id: z.string().uuid().optional()
  });
  const payload = schema.parse(req.body);
  const contact = await createContact(payload, req.user!.id);
  res.status(201).json(contact);
});

contactsRouter.get('/:id', async (req, res) => {
  const contact = await getContact(req.params.id);
  res.json(contact);
});

contactsRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    role: z.string().nullable().optional(),
    linkedin: z.string().url().nullable().optional(),
    owner_id: z.string().uuid().nullable().optional()
  });
  const payload = schema.parse(req.body);
  const contact = await updateContact(req.params.id, payload, req.user!.id);
  res.json(contact);
});

contactsRouter.delete('/:id', async (req, res) => {
  await deleteContact(req.params.id, req.user!.id);
  res.status(204).send();
});

contactsRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'CONTACT_ROUTE_NOT_FOUND', 'Route not found'));
});
