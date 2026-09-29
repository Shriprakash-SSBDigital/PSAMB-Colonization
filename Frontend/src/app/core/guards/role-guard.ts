import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): boolean | UrlTree {

    const requiredRoles: string[] | undefined = route.data?.['roles'];

    // No roles constraint declared → pass through
    if (!requiredRoles || !Array.isArray(requiredRoles) || requiredRoles.length === 0) {
      return true;
    }

    const userRoles = this.getUserRoles();

    const hasAccess = userRoles.some((userRole) =>
      requiredRoles.some(
        (required) => required.trim().toLowerCase() === userRole.trim().toLowerCase()
      )
    );

    if (hasAccess) {
      return true;
    }

    //4. Deny access
    console.warn(
      `[RoleGuard] Access denied. User roles: [${userRoles.join(', ')}]. ` +
      `Required roles: [${requiredRoles.join(', ')}]`
    );
    return this.router.createUrlTree(['/coming-soon']);
  }

  private getUserRoles(): string[] {
    // Source 1 — JWT token claims
    const fromToken = this.getRolesFromToken();
    if (fromToken.length) return fromToken;

    // Source 2 — cp_menus cached profile (set by MenuService after /Auth/profile)
    const fromMenus = this.getRolesFromCpMenus();
    if (fromMenus.length) return fromMenus;

    // Source 3 — cp_session (set during login flow)
    const fromSession = this.getRolesFromCpSession();
    if (fromSession.length) return fromSession;

    return [];
  }

  // Extracts role(s) from the JWT payload.
  private getRolesFromToken(): string[] {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return [];

      const payload = JSON.parse(atob(token.split('.')[1]));

      // .NET / Azure AD style claims
      const raw =
        payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
        ?? payload['role']
        ?? payload['Role']
        ?? payload['roles']
        ?? payload['Roles'];

      return this.toStringArray(raw);
    } catch {
      return [];
    }
  }

  /** Extracts role(s) from cp_menus (stored by MenuService). */
  private getRolesFromCpMenus(): string[] {
    try {
      const raw = sessionStorage.getItem('cp_menus');
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      // Supports both { profile: { roles: [...] } } and { roles: [...] }
      const roles = parsed?.profile?.roles ?? parsed?.roles;
      return this.toStringArray(roles);
    } catch {
      return [];
    }
  }

  /** Extracts role(s) from cp_session (stored during login). */
  private getRolesFromCpSession(): string[] {
    try {
      const raw = sessionStorage.getItem('cp_session');
      if (!raw) return [];

      const session = JSON.parse(raw);
      const role = session?.role ?? session?.userRole ?? session?.roles;
      return this.toStringArray(role);
    } catch {
      return [];
    }
  }

  private toStringArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  }
}

