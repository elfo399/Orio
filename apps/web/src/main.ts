import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { AppComponent } from './app/app.component.js';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient(), provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })]
}).catch((error: unknown) => console.error(error));
