import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize, Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { MandiWiseService } from '../../core/service/Mandi-Wise-Summary-Service/mandi-wise-service';
import { PropertyBalanceResponse } from '../../models/property-balance-calculatation.model';
import { MandiOption, PlotSummaryRow } from '../plot-wise-consolidate-details/plot-wise-consolidate-details';

export interface LookupItem {
  id: number;
  name: string;
}

export interface MandiItem {
  mandiId: number;
  mandiName: string;
  branchId: number;
  districtId: number;
}

export interface AllotmentRow {
  districtId?: number;
  branchId?: number;
  mandiId?: number;
  plotTypeId?: number;
  propertyId?: number;
  alloteeCode: string;
  name: string;
  district: string;
  mandi: string;
  plotType: string;
  plotNo: string;
  plotSize: string;
  auctionDate: string;
  allotmentDate: string;
  allotmentNumber: string;
  allotmentPrice: number;
  branchName: string;
}

export interface GridColumn {
  key: string;
  label: string;
  visible: boolean;
}

type SortKey = keyof AllotmentRow;

@Component({
  selector: 'app-mandi-wise-allotment-summary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatPaginatorModule],
  templateUrl: './mandi-wise-allotment-summary.html',
  styleUrl: './mandi-wise-allotment-summary.scss',
})
export class MandiWiseAllotmentSummary implements OnInit, OnDestroy {
  form!: FormGroup;

  districts: LookupItem[] = [];
  committees: LookupItem[] = [];
  allMandis: MandiItem[] = [];
  branchMandis: MandiItem[] = [];
  filteredMandis: MandiItem[] = [];

  columns: GridColumn[] = [
    { key: 'srNo', label: 'Sr. No.', visible: true },
    { key: 'alloteeCode', label: 'Allotee Code', visible: true },
    { key: 'name', label: 'Name', visible: true },
    { key: 'district', label: 'District', visible: true },
    { key: 'branchName', label: 'Market Committee', visible: true },
    { key: 'mandi', label: 'Mandi', visible: true },
    { key: 'plotType', label: 'Plot Type', visible: true },
    { key: 'plotNo', label: 'Plot No.', visible: true },
    { key: 'plotSize', label: 'Plot Size', visible: true },
    { key: 'auctionDate', label: 'Auction Date', visible: true },
    { key: 'allotmentDate', label: 'Allotment Date', visible: true },
    { key: 'allotmentNo', label: 'Allotment No.', visible: true },
    { key: 'allotmentPrice', label: 'Allotment Price', visible: true },
  ];

  isLoadingDistricts = false;
  isLoadingCommittees = false;
  isLoadingMandis = false;

  isDistrictDropdownOpen = false;
  isCommitteeDropdownOpen = false;
  isMandiDropdownOpen = false;
  isColumnDropdownOpen = false;
  mandiDisplayText = '';

  private mandiSearch$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  @ViewChild('districtDropdownRef') districtDropdownRef?: ElementRef;
  @ViewChild('committeeDropdownRef') committeeDropdownRef?: ElementRef;
  @ViewChild('mandiDropdownRef') mandiDropdownRef?: ElementRef;
  @ViewChild('columnDropdownRef') columnDropdownRef?: ElementRef;
  @ViewChild('mandiInputElement') mandiInputElement?: ElementRef<HTMLInputElement>;

  rows: AllotmentRow[] = [];
  searched = false;
  loading = false;

  pageIndex = 0;
  pageSize = 10;
  totalRecords = 0;

  private currentFilter: {
    districtId: number;
    branchId: number;
    mandiId: number;
    fromDate?: string | null;
    toDate?: string | null;
  } = {
      districtId: 0,
      branchId: 0,
      mandiId: 0,
      fromDate: null,
      toDate: null,
    };

  dateRangeError = false;
  plotDetail: any = null;
  balanceData: PropertyBalanceResponse | null = null;
  plotDetailLoading = false;
  plotDetailError = '';
  @ViewChild('plotDetailModal') plotDetailModalRef!: ElementRef;
  sortKey: SortKey | null = null;
  sortAsc = true;
  selectedPlotNo: string = '';
  selectedMandiId: number | null = null;
  allRows: PlotSummaryRow[] = [];
  filterForm: any;
  mandiOptions: MandiOption[] = [];
  isExporting = false;

  get selectedDistrictName(): string {
    const dId = this.form?.get('districtId')?.value;
    if (dId === null || dId === undefined || dId === '') return '';
    if (Number(dId) === 0) return 'All';
    const d = this.districts.find((item) => item.id === Number(dId));
    return d ? d.name : '';
  }

  get selectedCommitteeName(): string {
    const bId = this.form?.get('branchId')?.value;
    if (!bId) return '';
    const c = this.committees.find((item) => item.id === Number(bId));
    return c ? c.name : '';
  }

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private propertyService: Propertybidderregn,
    private mandiWiseService: MandiWiseService
  ) {
    this.filterForm = this.fb.group({
      mandi: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      districtId: [null],
      branchId: [null],
      mandiId: [null],
      fromDate: [null],
      toDate: [null],
    });

    this.mandiSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => {
        this.loadAllMandis(term);
      });

    this.loadDistricts();
    this.loadAllMandis('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDistrictDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isLoadingDistricts) return;
    this.isDistrictDropdownOpen = !this.isDistrictDropdownOpen;
    if (this.isDistrictDropdownOpen) {
      this.isCommitteeDropdownOpen = false;
      this.isMandiDropdownOpen = false;
      this.isColumnDropdownOpen = false;
    }
    this.cdr.detectChanges();
  }

  toggleColumnDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isColumnDropdownOpen = !this.isColumnDropdownOpen;
    if (this.isColumnDropdownOpen) {
      this.isDistrictDropdownOpen = false;
      this.isCommitteeDropdownOpen = false;
      this.isMandiDropdownOpen = false;
    }
    this.cdr.detectChanges();
  }

  isColumnVisible(key: string): boolean {
    const col = this.columns.find((c) => c.key === key);
    return col ? col.visible : true;
  }

  toggleColumn(key: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const col = this.columns.find((c) => c.key === key);
    if (col) {
      if (col.visible && this.visibleColumnsCount === 1) {
        return;
      }
      col.visible = !col.visible;
      this.cdr.detectChanges();
    }
  }

  toggleAllColumns(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const targetState = !this.isAllColumnsSelected;
    this.columns.forEach((c) => {
      c.visible = targetState;
    });
    if (!targetState) {
      this.columns[0].visible = true;
    }
    this.cdr.detectChanges();
  }

  get visibleColumnsCount(): number {
    return this.columns.filter((c) => c.visible).length;
  }

  get isAllColumnsSelected(): boolean {
    return this.columns.every((c) => c.visible);
  }

  get columnDropdownDisplayText(): string {
    const count = this.visibleColumnsCount;
    if (count === this.columns.length) {
      return 'All Columns (' + count + ')';
    }
    return `${count} / ${this.columns.length} Columns`;
  }

  selectDistrict(d: LookupItem | null): void {
    this.isDistrictDropdownOpen = false;
    const rawVal = this.form.get('districtId')?.value;
    const currentId = rawVal !== null && rawVal !== undefined && rawVal !== '' ? Number(rawVal) : null;
    const newId = d ? Number(d.id) : null;

    if (currentId === newId) {
      this.cdr.detectChanges();
      return;
    }

    this.form.patchValue({ districtId: newId });
    this.onDistrictChange();
    this.cdr.detectChanges();
  }

  toggleCommitteeDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isLoadingCommittees || !this.form.get('districtId')?.value) return;
    this.isCommitteeDropdownOpen = !this.isCommitteeDropdownOpen;
    if (this.isCommitteeDropdownOpen) {
      this.isDistrictDropdownOpen = false;
      this.isMandiDropdownOpen = false;
      this.isColumnDropdownOpen = false;
    }
    this.cdr.detectChanges();
  }

  selectCommittee(c: LookupItem | null): void {
    this.isCommitteeDropdownOpen = false;
    const currentId = this.form.get('branchId')?.value;
    const newId = c ? c.id : null;

    if (currentId === newId) {
      this.cdr.detectChanges();
      return;
    }

    this.form.patchValue({ branchId: newId });
    this.onCommitteeChange();
    this.cdr.detectChanges();
  }

  onMandiInputFocus(): void {
    if (this.isLoadingMandis) return;
    this.isDistrictDropdownOpen = false;
    this.isCommitteeDropdownOpen = false;
    this.isMandiDropdownOpen = true;

    const branchId = this.form.get('branchId')?.value;
    if (branchId && !this.branchMandis.length) {
      this.loadMandis(Number(branchId));
    } else if (!branchId && !this.allMandis.length) {
      this.loadAllMandis('');
    } else {
      this.applyMandiFilter(this.mandiDisplayText);
    }
    this.cdr.detectChanges();
  }

  onMandiInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mandiDisplayText = input.value || '';
    this.isMandiDropdownOpen = true;
    this.isDistrictDropdownOpen = false;
    this.isCommitteeDropdownOpen = false;

    const branchId = this.form.get('branchId')?.value;

    if (!this.mandiDisplayText.trim()) {
      this.clearMandiSelection();
    } else {
      this.applyMandiFilter(this.mandiDisplayText);
      if (!branchId) {
        this.mandiSearch$.next(this.mandiDisplayText.trim());
      }
    }
    this.cdr.detectChanges();
  }

  clearMandiSelection(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.mandiDisplayText = '';
    this.form.patchValue({ mandiId: null, districtId: null, branchId: null });
    this.committees = [];
    this.branchMandis = [];
    this.filteredMandis = [...this.allMandis];
    this.rows = [];
    this.totalRecords = 0;
    this.searched = false;
    this.pageIndex = 0;
    this.currentFilter = { districtId: 0, branchId: 0, mandiId: 0 };
    this.mandiSearch$.next('');
    this.cdr.detectChanges();
  }

  toggleMandiDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isLoadingMandis) return;
    this.isMandiDropdownOpen = !this.isMandiDropdownOpen;
    if (this.isMandiDropdownOpen) {
      this.isDistrictDropdownOpen = false;
      this.isCommitteeDropdownOpen = false;
      this.isColumnDropdownOpen = false;
      const branchId = this.form.get('branchId')?.value;
      if (branchId && !this.branchMandis.length) {
        this.loadMandis(Number(branchId));
      } else {
        this.applyMandiFilter(this.mandiDisplayText);
      }
      this.mandiInputElement?.nativeElement?.focus();
    }
    this.cdr.detectChanges();
  }

  closeMandiDropdown(): void {
    this.isMandiDropdownOpen = false;
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;

    if (this.isDistrictDropdownOpen) {
      const clickedInside = this.districtDropdownRef?.nativeElement?.contains(target);
      if (!clickedInside) {
        this.isDistrictDropdownOpen = false;
      }
    }

    if (this.isCommitteeDropdownOpen) {
      const clickedInside = this.committeeDropdownRef?.nativeElement?.contains(target);
      if (!clickedInside) {
        this.isCommitteeDropdownOpen = false;
      }
    }

    if (this.isColumnDropdownOpen) {
      const clickedInside = this.columnDropdownRef?.nativeElement?.contains(target);
      if (!clickedInside) {
        this.isColumnDropdownOpen = false;
      }
    }

    if (this.isMandiDropdownOpen) {
      const clickedInside = this.mandiDropdownRef?.nativeElement?.contains(target);
      if (!clickedInside) {
        this.isMandiDropdownOpen = false;
        const currentMandiId = this.form.get('mandiId')?.value;
        if (currentMandiId) {
          const found = this.branchMandis.find((m) => m.mandiId === Number(currentMandiId))
            ?? this.allMandis.find((m) => m.mandiId === Number(currentMandiId));
          this.mandiDisplayText = found ? found.mandiName : '';
        } else {
          this.clearMandiSelection();
        }
      }
    }

    this.cdr.detectChanges();
  }

  applyMandiFilter(searchTerm: string = ''): void {
    const q = (searchTerm || '').trim().toLowerCase();
    const branchId = this.form.get('branchId')?.value;
    const districtId = this.form.get('districtId')?.value;

    let sourceList: MandiItem[] = [];
    if (branchId && this.branchMandis.length) {
      sourceList = [...this.branchMandis];
    } else if (districtId && Number(districtId) !== 0) {
      const fromDistrict = this.allMandis.filter((m) => m.districtId === Number(districtId));
      sourceList = fromDistrict.length ? fromDistrict : [...this.allMandis];
    } else {
      sourceList = [...this.allMandis];
    }

    if (q) {
      this.filteredMandis = sourceList.filter((m) =>
        m.mandiName.toLowerCase().includes(q)
      );
    } else {
      this.filteredMandis = sourceList;
    }
    this.cdr.detectChanges();
  }

  selectMandi(m: MandiItem | null): void {
    this.isMandiDropdownOpen = false;
    if (!m) {
      this.clearMandiSelection();
      return;
    }

    this.form.patchValue({ mandiId: m.mandiId });
    this.mandiDisplayText = m.mandiName;

    const currentDistrictId = this.form.get('districtId')?.value;
    const currentBranchId = this.form.get('branchId')?.value;

    const targetDistrictId = m.districtId || currentDistrictId || 0;
    const targetBranchId = m.branchId || currentBranchId || 0;

    if (m.districtId && m.districtId !== currentDistrictId) {
      this.form.patchValue({ districtId: m.districtId }, { emitEvent: false });
      this.loadMarketCommittees(m.districtId, m.branchId, m.mandiId);
    } else if (m.branchId && m.branchId !== currentBranchId) {
      this.form.patchValue({ branchId: m.branchId }, { emitEvent: false });
      this.loadMandis(m.branchId, m.mandiId);
    }

    this.fetchSummary(Number(targetDistrictId), Number(targetBranchId), m.mandiId, 0);
    this.cdr.detectChanges();
  }

  loadAllMandis(search: string = ''): void {
    this.isLoadingMandis = true;
    this.cdr.detectChanges();
    this.mandiWiseService.getAllMandisForMandiWiseAllotmentSummary(search).subscribe({
      next: (res: any) => {
        const list = res?.data || (Array.isArray(res) ? res : []);
        this.allMandis = Array.isArray(list)
          ? list.map((m: any) => ({
            mandiId: Number(m.mandiId ?? m.MandiId),
            mandiName: m.mandiName ?? m.MandiName ?? '',
            branchId: Number(m.branchId ?? m.BranchId ?? 0),
            districtId: Number(m.districtId ?? m.DistrictId ?? 0),
          }))
          : [];

        if (!this.form.get('branchId')?.value) {
          const districtId = this.form.get('districtId')?.value;
          if (districtId && Number(districtId) !== 0) {
            const districtMandis = this.allMandis.filter((m) => m.districtId === Number(districtId));
            this.filteredMandis = districtMandis.length ? districtMandis : [...this.allMandis];
          } else {
            this.filteredMandis = [...this.allMandis];
          }
        }
        this.isLoadingMandis = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching mandis for allotment summary:', err);
        if (!this.form.get('branchId')?.value) {
          this.allMandis = [];
          this.filteredMandis = [];
        }
        this.isLoadingMandis = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadDistricts(): void {
    this.isLoadingDistricts = true;
    this.cdr.detectChanges();
    this.propertyService.getPropertyDistricts().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.districts = Array.isArray(list)
          ? list
            .map((d: any) => ({
              id: Number(d.districtId ?? d.DistrictId ?? d.id),
              name: (d.districtName ?? d.DistrictName ?? d.name ?? '').trim(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
          : [];
        this.isLoadingDistricts = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching property districts:', err);
        this.districts = [];
        this.isLoadingDistricts = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMarketCommittees(districtId: number, autoSelectBranchId?: number, autoSelectMandiId?: number): void {
    this.isLoadingCommittees = true;
    this.cdr.detectChanges();
    this.propertyService.getPropertyBranches(districtId).subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.committees = Array.isArray(list)
          ? list.map((c: any) => ({
            id: Number(c.branchId ?? c.BranchId ?? c.marketCommitteeId ?? c.MarketCommitteeId ?? c.id),
            name: c.branchName ?? c.BranchName ?? c.marketCommitteeName ?? c.MarketCommitteeName ?? c.name ?? '',
          }))
          : [];
        if (autoSelectBranchId) {
          this.form.patchValue({ branchId: autoSelectBranchId }, { emitEvent: false });
          this.loadMandis(autoSelectBranchId, autoSelectMandiId);
        }
        this.isLoadingCommittees = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching market committees:', err);
        this.committees = [];
        this.isLoadingCommittees = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadMandis(branchId: number, autoSelectMandiId?: number): void {
    this.isLoadingMandis = true;
    this.cdr.detectChanges();
    this.propertyService.getPropertyMandis(branchId).subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        const districtId = Number(this.form.get('districtId')?.value || 0);
        this.branchMandis = Array.isArray(list)
          ? list.map((m: any) => ({
            mandiId: Number(m.mandiId ?? m.MandiId ?? m.id),
            mandiName: m.mandiName ?? m.MandiName ?? m.name ?? '',
            branchId: branchId,
            districtId: districtId,
          }))
          : [];

        // Also merge any mandi from allMandis matching this branchId
        const existingIds = new Set(this.branchMandis.map((m) => m.mandiId));
        const extraFromAll = this.allMandis.filter(
          (m) => m.branchId === branchId && !existingIds.has(m.mandiId)
        );
        if (extraFromAll.length) {
          this.branchMandis = [...this.branchMandis, ...extraFromAll];
        }

        this.filteredMandis = [...this.branchMandis];
        this.isLoadingMandis = false;

        if (autoSelectMandiId) {
          const found = this.branchMandis.find((m) => m.mandiId === autoSelectMandiId);
          if (found) {
            this.mandiDisplayText = found.mandiName;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching property mandis for committee:', err);
        this.branchMandis = this.allMandis.filter((m) => m.branchId === branchId);
        this.filteredMandis = [...this.branchMandis];
        this.isLoadingMandis = false;
        this.cdr.detectChanges();
      },
    });
  }

  onDistrictChange(): void {
    const districtVal = this.form.get('districtId')?.value;
    const isAll = districtVal === 0 || districtVal === '0';
    const districtId = districtVal !== null && districtVal !== undefined && districtVal !== '' ? Number(districtVal) : null;
    const branch = this.form.get('branchId')!;
    const mandi = this.form.get('mandiId')!;

    this.committees = [];
    this.branchMandis = [];
    branch.reset(null, { emitEvent: false });
    mandi.reset(null, { emitEvent: false });
    this.mandiDisplayText = '';

    if (districtId === null) {
      this.filteredMandis = [...this.allMandis];
      this.rows = [];
      this.totalRecords = 0;
      this.searched = false;
      this.pageIndex = 0;
      this.currentFilter = { districtId: 0, branchId: 0, mandiId: 0 };
      this.cdr.detectChanges();
      return;
    }

    if (isAll) {
      this.filteredMandis = [...this.allMandis];
      this.fetchSummary(0, 0, 0, 0);
      this.cdr.detectChanges();
      return;
    }

    this.loadMarketCommittees(districtId);

    const districtMandis = this.allMandis.filter((m) => m.districtId === districtId);
    this.filteredMandis = districtMandis.length ? districtMandis : [...this.allMandis];

    this.fetchSummary(districtId, 0, 0, 0);
    this.cdr.detectChanges();
  }

  onCommitteeChange(): void {
    const branchVal = this.form.get('branchId')?.value;
    const branchId = branchVal ? Number(branchVal) : null;
    const districtVal = this.form.get('districtId')?.value;
    const districtId = districtVal !== null && districtVal !== undefined && districtVal !== '' ? Number(districtVal) : null;
    const mandi = this.form.get('mandiId')!;

    mandi.reset(null, { emitEvent: false });
    this.mandiDisplayText = '';
    this.branchMandis = [];

    if (!branchId) {
      if (districtId !== null) {
        if (districtId !== 0) {
          const districtMandis = this.allMandis.filter((m) => m.districtId === districtId);
          this.filteredMandis = districtMandis.length ? districtMandis : [...this.allMandis];
        } else {
          this.filteredMandis = [...this.allMandis];
        }
        this.fetchSummary(districtId, 0, 0, 0);
      } else {
        this.filteredMandis = [...this.allMandis];
      }
      this.cdr.detectChanges();
      return;
    }

    this.loadMandis(branchId);
    this.fetchSummary(districtId || 0, branchId, 0, 0);
    this.cdr.detectChanges();
  }

  onMandiChange(): void {
    const mandiVal = this.form.get('mandiId')?.value;
    const districtVal = this.form.get('districtId')?.value;
    const isDistrictSelected = districtVal !== null && districtVal !== undefined && districtVal !== '';
    const districtId = Number(districtVal || 0);
    const branchId = Number(this.form.get('branchId')?.value || 0);

    if (!mandiVal) {
      if (isDistrictSelected) {
        this.fetchSummary(districtId, branchId, 0, 0);
      } else {
        this.rows = [];
        this.totalRecords = 0;
        this.searched = false;
        this.pageIndex = 0;
        this.currentFilter = { districtId: 0, branchId: 0, mandiId: 0 };
        this.cdr.detectChanges();
      }
      return;
    }

    const mandiId = Number(mandiVal);
    const selected = this.branchMandis.find((m) => m.mandiId === mandiId)
      ?? this.allMandis.find((m) => m.mandiId === mandiId);

    if (selected) {
      if (selected.districtId && !districtId) {
        this.form.patchValue({ districtId: selected.districtId }, { emitEvent: false });
        this.loadMarketCommittees(selected.districtId, selected.branchId, selected.mandiId);
      }
      this.fetchSummary(selected.districtId || districtId, selected.branchId || branchId, selected.mandiId, 0);
    } else {
      this.fetchSummary(districtId, branchId, mandiId, 0);
    }
  }

  onSubmit(): void {
    this.onSearch();
  }

  onDateInputChange(): void {
    this.dateRangeError = false;
    this.cdr.detectChanges();
  }

  onDateChange(): void {
    this.onDateInputChange();
  }

  onSearch(): void {
    const fromDate = this.form.get('fromDate')?.value || null;
    const toDate = this.form.get('toDate')?.value || null;

    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      return;
    }

    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      this.dateRangeError = true;
      this.cdr.detectChanges();
      return;
    }
    this.dateRangeError = false;

    const districtVal = this.form.get('districtId')?.value;
    const dId = districtVal !== null && districtVal !== undefined && districtVal !== '' ? Number(districtVal) : 0;
    const bId = Number(this.form.get('branchId')?.value || 0);
    const mId = Number(this.form.get('mandiId')?.value || 0);

    this.fetchSummary(dId, bId, mId, 0, fromDate, toDate);
  }

  fetchSummary(
    districtId: number = 0,
    branchId: number = 0,
    mandiId: number = 0,
    pageIndex: number = 0,
    fromDate?: string | null,
    toDate?: string | null
  ): void {
    const fromDateVal = fromDate !== undefined ? fromDate : this.currentFilter.fromDate;
    const toDateVal = toDate !== undefined ? toDate : this.currentFilter.toDate;

    this.currentFilter = {
      districtId: Number(districtId || 0),
      branchId: Number(branchId || 0),
      mandiId: Number(mandiId || 0),
      fromDate: fromDateVal,
      toDate: toDateVal,
    };
    this.pageIndex = pageIndex;
    const pageNumber = this.pageIndex + 1;

    this.loading = true;
    this.cdr.detectChanges();

    this.mandiWiseService
      .getMandiWiseAllotmentSummary(
        this.currentFilter.districtId,
        this.currentFilter.branchId,
        this.currentFilter.mandiId,
        pageNumber,
        this.pageSize,
        this.currentFilter.fromDate,
        this.currentFilter.toDate
      )
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const isSuccess = res?.success ?? res?.Success ?? true;
          const pagedData = res?.data ?? res?.Data;

          if (!isSuccess || !pagedData) {
            this.rows = [];
            this.totalRecords = 0;
            this.searched = true;
            this.sortKey = null;
            this.cdr.detectChanges();
            return;
          }

          const rawList = pagedData?.data ?? pagedData?.Data ?? (Array.isArray(pagedData) ? pagedData : []);
          this.totalRecords = Number(
            pagedData?.totalRecords ?? pagedData?.TotalRecords ?? (Array.isArray(rawList) ? rawList.length : 0)
          );

          const returnedPage = pagedData?.pageNumber ?? pagedData?.PageNumber;
          if (returnedPage && returnedPage > 0) {
            this.pageIndex = returnedPage - 1;
          }

          const allList: AllotmentRow[] = Array.isArray(rawList)
            ? rawList.map((d: any) => this.mapToRow(d))
            : [];

          this.rows = allList;
          this.searched = true;
          if (this.currentFilter.districtId === 0 && !this.sortKey) {
            this.sortKey = 'district';
            this.sortAsc = true;
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error fetching mandi wise allotment summary:', err);
          this.rows = [];
          this.totalRecords = 0;
          this.searched = true;
          this.cdr.detectChanges();
        },
      });
  }

  private mapToRow(d: any): AllotmentRow {
    return {
      districtId: Number(d.districtId ?? d.DistrictId ?? 0),
      branchId: Number(d.branchId ?? d.BranchId ?? 0),
      mandiId: Number(d.mandiId ?? d.MandiId ?? 0),
      plotTypeId: Number(d.plotTypeId ?? d.PlotTypeId ?? 0),
      propertyId: Number(d.propertyId ?? d.PropertyId ?? 0),
      alloteeCode: d.allotteeCode ?? d.AllotteeCode ?? d.alloteeCode ?? d.AlloteeCode ?? '-',
      name: d.allotteeName ?? d.AllotteeName ?? d.name ?? d.Name ?? '-',
      district: d.districtName ?? d.DistrictName ?? d.district ?? d.District ?? '-',
      branchName: d.branchName ?? d.BranchName ?? d.branch ?? d.Branch ?? '-',
      mandi: d.mandiName ?? d.MandiName ?? d.mandi ?? d.Mandi ?? '-',
      plotType: d.plotType ?? d.PlotType ?? '-',
      plotNo: d.plotNo != null ? String(d.plotNo) : (d.PlotNo != null ? String(d.PlotNo) : '-'),
      plotSize: d.plotSize ?? d.PlotSize ?? '-',
      auctionDate: this.formatDate(d.auctionDate ?? d.AuctionDate),
      allotmentDate: this.formatDate(d.dateOfAllotment ?? d.DateOfAllotment ?? d.allotmentDate ?? d.AllotmentDate),
      allotmentNumber: d.allotmentNumber ?? d.allotmentNumber ?? '-',
      allotmentPrice: Number(d.allotmentPrice ?? d.AllotmentPrice ?? d.finalBidPrice ?? d.FinalBidPrice ?? d.price ?? d.Price ?? 0),
    };
  }

  private formatDate(dateVal: any): string {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return String(dateVal);
    }
  }

  onReset(): void {
    this.dateRangeError = false;
    this.form.reset({ districtId: null, branchId: null, mandiId: null, fromDate: null, toDate: null });
    this.isDistrictDropdownOpen = false;
    this.isCommitteeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isColumnDropdownOpen = false;
    this.columns.forEach((c) => (c.visible = true));
    this.mandiDisplayText = '';
    this.committees = [];
    this.rows = [];
    this.totalRecords = 0;
    this.searched = false;
    this.pageIndex = 0;
    this.sortKey = null;
    this.currentFilter = { districtId: 0, branchId: 0, mandiId: 0, fromDate: null, toDate: null };
    this.loadAllMandis('');
    this.cdr.detectChanges();
  }

  sortBy(key: SortKey): void {
    this.sortAsc = this.sortKey === key ? !this.sortAsc : true;
    this.sortKey = key;
    this.cdr.detectChanges();
  }

  private get sortedRows(): AllotmentRow[] {
    if (!this.sortKey) return this.rows;
    const key = this.sortKey;
    const dir = this.sortAsc ? 1 : -1;
    return [...this.rows].sort((a, b) => {
      const x = a[key];
      const y = b[key];
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  }

  get pagedRows(): AllotmentRow[] {
    return this.sortedRows;
  }

  onPageChange(event: PageEvent): void {
    const isPageSizeChanged = this.pageSize !== event.pageSize;
    this.pageSize = event.pageSize;
    this.pageIndex = isPageSizeChanged ? 0 : event.pageIndex;
    this.fetchSummary(
      this.currentFilter.districtId,
      this.currentFilter.branchId,
      this.currentFilter.mandiId,
      this.pageIndex
    );
  }

  exportToExcel(): void {
    if (this.isExporting) return;

    this.isExporting = true;
    this.cdr.detectChanges();

    const dId = this.currentFilter.districtId || 0;
    const bId = this.currentFilter.branchId || 0;
    const mId = this.currentFilter.mandiId || 0;
    const fromDate = this.currentFilter.fromDate || null;
    const toDate = this.currentFilter.toDate || null;

    this.mandiWiseService
      .exportMandiWiseAllotmentSummary(dId, bId, mId, fromDate, toDate)
      .pipe(
        finalize(() => {
          this.isExporting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const timestamp = new Date().toISOString().split('T')[0];
          link.download = `MandiWiseAllotmentSummary_${timestamp}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err: any) => {
          console.error('Error downloading Excel file:', err);
          alert('Failed to export Excel file. Please try again.');
        },
      });
  }

  isInvalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  get totalValue(): number {
    return this.rows.reduce((sum, r) => sum + (r.allotmentPrice || 0), 0);
  }

  get selectedMandiName(): string {
    const val = this.form.get('mandiId')?.value;
    if (!val) return '';
    const id = Number(val);
    return this.branchMandis.find((m) => m.mandiId === id)?.mandiName
      ?? this.allMandis.find((m) => m.mandiId === id)?.mandiName
      ?? this.filteredMandis.find((m) => m.mandiId === id)?.mandiName
      ?? '';
  }

  trackByRow = (index: number, row: AllotmentRow): any => {
    return row.alloteeCode ? `${row.alloteeCode}_${index}` : index;
  };

  skeletonRows = Array.from({ length: 6 });

  get mandiControl() {
    return this.filterForm.get('mandi');
  }
  private coerceNumber(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }
  closePreviewModal(): void {
    this.balanceData = null;
    this.plotDetail = null;
    this.plotDetailError = '';
    this.selectedPlotNo = '';
  }

  openPlotModal(plotNoOrRow: string | AllotmentRow, maybeRow?: any): void {
    const row: any = typeof plotNoOrRow === 'object' ? plotNoOrRow : (maybeRow || {});
    const plotNo: string = typeof plotNoOrRow === 'string' ? plotNoOrRow : (row.plotNo || '');

    this.selectedPlotNo = plotNo;
    this.balanceData = null;
    this.plotDetail = null;
    this.plotDetailError = '';
    this.plotDetailLoading = true;
    this.cdr.detectChanges();

    const mandiId = row.mandiId || this.form.get('mandiId')?.value || this.selectedMandiId || 0;
    const plotTypeId = row.plotTypeId || 0;
    const plotSize = row.plotSize || '';

    this.propertyService
      .getPropertyDetailsByMandiPlot(mandiId, plotTypeId, plotNo, plotSize, true)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.plotDetailLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const d = res?.data ?? res;
          if (d) {
            this.balanceData = this.buildBalanceDataFromResponse(d, plotNo, row);
            this.plotDetail = this.balanceData.propertyInfo;
          } else {
            this.plotDetailError = 'No data found for this plot.';
          }
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.plotDetailError = err?.error?.message || 'Failed to load plot details. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  private buildBalanceDataFromResponse(d: any, plotNo: string, row: any): PropertyBalanceResponse {
    if (d.propertyInfo && d.initialDeposits) {
      return {
        ...d,
        propertyInfo: {
          ...d.propertyInfo,
          plotNo: d.propertyInfo.plotNo || plotNo || row.plotNo,
          plotType: d.propertyInfo.plotType || row.plotType,
          sizeOfPlot: d.propertyInfo.sizeOfPlot || row.plotSize,
          mandiName: d.propertyInfo.mandiName || row.mandi || this.selectedMandiLabel || this.selectedMandiName || '',
          fatherOrHusbandName: d.propertyInfo.fatherOrHusbandName || d.fatherOrHusbandName || d.FatherOrHusbandName || '',
        }
      };
    }

    const installments: any[] = Array.isArray(d.installments) ? d.installments : [];
    const sorted = [...installments].sort((a, b) =>
      new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
    );

    const scheduleRows: any[] = Array.isArray(d.installmentSchedules)
      ? d.installmentSchedules
      : Array.isArray(d.installments)
        ? d.installments.filter((item: any) =>
          item && (
            item.installmentNo !== undefined ||
            item.installmentLabel !== undefined ||
            item.calculatedDueDate !== undefined ||
            item.dueDate !== undefined ||
            item.basePrincipal !== undefined ||
            item.dueAmount !== undefined ||
            item.interest !== undefined ||
            item.totalEstimatedAmount !== undefined ||
            item.totalDueAmount !== undefined
          )
        )
        : [];

    const dueInstallments = scheduleRows.map((item: any, index: number) => ({
      installmentNo: item.installmentNo ?? item.installmentLabel ?? `Installment ${index + 1}`,
      dueDate: this.formatDate(item.calculatedDueDate ?? item.dueDate ?? item.due_date),
      dueAmount: this.coerceNumber(item.basePrincipal ?? item.baseAmount ?? item.dueAmount ?? item.principalAmount ?? 0),
      interest: this.coerceNumber(item.interest ?? item.interestAmount ?? item.accumulatedInterest ?? 0),
      totalDueAmount: this.coerceNumber(
        item.totalEstimatedAmount ?? item.totalDueAmount ?? item.totalWithInterest ??
        (this.coerceNumber(item.basePrincipal ?? item.baseAmount ?? item.dueAmount ?? item.principalAmount ?? 0) +
          this.coerceNumber(item.interest ?? item.interestAmount ?? item.accumulatedInterest ?? 0))
      )
    }));

    const plotTypeName = d.plotType ?? d.plotTypeName ?? row?.plotType ?? '';

    const initialDeposit = sorted[0]
      ? {
        receiptNo: sorted[0].receiptNo ?? '',
        receiptDate: this.formatDate(sorted[0].receiptDate),
        draftChequeRtgsNo: sorted[0].draftNo ?? sorted[0].draftChequeRtgsNo ?? '',
        draftChequeRtgsDate: this.formatDate(sorted[0].draftDate ?? sorted[0].draftChequeRtgsDate),
        paymentMode: sorted[0].paymentMode ?? '-',
        bank: sorted[0].draftBank ?? sorted[0].bank ?? '-',
        amount: Number(sorted[0].draftAmount ?? sorted[0].amount) || 0
      }
      : null;

    const installmentReceipts = sorted.slice(1).map((r: any) => ({
      receiptNo: r.receiptNo ?? '',
      receiptDate: this.formatDate(r.receiptDate),
      draftNo: r.draftNo ?? '',
      draftRtgsDate: this.formatDate(r.draftDate ?? r.draftRtgsDate),
      paymentMode: r.paymentMode ?? '-',
      draftRtgsBank: r.draftBank ?? r.draftRtgsBank ?? '-',
      draftAmount: Number(r.draftAmount) || 0
    }));

    const totalReceived = sorted.reduce(
      (sum, r) => sum + (Number(r.draftAmount ?? r.amount) || 0),
      0
    );
    const finalBidPrice = Number(d.finalBidPrice ?? d.allotmentAmount) || 0;
    const totalBalance = Math.max(finalBidPrice - totalReceived, 0);

    return {
      propertyInfo: {
        allotteeCode: d.propertyCode ?? d.allotteeCode ?? row?.alloteeCode ?? '',
        agencyName: d.agencyName ?? 'Mandi Board',
        mandiName: d.mandiName ?? row?.mandi ?? this.selectedMandiLabel ?? this.selectedMandiName ?? '',
        nameOfAllottee: d.bidderName ?? d.nameOfAllottee ?? d.alloteeName ?? row?.name ?? '',
        fatherOrHusbandName: d.fatherOrHusbandName ?? d.FatherOrHusbandName ?? d.guardianName ?? d.allotteeFatherName ?? '',
        plotNo: d.plotNo != null ? String(d.plotNo) : (plotNo || row?.plotNo || ''),
        address: d.address ?? '',
        sizeOfPlot: d.plotSize ?? (row?.plotSize || ''),
        plotType: plotTypeName || row?.plotType || '',
        allotmentDate: this.formatDate(d.allotmentDate || row?.allotmentDate),
        finalBidPrice: finalBidPrice || row?.allotmentPrice || 0,
        auctionDate: this.formatDate(d.auctionDate || row?.auctionDate)
      },
      initialDeposits: Array.isArray(d.initialDeposits) && d.initialDeposits.length ? d.initialDeposits : (initialDeposit ? [initialDeposit] : []),
      dueInstallments: Array.isArray(d.dueInstallments) && d.dueInstallments.length ? d.dueInstallments : dueInstallments,
      installmentReceipts: Array.isArray(d.installmentReceipts) && d.installmentReceipts.length ? d.installmentReceipts : installmentReceipts,
      futureInstallments: Array.isArray(d.futureInstallments) ? d.futureInstallments : [],
      otherAmounts: Array.isArray(d.otherAmounts) ? d.otherAmounts : [],
      interestAndPenaltyDetails: Array.isArray(d.interestAndPenaltyDetails)
        ? d.interestAndPenaltyDetails
        : Array.isArray(d.installmentCalculations)
          ? d.installmentCalculations
          : [],
      summary: d.summary ? d.summary : {
        rebate: 0,
        totalPaymentReceivedTillDate: totalReceived,
        totalBalanceFromSaleOfPlot: totalBalance,
        interestOnLateInstallments: 0,
        penaltyOnLateInstallments: 0,
        totalRecoverableAmount: totalBalance
      }
    };
  }
  get selectedMandiLabel(): string {
    const value = this.mandiControl?.value;
    if (!value) return '';
    const match = this.mandiOptions.find((m) => m.mandiId == value || m.value == value);
    return match?.mandiName ?? match?.label ?? '';
  }

  getTotal(rows: Array<Record<string, any>> | null | undefined, field: string): number {
    const safeRows = rows ?? [];
    return safeRows.reduce((sum, row) => sum + (Number(row?.[field]) || 0), 0);
  }

  getRateOfInterest(): number {
    const propertyDate =
      this.balanceData?.propertyInfo?.allotmentDate ||
      this.balanceData?.propertyInfo?.auctionDate ||
      '';

    if (!propertyDate) {
      return 0;
    }

    const dateParts = propertyDate.split('-');
    if (dateParts.length !== 3) {
      return 0;
    }

    const year = Number(dateParts[2]);
    if (isNaN(year)) {
      return 0;
    }

    return year < 1992 ? 6 : 12;
  }
}