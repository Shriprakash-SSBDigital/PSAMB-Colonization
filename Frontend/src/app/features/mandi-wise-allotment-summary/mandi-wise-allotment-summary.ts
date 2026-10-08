import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { finalize } from 'rxjs';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { MandiWiseService } from '../../core/service/Mandi-Wise-Summary-Service/mandi-wise-service';

export interface LookupItem {
  id: number;
  name: string;
}

export interface AllotmentRow {
  districtId?: number;
  branchId?: number;
  mandiId?: number;
  alloteeCode: string;
  name: string;
  district: string;
  mandi: string;
  plotType: string;
  plotNo: string;
  plotSize: string;
  auctionDate: string;
  allotmentDate: string;
  allotmentNo: string;
  allotmentPrice: number;
  branchName: string;
}

type SortKey = keyof AllotmentRow;

@Component({
  selector: 'app-mandi-wise-allotment-summary',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatPaginatorModule],
  templateUrl: './mandi-wise-allotment-summary.html',
  styleUrl: './mandi-wise-allotment-summary.scss',
})
export class MandiWiseAllotmentSummary implements OnInit {
  form!: FormGroup;

  districts: LookupItem[] = [];
  committees: LookupItem[] = [];
  mandis: LookupItem[] = [];

  isLoadingDistricts = false;
  isLoadingCommittees = false;
  isLoadingMandis = false;

  rows: AllotmentRow[] = [];
  searched = false;
  loading = false;

  pageIndex = 0;
  pageSize = 10;

  sortKey: SortKey | null = null;
  sortAsc = true;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private propertyService: Propertybidderregn,
    private mandiWiseService: MandiWiseService
  ) { }

  ngOnInit(): void {
    this.form = this.fb.group({
      districtId: [null, Validators.required],
      branchId: [{ value: null, disabled: true }],
      mandiId: [{ value: null, disabled: true }],
    });

    this.loadDistricts();
  }

  loadDistricts(): void {
    this.isLoadingDistricts = true;
    this.cdr.detectChanges();
    this.propertyService.getPropertyDistricts().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.districts = Array.isArray(list)
          ? list.map((d: any) => ({
            id: Number(d.districtId ?? d.DistrictId ?? d.id),
            name: d.districtName ?? d.DistrictName ?? d.name ?? '',
          }))
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

  loadMarketCommittees(districtId: number): void {
    this.isLoadingCommittees = true;
    const branchCtrl = this.form.get('branchId');
    branchCtrl?.disable({ emitEvent: false });
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
        this.isLoadingCommittees = false;
        branchCtrl?.enable({ emitEvent: false });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching market committees:', err);
        this.committees = [];
        this.isLoadingCommittees = false;
        branchCtrl?.enable({ emitEvent: false });
        this.cdr.detectChanges();
      },
    });
  }

  loadMandis(branchId: number): void {
    this.isLoadingMandis = true;
    const mandiCtrl = this.form.get('mandiId');
    mandiCtrl?.disable({ emitEvent: false });
    this.cdr.detectChanges();
    this.propertyService.getPropertyMandis(branchId).subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.mandis = Array.isArray(list)
          ? list.map((m: any) => ({
            id: Number(m.mandiId ?? m.MandiId ?? m.id),
            name: m.mandiName ?? m.MandiName ?? m.name ?? '',
          }))
          : [];
        this.isLoadingMandis = false;
        mandiCtrl?.enable({ emitEvent: false });
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching mandis:', err);
        this.mandis = [];
        this.isLoadingMandis = false;
        mandiCtrl?.enable({ emitEvent: false });
        this.cdr.detectChanges();
      },
    });
  }

  onDistrictChange(): void {
    const districtVal = this.form.get('districtId')?.value;
    const districtId = districtVal ? Number(districtVal) : null;
    const branch = this.form.get('branchId')!;
    const mandi = this.form.get('mandiId')!;

    this.committees = [];
    this.mandis = [];
    branch.reset(null, { emitEvent: false });
    mandi.reset(null, { emitEvent: false });
    mandi.disable();

    if (!districtId) {
      branch.disable();
      this.rows = [];
      this.searched = false;
      this.cdr.detectChanges();
      return;
    }

    this.loadMarketCommittees(districtId);
    this.updateData();
    this.cdr.detectChanges();
  }

  onCommitteeChange(): void {
    const branchVal = this.form.get('branchId')?.value;
    const branchId = branchVal ? Number(branchVal) : null;
    const mandi = this.form.get('mandiId')!;

    this.mandis = [];
    mandi.reset(null, { emitEvent: false });

    if (!branchId) {
      mandi.disable();
      this.updateData();
      this.cdr.detectChanges();
      return;
    }

    this.loadMandis(branchId);
    this.updateData();
    this.cdr.detectChanges();
  }

  onMandiChange(): void {
    this.updateData();
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.updateData();
    this.cdr.detectChanges();
  }

  updateData(): void {
    const filters = this.form.getRawValue();
    const districtId = filters.districtId ? Number(filters.districtId) : 0;
    const branchId = filters.branchId ? Number(filters.branchId) : 0;
    const mandiId = filters.mandiId ? Number(filters.mandiId) : 0;

    if (!districtId) {
      this.rows = [];
      this.searched = false;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.mandiWiseService.getMandiWiseAllotmentSummary(districtId, branchId, mandiId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const rawList = res?.data ?? (Array.isArray(res) ? res : []);
          const allList: AllotmentRow[] = Array.isArray(rawList)
            ? rawList.map((d: any) => this.mapToRow(d))
            : [];

          this.rows = allList;
          this.searched = true;
          this.pageIndex = 0;
          this.sortKey = null;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error fetching mandi wise allotment summary:', err);
          this.rows = [];
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
      allotmentNo: d.allotmentNo ?? d.AllotmentNo ?? d.allotteeCode ?? d.AllotteeCode ?? '-',
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
    this.form.reset({ districtId: null, branchId: null, mandiId: null });
    this.form.get('branchId')?.disable();
    this.form.get('mandiId')?.disable();
    this.committees = [];
    this.mandis = [];
    this.rows = [];
    this.searched = false;
    this.pageIndex = 0;
    this.sortKey = null;
    this.cdr.detectChanges();
  }

  sortBy(key: SortKey): void {
    this.sortAsc = this.sortKey === key ? !this.sortAsc : true;
    this.sortKey = key;
    this.pageIndex = 0;
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
    const start = this.pageIndex * this.pageSize;
    return this.sortedRows.slice(start, start + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.cdr.detectChanges();
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
    return this.mandis.find((m) => m.id === id)?.name ?? '';
  }

  trackByRow = (index: number, row: AllotmentRow): any => {
    return row.alloteeCode ? `${row.alloteeCode}_${index}` : index;
  };

  skeletonRows = Array.from({ length: 6 });
}