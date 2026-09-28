import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { type ApiPet, type MiniGameCompleteInput, type MiniGameResult, type MiniGameSession } from '@orio/contracts';
import { BubbleBathGameComponent } from './bubble-bath-game.component.js';
import { MemoryLightsGameComponent } from './memory-lights-game.component.js';
import { MinigameApiService } from './minigame-api.service.js';
import { PetMascotComponent } from './pet-mascot.component.js';
import { SnackCatchGameComponent } from './snack-catch-game.component.js';

type ModalPhase = 'intro' | 'playing' | 'result' | 'error';

@Component({
  selector: 'orio-minigame-modal', standalone: true,
  imports: [SnackCatchGameComponent, MemoryLightsGameComponent, BubbleBathGameComponent, PetMascotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host{position:fixed;z-index:20;inset:0}.game-backdrop{position:absolute;inset:0;background:#263f3473;backdrop-filter:blur(5px)}.game-modal{position:relative;box-sizing:border-box;width:min(650px,calc(100% - 30px));max-height:calc(100dvh - 30px);overflow:auto;margin:15px auto;padding:clamp(20px,4vw,32px);border-radius:30px;background:#fffdf9;border:1px solid #fff;box-shadow:0 25px 70px #1f352c55}.modal-top{display:flex;justify-content:space-between;align-items:start;gap:18px}.modal-top h2{margin:4px 0 7px;letter-spacing:-.05em;font-size:clamp(28px,5vw,40px)}.modal-top p{margin:0;color:#66776b;line-height:1.5;max-width:440px;font-size:14px}.close-game{border:1px solid #e8dfd4;background:#fff;border-radius:50%;width:38px;height:38px;font-size:22px;color:#496453;flex:none}.game-intro,.game-result,.game-error{text-align:center;padding:24px 4px 4px}.game-intro .game-icon{width:105px;margin:0 auto 13px}.game-icon img{display:block;width:100%}.game-intro h3,.game-result h3,.game-error h3{font-size:26px;letter-spacing:-.05em;margin:0 0 9px}.game-intro p,.game-result p,.game-error p{color:#66776b;line-height:1.5;font-size:14px}.start-game{margin-top:19px;min-width:205px;display:inline-flex;justify-content:space-between;gap:26px}.gentle-option{display:flex;gap:8px;justify-content:center;align-items:center;margin:18px auto 0;font-size:12px;color:#5d7363;font-weight:700}.game-stage{margin-top:24px}.game-result orio-pet-mascot{display:block;width:170px;margin:-8px auto -10px}.result-score{display:flex;justify-content:center;gap:12px;margin:17px 0}.result-score span{min-width:115px;border-radius:16px;padding:12px;background:#eef3eb;color:#41644d;font-weight:800;font-size:13px}.result-score span:last-child{background:#f2e8f3;color:#806487}.server-error{color:#ae5252!important;font-weight:700}.game-result .primary{margin-top:8px}@media(max-width:700px){.game-modal{width:calc(100% - 16px);max-height:calc(100dvh - 16px);margin:8px auto;padding:20px;border-radius:25px}.modal-top h2{font-size:31px}.game-stage{margin-top:18px}}
  `],
  template: `
    <div class="game-backdrop"></div>
    <section class="game-modal" role="dialog" aria-modal="true" [attr.aria-label]="title()" (keydown.escape)="close()">
      <header class="modal-top"><div><p class="eyebrow">CARE MINI-GAME</p><h2>{{ title() }}</h2><p>{{ description() }}</p></div><button class="close-game" type="button" (click)="close()" [disabled]="busy()" aria-label="Close minigame">×</button></header>
      @if (phase() === 'intro') {
        <section class="game-intro"><div class="game-icon"><img [src]="icon()" alt=""></div><h3>{{ pet().name }} is ready.</h3><p>{{ intro() }}</p><label class="gentle-option"><input type="checkbox" [checked]="gentlePace()" (change)="gentlePace.set(!gentlePace())"> Gentle pace for Memory Lights</label><button class="primary start-game" type="button" (click)="start()">Start {{ title() }} <span>→</span></button></section>
      } @else if (phase() === 'playing') {
        <section class="game-stage">
          @if (session().configuration.gameType === 'feed') { <orio-snack-catch-game [configuration]="session().configuration" [running]="true" (finished)="complete($event)"/> }
          @else if (session().configuration.gameType === 'play') { <orio-memory-lights-game [configuration]="session().configuration" [running]="true" [gentlePace]="gentlePace()" (finished)="complete($event)"/> }
          @else { <orio-bubble-bath-game [configuration]="session().configuration" [pet]="pet()" [running]="true" (finished)="complete($event)"/> }
          @if (busy()) { <p class="memory-note">Confirming your reward with ORIO…</p> }
        </section>
      } @else if (phase() === 'result' && result(); as outcome) {
        <section class="game-result"><orio-pet-mascot [pet]="outcome.pet" [overrideExpression]="'happy'"/><p class="eyebrow">GREAT JOB!</p><h3>{{ outcome.message }}</h3><div class="result-score"><span>Score {{ outcome.score }}/100</span><span>{{ rewardLabel(outcome) }} +{{ outcome.reward }}</span></div><p>{{ outcome.pet.name }}’s {{ rewardLabel(outcome).toLowerCase() }} is now {{ outcome.pet.stats[outcome.rewardStat] }}/100.</p><button class="primary" type="button" (click)="close()">Back to your world <span>→</span></button></section>
      } @else {
        <section class="game-error"><h3>We could not confirm that round.</h3><p class="server-error">{{ error() }}</p><p>No reward or cooldown was applied.</p><button class="primary" type="button" (click)="close()">Back to your world <span>→</span></button></section>
      }
    </section>
  `
})
export class MinigameModalComponent {
  readonly session = input.required<MiniGameSession>();
  readonly pet = input.required<ApiPet>();
  readonly closed = output<void>();
  readonly completed = output<MiniGameResult>();
  private readonly api = inject(MinigameApiService);
  readonly phase = signal<ModalPhase>('intro');
  readonly gentlePace = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly result = signal<MiniGameResult | null>(null);
  readonly title = computed(() => ({ feed: 'Snack Catch', play: 'Memory Lights', clean: 'Bubble Bath' })[this.session().gameType]);
  readonly description = computed(() => ({ feed: 'Catch fresh snacks and leave the spoiled food alone.', play: 'Watch the lights, then replay the sequence.', clean: 'Wipe every little dirt spot away.' })[this.session().gameType]);
  readonly intro = computed(() => ({ feed: 'Move the basket with your finger, mouse, or arrow keys. Tap a snack for an accessible catch.', play: 'Every colour also has a shape and a keyboard key: 1–4 or Q/W/A/S.', clean: 'Guide the sponge across the spots. You can also tap each spot directly.' })[this.session().gameType]);
  readonly icon = computed(() => ({ feed: '/assets/minigames/basket.svg', play: '/assets/orio-icon.svg', clean: '/assets/minigames/sponge.svg' })[this.session().gameType]);

  start(): void { this.phase.set('playing'); }

  complete(payload: MiniGameCompleteInput): void {
    if (this.busy()) return;
    this.busy.set(true);
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
    this.api.complete(this.session().id, { ...payload, idempotencyKey }).subscribe({
      next: (result) => { this.result.set(result); this.phase.set('result'); this.busy.set(false); this.completed.emit(result); },
      error: (response: { error?: { message?: string } }) => { this.error.set(response.error?.message ?? 'Please start another round.'); this.phase.set('error'); this.busy.set(false); }
    });
  }

  close(): void {
    if (this.busy()) return;
    if (this.phase() === 'result' || this.phase() === 'error') { this.closed.emit(); return; }
    this.busy.set(true);
    this.api.abandon(this.session().id).subscribe({ complete: () => this.closed.emit(), error: () => this.closed.emit() });
  }

  rewardLabel(result: MiniGameResult): string { return ({ satiety: 'Satiety', happiness: 'Happiness', hygiene: 'Hygiene' })[result.rewardStat]; }
}
