import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Userservice } from '../../core/service/UserService/userservice';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';

interface OwnershipPropertyModel {
  id: number;
  createdBy: number | null;
  propertyNo: string;
  ownerName: string;
  district: string;
  branch: string;
  mandiName: string;
  plotType: string;
  plotNumber: string;
  status: string;
  registrationDate: string;
  registrationData?: Record<string, unknown>;
}

@Component({
  selector: 'app-property-ownership-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  templateUrl: './property-ownership-verification.html',
  styleUrl: './property-ownership-verification.scss',
})
export class PropertyOwnershipVerification implements OnInit {

  constructor(
    private router: Router,
    private userService: Userservice,
    private service: Propertybidderregn,
    private cdr: ChangeDetectorRef
  ) { }

  isLoading = false;

  searchText = '';
  selectedStatus = 'All';
  selectedMarketCommittee = 'All';

  districtList: string[] = [];
  mandiList: string[] = [];
  marketCommitteeList: string[] = [];

  propertyList: OwnershipPropertyModel[] = [];
  filteredPropertyList: OwnershipPropertyModel[] = [];
  pagedPropertyList: OwnershipPropertyModel[] = [];

  pageIndex = 0;
  pageSize = 10;
  selectedBranch = 'All';
  selectedDistrict = 'All';
  selectedMandi = 'All';
  ngOnInit(): void {
    this.GetPropertyOwnerVerification();
  }

  getUserId(): string {
    try {
      const sessionStr = sessionStorage.getItem('cp_session') || localStorage.getItem('cp_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.userId) return String(session.userId);
        if (session?.id) return String(session.id);
        if (session?.applicantId) return String(session.applicantId);
      }
    } catch (e) {
      console.error('Error reading session data:', e);
    }

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const uid = payload?.UserId || payload?.userId || payload?.id || payload?.ApplicantId || payload?.applicantId || payload?.sub;
        if (uid) return String(uid);
      }
    } catch (e) {
      console.error('Error decoding token:', e);
    }

    return '';
  }

  // mapStatus(statusId: number | null | undefined): string {
  //   if (statusId === 7) return 'Objection';
  //   if (statusId === 2 || statusId === 3 || statusId === 4) return 'Verified';
  //   return 'Pending';
  // }

  loadProperties(): void {
    this.GetPropertyOwnerVerification();
  }

  mapStatus(
    statusId: number | null | undefined,
    roleName: string | null | undefined,
    levelId?: string | null | undefined
  ): string {
    const role = (roleName || '').trim().toLowerCase().replace('_', ' ');
    const sid = statusId != null ? Number(statusId) : null;
    const lvl = (levelId || '').trim().toLowerCase().replace('_', ' ');

    if (role.includes('senior assistant')) {
      // SA:
      // status=2 → Pending (clerk approved, SA action pending)
      // status=3/4 → Verified (SA approved)
      // status=7 → Objection (objected by Senior Assistant)
      if (sid === 2) return 'Pending';
      if (sid === 3 || sid === 4) return 'Verified';
      if (sid === 7) return 'Objection';
      return 'Pending';
    }

    if (role.includes('clerk')) {
      // Clerk:
      // status=1 → Pending
      // status=2/3/4 → Verified (already verified by clerk)
      // status=7:
      //   agar Senior Assistant ne object kiya ho → Objected by Senior Assistant
      //   agar Clerk ne object kiya ho → Objection
      if (sid === 1) return 'Pending';
      if (sid === 2 || sid === 3 || sid === 4) return 'Verified';
      if (sid === 7) {
        return lvl.includes('senior assistant') ? 'Objected by Senior Assistant' : 'Objection';
      }
      return 'Pending';
    }

    // Default fallback
    if (sid === 7) return 'Objection';
    if (sid === 2 || sid === 3 || sid === 4) return 'Verified';
    return 'Pending';
  }

  GetPropertyOwnerVerification(searchCode?: string) {
    const roleName = this.getUserRole();
    const isSA = (roleName || '').trim().toLowerCase().replace('_', ' ').includes('senior assistant');

    this.userService.GetPropertyOwnerVerification(searchCode).subscribe({
      next: (res: any) => {
        const rawData = res.data || res || [];

        // Senior Assistant ko sirf wo data dikhe jo clerk se approve ho chuka hai (status 2, 3, 4) ya SA ne khud send back kiya ho (status 7 with levelId='Senior Assistant')
        // Clerk ka objection (status 7 with levelId='Clerk') aur naya pending data (status 1) Senior Assistant ko NAHI dikhega
        const visibleData = isSA
          ? rawData.filter((d: any) => {
            const s = Number(d.status != null ? d.status : d.applicationStatusId);
            const lvl = (d.levelId || '').trim().toLowerCase().replace('_', ' ');
            if (s === 2 || s === 3 || s === 4) return true;
            if (s === 7 && lvl.includes('senior assistant')) return true;
            return false;
          })
          : rawData;

        this.propertyList = visibleData.map((d: any) => {
          const statusVal = d.status != null ? d.status : d.applicationStatusId;
          return {
            id: d.id,
            createdBy: d.createdBy ?? d.CreatedBy ?? null,
            propertyNo: d.propertyCode,
            ownerName: d.currentOwnerName || 'N/A',
            branch: d.branchName || 'N/A',
            district: d.districtName || 'N/A',
            mandiName: d.mandiName || 'N/A',
            status: this.mapStatus(statusVal, roleName, d.levelId),
            registrationDate: d.createdDate ? d.createdDate : new Date().toISOString(),
            label: d.label || 'User',
            plotNumber: d.plotNo,
            plotType: d.plotType,
            applicationStatusId: statusVal,
            roleName: roleName,
            levelId: d.levelId,
            registrationData: {
              ...d,
              status: statusVal,
              applicationStatusId: statusVal,
            },
          };
        });
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
      const cpMenus = sessionStorage.getItem('cp_menus');
      if (cpMenus) {
        const user = JSON.parse(cpMenus);
        const role = user?.profile?.roles?.[0] || user?.roles?.[0] || user?.role;
        if (role) return String(role);
      }
    } catch (error) {
      console.error('Error getting user role from cp_menus:', error);
    }

    try {
      const storedRole = sessionStorage.getItem('role');
      if (storedRole) return storedRole;
    } catch (e) { }

    try {
      const cpSession = sessionStorage.getItem('cp_session');
      if (cpSession) {
        const session = JSON.parse(cpSession);
        const role = session?.role || session?.userRole;
        if (role) return String(role);
      }
    } catch (e) { }

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
        property.status === this.selectedStatus ||
        (this.selectedStatus === 'Objection' && property.status === 'Objected by Senior Assistant');

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

  updatePagedList(): void {
    const startIndex = this.pageIndex * this.pageSize;
    this.pagedPropertyList = this.filteredPropertyList.slice(startIndex, startIndex + this.pageSize);
    // console.log('dta', this.pagedPropertyList);

  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.updatePagedList();
  }

  viewDetails(property: OwnershipPropertyModel): void {
    this.router.navigate(['/user-verification'], {
      queryParams: { id: property.id, createdBy: property.createdBy },
      state: { registrationData: property.registrationData },

    });
    // console.log('data', property);

  }

  OpenTotalRegistration(): void {
    this.selectedStatus = 'All';
    this.applyFilter();
  }

  OpenPendingRegistration(): void {
    this.selectedStatus = 'Pending';
    this.applyFilter();
  }

  OpenVerifiedRegistration(): void {
    this.selectedStatus = 'Verified';
    this.applyFilter();
  }

  OpenRejectedRegistration(): void {
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
    return this.propertyList.filter(p => p.status === 'Objection' || p.status === 'Objected by Senior Assistant').length;
  }
}
