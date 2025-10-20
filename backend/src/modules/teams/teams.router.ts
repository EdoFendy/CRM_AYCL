import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../../middlewares/auth.js';
import { listTeams, createTeam } from '../users/users.service.js';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

teamsRouter.get('/', async (req, res) => {
  const type = req.query.type as string | undefined;
  const teams = await listTeams(type);
  res.json({ data: teams });
});

teamsRouter.post('/', requireRoles(['admin']), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    type: z.enum(['seller', 'reseller']),
    parent_team_id: z.string().uuid().nullable().optional(),
  });
  const payload = schema.parse(req.body);
  const team = await createTeam(payload.name, payload.type, payload.parent_team_id);
  res.status(201).json(team);
});

