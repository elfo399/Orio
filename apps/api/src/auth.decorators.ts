import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@orio/contracts';
import type { AuthenticatedRequest } from './auth.types.js';

export const IS_PUBLIC = 'orio:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user as AuthUser;
});
