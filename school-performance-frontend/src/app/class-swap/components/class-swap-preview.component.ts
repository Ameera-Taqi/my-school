import { Component, Input } from '@angular/core';
import { ClassSwapSide } from '../services/class-swap-api.service';

@Component({
  selector: 'app-class-swap-preview',
  standalone: true,
  template: `
    <div class="swap-preview">
      <section>
        <h3>قبل</h3>
        <div class="swap-preview__pair">
          <article>
            <p class="swap-preview__who">{{ beforeA.teacherName }}</p>
            <p>الحصة {{ beforeA.period }} · {{ beforeA.periodTime }}</p>
            <p>{{ beforeA.subject }}</p>
            <p>{{ beforeA.className }}</p>
          </article>
          <article>
            <p class="swap-preview__who">{{ beforeB.teacherName }}</p>
            <p>الحصة {{ beforeB.period }} · {{ beforeB.periodTime }}</p>
            <p>{{ beforeB.subject }}</p>
            <p>{{ beforeB.className }}</p>
          </article>
        </div>
      </section>
      <section>
        <h3>بعد</h3>
        <div class="swap-preview__pair">
          <article class="is-after">
            <p class="swap-preview__who">{{ afterA.teacherName }}</p>
            <p>الحصة {{ afterA.period }} · {{ afterA.periodTime }}</p>
            <p>{{ afterA.subject }}</p>
            <p>{{ afterA.className }}</p>
          </article>
          <article [class.is-after]="!afterB.cancelled" [class.is-cancelled]="!!afterB.cancelled">
            <p class="swap-preview__who">{{ afterB.teacherName }}</p>
            @if (afterB.cancelled) {
              <p class="swap-preview__cancelled">ملغاة لهذا اليوم</p>
              <p>{{ afterB.subject }} · {{ afterB.className }}</p>
            } @else {
              <p>الحصة {{ afterB.period }} · {{ afterB.periodTime }}</p>
              <p>{{ afterB.subject }}</p>
              <p>{{ afterB.className }}</p>
            }
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .swap-preview { display: grid; gap: 0.85rem; }
    @media (min-width: 800px) { .swap-preview { grid-template-columns: 1fr 1fr; } }
    h3 { margin: 0 0 0.55rem; font-size: 0.92rem; font-weight: 800; }
    .swap-preview__pair { display: grid; gap: 0.55rem; }
    article {
      padding: 0.75rem 0.85rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.85rem;
      background: #fff;
    }
    article.is-after { border-color: #c7d2fe; background: #eef2ff; }
    article.is-cancelled { border-color: #fecdd3; background: #fff1f2; }
    p { margin: 0; font-size: 0.84rem; line-height: 1.55; }
    .swap-preview__who { font-weight: 800; }
    .swap-preview__cancelled { color: #be123c; font-weight: 800; }
  `]
})
export class ClassSwapPreviewComponent {
  @Input({ required: true }) beforeA!: ClassSwapSide;
  @Input({ required: true }) beforeB!: ClassSwapSide;
  @Input({ required: true }) afterA!: ClassSwapSide;
  @Input({ required: true }) afterB!: ClassSwapSide;
}
