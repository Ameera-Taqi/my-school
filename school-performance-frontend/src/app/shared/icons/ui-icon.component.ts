import { AfterContentInit, Component, ElementRef, Input, booleanAttribute, inject } from '@angular/core';
import { uiconClass } from './uicon-map';

/**
 * Flaticon Uicons (https://www.flaticon.com/uicons/interface-icons).
 * Usage: <app-ui-icon name="home"></app-ui-icon>
 * Also accepts legacy Material names via `name`.
 */
@Component({
  selector: 'app-ui-icon',
  standalone: true,
  template: `<i [class]="iconClass" aria-hidden="true"></i>`,
  host: {
    'class': 'app-ui-icon',
    '[class.solid]': 'solid',
    '[attr.aria-hidden]': 'true',
    'role': 'img'
  },
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25em;
      height: 1.25em;
      font-size: 1.25rem;
      line-height: 1;
      flex-shrink: 0;
      color: inherit;
      vertical-align: middle;
      speak: never;
    }
    :host(.sm) { font-size: 1rem; }
    :host(.md) { font-size: 1.15rem; }
    :host(.lg) { font-size: 1.5rem; }
    :host(.xl) { font-size: 1.75rem; }
    i {
      font-size: 1em !important;
      line-height: 1 !important;
      width: 1em;
      height: 1em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    i::before { line-height: 1; }
  `]
})
export class UiIconComponent implements AfterContentInit {
  private readonly host = inject(ElementRef<HTMLElement>);

  private _name = '';
  iconClass = 'fi fi-rr-apps';

  @Input()
  set name(v: string | null | undefined) {
    this._name = (v ?? '').trim();
    this.refresh();
  }
  get name(): string { return this._name; }

  @Input({ transform: booleanAttribute }) solid = false;

  ngAfterContentInit(): void {
    if (!this._name) {
      const text = (this.host.nativeElement.textContent || '').trim();
      if (text) {
        this._name = text;
        const nodes = Array.from(this.host.nativeElement.childNodes) as ChildNode[];
        for (const node of nodes) {
          if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
        }
        this.refresh();
      }
    }
  }

  private refresh(): void {
    this.iconClass = uiconClass(this._name || 'apps', this.solid);
  }
}
