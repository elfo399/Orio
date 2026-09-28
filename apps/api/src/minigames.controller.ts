import { BadRequestException, Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { minigameCompleteSchema, minigameStartSchema, type MiniGameCompleteInput, type MiniGameStartInput } from '@orio/contracts';
import { CurrentUser } from './auth.decorators.js';
import { MinigamesService } from './minigames.service.js';

function parseBody<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestException('Invalid minigame request.');
  return parsed.data;
}

@Controller('minigames')
export class MinigamesController {
  constructor(private readonly minigames: MinigamesService) {}

  @Post('sessions')
  @HttpCode(201)
  start(@CurrentUser() user: { id: string }, @Body() body: unknown) {
    return this.minigames.start(user.id, parseBody<MiniGameStartInput>(minigameStartSchema, body));
  }

  @Get('sessions/:id')
  get(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.minigames.get(user.id, id); }

  @Post('sessions/:id/complete')
  @HttpCode(200)
  complete(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: unknown) {
    return this.minigames.complete(user.id, id, parseBody<MiniGameCompleteInput>(minigameCompleteSchema, body ?? {}));
  }

  @Post('sessions/:id/abandon')
  @HttpCode(204)
  async abandon(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<void> { await this.minigames.abandon(user.id, id); }
}
