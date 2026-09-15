import { Direction, Directionality } from '@angular/cdk/bidi';
import { EventEmitter, Injectable, OnDestroy, effect, inject } from '@angular/core';
import { LanguageService } from './language.service';

/** Syncs Angular CDK / Material direction with LanguageService (ar=rtl, en=ltr). */
@Injectable()
export class AppDirectionality implements Directionality, OnDestroy {
  readonly change = new EventEmitter<Direction>();
  private _value: Direction;

  get value(): Direction {
    return this._value;
  }

  constructor() {
    const lang = inject(LanguageService);
    this._value = lang.direction();
    effect(() => {
      const next = lang.direction();
      if (next === this._value) return;
      this._value = next;
      this.change.emit(next);
    });
  }

  ngOnDestroy(): void {
    this.change.complete();
  }
}
