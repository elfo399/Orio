import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { type SnackCatchConfiguration } from '@orio/contracts';

type FoodKind = 'apple' | 'strawberry' | 'carrot' | 'spoiled';
interface FallingFood { id: number; kind: FoodKind; x: number; y: number; speed: number; }

@Component({
  selector: 'orio-snack-catch-game', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .game-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}.game-head b{font-size:13px}.game-head span{font-size:12px;color:#66776b;font-weight:800}.snack-board{position:relative;height:min(52vh,410px);min-height:295px;overflow:hidden;border-radius:22px;background:linear-gradient(180deg,#d9edf1,#fff5df 74%);border:1px solid #ffffffaa;touch-action:none;outline:none}.snack-board:focus-visible{box-shadow:0 0 0 3px #806487}.snack-hill{position:absolute;left:-8%;right:-8%;bottom:-15%;height:33%;border-radius:50% 50% 0 0;background:#b9d4b3}.food{position:absolute;width:48px;aspect-ratio:1;padding:0;border:0;background:transparent;transform:translate(-50%,-50%);cursor:pointer;filter:drop-shadow(0 5px 3px #4c765d2c)}.food img{display:block;width:100%;height:100%}.basket{position:absolute;width:96px;bottom:4%;transform:translateX(-50%);pointer-events:none;filter:drop-shadow(0 7px 5px #4c765d35)}.basket img{display:block;width:100%}.catch-help{position:absolute;left:50%;bottom:7px;transform:translateX(-50%);width:max-content;max-width:90%;border-radius:99px;background:#fffdf9c9;padding:5px 10px;font-size:11px;color:#556b5d;font-weight:700}.score-meter{height:8px;border-radius:20px;background:#ffffff99;overflow:hidden}.score-meter i{display:block;height:100%;background:linear-gradient(90deg,#78ad87,#efbf83);border-radius:inherit;transition:width .2s}
    @media(max-width:700px){.snack-board{height:55vh;min-height:330px}.food{width:54px}.basket{width:106px}}
  `],
  template: `
    <div class="game-head"><div><b>Snack score {{ score() }}/100</b><div class="score-meter"><i [style.width.%]="score()"></i></div></div><span>{{ secondsLeft() }} sec</span></div>
    <div class="snack-board" tabindex="0" role="application" aria-label="Snack Catch. Move the basket and catch fresh food." (pointermove)="moveBasket($event)" (pointerdown)="moveBasket($event)" (keydown)="moveWithKeyboard($event)">
      <div class="snack-hill"></div>
      @for (food of foods(); track food.id) { <button class="food" type="button" [style.left.%]="food.x" [style.top.%]="food.y" (click)="catchFood(food.id)" [attr.aria-label]="food.kind === 'spoiled' ? 'Avoid spoiled food' : 'Catch ' + food.kind"><img [src]="assetFor(food.kind)" alt=""></button> }
      <div class="basket" [style.left.%]="basketX()"><img src="/assets/minigames/basket.svg" alt=""></div>
      <p class="catch-help">Drag, use arrows, or tap a snack</p>
    </div>
  `
})
export class SnackCatchGameComponent {
  readonly configuration = input.required<SnackCatchConfiguration>();
  readonly running = input(false);
  readonly finished = output<{ feedEvents: Array<{ kind: 'good' | 'spoiled'; atMs: number }> }>();
  private readonly destroyRef = inject(DestroyRef);
  readonly foods = signal<FallingFood[]>([]);
  readonly basketX = signal(50);
  readonly score = signal(0);
  readonly secondsLeft = signal(0);
  private events: Array<{ kind: 'good' | 'spoiled'; atMs: number }> = [];
  private nextFoodId = 1;
  private startedAt = 0;
  private lastEventAt = -350;
  private tick?: number;
  private spawn?: number;
  private countdown?: number;
  private started = false;

  constructor() {
    effect(() => { if (this.running() && !this.started) this.start(); });
    this.destroyRef.onDestroy(() => this.stopTimers());
  }

  moveBasket(event: PointerEvent): void {
    const board = event.currentTarget as HTMLElement;
    const bounds = board.getBoundingClientRect();
    this.basketX.set(Math.max(7, Math.min(93, ((event.clientX - bounds.left) / bounds.width) * 100)));
  }

  moveWithKeyboard(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.basketX.update((position) => Math.max(7, Math.min(93, position + (event.key === 'ArrowLeft' ? -8 : 8))));
  }

  catchFood(id: number): void {
    const food = this.foods().find((item) => item.id === id);
    if (!food || !this.started) return;
    this.foods.update((items) => items.filter((item) => item.id !== id));
    this.recordCatch(food);
  }

  private recordCatch(food: FallingFood): void {
    const atMs = Math.min(this.configuration().durationSeconds * 1_000, Math.round(performance.now() - this.startedAt));
    if (atMs < this.lastEventAt + 350) return;
    this.lastEventAt = atMs;
    this.events.push({ kind: food.kind === 'spoiled' ? 'spoiled' : 'good', atMs });
    const delta = food.kind === 'spoiled' ? -12 : 8;
    this.score.update((value) => Math.max(0, Math.min(100, value + delta)));
  }

  assetFor(kind: FoodKind): string { return `/assets/minigames/${kind}.svg`; }

  private start(): void {
    this.started = true; this.startedAt = performance.now(); this.secondsLeft.set(this.configuration().durationSeconds);
    this.spawnFood();
    this.spawn = window.setInterval(() => this.spawnFood(), 850);
    this.tick = window.setInterval(() => this.advance(), 50);
    this.countdown = window.setInterval(() => {
      const remaining = Math.max(0, this.configuration().durationSeconds - Math.floor((performance.now() - this.startedAt) / 1_000));
      this.secondsLeft.set(remaining);
    }, 200);
  }

  private spawnFood(): void {
    const kinds: FoodKind[] = ['apple', 'strawberry', 'carrot', 'apple', 'strawberry', 'carrot', 'spoiled'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    this.foods.update((items) => [...items, { id: this.nextFoodId++, kind, x: 9 + Math.random() * 82, y: -9, speed: 18 + Math.random() * 12 }]);
  }

  private advance(): void {
    const elapsed = performance.now() - this.startedAt;
    const caught: FallingFood[] = [];
    const basket = this.basketX();
    const next = this.foods().map((food) => ({ ...food, y: food.y + food.speed * .05 })).filter((food) => {
      if (food.y > 78 && food.y < 91 && Math.abs(food.x - basket) < 11) { caught.push(food); return false; }
      return food.y < 108;
    });
    this.foods.set(next);
    for (const food of caught) this.recordCatch(food);
    if (elapsed >= this.configuration().durationSeconds * 1_000) this.finish();
  }

  private finish(): void {
    if (!this.started) return;
    this.started = false; this.stopTimers(); this.secondsLeft.set(0); this.finished.emit({ feedEvents: this.events });
  }

  private stopTimers(): void {
    if (this.tick) window.clearInterval(this.tick); if (this.spawn) window.clearInterval(this.spawn); if (this.countdown) window.clearInterval(this.countdown);
    this.tick = undefined; this.spawn = undefined; this.countdown = undefined;
  }
}
