import { Injectable, computed, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

const COLLAPSED_KEY = 'sp_sidebar_collapsed';
const SECTIONS_KEY = 'sp_sidebar_sections';

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

  /** Section title keys the user has collapsed. */
  private readonly closedSections = signal<Set<string>>(readSet(SECTIONS_KEY));

  readonly sidebarMode = computed(() => (this.isMobile() ? 'over' : 'side'));
  readonly sidebarOpened = computed(() => (this.isMobile() ? this.drawerOpen() : true));

  toggleDrawer(): void { this.drawerOpen.update(v => !v); }
  closeDrawer(): void { this.drawerOpen.set(false); }

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
    write(COLLAPSED_KEY, String(this.collapsed()));
  }

  isSectionOpen(key: string): boolean {
    return !this.closedSections().has(key);
  }

  toggleSection(key: string): void {
    const next = new Set(this.closedSections());
    if (next.has(key)) next.delete(key); else next.add(key);
    this.closedSections.set(next);
    write(SECTIONS_KEY, JSON.stringify([...next]));
  }

  /** Open the section containing the active route so the highlighted item is visible. */
  ensureSectionOpen(key: string): void {
    if (!this.closedSections().has(key)) return;
    const next = new Set(this.closedSections());
    next.delete(key);
    this.closedSections.set(next);
    write(SECTIONS_KEY, JSON.stringify([...next]));
  }
}

function readBool(key: string, fallback: boolean): boolean {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === 'true'; } catch { return fallback; }
}
function readSet(key: string): Set<string> {
  try { const raw = localStorage.getItem(key); return new Set(raw ? (JSON.parse(raw) as string[]) : []); } catch { return new Set(); }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
