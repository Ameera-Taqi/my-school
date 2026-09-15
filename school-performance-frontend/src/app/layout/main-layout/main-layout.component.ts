import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { filter } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../shared/services/layout.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent, HeaderComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <mat-sidenav-container
      class="layout"
      [class.collapsed]="layout.collapsed() && !layout.isMobile()"
      [class.mobile]="layout.isMobile()"
      [hasBackdrop]="layout.isMobile()">
      <mat-sidenav
        class="layout-sidenav"
        [mode]="layout.sidebarMode()"
        [opened]="layout.sidebarOpened()"
        [fixedInViewport]="true"
        (closedStart)="layout.closeDrawer()"
        position="start"
        [disableClose]="!layout.isMobile()">
        <app-sidebar [sections]="sidebarSections()" [mini]="layout.collapsed() && !layout.isMobile()"></app-sidebar>
      </mat-sidenav>

      <mat-sidenav-content class="main-area">
        <app-header></app-header>
        <main class="content" id="main-content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .layout {
      height: 100vh;
      background: var(--sp-bg);
    }

    .layout-sidenav.mat-drawer,
    .layout-sidenav.mat-sidenav {
      width: var(--sp-sidebar-width) !important;
      border: none !important;
      border-radius: 0 !important;
      background: transparent !important;
      transition: width 0.2s ease;
    }

    .layout-sidenav .mat-drawer-inner-container {
      border-radius: 0 !important;
      overflow: hidden;
      width: 100%;
    }

    .layout.collapsed .layout-sidenav.mat-drawer,
    .layout.collapsed .layout-sidenav.mat-sidenav {
      width: var(--sp-sidebar-mini) !important;
    }

    /* Material keeps the open-width margin; force it to follow collapse */
    .layout:not(.mobile) .main-area.mat-sidenav-content {
      margin-left: 0 !important;
      margin-right: 0 !important;
      margin-inline-start: var(--sp-sidebar-width) !important;
      margin-inline-end: 0 !important;
      transition: margin-inline-start 0.2s ease;
    }

    .layout.collapsed:not(.mobile) .main-area.mat-sidenav-content {
      margin-inline-start: var(--sp-sidebar-mini) !important;
    }

    .layout.mobile .main-area.mat-sidenav-content {
      margin-left: 0 !important;
      margin-right: 0 !important;
      margin-inline-start: 0 !important;
    }

    .main-area {
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: var(--sp-bg);
    }

    .content {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: 1.5rem;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
    }

    @media (max-width: 959px) {
      .content { padding: 1rem; }
    }
  `]
})
export class MainLayoutComponent implements OnInit {
  private readonly permissionService = inject(PermissionService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly layout = inject(LayoutService);
  readonly sidebarSections = this.permissionService.visibleSidebarSections;

  ngOnInit(): void {
    this.authService.refreshCurrentUser().subscribe();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.layout.closeDrawer());
  }
}
