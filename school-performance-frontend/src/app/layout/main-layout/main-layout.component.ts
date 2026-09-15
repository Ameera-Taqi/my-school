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
  `
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
