import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { loginSchema, registerSchema, type AuthResponse, type LoginInput, type RegisterInput } from '@orio/contracts';
import { AuthService, readCookie } from './auth.service.js';
import { CurrentUser, Public } from './auth.decorators.js';
import { LoginRateLimitService } from './login-rate-limit.service.js';
import type { AuthenticatedRequest } from './auth.types.js';

type Request = { headers: { cookie?: string | string[] }; ip?: string; socket?: { remoteAddress?: string } };
type Response = { cookie(name: string, value: string, options: object): void; clearCookie(name: string, options: object): void };

function parseBody<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { flatten(): unknown; issues: Array<{ message: string }> } } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException({
      message: parsed.error.issues[0]?.message ?? 'Invalid request.',
      issues: parsed.error.flatten()
    });
  }
  return parsed.data;
}

const cookieOptions = () => ({ httpOnly: true, secure: (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true', sameSite: 'lax' as const, path: '/api', maxAge: Math.max(1, Number(process.env.SESSION_TTL_DAYS ?? 30)) * 86_400_000 });
const clientAddress = (request: AuthenticatedRequest): string => request.ip ?? request.socket?.remoteAddress ?? 'unknown';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly limits: LoginRateLimitService) {}

  @Post('register')
  @HttpCode(201)
  @Public()
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: Response): Promise<AuthResponse> {
    const result = await this.auth.register(parseBody<RegisterInput>(registerSchema, body));
    response.cookie('orio_session', result.token, cookieOptions());
    return result.response;
  }

  @Post('login')
  @HttpCode(200)
  @Public()
  async login(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<AuthResponse> {
    const input = parseBody<LoginInput>(loginSchema, body);
    const ip = clientAddress(request as unknown as AuthenticatedRequest);
    if (!this.limits.allowed(ip, input.email)) throw new UnauthorizedException('Invalid email or password.');
    try {
      const result = await this.auth.login(input);
      this.limits.succeeded(ip, input.email);
      response.cookie('orio_session', result.token, cookieOptions());
      return result.response;
    } catch (error) {
      this.limits.failed(ip, input.email);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  @Public()
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.auth.logout(readCookie(request.headers.cookie, 'orio_session'));
    response.clearCookie('orio_session', { httpOnly: true, sameSite: 'lax', path: '/api', secure: cookieOptions().secure });
  }

  @Get('me')
  async me(@CurrentUser() user: AuthResponse['user']): Promise<AuthResponse> { return { user }; }
}
