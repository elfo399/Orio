import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type ApiPet } from '@orio/contracts';

@Component({
  selector: 'orio-mascot', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mascot-stage" [class]="'mascot-stage ' + status()" [attr.aria-label]="'ORIO looks ' + status()" role="img">
      <span class="spark spark-one"></span><span class="spark spark-two"></span><span class="spark spark-three"></span>
      <svg class="orio-mascot" viewBox="0 0 300 300" aria-hidden="true">
        <ellipse class="shadow" cx="150" cy="262" rx="78" ry="13" fill="#d5c5b7" opacity=".42"/>
        <g class="body">
          <path d="M89 117C66 68 84 38 120 74C129 46 171 46 180 74C217 38 235 68 211 117C241 152 223 242 151 249C77 242 59 152 89 117Z" fill="#a9c8b0" stroke="#4c765d" stroke-width="7" stroke-linejoin="round"/>
          <path d="M95 111C82 77 95 62 119 91M205 111C218 77 205 62 181 91" fill="#d9b9de" stroke="#4c765d" stroke-width="7" stroke-linecap="round"/>
          <path d="M105 141C123 127 177 127 195 141L187 211C169 226 131 226 113 211Z" fill="#f6e8d3"/>
          <ellipse cx="120" cy="164" rx="12" ry="16" fill="#314d3c" class="eye left-eye"/>
          <ellipse cx="180" cy="164" rx="12" ry="16" fill="#314d3c" class="eye right-eye"/>
          <circle cx="117" cy="159" r="3.5" fill="white"/><circle cx="177" cy="159" r="3.5" fill="white"/>
          <path class="mouth neutral-mouth" d="M137 191Q150 198 163 191" fill="none" stroke="#314d3c" stroke-width="6" stroke-linecap="round"/>
          <path class="mouth happy-mouth" d="M132 188Q150 210 168 188" fill="none" stroke="#314d3c" stroke-width="6" stroke-linecap="round"/>
          <path class="mouth sad-mouth" d="M136 201Q150 187 164 201" fill="none" stroke="#314d3c" stroke-width="6" stroke-linecap="round"/>
          <path class="mouth hungry-mouth" d="M138 193Q150 207 162 193Q150 184 138 193Z" fill="#e28a85" stroke="#314d3c" stroke-width="4"/>
          <path class="sleep-mark" d="M110 160l17 0M173 160l17 0" stroke="#314d3c" stroke-width="6" stroke-linecap="round"/>
          <circle cx="106" cy="186" r="10" fill="#e9a5a2" opacity=".65"/><circle cx="194" cy="186" r="10" fill="#e9a5a2" opacity=".65"/>
          <path d="M143 117l7-12 7 12z" fill="#d59bca"/>
        </g>
        <text class="zzz" x="205" y="87" fill="#7e6b92" font-size="27" font-weight="700">Z</text>
        <text class="zzz z-two" x="229" y="62" fill="#7e6b92" font-size="20" font-weight="700">Z</text>
      </svg>
    </div>
  `
})
export class OrioMascotComponent {
  readonly pet = input<ApiPet | null>(null);
  readonly overrideExpression = input<'neutral' | 'happy' | 'hungry' | 'sad' | 'sleeping' | 'sick' | null>(null);
  readonly status = computed(() => this.overrideExpression() ?? this.pet()?.status ?? 'happy');
}
