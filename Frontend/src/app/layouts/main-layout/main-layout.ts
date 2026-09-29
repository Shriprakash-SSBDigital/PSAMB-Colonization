import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: false,
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
})
export class MainLayout {
  private readonly router = inject(Router);

  private readonly hiddenLayoutPaths = new Set([
    '/auth/login',
    '/auth/register',
    '/login',
    '/new-login',
    '/new-signup',
  ]);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(
        (event): event is NavigationEnd =>
          event instanceof NavigationEnd
      ),
      map((event) => event.urlAfterRedirects),
      startWith(this.getInitialUrl()),
    ),
    {
      initialValue: this.getInitialUrl()
    },
  );

  protected get showPublicNavbar(): boolean {
    const url = this.currentUrl() ?? '/';
    return !this.isDashboardRoute(url);
  }

  protected get showPublicFooter(): boolean {
    const url = this.currentUrl() ?? '/';
    const isDashboardRoute = this.isDashboardRoute(url);
    const isHiddenAuthRoute =
      Array.from(this.hiddenLayoutPaths).some(
        (path) =>
          url === path ||
          url.startsWith(`${path}/`)
      );

    return !isDashboardRoute && !isHiddenAuthRoute;
  }

  private getInitialUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.pathname}${window.location.search}`;
    }

    return this.router.url;
  }

  private isDashboardRoute(url: string): boolean {
    const path = url
      .split(/[?#]/, 1)[0]
      .toLowerCase();
    const dashboardRoutes = [
      '/dashboard',
      '/register-property',
      '/property-bidder-registration',
      '/property-verification',
      '/profile',
      '/user-verification',
      '/verification',
      '/registration-status',
      '/property-details',
      '/dashboard-citizen-services',
      '/role-management',
      '/online-payment-details',
      '/coming-soon',
      '/deo-verification-view',
      '/mandi-wise-allotment-summary',
      '/plot-wise-consolidate-details',
      '/property-ownership-verification',
      '/application-status',
    ];
    return dashboardRoutes.some(
      (route) =>
        path === route ||
        path.startsWith(`${route}/`)
    );
  }
}
