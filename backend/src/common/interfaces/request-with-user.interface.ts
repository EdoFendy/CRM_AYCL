import type { Request } from 'express';

import type { AuthenticatedUser } from './authenticated-user.interface';

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
  correlationId?: string;
}
// CRITIC PASS: Mancano tipizzazioni per sessione esclusiva e attributi security (es. ip, userAgent); TODO estendere quando verrà implementato middleware auth.
