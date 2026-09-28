import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type ApiPet, type PetSpeciesSlug } from '@orio/contracts';

type PetExpression = 'neutral' | 'happy' | 'hungry' | 'sad' | 'sleeping' | 'sick';
type PetReaction = 'feed' | 'play' | null;

@Component({
  selector: 'orio-pet-mascot', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display:block; } .pet-stage { position:relative; isolation:isolate; }
    .pet-mascot { display:block; width:100%; height:auto; transform-origin:50% 82%; animation:pet-breathe 3.6s ease-in-out infinite; }
    .spark { position:absolute; border-radius:50%; z-index:-1; animation:pet-float 4s ease-in-out infinite; }
    .spark-one { top:26%; left:8%; width:13px; height:13px; background:#f0bf84; } .spark-two { top:13%; right:14%; width:9px; height:9px; background:#d9b9de; animation-delay:1.1s; } .spark-three { right:4%; bottom:22%; width:7px; height:7px; background:#a9c8b0; animation-delay:2.3s; }
    .happy .pet-mascot { animation:pet-hop 1.7s ease-in-out infinite; } .hungry .pet-mascot { animation:pet-hungry 1.2s ease-in-out infinite; } .sleeping .pet-mascot { animation:pet-sleep 4s ease-in-out infinite; } .sick .pet-mascot { animation:pet-sick 1.5s ease-in-out infinite; }
    .reaction-feed .pet-mascot { animation:pet-nibble .46s ease-in-out 3; } .reaction-play .pet-mascot { animation:pet-play .42s ease-in-out 4; }
    @keyframes pet-breathe { 50% { transform:scale(1.025,.985) translateY(2px); } } @keyframes pet-float { 50% { transform:translateY(-13px); } } @keyframes pet-hop { 25% { transform:translateY(-11px) rotate(2deg); } 50% { transform:translateY(0); } 75% { transform:translateY(-6px) rotate(-2deg); } } @keyframes pet-hungry { 50% { transform:translateX(-2px) scale(.99); } } @keyframes pet-sleep { 50% { transform:rotate(2deg) translateY(4px); } } @keyframes pet-sick { 25%,75% { transform:rotate(-2deg); } 50% { transform:rotate(2deg); } } @keyframes pet-nibble { 50% { transform:translateY(7px) scaleY(.96); } } @keyframes pet-play { 50% { transform:translateY(-15px) rotate(6deg); } }
    @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:.001ms!important; animation-iteration-count:1!important; } }
  `],
  template: `
    <div class="mascot-stage pet-stage" [class]="classes()" [attr.aria-label]="label()" role="img">
      <span class="spark spark-one"></span><span class="spark spark-two"></span><span class="spark spark-three"></span>
      <img class="pet-mascot" [src]="source()" alt="" aria-hidden="true">
    </div>
  `
})
export class PetMascotComponent {
  readonly pet = input<ApiPet | null>(null);
  readonly speciesOverride = input<PetSpeciesSlug | null>(null);
  readonly overrideExpression = input<PetExpression | null>(null);
  readonly reaction = input<PetReaction>(null);
  readonly species = computed<PetSpeciesSlug>(() => this.speciesOverride() ?? (this.pet()?.species.slug as PetSpeciesSlug) ?? 'orio');
  readonly status = computed<PetExpression>(() => this.overrideExpression() ?? this.pet()?.status ?? 'happy');
  readonly source = computed(() => `/assets/pets/${this.species()}.svg`);
  readonly classes = computed(() => `mascot-stage pet-stage ${this.species()} ${this.status()}${this.reaction() ? ` reaction-${this.reaction()}` : ''}`);
  readonly label = computed(() => `${this.pet()?.name ?? this.species()} looks ${this.status()}`);
}
