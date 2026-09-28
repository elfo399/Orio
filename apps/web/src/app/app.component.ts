import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { type PetAction, type PetResponse } from '@orio/contracts';
import { formatRemaining } from '@orio/shared';
import { AuthService } from './auth.service.js';
import { EggHatchComponent } from './egg-hatch.component.js';
import { PetApiService } from './pet-api.service.js';
import { PetMascotComponent } from './pet-mascot.component.js';

type ViewState = 'loading' | 'adoption' | 'dashboard' | 'offline';
type StatKey = 'satiety' | 'happiness' | 'energy' | 'hygiene' | 'health';
type Expression = 'neutral' | 'happy' | 'hungry' | 'sad' | 'sleeping' | 'sick';

@Component({
  selector: 'orio-dashboard', standalone: true, imports: [FormsModule, NgClass, EggHatchComponent, PetMascotComponent], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell">
      <header class="topbar"><a class="brand" href="/dashboard" aria-label="ORIO home"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 3C9.8 8.2 6.5 14.1 6.5 19.4C6.5 25 10.5 29 16 29s9.5-4 9.5-9.6C25.5 14.1 22.2 8.2 16 3Z" fill="#fff8e8" stroke="#4c765d" stroke-width="2.8"/><path d="M16 9.5c-2.7 2.7-4 5.1-4 7.4 0 2.5 1.7 4.1 4 4.1s4-1.6 4-4.1c0-2.3-1.3-4.7-4-7.4Z" fill="#d9b9de"/><circle cx="16" cy="16.5" r="2.3" fill="#efbf83"/></svg></span><span>ORIO</span></a><div class="profile"><span class="connection" [class.online]="view() === 'dashboard'" [class.offline]="view() === 'offline'"><i></i>{{ view() === 'offline' ? 'Offline' : view() === 'dashboard' ? 'Connected' : 'Connecting' }}</span><button class="profile-button" (click)="logout()"><b>{{ auth.user()?.displayName }}</b><small>{{ auth.user()?.email }}</small><span>Sign out</span></button></div></header>

      @if (view() === 'loading') { <section class="loading"><div class="dot-orbit"><i></i><i></i><i></i></div><p>Waking up your little world...</p></section> }
      @else if (view() === 'offline') { <section class="offline-card card"><orio-pet-mascot [overrideExpression]="'sad'"/><h1>ORIO needs a connection</h1><p>Your pet is safe. Reconnect to see its authoritative, up-to-date world.</p><button class="primary" (click)="load()">Try again</button></section> }
      @else if (view() === 'adoption') {
        <section class="adoption-grid egg-adoption">
          <div class="adoption-hero"><p class="eyebrow">ORIO / YOUR MYSTERY EGG</p><h1>A new little world is about to <em>hatch.</em></h1><p>Your companion is chosen only once the egg opens. Give them a name, then let the magic begin.</p><orio-egg-hatch [hatching]="hatching()" [pet]="hatchedPet()"/></div>
          <form class="adoption-card card" (ngSubmit)="adopt()">
            @if (!hatchedPet()) { <span class="step">01 / HATCH AN EGG</span><h2>What should we call them?</h2><p>Choose a name with 2-24 characters. The creature inside remains a surprise.</p><label for="name">Pet name</label><input id="name" name="name" [(ngModel)]="name" [disabled]="busy()" minlength="2" maxlength="24" required autocomplete="off" placeholder="e.g. Miso"><small [class.error]="adoptionError()">{{ adoptionError() || 'A name makes this world feel like home.' }}</small><button class="primary" [disabled]="busy() || name.trim().length < 2">{{ hatching() ? 'The shell is cracking...' : 'Hatch your egg' }} <span>&rarr;</span></button> }
            @else { <span class="step">02 / WELCOME HOME</span><h2>Welcome to the world, {{ hatchedPet()?.name }}!</h2><p>Your {{ hatchedPet()?.species?.displayName }} is ready for their first little day.</p><button class="primary" type="button" (click)="enterDashboard()">Enter your world <span>&rarr;</span></button> }
          </form>
        </section>
      }
      @else if (response(); as data) {
        <section class="dashboard" [class.sleeping-page]="data.pet.isSleeping">
          <div class="pet-summary"><div><p class="eyebrow">{{ emotionLabel(data.pet.status) }}</p><h1>{{ data.pet.name }}</h1><p class="age">{{ ageLabel(data.pet.ageMinutes) }} &middot; {{ data.pet.species.displayName }}</p></div><button class="refresh" (click)="load()" [disabled]="busy()" aria-label="Refresh pet state">&#8635;</button></div>
          <div class="world card"><div class="world-copy"><p>{{ story() }}</p><span class="mood-pill" [ngClass]="data.pet.status">{{ data.pet.isSleeping ? 'Dreaming' : data.pet.status }}</span></div><orio-pet-mascot [pet]="data.pet" [overrideExpression]="reaction()" [reaction]="reactionAction()"/></div>
          <section class="stats card"><div class="section-heading"><div><p class="eyebrow">Wellbeing</p><h2>How {{ data.pet.name }} feels</h2></div><span class="time-note">Live state</span></div><div class="stats-grid">@for (stat of stats; track stat.key) { <div class="stat"><div class="stat-label"><span>{{ stat.label }}</span><b>{{ data.pet.stats[stat.key] }}<small>/100</small></b></div><div class="meter"><i [style.width.%]="data.pet.stats[stat.key]" [ngClass]="stat.key"></i></div></div> }</div></section>
          <section class="actions"><p class="eyebrow">Care rituals</p><div class="action-grid">@for (item of actions; track item.action) { <button class="action-card card" [class.active-action]="reaction() === item.reaction" [disabled]="actionDisabled(item.action, data)" (click)="doAction(item.action)"><span><b>{{ item.label }}</b><small>{{ actionHint(item.action, data) }}</small></span><strong>{{ item.action === 'sleep' || item.action === 'wake' ? 'Go' : cooldownText(item.action, data) || '+' + item.gain }}</strong></button> }</div></section>
          <p class="hint">{{ data.pet.isSleeping ? 'Rest is important. Wake your companion when you are ready.' : 'Every small act shapes the day.' }}</p>
        </section>
      }
      @if (toast(); as note) { <div class="toast" role="status">{{ note }}</div> }
    </main>
  `
})
export class DashboardComponent {
  private readonly api = inject(PetApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly view = signal<ViewState>('loading');
  readonly response = signal<PetResponse | null>(null);
  readonly busy = signal(false);
  readonly toast = signal<string | null>(null);
  readonly reaction = signal<Expression | null>(null);
  readonly reactionAction = signal<'feed' | 'play' | null>(null);
  readonly now = signal(Date.now());
  readonly adoptionError = signal('');
  readonly hatching = signal(false);
  readonly hatchedPet = signal<PetResponse['pet'] | null>(null);
  name = '';
  readonly stats: Array<{ key: StatKey; label: string }> = [
    { key: 'satiety', label: 'Satiety' }, { key: 'happiness', label: 'Joy' }, { key: 'energy', label: 'Energy' }, { key: 'hygiene', label: 'Hygiene' }, { key: 'health', label: 'Health' }
  ];
  readonly actions: Array<{ action: PetAction; label: string; gain: string; reaction: 'happy' | 'neutral' | 'sleeping' }> = [
    { action: 'feed', label: 'Feed', gain: '20', reaction: 'happy' }, { action: 'play', label: 'Play', gain: '15', reaction: 'happy' }, { action: 'clean', label: 'Clean', gain: '25', reaction: 'neutral' }, { action: 'sleep', label: 'Sleep', gain: '', reaction: 'sleeping' }, { action: 'wake', label: 'Wake', gain: '', reaction: 'happy' }
  ];
  readonly story = computed(() => {
    const pet = this.response()?.pet;
    if (!pet) return '';
    return { happy: 'A bright little glow follows every step.', hungry: 'A tiny tummy is asking for something warm.', sad: 'A little gentleness would go a long way.', sleeping: 'Soft dreams are restoring a little world.', sick: 'Your companion needs a patient, caring day.', neutral: 'A quiet moment in a world made for two.' }[pet.status];
  });

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
    this.api.current().subscribe({ next: (data) => { this.response.set(data); this.view.set('dashboard'); this.busy.set(false); }, error: (error: { status?: number }) => { this.busy.set(false); if (error.status === 401) { this.auth.clear(); void this.router.navigateByUrl('/login'); return; } this.view.set(error.status === 404 ? 'adoption' : 'offline'); } });
  }

  adopt(): void {
    const name = this.name.trim();
    if (name.length < 2 || this.busy()) return;
    this.busy.set(true); this.hatching.set(true); this.adoptionError.set('');
    const hatchStarted = Date.now();
    this.api.adopt({ name }).subscribe({ next: (data) => {
      const reveal = () => { this.response.set(data); this.hatchedPet.set(data.pet); this.hatching.set(false); this.busy.set(false); };
      window.setTimeout(reveal, Math.max(0, 1_250 - (Date.now() - hatchStarted)));
    }, error: (error: { error?: { message?: string } }) => { this.hatching.set(false); this.busy.set(false); this.adoptionError.set(error.error?.message ?? 'The egg needs a moment. Please try again.'); } });
  }

  enterDashboard(): void { this.view.set('dashboard'); this.showToast(`Welcome to the world, ${this.hatchedPet()?.name ?? 'little one'}!`); }

  doAction(action: PetAction): void {
    if (this.busy() || !this.response()) return;
    this.busy.set(true);
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
    this.api.action(action, id).subscribe({ next: (data) => { this.response.set(data); this.busy.set(false); this.reaction.set(this.actions.find((item) => item.action === action)?.reaction ?? null); this.reactionAction.set(action === 'feed' || action === 'play' ? action : null); this.showToast(data.message); window.setTimeout(() => { this.reaction.set(null); this.reactionAction.set(null); }, 1_700); }, error: (error: { error?: { message?: string } }) => { this.busy.set(false); this.showToast(error.error?.message ?? 'That action is not available yet.'); } });
  }

  actionDisabled(action: PetAction, data: PetResponse): boolean { if (this.busy()) return true; if (action === 'wake') return !data.pet.isSleeping; if (action === 'sleep') return data.pet.isSleeping; return data.pet.isSleeping || !!this.cooldownText(action, data); }
  cooldownText(action: PetAction, data: PetResponse): string | null { this.now(); return formatRemaining(data.cooldowns[action]); }
  actionHint(action: PetAction, data: PetResponse): string { if (action === 'wake') return data.pet.isSleeping ? 'End a cozy nap' : 'Already awake'; if (action === 'sleep') return data.pet.isSleeping ? 'Already dreaming' : 'Restore energy'; const remaining = this.cooldownText(action, data); return remaining ? `Ready in ${remaining}` : ({ feed: 'A nourishing bite', play: 'A joyful burst', clean: 'Fresh and tidy' } as Record<string, string>)[action]; }
  emotionLabel(status: string): string { return ({ happy: 'Feeling radiant', hungry: 'A little hungry', sad: 'Needs some care', sleeping: 'Sleeping soundly', sick: 'Under the weather', neutral: 'A calm little day' } as Record<string, string>)[status] ?? 'A calm little day'; }
  ageLabel(minutes: number): string { return minutes < 1 ? 'Just adopted' : minutes < 60 ? `${minutes} min old` : `${Math.floor(minutes / 60)}h old`; }
  logout(): void { this.auth.logout().subscribe({ next: () => { this.auth.clear(); void this.router.navigateByUrl('/login'); }, error: () => { this.auth.clear(); void this.router.navigateByUrl('/login'); } }); }
  private showToast(message: string): void { this.toast.set(message); window.setTimeout(() => this.toast.set(null), 3_500); }
}
