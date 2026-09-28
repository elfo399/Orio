import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { type MemoryLightsConfiguration } from '@orio/contracts';

@Component({
  selector: 'orio-memory-lights-game', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .memory-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.memory-head b{font-size:14px}.memory-head span{font-size:12px;color:#66776b;font-weight:800}.memory-progress{height:8px;border-radius:99px;background:#ece5dc;overflow:hidden;margin-top:6px}.memory-progress i{display:block;height:100%;background:#bba4ce;border-radius:inherit;transition:width .3s}.memory-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;max-width:430px;margin:auto;outline:none}.light{border:0;aspect-ratio:1;border-radius:24px;color:#244334;font-size:38px;font-weight:900;box-shadow:inset 0 -7px 0 #00000014,0 8px 15px #4c765d17;transition:transform .13s,filter .13s,box-shadow .13s;touch-action:manipulation}.light:active,.light.lit{transform:scale(.95);filter:brightness(1.15) saturate(1.2);box-shadow:inset 0 0 0 4px #fff9,0 0 0 5px #fff7,0 8px 19px #4c765d35}.light:focus-visible{outline:4px solid #314d3c;outline-offset:3px}.mint{background:#a9d5bd}.lilac{background:#d7b9df}.peach{background:#f6c39c}.sun{background:#f5df83}.memory-note{text-align:center;min-height:24px;margin:16px 0 0;font-size:13px;color:#5f7366;font-weight:700}
  `],
  template: `
    <div class="memory-head"><div><b>Level {{ level() }} of {{ configuration().levels }}</b><div class="memory-progress"><i [style.width.%]="((level() - 1) / configuration().levels) * 100"></i></div></div><span>{{ phase() === 'showing' ? 'Watch closely' : 'Your turn' }}</span></div>
    <div class="memory-board" tabindex="0" role="application" aria-label="Memory Lights. Repeat the shown sequence." (keydown)="keyPress($event)">
      @for (tone of tones; track tone.index) { <button type="button" class="light" [class]="tone.className + (lit() === tone.index ? ' lit' : '')" (click)="press(tone.index)" [disabled]="phase() !== 'answer'" [attr.aria-label]="tone.label + ', key ' + (tone.index + 1)">{{ tone.symbol }}</button> }
    </div>
    <p class="memory-note">{{ phase() === 'showing' ? 'Remember the lights and symbols.' : 'Repeat the sequence using the large buttons.' }}</p>
  `
})
export class MemoryLightsGameComponent {
  readonly configuration = input.required<MemoryLightsConfiguration>();
  readonly running = input(false);
  readonly gentlePace = input(false);
  readonly finished = output<{ memoryLevels: number[][] }>();
  private readonly destroyRef = inject(DestroyRef);
  readonly level = signal(1);
  readonly phase = signal<'showing' | 'answer'>('showing');
  readonly lit = signal<number | null>(null);
  readonly tones = [
    { index: 0, className: 'mint', symbol: '▲', label: 'Mint triangle' }, { index: 1, className: 'lilac', symbol: '●', label: 'Lilac circle' },
    { index: 2, className: 'peach', symbol: '◆', label: 'Peach diamond' }, { index: 3, className: 'sun', symbol: '✦', label: 'Yellow star' }
  ];
  private attempts: number[][] = [];
  private current: number[] = [];
  private run = 0;
  private started = false;

  constructor() {
    effect(() => { if (this.running() && !this.started) this.start(); });
    this.destroyRef.onDestroy(() => { this.run += 1; });
  }

  press(index: number): void {
    if (!this.started || this.phase() !== 'answer') return;
    this.lit.set(index);
    window.setTimeout(() => this.lit.set(null), 130);
    this.current.push(index);
    const expected = this.configuration().sequence[this.current.length - 1];
    if (index !== expected) { this.attempts.push([...this.current]); this.finish(); return; }
    if (this.current.length !== this.level()) return;
    this.attempts.push([...this.current]);
    if (this.level() === this.configuration().levels) { this.finish(); return; }
    this.level.update((value) => value + 1); this.current = []; void this.showSequence();
  }

  keyPress(event: KeyboardEvent): void {
    const mapped: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, q: 0, w: 1, a: 2, s: 3 };
    const index = mapped[event.key.toLowerCase()];
    if (index === undefined) return;
    event.preventDefault(); this.press(index);
  }

  private start(): void { this.started = true; void this.showSequence(); }

  private async showSequence(): Promise<void> {
    const run = ++this.run;
    this.phase.set('showing'); this.lit.set(null);
    await this.wait(450);
    for (const tone of this.configuration().sequence.slice(0, this.level())) {
      if (run !== this.run || !this.started) return;
      const pace = this.gentlePace() ? 1.45 : 1;
      this.lit.set(tone); await this.wait(520 * pace); this.lit.set(null); await this.wait(210 * pace);
    }
    if (run === this.run && this.started) this.phase.set('answer');
  }

  private finish(): void {
    if (!this.started) return;
    this.started = false; this.run += 1; this.lit.set(null); this.finished.emit({ memoryLevels: this.attempts });
  }

  private wait(milliseconds: number): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, milliseconds)); }
}
