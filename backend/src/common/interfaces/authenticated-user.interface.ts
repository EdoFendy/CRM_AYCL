import type { Role } from '../types/role.type';

export interface AuthenticatedUser {
  id: string;
  roles: Role[];
  primaryRole: Role;
  teamIds?: string[];
  resellerId?: string | null;
}
// CRITIC PASS: Interfaccia utente priva di permessi granulari e attributi multi-tenant; TODO estendere con scope e flag MFA.
