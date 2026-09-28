import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { prepareDatabase } from './database-bootstrap.js';

type Request = { method: string; path: string; protocol: string; get(name: string): string | undefined };
type Response = { status(code: number): { json(body: unknown): unknown } };
type NextFunction = () => void;

function expectedOrigin(request: Request): string | undefined {
  if (process.env.PUBLIC_ORIGIN) return process.env.PUBLIC_ORIGIN.replace(/\/$/, '');
  const host = request.get('host');
  if (!host) return undefined;
  return `${request.protocol}://${host}`;
}

async function bootstrap(): Promise<void> {
  await prepareDatabase();
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: false });
  if (process.env.TRUST_PROXY === 'true') (app.getHttpAdapter().getInstance() as { set(name: string, value: unknown): void }).set('trust proxy', 1);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) || !request.path.startsWith('/api/')) return next();
    const origin = request.get('origin');
    if (!origin || origin !== expectedOrigin(request)) return response.status(403).json({ message: 'Invalid request origin.' });
    return next();
  });
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

void bootstrap().catch((error: unknown) => {
  console.error('ORIO API startup failed.', error);
  process.exit(1);
});
