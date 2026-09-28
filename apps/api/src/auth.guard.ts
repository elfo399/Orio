import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, readCookie } from './auth.service.js';
import { IS_PUBLIC } from './auth.decorators.js';
import type { AuthenticatedRequest } from './auth.types.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.auth.resolveSession(readCookie(request.headers.cookie, 'orio_session'));
    if (!user) throw new UnauthorizedException('Authentication required.');
    request.user = user;
    return true;
  }
}
