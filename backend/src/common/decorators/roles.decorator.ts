import { SetMetadata } from '@nestjs/common';

import type { Role } from '../types/role.type';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
// CRITIC PASS: Decoratore minimale senza gestione di permessi granulari; TODO integrare attributi per scope aziendale/team e limitazioni field-level.
