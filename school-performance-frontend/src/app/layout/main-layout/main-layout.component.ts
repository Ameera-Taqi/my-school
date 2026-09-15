import { Component, OnInit, inject } from '@angular/core';
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
  template: `
    <mat-sidenav-container class="layout" [class.collapsed]="layout.collapsed() && !layout.isMobile()" [hasBackdrop]="layout.isMobile()">
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
    .layout-sidenav {
      width: var(--sp-sidebar-width);
      border: none;
      transition: width 0.2s ease;
      background: transparent;
    }
    .layout.collapsed .layout-sidenav { width: var(--sp-sidebar-mini); }
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
    // Close the mobile drawer after navigating.
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.layout.closeDrawer());
  }
}
