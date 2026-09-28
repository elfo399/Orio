import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { RootComponent } from './app/root.component.js';
import { routes } from './app/app.routes.js';

bootstrapApplication(RootComponent, {
  providers: [provideHttpClient(), provideRouter(routes), provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerImmediately' })]
}).catch((error: unknown) => console.error(error));
