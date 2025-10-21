import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../../middlewares/auth.js';
import { listTeams, createTeam, getTeam, updateTeam, deleteTeam } from '../users/users.service.js';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

teamsRouter.get('/', async (req, res) => {
  const type = req.query.type as string | undefined;
  const teams = await listTeams(type);
  res.json({ data: teams });
});

teamsRouter.get('/:id', async (req, res) => {
  try {
    const team = await getTeam(req.params.id);
    res.json(team);
  } catch (error: any) {
    if (error.message === 'Team not found') {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
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

teamsRouter.patch('/:id', requireRoles(['admin']), async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      type: z.enum(['seller', 'reseller']).optional(),
      parent_team_id: z.string().uuid().nullable().optional(),
    });
    const payload = schema.parse(req.body);
    const team = await updateTeam(req.params.id, payload);
    res.json(team);
  } catch (error: any) {
    if (error.message === 'Team not found') {
      res.status(404).json({ error: 'Team not found' });
    } else if (error.message === 'No fields to update') {
      res.status(400).json({ error: 'No fields to update' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

teamsRouter.delete('/:id', requireRoles(['admin']), async (req, res) => {
  try {
    await deleteTeam(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Team not found') {
      res.status(404).json({ error: 'Team not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

