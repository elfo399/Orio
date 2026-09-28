import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type ApiPet } from '@orio/contracts';
import { PetMascotComponent } from './pet-mascot.component.js';

@Component({
  selector: 'orio-egg-hatch', standalone: true, imports: [PetMascotComponent], changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display:block; } .hatch-stage { position:relative; width:min(330px,100%); margin:12px auto -14px; min-height:300px; display:grid; place-items:center; } .mystery-egg { width:100%; overflow:visible; animation:egg-sway 4s ease-in-out infinite; } .egg-shell { transform-origin:150px 210px; } .egg-cracks { opacity:0; transform-origin:150px 150px; }
    .hatching .mystery-egg { animation:egg-shake .12s linear infinite; } .hatching .egg-cracks { opacity:1; animation:cracks-grow 1.1s ease-out forwards; } .hatching .egg-shell { animation:egg-open 1.2s .4s ease-in forwards; } .revealed { animation:hatch-in .55s ease-out both; } .revealed orio-pet-mascot { width:100%; z-index:2; } .hatch-glow { position:absolute; width:72%; aspect-ratio:1; border-radius:50%; background:radial-gradient(circle,#fffbe8 0,rgba(255,246,197,.8) 28%,transparent 70%); animation:hatch-glow .9s ease-out both; } .particle { position:absolute; width:12px; height:12px; border-radius:50%; z-index:3; animation:particle-burst 1s ease-out both; } .particle-one { background:#f2b88f; left:17%; top:31%; } .particle-two { background:#d9b9de; right:15%; top:23%; animation-delay:.08s; } .particle-three { background:#a9c8b0; right:23%; bottom:20%; animation-delay:.13s; }
    @keyframes egg-sway { 50% { transform:rotate(3deg) translateY(-3px); } } @keyframes egg-shake { 25% { transform:translateX(-5px) rotate(-3deg); } 75% { transform:translateX(5px) rotate(3deg); } } @keyframes cracks-grow { from { transform:scale(.45); } to { transform:scale(1.15); } } @keyframes egg-open { to { opacity:0; transform:scale(1.22) translateY(15px); } } @keyframes hatch-in { from { transform:scale(.7); opacity:0; } to { transform:scale(1); opacity:1; } } @keyframes hatch-glow { from { transform:scale(.25); opacity:0; } to { transform:scale(1.4); opacity:0; } } @keyframes particle-burst { from { transform:translate(0,0) scale(0); opacity:1; } to { transform:translate(28px,-42px) scale(1.1); opacity:0; } }
    @media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:.001ms!important; animation-iteration-count:1!important; } }
  `],
  template: `
    <div class="hatch-stage" [class.hatching]="hatching()" [class.revealed]="!!pet()" aria-live="polite">
      @if (pet(); as newborn) {
        <span class="hatch-glow"></span><span class="particle particle-one"></span><span class="particle particle-two"></span><span class="particle particle-three"></span>
        <orio-pet-mascot [pet]="newborn" [overrideExpression]="'happy'"/>
      } @else {
        <svg class="mystery-egg" viewBox="0 0 300 300" role="img" aria-label="A mysterious egg waiting to hatch">
          <ellipse cx="150" cy="266" rx="72" ry="12" fill="#d5c5b7" opacity=".45"/>
          <g class="egg-shell"><path d="M150 35C97 35 73 113 79 168C85 224 114 252 150 252C186 252 215 224 221 168C227 113 203 35 150 35Z" fill="#fff8e8" stroke="#4c765d" stroke-width="7" stroke-linejoin="round"/><path d="M89 168C119 149 125 181 150 164C177 145 190 174 212 160L219 195C200 227 176 242 150 242C124 242 100 227 81 195Z" fill="#d9b9de"/><path d="M98 123c20-18 35 4 52-13 18-17 33 5 52-13" stroke="#aed7e5" stroke-width="16" stroke-linecap="round"/><circle cx="119" cy="87" r="7" fill="#f2b88f"/><circle cx="181" cy="87" r="7" fill="#f2b88f"/></g>
          <g class="egg-cracks"><path d="m150 91-11 34 15 18-19 28M154 143l17-17 5 25 17 13" stroke="#4c765d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>
        </svg>
      }
    </div>
  `
})
export class EggHatchComponent {
  readonly hatching = input(false);
  readonly pet = input<ApiPet | null>(null);
}
