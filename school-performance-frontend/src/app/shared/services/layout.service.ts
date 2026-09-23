import { Injectable, computed, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const COLLAPSED_KEY = 'sp_sidebar_collapsed';

/** Shared sidebar/layout state: mobile drawer, desktop mini mode, collapsed sections. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly breakpoints = inject(BreakpointObserver);

  /** True below 960px: the sidebar becomes an overlay drawer. */
  readonly isMobile = toSignal(
    this.breakpoints.observe('(max-width: 959px)').pipe(map(state => state.matches)),
    { initialValue: typeof window !== 'undefined' && window.innerWidth < 960 }
  );

  /** Drawer open state (mobile only). */
  readonly drawerOpen = signal(false);

  /** Desktop mini (icons only) mode. */
  readonly collapsed = signal(readBool(COLLAPSED_KEY, false));

  /** Section title keys the user has expanded in this session. Submenus start folded. */
  private readonly openSections = signal<Set<string>>(new Set());

  readonly sidebarMode = computed(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidebarOpened = computed(() => (this.isMobile() ? this.drawerOpen() : true));

  toggleDrawer(): void { this.drawerOpen.update(v => !v); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
    write(COLLAPSED_KEY, String(this.collapsed()));
  }

  isSectionOpen(key: string): boolean {
    return this.openSections().has(key);
  }

  toggleSection(key: string): void {
    const next = new Set(this.openSections());
    if (next.has(key)) next.delete(key); else next.add(key);
    this.openSections.set(next);
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === 'true'; } catch { return fallback; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
