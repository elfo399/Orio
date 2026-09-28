import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type ApiPet, type PetSpeciesSlug } from '@orio/contracts';

type PetExpression = 'neutral' | 'happy' | 'hungry' | 'sad' | 'sleeping' | 'sick';
type PetReaction = 'feed' | 'play' | null;

@Component({
  selector: 'orio-pet-mascot', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display:block; } .pet-stage { position:relative; isolation:isolate; } .pet-mascot { display:block; width:100%; overflow:visible; }
    .pet-body,.pet-face { transform-origin:150px 210px; animation:pet-breathe 3.6s ease-in-out infinite; } .shadow { transform-origin:150px 263px; animation:pet-shadow 3.6s ease-in-out infinite; }
    .pet-eye { transform-box:fill-box; transform-origin:center; animation:pet-blink 5.2s ease-in-out infinite; } .spark { position:absolute; border-radius:50%; z-index:-1; animation:pet-float 4s ease-in-out infinite; }
    .spark-one { top:26%; left:8%; width:13px; height:13px; background:#f0bf84; } .spark-two { top:13%; right:14%; width:9px; height:9px; background:#d9b9de; animation-delay:1.1s; } .spark-three { right:4%; bottom:22%; width:7px; height:7px; background:#a9c8b0; animation-delay:2.3s; }
    .happy-mouth,.sad-mouth,.hungry-mouth,.sleep-mark,.sick-mark,.zzz { display:none; } .happy .happy-mouth,.sad .sad-mouth,.sick .sad-mouth,.hungry .hungry-mouth,.sleeping .sleep-mark,.sleeping .zzz,.sick .sick-mark { display:block; }
    .happy .neutral-mouth,.sad .neutral-mouth,.sick .neutral-mouth,.hungry .neutral-mouth,.sleeping .neutral-mouth { display:none; } .sleeping .pet-eye,.sleeping .pet-face circle[fill='white'] { opacity:0; }
    .happy .pet-body,.happy .pet-face { animation:pet-hop 1.7s ease-in-out infinite; } .hungry .pet-body,.hungry .pet-face { animation:pet-hungry 1.2s ease-in-out infinite; } .sleeping .pet-body,.sleeping .pet-face { animation:pet-sleep 4s ease-in-out infinite; } .sick .pet-body,.sick .pet-face { animation:pet-sick 1.5s ease-in-out infinite; }
    .reaction-feed .pet-body,.reaction-feed .pet-face { animation:pet-nibble .46s ease-in-out 3; } .reaction-play .pet-body,.reaction-play .pet-face { animation:pet-play .42s ease-in-out 4; }
    @keyframes pet-breathe { 50% { transform:scale(1.025,.985) translateY(2px); } } @keyframes pet-shadow { 50% { transform:scaleX(.9); opacity:.3; } } @keyframes pet-float { 50% { transform:translateY(-13px); } } @keyframes pet-blink { 0%,44%,48%,100% { transform:scaleY(1); } 46% { transform:scaleY(.08); } }
    @keyframes pet-hop { 25% { transform:translateY(-11px) rotate(2deg); } 50% { transform:translateY(0); } 75% { transform:translateY(-6px) rotate(-2deg); } } @keyframes pet-hungry { 50% { transform:translateX(-2px) scale(.99); } } @keyframes pet-sleep { 50% { transform:rotate(2deg) translateY(4px); } } @keyframes pet-sick { 25%,75% { transform:rotate(-2deg); } 50% { transform:rotate(2deg); } } @keyframes pet-nibble { 50% { transform:translateY(7px) scaleY(.96); } } @keyframes pet-play { 50% { transform:translateY(-15px) rotate(6deg); } }
    @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:.001ms!important; animation-iteration-count:1!important; } }
  `],
  template: `
    <div class="mascot-stage pet-stage" [class]="classes()" [attr.aria-label]="label()" role="img">
      <span class="spark spark-one"></span><span class="spark spark-two"></span><span class="spark spark-three"></span>
      <svg class="orio-mascot pet-mascot" viewBox="0 0 300 300" aria-hidden="true">
        <ellipse class="shadow" cx="150" cy="263" rx="76" ry="13" fill="#d5c5b7" opacity=".42"/>
        @switch (species()) {
          @case ('orio') { <g class="pet-body"><path d="M89 117C66 68 84 38 120 74C129 46 171 46 180 74C217 38 235 68 211 117C241 152 223 242 151 249C77 242 59 152 89 117Z" fill="#a9c8b0" stroke="#4c765d" stroke-width="7" stroke-linejoin="round"/><path d="M95 111C82 77 95 62 119 91M205 111C218 77 205 62 181 91" fill="#d9b9de" stroke="#4c765d" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path class="muzzle" d="M105 141C123 127 177 127 195 141L187 211C169 226 131 226 113 211Z" fill="#f6e8d3"/><path d="m143 117 7-12 7 12z" fill="#d59bca"/></g> }
          @case ('rabbit') { <g class="pet-body"><path d="M105 136C82 93 83 39 113 35C137 32 137 91 133 119C144 112 157 112 168 119C164 91 164 32 188 35C218 39 219 93 196 136C224 164 214 240 151 247C87 240 77 164 105 136Z" fill="#aed7e5" stroke="#4c765d" stroke-width="7" stroke-linejoin="round"/><path d="M107 116C97 86 101 56 114 55C126 53 124 98 119 122M193 116C203 86 199 56 186 55C174 53 176 98 181 122" fill="#f2b4c0" stroke="#4c765d" stroke-width="5" stroke-linecap="round"/><ellipse class="muzzle" cx="150" cy="182" rx="57" ry="43" fill="#f6e8d3"/></g> }
          @case ('fox') { <g class="pet-body"><path d="M91 119 81 62 128 92C142 85 158 85 172 92L219 62 209 119C232 154 216 239 151 248C84 239 68 154 91 119Z" fill="#f2ab78" stroke="#4c765d" stroke-width="7" stroke-linejoin="round"/><path d="m88 72 35 22-21 7zM212 72l-35 22 21 7z" fill="#e88971" stroke="#4c765d" stroke-width="4" stroke-linejoin="round"/><path class="muzzle" d="M96 168C111 142 133 137 150 151C167 137 189 142 204 168C194 215 174 230 150 230C126 230 106 215 96 168Z" fill="#f9edd9"/></g> }
          @case ('bear') { <g class="pet-body"><circle cx="103" cy="112" r="34" fill="#beb4d9" stroke="#4c765d" stroke-width="7"/><circle cx="197" cy="112" r="34" fill="#beb4d9" stroke="#4c765d" stroke-width="7"/><path d="M83 156C78 105 109 77 150 89C191 77 222 105 217 156C231 203 202 246 150 249C98 246 69 203 83 156Z" fill="#beb4d9" stroke="#4c765d" stroke-width="7" stroke-linejoin="round"/><circle cx="103" cy="112" r="15" fill="#e6ddef" stroke="#4c765d" stroke-width="4"/><circle cx="197" cy="112" r="15" fill="#e6ddef" stroke="#4c765d" stroke-width="4"/><ellipse class="muzzle" cx="150" cy="191" rx="62" ry="42" fill="#f6e8d3"/></g> }
          @case ('chick') { <g class="pet-body"><path d="M88 166C72 126 96 92 125 99C132 78 145 69 150 69C155 69 168 78 175 99C204 92 228 126 212 166C232 210 197 246 150 249C103 246 68 210 88 166Z" fill="#f6d777" stroke="#4c765d" stroke-width="7" stroke-linejoin="round"/><path d="M132 101C126 79 136 59 150 49C164 59 174 79 168 101" fill="#f0c252" stroke="#4c765d" stroke-width="6" stroke-linecap="round"/><path d="M90 181C72 169 67 149 85 139C102 143 111 156 112 174M210 181C228 169 233 149 215 139C198 143 189 156 188 174" fill="#efc85b" stroke="#4c765d" stroke-width="6" stroke-linejoin="round"/><path d="M138 185 150 177 162 185 150 196z" fill="#e88d55" stroke="#4c765d" stroke-width="4" stroke-linejoin="round"/></g> }
        }
        <g class="pet-face"><ellipse class="pet-eye left-eye" cx="121" cy="164" rx="12" ry="16" fill="#314d3c"/><ellipse class="pet-eye right-eye" cx="179" cy="164" rx="12" ry="16" fill="#314d3c"/><circle cx="118" cy="159" r="3.5" fill="white"/><circle cx="176" cy="159" r="3.5" fill="white"/><circle class="cheek" cx="104" cy="190" r="10" fill="#e9a5a2" opacity=".7"/><circle class="cheek" cx="196" cy="190" r="10" fill="#e9a5a2" opacity=".7"/><path class="neutral-mouth" d="M137 194Q150 201 163 194" fill="none" stroke="#314d3c" stroke-width="5" stroke-linecap="round"/><path class="happy-mouth" d="M133 189Q150 210 167 189" fill="none" stroke="#314d3c" stroke-width="5" stroke-linecap="round"/><path class="sad-mouth" d="M137 204Q150 190 163 204" fill="none" stroke="#314d3c" stroke-width="5" stroke-linecap="round"/><path class="hungry-mouth" d="M139 195Q150 211 161 195Q150 187 139 195Z" fill="#e28a85" stroke="#314d3c" stroke-width="4"/><path class="sleep-mark" d="M109 164h20M171 164h20" stroke="#314d3c" stroke-width="6" stroke-linecap="round"/><path class="sick-mark" d="m188 132 12 12M200 132l-12 12" stroke="#a76b59" stroke-width="5" stroke-linecap="round"/></g>
        <text class="zzz" x="208" y="94" fill="#7e6b92" font-size="27" font-weight="700">Z</text><text class="zzz z-two" x="231" y="69" fill="#7e6b92" font-size="20" font-weight="700">Z</text>
      </svg>
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
  readonly classes = computed(() => `mascot-stage pet-stage ${this.species()} ${this.status()}${this.reaction() ? ` reaction-${this.reaction()}` : ''}`);
  readonly label = computed(() => `${this.pet()?.name ?? this.species()} looks ${this.status()}`);
}
