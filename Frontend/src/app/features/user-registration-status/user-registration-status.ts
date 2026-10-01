import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PageEvent } from '@angular/material/paginator';
import { Userservice } from '../../core/service/UserService/userservice';

interface RegistrationRecord {
  id: number;
  propertyId: number;
  allotteeCode: string;
  allotteeName: string;
  approvalStatus: 'Approved' | 'Rejected' | 'Pending' | 'Objection' | 'Verified' | string;
  remarks: string;
  rawData?: any;
}

@Component({
  selector: 'app-user-registration-status',
  standalone: true,
  imports: [CommonModule, MatPaginatorModule],
  templateUrl: './user-registration-status.html',
  styleUrl: './user-registration-status.scss',
})
export class UserRegistrationStatus implements OnInit {

  searchText: string = '';
  selectedFilter: string = 'Pending';
  pageIndex = 0;
  pageSize = 10;
  pagedPropertyList: RegistrationRecord[] = [];
  registrationList: RegistrationRecord[] = [];
  filteredList: RegistrationRecord[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private router: Router,
    private _userService: Userservice,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.getRegistrationList();
  }

  getRegistrationList(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this._userService.GetAllUserRegisterPropertyById().subscribe({
      next: (res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          this.registrationList = res.data.map((item: any) => ({
            id:             item.id ?? 0,
            propertyId:     item.propertyId ?? item.id ?? 0,
            allotteeCode:   item.allotteeCode || item.propertyCode || '—',
            allotteeName:   item.currentOwnerName || item.allotteeName || '—',
            approvalStatus: item.applicationStatusName || (item.status === 1 ? 'Pending' : (item.status === 2 || item.status === 3 || item.status === 4 ? 'Verified' : (item.status === 7 ? 'Objection' : 'Pending'))),
            remarks:        item.remarks ?? '',
            rawData:        item,
          }));
        } else {
          this.registrationList = [];
        }
        this.applyFilters();
        this.updatePagedList();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching registration list:', err);
        this.errorMessage = 'Failed to load records. Please try again.';
        this.registrationList = [];
        this.filteredList = [];
        this.pagedPropertyList = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.updatePagedList();
    this.cdr.detectChanges();
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.updatePagedList();
    this.cdr.detectChanges();
  }

  setStatusFilter(status: string): void {
    this.selectedFilter = status;
    this.pageIndex = 0;
    this.applyFilters();
    this.updatePagedList();
    this.cdr.detectChanges();
  }

  private applyFilters(): void {
    const term = (this.searchText || '').trim().toLowerCase();
    const filterStatus = (this.selectedFilter || '').trim().toLowerCase();

    this.filteredList = this.registrationList.filter(item => {
      const matchesSearch =
        term === '' ||
        (item.allotteeCode || '').toLowerCase().includes(term) ||
        (item.allotteeName || '').toLowerCase().includes(term);

      const itemStatus = (item.approvalStatus || '').trim().toLowerCase();

      let matchesStatus: boolean;
      if (filterStatus === '') {
        matchesStatus = true;
      } else if (filterStatus === 'approved/verified') {
        matchesStatus = itemStatus.includes('approved') || itemStatus.includes('verified');
      } else {
        matchesStatus = itemStatus.includes(filterStatus);
      }

      return matchesSearch && matchesStatus;
    });
  }

  getTotalCount(): number {
    return this.registrationList.length;
  }

  getPendingCount(): number {
    return this.registrationList.filter(item =>
      (item.approvalStatus || '').trim().toLowerCase().includes('pending')
    ).length;
  }

  getObjectionCount(): number {
    return this.registrationList.filter(item =>
      (item.approvalStatus || '').trim().toLowerCase().includes('objection')
    ).length;
  }

  getApprovedOrVerifiedCount(): number {
    return this.registrationList.filter(item => {
      const s = (item.approvalStatus || '').trim().toLowerCase();
      return s.includes('approved') || s.includes('verified');
    }).length;
  }

  getStatusClass(status: string | null | undefined): string {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('objection'))                        return 'status-objection';
    if (s.includes('reject'))                           return 'status-rejected';
    if (s.includes('verified') || s.includes('clerk')) return 'status-verified';
    if (s.includes('approved'))                         return 'status-approved';
    if (s.includes('pending'))                          return 'status-pending';
    return 'status-default';
  }

  onView(item: RegistrationRecord): void {
    this.router.navigate(['/user-verification'], {
      queryParams: {
        mode:           'view',
        propertyCode:   item.allotteeCode,
        id:             item.id || item.propertyId,
        approvalStatus: item.approvalStatus || '',
        remarks:        item.remarks || ''
      },
      state: {
        registrationData: item.rawData || item
      }
    });
  }

  onEdit(item: RegistrationRecord): void {
    this.router.navigate(['/register-property'], {
      queryParams: {
        mode:         'edit',
        propertyCode: item.allotteeCode,
        id:           item.id || item.propertyId
      },
      state: {
        registrationData: item.rawData || item
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize  = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedList();
    this.cdr.detectChanges();
  }

  updatePagedList(): void {
    const startIndex = this.pageIndex * this.pageSize;
    this.pagedPropertyList = this.filteredList.slice(startIndex, startIndex + this.pageSize);
  }
}