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
  userName?: string | null;
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
    // debugger
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

  getUserFullName(): string {
    try {
      const cpSession = sessionStorage.getItem('cp_session');
      if (cpSession) {
        const sessionObj = JSON.parse(cpSession);
        if (sessionObj?.fullName) {
          return sessionObj.fullName.trim();
        }
      }
      const cpMenus = sessionStorage.getItem('cp_menus');
      if (cpMenus) {
        const user = JSON.parse(cpMenus);
        if (user?.profile?.fullName) {
          return user.profile.fullName.trim();
        }
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const val = sessionStorage.getItem(key);
          if (val && val.includes('fullName')) {
            try {
              const parsed = JSON.parse(val);
              if (parsed?.fullName) {
                return parsed.fullName.trim();
              }
            } catch { }
          }
        }
      }
    } catch (error) {
      console.error('Error getting user full name from session storage:', error);
    }
    return '';
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

  //View history of the property

  viewHistory(property: PropertyVerificationModel): void {
    this.selectedHistoryPropertyNo = property.propertyNo;
    this.selectedHistory = [];
    this.selectedHistoryCreatedDate = property.registrationDate ?? null;
    this.historyError = '';

    const rawTimeline = property.registrationData?.['timelineHistory'] || property.registrationData?.['TimelineHistory'];
    if (rawTimeline && Array.isArray(rawTimeline) && rawTimeline.length > 0) {
      this.selectedHistory = this.mapStatusHistory(rawTimeline, property);
      this.historyLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.historyLoading = true;

    this.service.getPropertyHistory(property.id).subscribe({
      next: (res: any) => {
        const historyData = res?.data ?? res;
        if (!historyData) {
          this.historyError = 'History could not be loaded.';
          return;
        }

        if (!Array.isArray(historyData)) {
          this.selectedHistoryPropertyNo = historyData.propertyCode ?? this.selectedHistoryPropertyNo;
          this.selectedHistoryCreatedDate = historyData.createdDate ?? this.selectedHistoryCreatedDate;
        }
        this.selectedHistory = this.mapStatusHistory(historyData, property);
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

  private mapStatusHistory(data: any, property?: PropertyVerificationModel): PropertyStatusHistoryEntry[] {
    const rawList: any[] = Array.isArray(data)
      ? data
      : data.history ?? data.statusHistory ?? data.applicationStatusHistory ?? data.timelineHistory ?? data.TimelineHistory ?? [];

    if (!rawList || rawList.length === 0) {
      return [{
        userName: '-',
        status: 'Pending for Clerk',
        date: null,
        remarks: null
      }];
    }

    // Sort by id or date ascending
    const sorted = [...rawList].sort((a: any, b: any) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return (a.id || 0) - (b.id || 0) || dateA - dateB;
    });

    // Split sorted entries into cycles.
    // A new cycle starts when a statusId === 1 occurs AFTER an objection (statusId === 7).
    const cycles: any[][] = [];
    let currentCycle: any[] = [];
    let hasObjectionInCurrent = false;

    for (const item of sorted) {
      if (item.statusId === 1 && hasObjectionInCurrent) {
        cycles.push(currentCycle);
        currentCycle = [item];
        hasObjectionInCurrent = false;
      } else {
        currentCycle.push(item);
        if (item.statusId === 7 || item.status === 'Objection' || item.statusName === 'Objection') {
          hasObjectionInCurrent = true;
        }
      }
    }
    if (currentCycle.length > 0) {
      cycles.push(currentCycle);
    }

    const result: PropertyStatusHistoryEntry[] = [];

    // Process each cycle
    for (let cIdx = 0; cIdx < cycles.length; cIdx++) {
      const cycle = cycles[cIdx];
      const isLatestCycle = (cIdx === cycles.length - 1);

      // 1. Clerk level entries in this cycle
      const clerkApproved = cycle.find((e: any) =>
        e.statusId === 2 ||
        e.status === 'Verified by Clerk' ||
        e.statusName === 'Verified by Clerk' ||
        e.statusName === 'Approved by Clerk'
      );
      const clerkApprovedIdx = clerkApproved ? cycle.indexOf(clerkApproved) : -1;

      // Clerk objection in this cycle (statusId 7 before clerk approval)
      const clerkObjection = cycle.find((e: any, idx: number) =>
        (e.statusId === 7 || e.status === 'Objection' || e.statusName === 'Objection' || e.statusName === 'Sent Back') &&
        (clerkApprovedIdx === -1 || idx < clerkApprovedIdx)
      );

      // SA approved in this cycle (statusId 3)
      const saApproved = cycle.find((e: any) =>
        e.statusId === 3 ||
        e.status === 'Verified by Assistant' ||
        e.statusName === 'Verified by Assistant' ||
        e.statusName === 'Verified by Senior Assistant' ||
        e.statusName === 'Approved by Senior Assistant' ||
        e.statusName === 'Approved by SA'
      );

      // SA objection in this cycle (statusId 7 after clerk approval)
      const saObjection = cycle.find((e: any, idx: number) =>
        (e.statusId === 7 || e.status === 'Objection' || e.statusName === 'Objection' || e.statusName === 'Sent Back') &&
        (clerkApprovedIdx !== -1 && idx > clerkApprovedIdx)
      );

      // Check if clerk is approved in this cycle (or in latest cycle if property status says so)
      const isClerkApprovedInCycle = !!clerkApproved || (isLatestCycle && (
        property?.applicationStatusId === 2 ||
        property?.applicationStatusId === 3 ||
        property?.status === 'Verified'
      ));

      // --- Clerk Stage in this cycle ---
      if (clerkApproved) {
        result.push({
          userName: clerkApproved.userName || '-',
          status: 'Verified by Clerk',
          date: clerkApproved.date ?? clerkApproved.createdDate ?? clerkApproved.modifiedDate ?? null,
          remarks: clerkApproved.remarks ?? clerkApproved.remark ?? null
        });
      } else if (clerkObjection) {
        result.push({
          userName: clerkObjection.userName || '-',
          status: 'Objection by Clerk',
          date: clerkObjection.date ?? clerkObjection.createdDate ?? clerkObjection.modifiedDate ?? null,
          remarks: clerkObjection.remarks ?? clerkObjection.remark ?? clerkObjection.objectionRemarks ?? null
        });
      } else {
        // Pending for Clerk in this cycle
        result.push({
          userName: '-',
          status: 'Pending for Clerk',
          date: null,
          remarks: null
        });
      }

      // --- SA Stage in this cycle (only if Clerk approved in this cycle) ---
      if (isClerkApprovedInCycle) {
        if (saApproved) {
          result.push({
            userName: saApproved.userName || '-',
            status: 'Verified by Senior Assistant',
            date: saApproved.date ?? saApproved.createdDate ?? saApproved.modifiedDate ?? null,
            remarks: saApproved.remarks ?? saApproved.remark ?? null
          });
        } else if (saObjection) {
          result.push({
            userName: saObjection.userName || (property?.registrationData as any)?.modifyByName || '-',
            status: 'Objection by Senior Assistant',
            date: saObjection.date ?? saObjection.createdDate ?? saObjection.modifiedDate ?? null,
            remarks: saObjection.remarks ?? saObjection.remark ?? saObjection.objectionRemarks ?? null
          });
        } else {
          // Pending by Senior Assistant in this cycle
          result.push({
            userName: '-',
            status: 'Pending by Senior Assistant',
            date: null,
            remarks: null
          });
        }
      }
    }

    return result;
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