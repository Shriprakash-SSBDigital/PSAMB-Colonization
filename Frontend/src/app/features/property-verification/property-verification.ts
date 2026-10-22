import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';

interface PropertyVerificationModel {
  id: number;
  propertyNo: string;
  ownerName: string;
  category: string;
  branch: string;
  district: string;
  mandiName: string;
  status: string;
  registrationDate: string;
  label: 'User' | 'DEO';
  firstName?: string;
  applicationStatusId?: number;
  registrationData?: Record<string, unknown>;
}
interface PropertyStatusHistoryEntry {
  status: string;
  date: string | null;
  remarks: string | null;
}

@Component({
  selector: 'app-property-verification',
  standalone: false,
  templateUrl: './property-verification.html',
  styleUrl: './property-verification.scss'
})
export class PropertyVerification implements OnInit {

  constructor(private router: Router, private service: Propertybidderregn, private cdr: ChangeDetectorRef) { }

  searchText = '';
  selectedStatus = 'Pending';
  selectedBranch = 'All';
  selectedDistrict = 'All';
  selectedMandi = 'All';
  marketCommitteeList: string[] = [];
  selectedMarketCommittee = 'All';

  districtList: string[] = [];
  mandiList: string[] = [];

  propertyList: PropertyVerificationModel[] = [];
  filteredPropertyList: PropertyVerificationModel[] = [];
  pagedPropertyList: PropertyVerificationModel[] = [];
  selectedHistoryPropertyNo = '';
  selectedHistory: PropertyStatusHistoryEntry[] = [];
  selectedHistoryCreatedDate: string | null = null;
  historyLoading = false;
  historyError = '';

  pageIndex = 0;
  pageSize = 10;



  ngOnInit(): void {
    this.GetPendingForClerk();
  }

  mapStatus(statusId: number | null | undefined, roleName: string | null | undefined
  ): string {
    // debugger
    const role = (roleName || '').trim().toLowerCase();

    // Objection
    if (statusId === 7) {
      return 'Objection';
    }
    if (role === 'senior assistant') {
      if (statusId === 2) {
        return 'Pending';
      }
      if (statusId === 3 || statusId === 4) {
        return 'Verified';
      }
      return 'Pending';
    }
    if (role === 'clerk') {
      if (statusId === 1) {
        return 'Pending';
      }

      if (statusId === 2 || statusId === 3 || statusId === 4) {
        return 'Verified';
      }
      return 'Pending';
    }

    if (statusId === 2 || statusId === 3 || statusId === 4) {
      return 'Verified';
    }
    return 'Pending';
  }

  GetPendingForClerk(searchCode?: string) {

    const roleName = this.getUserRole();
    this.service.GetPendingForClerk(searchCode).subscribe({
      next: (res: any) => {
        const rawData = res.data || res || [];
        this.propertyList = rawData.map((d: any) => ({
          id: d.id,
          propertyNo: d.propertyCode || `PROP-${d.id}`,
          ownerName: d.bidderName || 'N/A',
          category: d.categoryName || 'N/A',
          branch: d.branchName || 'N/A',
          district: d.districtName || 'N/A',
          mandiName: d.mandiName || 'N/A',
          status: this.mapStatus(d.applicationStatusId, roleName),
          registrationDate: d.createdDate ? d.createdDate : new Date().toISOString(),
          label: d.label || 'User',
          firstName: d.firstName,
          applicationStatusId: d.applicationStatusId,
          roleName: roleName,
          registrationData: d,
        }));
        this.buildFilterOptions();
        this.applyFilter();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching property types:', err);
      }
    });
  }
  getUserRole(): string {
    try {
      // debugger
      const cpMenus = sessionStorage.getItem('cp_menus');

      if (!cpMenus) {
        return '';
      }

      const user = JSON.parse(cpMenus);
      return user?.profile?.roles?.[0] || '';

    } catch (error) {
      console.error('Error getting user role:', error);
      return '';
    }
  }
  buildFilterOptions(): void {
    this.marketCommitteeList = Array.from(
      new Set(this.propertyList.map(p => p.branch).filter(branch => !!branch && branch !== 'N/A'))
    ).sort();

    this.districtList = Array.from(
      new Set(this.propertyList.map(p => p.district).filter(d => !!d && d !== 'N/A'))
    ).sort();

    this.refreshMandiOptions();
  }

  refreshMandiOptions(): void {
    const source = this.selectedDistrict === 'All'
      ? this.propertyList
      : this.propertyList.filter(p => p.district === this.selectedDistrict);

    this.mandiList = Array.from(
      new Set(source.map(p => p.mandiName).filter(m => !!m && m !== 'N/A'))
    ).sort();

    // If the previously selected mandi no longer belongs to this district, reset it
    if (this.selectedMandi !== 'All' && !this.mandiList.includes(this.selectedMandi)) {
      this.selectedMandi = 'All';
    }
  }

  onDistrictChange(): void {
    this.refreshMandiOptions();
    this.applyFilter();
  }
  onMarketCommitteeChange(): void {
    this.applyFilter();
  }

  // clearSearch(): void {
  //   this.searchText = '';
  //   this.applyFilter();
  // }

  clearDistrict(event: Event): void {
    event.stopPropagation();
    this.selectedDistrict = 'All';
    this.onDistrictChange();
  }

  clearMandi(event: Event): void {
    event.stopPropagation();
    this.selectedMandi = 'All';
    this.applyFilter();
  }

  clearMarketCommittee(event: Event): void {
    event.stopPropagation();
    this.selectedMarketCommittee = 'All';
    this.onMarketCommitteeChange();
  }

  applyFilter(): void {
    this.pageIndex = 0;
    this.filteredPropertyList = this.propertyList.filter(property => {
      const matchesSearch =
        property.propertyNo.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesStatus =
        this.selectedStatus === 'All' ||
        property.status === this.selectedStatus;

      const matchesBranch =
        this.selectedBranch === 'All' ||
        property.branch === this.selectedBranch;

      const matchesDistrict =
        this.selectedDistrict === 'All' ||
        property.district === this.selectedDistrict;

      const matchesMandi =
        this.selectedMandi === 'All' ||
        property.mandiName === this.selectedMandi;

      const matchesMarketCommittee =
        this.selectedMarketCommittee === 'All' ||
        property.branch === this.selectedMarketCommittee;

      return matchesSearch && matchesStatus && matchesBranch && matchesDistrict && matchesMandi && matchesMarketCommittee;
    });

    this.updatePagedList();
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedDistrict = 'All';
    this.selectedMandi = 'All';
    this.refreshMandiOptions();
    this.applyFilter();
  }

  updatePagedList(): void {
    const startIndex = this.pageIndex * this.pageSize;
    this.pagedPropertyList = this.filteredPropertyList.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedList();
  }

  get visibleRangeStart(): number {
    return this.filteredPropertyList.length === 0 ? 0 : (this.pageIndex * this.pageSize) + 1;
  }

  get visibleRangeEnd(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.filteredPropertyList.length);
  }

  getStatusCount(status: string): number {
    return this.propertyList.filter(property => property.status === status).length;
  }

  viewDetails(property: PropertyVerificationModel): void {
    const targetRoute = property.label === 'DEO' ? '/verification' : '/verification-view';
    const encryptedId = btoa(property.id.toString());
    this.router.navigate([targetRoute], {
      queryParams: { id: encryptedId },
      state: { registrationData: property.registrationData },
    });
  }
  viewHistory(property: PropertyVerificationModel): void {
    this.selectedHistoryPropertyNo = property.propertyNo;
    this.selectedHistory = [];
    this.selectedHistoryCreatedDate = null;
    this.historyError = '';
    this.historyLoading = true;

    this.service.getPropertyHistory(property.id).subscribe({
      next: (res: any) => {
        const historyData = res?.data ?? res;
        if (!historyData) {
          this.historyError = 'History could not be loaded.';
          return;
        }

        this.selectedHistoryPropertyNo = historyData.propertyCode ?? this.selectedHistoryPropertyNo;
        this.selectedHistoryCreatedDate = historyData.createdDate ?? null;
        this.selectedHistory = this.mapStatusHistory(historyData);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching property history:', err);
        this.historyLoading = false;
        this.historyError = 'History could not be loaded.';
        this.cdr.detectChanges();
      },
      complete: () => {
        this.historyLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapStatusHistory(data: any): PropertyStatusHistoryEntry[] {
    const history = Array.isArray(data)
      ? data
      : data.history ?? data.statusHistory ?? data.applicationStatusHistory ?? [];

    return history.map((entry: any) => ({
      status: entry.statusName ?? entry.applicationStatusName ?? entry.status ?? 'Unknown',
      date: entry.date ?? entry.createdDate ?? entry.modifiedDate ?? null,
      remarks: entry.remarks ?? entry.remark ?? entry.objectionRemarks ?? null
    }));
  }

  refreshData(): void {
    this.searchText = '';
    this.selectedStatus = 'All';
    this.selectedBranch = 'All';
    this.selectedDistrict = 'All';
    this.selectedMandi = 'All';
    this.selectedMarketCommittee = 'All';
    this.GetPendingForClerk();
  }

  OpenTotalRegistration() {
    this.selectedStatus = 'All';
    this.applyFilter();
  }
  OpenPendingRegistration() {
    this.selectedStatus = 'Pending';
    this.applyFilter();
  }
  OpenVerifiedRegistration() {
    this.selectedStatus = 'Verified';
    this.applyFilter();
  }
  OpenRejectedRegistration() {
    this.selectedStatus = 'Objection';
    this.applyFilter();
  }


  get pendingCount(): number {
    return this.propertyList.filter(p => p.status === 'Pending').length;
  }

  get verifiedCount(): number {
    return this.propertyList.filter(p => p.status === 'Verified').length;
  }

  get objectionCount(): number {
    return this.propertyList.filter(p => p.status === 'Objection').length;
  }
}