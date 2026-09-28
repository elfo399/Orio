import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, type VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Component({ selector: 'orio-root', standalone: true, imports: [RouterOutlet], changeDetection: ChangeDetectionStrategy.OnPush, template: '<router-outlet />' })
export class RootComponent {
  private readonly updates = inject(SwUpdate);

  constructor() {
    if (!this.updates.isEnabled) return;
    this.updates.versionUpdates.pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')).subscribe(() => void this.activateLatestVersion());
    void this.updates.checkForUpdate();
  }

  private async activateLatestVersion(): Promise<void> {
    await this.updates.activateUpdate();
    window.location.reload();
  }
}
