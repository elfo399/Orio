import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { type PetAction, type PetResponse } from '@orio/contracts';
import { formatRemaining } from '@orio/shared';
import { PetApiService } from './pet-api.service.js';
import { OrioMascotComponent } from './orio-mascot.component.js';

type ViewState = 'loading' | 'adoption' | 'dashboard' | 'offline';
type StatKey = 'satiety' | 'happiness' | 'energy' | 'hygiene' | 'health';

@Component({
  selector: 'orio-root', standalone: true, imports: [FormsModule, NgClass, OrioMascotComponent], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell">
      <header class="topbar"><a class="brand" href="/" aria-label="ORIO home"><span class="brand-orb">o</span><span>ORIO</span></a><span class="connection" [class.online]="view() === 'dashboard'" [class.offline]="view() === 'offline'"><i></i>{{ view() === 'offline' ? 'Offline' : view() === 'dashboard' ? 'Connected' : 'Connecting' }}</span></header>
      @if (view() === 'loading') { <section class="loading"><div class="dot-orbit"><i></i><i></i><i></i></div><p>Waking up your little world…</p></section> }
      @else if (view() === 'offline') { <section class="offline-card card"><orio-mascot [overrideExpression]="'sad'"/><h1>ORIO needs a connection</h1><p>Your pet is safe. Reconnect to see its authoritative, up-to-date world.</p><button class="primary" (click)="load()">Try again</button></section> }
      @else if (view() === 'adoption') {
        <section class="adoption-grid">
          <div class="adoption-hero"><p class="eyebrow">A small world is waiting</p><h1>Meet your new <em>little</em> friend.</h1><p>ORIO lives quietly at home, changing with time and every bit of care.</p><orio-mascot [overrideExpression]="'happy'"/></div>
          <form class="adoption-card card" (ngSubmit)="adopt()"><span class="step">01 / ADOPTION</span><h2>What should we call them?</h2><p>Choose a name with 2–24 characters.</p><label for="name">Pet name</label><input id="name" name="name" [(ngModel)]="name" [disabled]="busy()" minlength="2" maxlength="24" required autocomplete="off" placeholder="e.g. Miso"><small [class.error]="adoptionError()">{{ adoptionError() || 'A name makes this world feel like home.' }}</small><button class="primary" [disabled]="busy() || name.trim().length < 2">{{ busy() ? 'Adopting…' : 'Adopt ORIO' }} <span>→</span></button></form>
        </section>
      }
      @else if (response(); as data) {
        <section class="dashboard" [class.sleeping-page]="data.pet.isSleeping">
          <div class="pet-summary"><div><p class="eyebrow">{{ emotionLabel(data.pet.status) }}</p><h1>{{ data.pet.name }}</h1><p class="age">{{ ageLabel(data.pet.ageMinutes) }} · {{ data.pet.species.displayName }}</p></div><button class="refresh" (click)="load()" [disabled]="busy()" aria-label="Refresh pet state">↻</button></div>
          <div class="world card"><div class="world-copy"><p>{{ story() }}</p><span class="mood-pill" [ngClass]="data.pet.status">{{ data.pet.isSleeping ? 'Dreaming' : data.pet.status }}</span></div><orio-mascot [pet]="data.pet" [overrideExpression]="reaction()"/></div>
          <section class="stats card"><div class="section-heading"><div><p class="eyebrow">Wellbeing</p><h2>How {{ data.pet.name }} feels</h2></div><span class="time-note">Live state</span></div><div class="stats-grid">@for (stat of stats; track stat.key) { <div class="stat"><div class="stat-label"><span>{{ stat.icon }} {{ stat.label }}</span><b>{{ data.pet.stats[stat.key] }}<small>/100</small></b></div><div class="meter"><i [style.width.%]="data.pet.stats[stat.key]" [ngClass]="stat.key"></i></div></div> }</div></section>
          <section class="actions"><p class="eyebrow">Care rituals</p><div class="action-grid">@for (item of actions; track item.action) { <button class="action-card card" [class.active-action]="reaction() === item.reaction" [disabled]="actionDisabled(item.action, data)" (click)="doAction(item.action)"><span class="action-icon">{{ item.icon }}</span><span><b>{{ item.label }}</b><small>{{ actionHint(item.action, data) }}</small></span><strong>{{ item.action === 'sleep' || item.action === 'wake' ? '→' : cooldownText(item.action, data) || '+' + item.gain }}</strong></button> }</div></section>
          <p class="hint">{{ data.pet.isSleeping ? 'Rest is important. Wake ORIO when you are ready.' : 'Every small act shapes the day.' }}</p>
        </section>
      }
      @if (toast(); as note) { <div class="toast" role="status">{{ note }}</div> }
    </main>
  `
})
export class AppComponent {
  private readonly api = inject(PetApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly view = signal<ViewState>('loading');
  readonly response = signal<PetResponse | null>(null);
  readonly busy = signal(false);
  readonly toast = signal<string | null>(null);
  readonly reaction = signal<'neutral' | 'happy' | 'hungry' | 'sad' | 'sleeping' | 'sick' | null>(null);
  readonly now = signal(Date.now());
  readonly adoptionError = signal('');
  name = '';
  readonly stats: Array<{ key: StatKey; label: string; icon: string }> = [
    { key: 'satiety', label: 'Satiety', icon: '◒' }, { key: 'happiness', label: 'Joy', icon: '✦' }, { key: 'energy', label: 'Energy', icon: '↯' }, { key: 'hygiene', label: 'Hygiene', icon: '◌' }, { key: 'health', label: 'Health', icon: '♡' }
  ];
  readonly actions: Array<{ action: PetAction; label: string; icon: string; gain: string; reaction: 'happy' | 'neutral' | 'sleeping' }> = [
    { action: 'feed', label: 'Feed', icon: '◕', gain: '20', reaction: 'happy' }, { action: 'play', label: 'Play', icon: '✦', gain: '15', reaction: 'happy' }, { action: 'clean', label: 'Clean', icon: '⌁', gain: '25', reaction: 'neutral' }, { action: 'sleep', label: 'Sleep', icon: '☾', gain: '', reaction: 'sleeping' }, { action: 'wake', label: 'Wake', icon: '☀', gain: '', reaction: 'happy' }
  ];
  readonly story = computed(() => { const pet = this.response()?.pet; if (!pet) return ''; const copy = { happy: 'A bright little glow follows every step.', hungry: 'A tiny tummy is asking for something warm.', sad: 'A little gentleness would go a long way.', sleeping: 'Soft dreams are restoring a little world.', sick: 'ORIO needs a patient, caring day.', neutral: 'A quiet moment in a world made for two.' }; return copy[pet.status]; });

  constructor() {
    const clock = window.setInterval(() => this.now.set(Date.now()), 1_000);
    const markOffline = () => this.view.set('offline');
    const reconnect = () => this.load();
    window.addEventListener('offline', markOffline);
    window.addEventListener('online', reconnect);
    this.destroyRef.onDestroy(() => { window.clearInterval(clock); window.removeEventListener('offline', markOffline); window.removeEventListener('online', reconnect); });
    this.load();
    effect(() => { if (this.now() && this.toast()) { /* keeps countdown bindings reactive */ } });
  }

  load(): void {
    this.busy.set(true);
    this.api.current().subscribe({ next: (data) => { this.response.set(data); this.view.set('dashboard'); this.busy.set(false); }, error: (error: { status?: number }) => { this.busy.set(false); this.view.set(error.status === 404 ? 'adoption' : 'offline'); } });
  }

  adopt(): void {
    const name = this.name.trim();
    if (name.length < 2) return;
    this.busy.set(true); this.adoptionError.set('');
    this.api.adopt({ name }).subscribe({ next: (data) => { this.response.set(data); this.view.set('dashboard'); this.busy.set(false); this.showToast(`Welcome home, ${data.pet.name}.`); }, error: (error: { error?: { message?: string } }) => { this.busy.set(false); this.adoptionError.set(error.error?.message ?? 'That name could not be saved. Please try again.'); } });
  }

  doAction(action: PetAction): void {
    if (this.busy() || !this.response()) return;
    this.busy.set(true);
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
    this.api.action(action, id).subscribe({ next: (data) => { this.response.set(data); this.busy.set(false); this.reaction.set(this.actions.find((item) => item.action === action)?.reaction ?? null); this.showToast(data.message); window.setTimeout(() => this.reaction.set(null), 1_700); }, error: (error: { error?: { message?: string } }) => { this.busy.set(false); this.showToast(error.error?.message ?? 'That action is not available yet.'); } });
  }

  actionDisabled(action: PetAction, data: PetResponse): boolean { if (this.busy()) return true; if (action === 'wake') return !data.pet.isSleeping; if (action === 'sleep') return data.pet.isSleeping; return data.pet.isSleeping || !!this.cooldownText(action, data); }
  cooldownText(action: PetAction, data: PetResponse): string | null { this.now(); return formatRemaining(data.cooldowns[action]); }
  actionHint(action: PetAction, data: PetResponse): string { if (action === 'wake') return data.pet.isSleeping ? 'End a cozy nap' : 'Already awake'; if (action === 'sleep') return data.pet.isSleeping ? 'Already dreaming' : 'Restore energy'; const remaining = this.cooldownText(action, data); return remaining ? `Ready in ${remaining}` : ({ feed: 'A nourishing bite', play: 'A joyful burst', clean: 'Fresh & tidy' } as Record<string, string>)[action]; }
  emotionLabel(status: string): string { return ({ happy: 'Feeling radiant', hungry: 'A little hungry', sad: 'Needs some care', sleeping: 'Sleeping soundly', sick: 'Under the weather', neutral: 'A calm little day' } as Record<string, string>)[status] ?? 'A calm little day'; }
  ageLabel(minutes: number): string { return minutes < 1 ? 'Just adopted' : minutes < 60 ? `${minutes} min old` : `${Math.floor(minutes / 60)}h old`; }
  private showToast(message: string): void { this.toast.set(message); window.setTimeout(() => this.toast.set(null), 3_500); }
}
