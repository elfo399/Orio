import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { type ApiPet, type BubbleBathConfiguration } from '@orio/contracts';
import { PetMascotComponent } from './pet-mascot.component.js';

interface ZonePlacement { id: string; label: string; x: number; y: number; }

@Component({
  selector: 'orio-bubble-bath-game', standalone: true, imports: [PetMascotComponent], changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .bath-head{display:flex;justify-content:space-between;gap:14px;align-items:end;margin-bottom:10px}.bath-head b{font-size:13px}.bath-head span{font-size:12px;color:#66776b;font-weight:800}.clean-meter{height:8px;border-radius:99px;background:#e5e8df;overflow:hidden;margin-top:6px}.clean-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#87c7ca,#a9d5bd);transition:width .24s}.bath-board{position:relative;min-height:330px;height:min(51vh,410px);overflow:hidden;border-radius:22px;background:linear-gradient(180deg,#dff0ee,#faefd9);touch-action:none;outline:none}.bath-board:focus-visible{box-shadow:0 0 0 3px #806487}.bath-board orio-pet-mascot{position:absolute;width:min(71%,310px);left:50%;bottom:-9%;transform:translateX(-50%)}.dirt{position:absolute;z-index:2;width:39px;height:32px;border:0;border-radius:50% 44% 48% 42%;background:#9c7b61;opacity:.82;box-shadow:inset 4px 3px #b99679,0 2px 4px #5c483a55;cursor:pointer;transition:opacity .24s,transform .24s}.dirt.cleaned{opacity:0;transform:scale(.3);pointer-events:none}.dirt:focus-visible{outline:3px solid #314d3c;outline-offset:3px}.bubble{position:absolute;z-index:1;border:2px solid #ffffffaa;border-radius:50%;background:#dff4f255;animation:bubble-rise 3s ease-in infinite}.bubble-one{width:30px;height:30px;left:16%;bottom:12%}.bubble-two{width:17px;height:17px;right:19%;bottom:19%;animation-delay:.9s}.bubble-three{width:23px;height:23px;right:11%;bottom:6%;animation-delay:1.6s}.sponge{position:absolute;z-index:3;width:62px;transform:translate(-50%,-50%) rotate(-14deg);pointer-events:none;filter:drop-shadow(0 4px 3px #55726645)}.bath-help{position:absolute;z-index:4;bottom:8px;left:50%;transform:translateX(-50%);width:max-content;max-width:92%;padding:5px 10px;border-radius:99px;background:#fffdf9cb;font-size:11px;color:#556b5d;font-weight:700}@keyframes bubble-rise{to{transform:translateY(-180px) scale(1.15);opacity:0}}@media(max-width:700px){.bath-board{height:56vh;min-height:365px}.bath-board orio-pet-mascot{width:min(83%,330px)}}
  `],
  template: `
    <div class="bath-head"><div><b>Cleanliness {{ cleanliness() }}%</b><div class="clean-meter"><i [style.width.%]="cleanliness()"></i></div></div><span>{{ secondsLeft() }} sec</span></div>
    <div class="bath-board" tabindex="0" role="application" aria-label="Bubble Bath. Rub every dirt spot away." (pointermove)="scrub($event)" (pointerdown)="scrub($event)">
      <span class="bubble bubble-one"></span><span class="bubble bubble-two"></span><span class="bubble bubble-three"></span>
      <orio-pet-mascot [pet]="pet()" [overrideExpression]="cleanliness() === 100 ? 'happy' : 'neutral'"/>
      @for (zone of zones; track zone.id) { <button class="dirt" type="button" [class.cleaned]="isCleaned(zone.id)" [style.left.%]="zone.x" [style.top.%]="zone.y" (click)="clean(zone.id)" [attr.aria-label]="'Clean ' + zone.label"></button> }
      @if (sponge(); as position) { <img class="sponge" src="/assets/minigames/sponge.svg" alt="" [style.left.%]="position.x" [style.top.%]="position.y"> }
      <p class="bath-help">Move the sponge over each spot, or tap a spot to clean it</p>
    </div>
  `
})
export class BubbleBathGameComponent {
  readonly configuration = input.required<BubbleBathConfiguration>();
  readonly pet = input.required<ApiPet>();
  readonly running = input(false);
  readonly finished = output<{ cleanedZones: string[] }>();
  private readonly destroyRef = inject(DestroyRef);
  readonly cleaned = signal<string[]>([]);
  readonly sponge = signal<{ x: number; y: number } | null>(null);
  readonly secondsLeft = signal(0);
  readonly zones: ZonePlacement[] = [
    { id: 'ear-left', label: 'left ear', x: 33, y: 29 }, { id: 'ear-right', label: 'right ear', x: 65, y: 29 },
    { id: 'forehead', label: 'forehead', x: 50, y: 40 }, { id: 'cheek-left', label: 'left cheek', x: 38, y: 53 },
    { id: 'cheek-right', label: 'right cheek', x: 62, y: 53 }, { id: 'chin', label: 'chin', x: 50, y: 64 },
    { id: 'body-left', label: 'left side', x: 40, y: 71 }, { id: 'body-right', label: 'right side', x: 60, y: 71 }
  ];
  private startedAt = 0;
  private timer?: number;
  private started = false;

  constructor() {
    effect(() => { if (this.running() && !this.started) this.start(); });
    this.destroyRef.onDestroy(() => { if (this.timer) window.clearInterval(this.timer); });
  }

  readonly cleanliness = () => Math.round((this.cleaned().length / this.configuration().zones.length) * 100);

  scrub(event: PointerEvent): void {
    const board = event.currentTarget as HTMLElement;
    const bounds = board.getBoundingClientRect();
    const point = { x: ((event.clientX - bounds.left) / bounds.width) * 100, y: ((event.clientY - bounds.top) / bounds.height) * 100 };
    this.sponge.set(point);
    for (const zone of this.zones) if (Math.hypot(point.x - zone.x, point.y - zone.y) < 9) this.clean(zone.id);
  }

  clean(id: string): void {
    if (!this.started || !this.configuration().zones.includes(id) || this.isCleaned(id)) return;
    this.cleaned.update((zones) => [...zones, id]);
    if (this.cleanliness() === 100) this.finish();
  }

  isCleaned(id: string): boolean { return this.cleaned().includes(id); }

  private start(): void {
    this.started = true; this.startedAt = performance.now(); this.secondsLeft.set(this.configuration().durationSeconds);
    this.timer = window.setInterval(() => {
      const elapsed = performance.now() - this.startedAt;
      this.secondsLeft.set(Math.max(0, this.configuration().durationSeconds - Math.floor(elapsed / 1_000)));
      if (elapsed >= this.configuration().durationSeconds * 1_000) this.finish();
    }, 200);
  }

  private finish(): void {
    if (!this.started) return;
    this.started = false; if (this.timer) window.clearInterval(this.timer); this.timer = undefined; this.secondsLeft.set(0); this.finished.emit({ cleanedZones: this.cleaned() });
  }
}
