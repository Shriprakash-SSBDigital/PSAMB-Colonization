import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatPaginatorModule } from '@angular/material/paginator';
import { PageEvent } from '@angular/material/paginator';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';

interface RegistrationRecord {
  allotteeCode: string;
  allotteeName: string;
  approvalStatus: 'Approved' | 'Rejected' | 'Pending' | 'Objection' | 'Verified' | string;
  remarks: string;
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

  constructor(
    private router: Router,
    private _service: Propertybidderregn,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.getRegistrationList();
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.updatePagedList();
    this.cdr.detectChanges();
  }

  getRegistrationList(): void {
    this._service.GetAllRegisterPropertyById().subscribe({
      next: (res: any) => {
        if (res?.data && Array.isArray(res.data)) {
          this.registrationList = res.data.map((item: any) => ({
            allotteeCode: item.allotteeCode,
            allotteeName: item.allotteeName,
            approvalStatus: item.applicationStatusName,
            remarks: item.remarks
          }));
        } else {
          this.registrationList = [];
        }

        this.applyFilters();
        this.updatePagedList();
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error loading registration list:', err);
        this.registrationList = [];
        this.filteredList = [];
        this.pagedPropertyList = [];
        this.cdr.detectChanges();
      }
    });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.applyFilters();
    this.updatePagedList();
    this.cdr.detectChanges();
  }

  setStatusFilter(status: string): void {
    // Always apply the selected status; only the 'Records' (empty) button clears the filter
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
        // Combined filter: matches any status containing 'approved' OR 'verified'
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
    return this.registrationList.filter(item => (item.approvalStatus || '').trim().toLowerCase().includes('pending')).length;
  }

  getObjectionCount(): number {
    return this.registrationList.filter(item => (item.approvalStatus || '').trim().toLowerCase().includes('objection')).length;
  }

  getApprovedOrVerifiedCount(): number {
    return this.registrationList.filter(item => {
      const s = (item.approvalStatus || '').trim().toLowerCase();
      return s.includes('approved') || s.includes('verified');
    }).length;
  }

  getStatusClass(status: string | null | undefined): string {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('objection')) return 'status-objection';
    if (s.includes('reject')) return 'status-rejected';
    if (s.includes('verified') || s.includes('clerk')) return 'status-verified';
    if (s.includes('approved')) return 'status-approved';
    if (s.includes('pending')) return 'status-pending';
    return 'status-default';
  }

  onView(item: RegistrationRecord): void {
    this.router.navigate(['/user-verification'], {
      queryParams: {
        mode: 'view',
        propertyCode: item.allotteeCode,
        approvalStatus: item.approvalStatus || '',
        remarks: item.remarks || ''
      }
    });
  }

  onEdit(item: RegistrationRecord): void {
    // debugger
    this.router.navigate(['/register-property'], {
      queryParams: {
        mode: 'edit',
        propertyCode: item.allotteeCode
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedList();
    this.cdr.detectChanges();
  }

  updatePagedList(): void {
    const startIndex = this.pageIndex * this.pageSize;
    this.pagedPropertyList = this.filteredList.slice(startIndex, startIndex + this.pageSize);
  }
}