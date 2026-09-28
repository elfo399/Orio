import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginRateLimitService } from './login-rate-limit.service.js';
import { MinigamesController } from './minigames.controller.js';
import { MinigamesService } from './minigames.service.js';
import { PetsController } from './pets.controller.js';
import { PetsService } from './pets.service.js';

@Module({
  controllers: [AuthController, PetsController, MinigamesController],
  providers: [AuthService, LoginRateLimitService, PetsService, MinigamesService, { provide: APP_GUARD, useClass: AuthGuard }]
})
export class AppModule {}
