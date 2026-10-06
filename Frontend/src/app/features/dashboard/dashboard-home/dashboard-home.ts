import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MenuService, SubMenuItem } from '../../../core/service/MenuService/menu.service';

export interface DashboardStats {
  totalProperties: number;
  soldProperties: number;
  unsoldProperties: number;
  digitizedProperties: number;
  forfeitedProperties: number;
  monthlyCollection: number;
  monthlyDues: number;
  ndcIssuedTillDate: number;
}

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule],
  standalone: true,
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome implements OnInit {
  isLoggedIn = true;

  totalProperties = 29360;
  soldProperties = 21557;
  unsoldProperties = 2739;
  digitizedProperties = 21557;
  forfeitedProperties = 15;
  monthlyCollection = 4285000;
  monthlyDues = 1840000;
  ndcIssuedTillDate = 348;

  collection = '42,85,000';
  dues = '18,40,000';
  ndcissued = '348';

  currentDate = new Date();

  loggedInUser: {
    userId?: string;
    fullName?: string;
    userName?: string;
    entityType?: string;
  } = {};

  availableServices: SubMenuItem[] = [];

  constructor(private menuService: MenuService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.extractUserFromStorage();
    this.menuService.menus$.subscribe({
      next: (menus) => {
        this.availableServices = this.flattenServices(menus);
        this.cdr.detectChanges();
      },
      error: () => {
        this.availableServices = [];
        this.cdr.detectChanges();
      }
    });

    this.menuService.profile$.subscribe((profile) => {
      if (profile) {
        this.loggedInUser = {
          userId: profile.id ?? profile.userId ?? this.loggedInUser.userId ?? '',
          fullName: profile.fullName ?? profile.name ?? profile.userName ?? this.loggedInUser.fullName ?? 'Officer',
          userName: profile.userName ?? this.loggedInUser.userName ?? '',
          entityType: profile.entityType ?? (Array.isArray(profile.roles) && profile.roles.length ? profile.roles[0] : '') ?? (typeof profile.roles === 'string' ? profile.roles : this.loggedInUser.entityType ?? ''),
        };
        this.cdr.detectChanges();
      }
    });
  }
  getUserRoles(): string[] {
    const roles: string[] = [];
    if (this.loggedInUser.entityType) {
      roles.push(this.loggedInUser.entityType);
    }

    // 1. JWT token claims
    try {
      const token = sessionStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const raw = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
          ?? payload['role'] ?? payload['Role'] ?? payload['roles'] ?? payload['Roles'];
        if (Array.isArray(raw)) roles.push(...raw);
        else if (typeof raw === 'string') roles.push(raw);
      }
    } catch { }

    try {
      const raw = sessionStorage.getItem('cp_menus');
      if (raw) {
        const parsed = JSON.parse(raw);
        const r = parsed?.profile?.roles ?? parsed?.roles ?? parsed?.profile?.entityType;
        if (Array.isArray(r)) roles.push(...r);
        else if (typeof r === 'string') roles.push(r);
      }
    } catch { }

    // 3. cp_session stored during login
    try {
      const raw = sessionStorage.getItem('cp_session');
      if (raw) {
        const session = JSON.parse(raw);
        const r = session?.role ?? session?.userRole ?? session?.roles ?? session?.entityType;
        if (Array.isArray(r)) roles.push(...r);
        else if (typeof r === 'string') roles.push(r);
      }
    } catch { }

    return Array.from(new Set(roles.map(r => r.trim()).filter(Boolean)));
  }

  get isClerkOrAbove(): boolean {
    const roles = this.getUserRoles();
    const entity = (this.loggedInUser?.entityType || '').trim().toLowerCase();
    const allRoleStrings = [...roles, entity].map(r => r.toLowerCase().trim()).filter(Boolean);

    // Explicit check for clerk or higher roles
    const isOfficer = allRoleStrings.some(r =>
      r.includes('clerk') ||
      r.includes('senior assistant') ||
      r.includes('superintendent') ||
      r.includes('supritendent') ||
      r.includes('deputy director') ||
      r.includes('director') ||
      r.includes('admin') ||
      r.includes('officer')
    );

    if (isOfficer) {
      return true;
    }

    // Explicit check for excluded roles (User, DEO)
    const isUserOrDeo = allRoleStrings.some(r =>
      r === 'user' || r === 'deo' || r.includes('data entry') || r === 'bidder' || r === 'citizen'
    );

    if (isUserOrDeo) {
      return false;
    }

    if (entity) {
      return entity !== 'user' && entity !== 'deo' && !entity.includes('data entry');
    }

    return true;
  }

  get totalMonthlyDemand(): number {
    return this.monthlyCollection + this.monthlyDues;
  }

  get collectionRecoveryRate(): number {
    const total = this.totalMonthlyDemand;
    return total ? Math.round((this.monthlyCollection / total) * 100) : 0;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  }

  formatCurrencyShort(value: number): string {
    if (value >= 10000000) {
      return '₹ ' + (value / 10000000).toFixed(2) + ' Cr';
    }
    if (value >= 100000) {
      return '₹ ' + (value / 100000).toFixed(2) + ' Lakhs';
    }
    return this.formatCurrency(value);
  }

  private extractUserFromStorage(): void {
    try {
      const rawSession = sessionStorage.getItem('cp_session');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        this.loggedInUser = {
          userId: session.userId || session.id || '',
          fullName: session.fullName || session.name || session.userName || '',
          userName: session.userName || session.email || '',
          entityType: session.role || session.userRole || session.entityType || ''
        };
      }
    } catch { }
  }

  private flattenServices(menus: any[]): SubMenuItem[] {
    return menus?.flatMap((menu) => (menu.subMenus ?? []).map((sub: SubMenuItem) => sub)) ?? [];
  }
}
