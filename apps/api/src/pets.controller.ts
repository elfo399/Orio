import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { adoptionSchema, idempotencySchema, petActionSchema, type AdoptionInput, type IdempotencyInput, type PetAction } from '@orio/contracts';
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
  health() { return this.pets.health(); }

  @Get('pets/current')
  current() { return this.pets.current(); }

  @Post('pets')
  @HttpCode(201)
  adopt(@Body() body: unknown) { return this.pets.adopt(parseBody<AdoptionInput>(adoptionSchema, body)); }

  @Post('pets/current/actions/:action')
  @HttpCode(200)
  act(@Param('action') actionParam: string, @Body() body: unknown) {
    const action = petActionSchema.safeParse(actionParam);
    if (!action.success) throw new BadRequestException('Unknown action.');
    return this.pets.act(action.data as PetAction, parseBody<IdempotencyInput>(idempotencySchema, body ?? {}));
  }
}
