import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import { changeOfferStatus, createOffer, getOffer, listOffers, updateOffer } from './offers.service.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const offersRouter = Router();

offersRouter.use(requireAuth);

offersRouter.get('/', async (req, res) => {
  const offers = await listOffers(req.query);
  res.json(offers);
});

offersRouter.post('/', async (req, res) => {
  const schema = z.object({
    opportunity_id: z.string().uuid(),
    version: z.number().int(),
    items: z.array(z.any()),
    total: z.number(),
    currency: z.string().length(3).optional(),
    status: z.string().optional()
  });
  const payload = schema.parse(req.body);
  const offer = await createOffer(payload, req.user!.id);
  res.status(201).json(offer);
});

offersRouter.get('/:id', async (req, res) => {
  const offer = await getOffer(req.params.id);
  res.json(offer);
});

offersRouter.patch('/:id', async (req, res) => {
  const schema = z.object({
    version: z.number().int().optional(),
    items: z.array(z.any()).optional(),
    total: z.number().optional(),
    currency: z.string().length(3).optional(),
    status: z.string().optional()
  });
  const payload = schema.parse(req.body);
  const offer = await updateOffer(req.params.id, payload, req.user!.id);
  res.json(offer);
});

const statusSchema = z.object({ note: z.string().optional() });

offersRouter.post('/:id/send', async (req, res) => {
  const metadata = statusSchema.parse(req.body);
  const offer = await changeOfferStatus(req.params.id, 'sent', req.user!.id, metadata);
  // TODO send notification/email with offer PDF
  res.json({ offer, todo: 'Implement offer send workflow' });
});

offersRouter.post('/:id/accept', async (req, res) => {
  const metadata = statusSchema.parse(req.body);
  const offer = await changeOfferStatus(req.params.id, 'accepted', req.user!.id, metadata);
  res.json({ offer, todo: 'Trigger contract creation + webhook offer.accepted' });
});

offersRouter.post('/:id/decline', async (req, res) => {
  const metadata = statusSchema.parse(req.body);
  const offer = await changeOfferStatus(req.params.id, 'declined', req.user!.id, metadata);
  res.json({ offer });
});

offersRouter.post('/:id/expire', async (req, res) => {
  const metadata = statusSchema.parse(req.body);
  const offer = await changeOfferStatus(req.params.id, 'expired', req.user!.id, metadata);
  res.json({ offer });
});

offersRouter.use((_req, _res, next) => {
  next(new HttpError(404, 'OFFER_ROUTE_NOT_FOUND', 'Route not found'));
});
