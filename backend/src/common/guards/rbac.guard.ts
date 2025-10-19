import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppLogger } from '../services/app-logger.service';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import type { Role } from '../types/role.type';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly logger: AppLogger) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      this.logger.warn('RBAC guard blocked request without authenticated user');
      throw new ForbiddenException('Access forbidden');
    }

    const hasRole = requiredRoles.some((role) => user.primaryRole === role || user.roles.includes(role));

    if (!hasRole) {
      this.logger.warn('RBAC guard denied access due to missing roles', {
        requiredRoles,
        userRoles: user.roles
      });
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
// CRITIC PASS: Guard non gestisce permessi granulari né scoping su risorse specifiche; TODO introdurre policy engine (es. CASL) e valutazioni su team/owner.
