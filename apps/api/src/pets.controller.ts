import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { adoptionSchema, idempotencySchema, petActionSchema, type AdoptionInput, type IdempotencyInput, type PetAction } from '@orio/contracts';
import { CurrentUser, Public } from './auth.decorators.js';
import { PetsService } from './pets.service.js';

function parseBody<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { flatten(): unknown } } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException({ message: 'Invalid request.', issues: parsed.error.flatten() });
  return parsed.data;
}

@Controller()
export class PetsController {
  constructor(private readonly pets: PetsService) {}

  @Get('health')
  @Public()
  health() { return this.pets.health(); }

  @Get('pets/current')
  current(@CurrentUser() user: { id: string }) { return this.pets.current(user.id); }

  @Post('pets')
  @HttpCode(201)
  adopt(@CurrentUser() user: { id: string }, @Body() body: unknown) { return this.pets.adopt(user.id, parseBody<AdoptionInput>(adoptionSchema, body)); }

  @Post('pets/current/actions/:action')
  @HttpCode(200)
  act(@CurrentUser() user: { id: string }, @Param('action') actionParam: string, @Body() body: unknown) {
    const action = petActionSchema.safeParse(actionParam);
    if (!action.success) throw new BadRequestException('Unknown action.');
    return this.pets.act(user.id, action.data as PetAction, parseBody<IdempotencyInput>(idempotencySchema, body ?? {}));
  }
}
