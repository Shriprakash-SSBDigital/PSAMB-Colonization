import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MenuService, MenuItem } from '../../../core/service/MenuService/menu.service';

@Component({
  selector: 'app-sidebar',
  standalone: false,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  isCollapsed = false;
  menus: MenuItem[] = [];
  isLoading = false;

  constructor(
    private menuService: MenuService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMenus();
  }

  private loadMenus(): void {
    this.isLoading = true;
    this.menuService.fetchMenus(true).subscribe({
      next: (menus) => {
        this.menus = this.sortMenus(menus);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.menus = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private sortMenus(menus: MenuItem[]): MenuItem[] {
    return menus
      .map(menu => ({
        ...menu,
        subMenus: [...(menu.subMenus ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }
}
