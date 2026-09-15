import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from './core/services/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  host: { class: 'block' },
  template: `<router-outlet></router-outlet>`
})
export class AppComponent {
  constructor() {
    inject(LanguageService);
  }
}
