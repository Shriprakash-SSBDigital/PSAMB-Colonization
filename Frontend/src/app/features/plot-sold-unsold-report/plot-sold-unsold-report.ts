import { Component, ChangeDetectorRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { ReportService } from '../../core/service/ReportService/report.service';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';

export interface LookupItem {
  id: number;
  name: string;
}

export interface PlotRow {
  srNo?: number;
  districtId?: number;
  district: string;
  branchId?: number;
  mcName: string;
  totalPlots: number;
  soldPlots: number;
  unsoldPlots: number;
}

@Component({
  selector: 'app-plot-sold-unsold-report',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  standalone: true,
  templateUrl: './plot-sold-unsold-report.html',
  styleUrl: './plot-sold-unsold-report.scss',
})
export class PlotSoldUnsoldReport implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private reportService = inject(ReportService);
  private propertyService = inject(Propertybidderregn);

  displayedColumns: string[] = [
    'index',
    'district',
    'mcName',
    'totalPlots',
    'soldPlots',
    'unsoldPlots',
  ];
  dataSource = new MatTableDataSource<PlotRow>([]);
  allRows: PlotRow[] = [];
  loading = false;

  pageIndex = 0;
  pageSize = 10;
  totalRecords = 0;
  overallTotalPlots = 0;
  overallSoldPlots = 0;
  overallUnsoldPlots = 0;
  isExportingExcel = false;
  isExportingPdf = false;

  districtCtrl = new FormControl('', { nonNullable: true });
  mcCtrl = new FormControl('', { nonNullable: true });

  districts: LookupItem[] = [];
  committees: LookupItem[] = [];

  isLoadingDistricts = false;
  isLoadingCommittees = false;

  get hasData(): boolean {
    return this.dataSource.data.length > 0;
  }

  get filtered(): PlotRow[] {
    return this.dataSource.data;
  }

  get totalPlots(): number {
    return this.overallTotalPlots || this.allRows.reduce((s, r) => s + (r.totalPlots || 0), 0);
  }

  get totalSold(): number {
    return this.overallSoldPlots || this.allRows.reduce((s, r) => s + (r.soldPlots || 0), 0);
  }

  get totalUnsold(): number {
    return this.overallUnsoldPlots || this.allRows.reduce((s, r) => s + (r.unsoldPlots || 0), 0);
  }

  percent(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  serialNo(index: number): number {
    return this.pageIndex * this.pageSize + index + 1;
  }

  ngOnInit(): void {
    this.loadDistricts();
    this.loadData();
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

  loadData(resetPage: boolean = false): void {
    if (resetPage) {
      this.pageIndex = 0;
    }
    this.loading = true;
    const districtId = Number(this.districtCtrl.value) || 0;
    const branchId = Number(this.mcCtrl.value) || 0;
    const pageNumber = this.pageIndex + 1;

    this.reportService
      .getPlotSoldUnsoldDetails(districtId, branchId, pageNumber, this.pageSize)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res: any) => {
          const pagedData = res?.data ?? res;
          const rawList = pagedData?.data ?? (Array.isArray(pagedData) ? pagedData : []);

          this.totalRecords = Number(
            pagedData?.totalRecords ??
            pagedData?.TotalRecords ??
            (rawList.length > 0 ? (rawList[0]?.totalRecords ?? rawList[0]?.TotalRecords ?? rawList.length) : 0)
          );

          this.overallTotalPlots = Number(pagedData?.overallTotalPlots ?? pagedData?.OverallTotalPlots ?? 0);
          this.overallSoldPlots = Number(pagedData?.overallSoldPlots ?? pagedData?.OverallSoldPlots ?? 0);
          this.overallUnsoldPlots = Number(pagedData?.overallUnsoldPlots ?? pagedData?.OverallUnsoldPlots ?? 0);

          this.allRows = Array.isArray(rawList)
            ? rawList.map((item: any, idx: number) => ({
                srNo: item.srNo ?? item.SrNo ?? (this.pageIndex * this.pageSize + idx + 1),
                districtId: item.districtId ?? item.DistrictId ?? 0,
                district: item.districtName ?? item.DistrictName ?? item.district ?? '',
                branchId: item.branchId ?? item.BranchId ?? 0,
                mcName: item.marketCommittee ?? item.MarketCommittee ?? item.mcName ?? '',
                totalPlots: Number(item.totalPlots ?? item.TotalPlots ?? 0),
                soldPlots: Number(item.soldPlots ?? item.SoldPlots ?? 0),
                unsoldPlots: Number(item.unsoldPlots ?? item.UnsoldPlots ?? 0),
              }))
            : [];

          this.dataSource.data = this.allRows;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error fetching plot sold unsold details:', err);
          this.allRows = [];
          this.dataSource.data = [];
          this.totalRecords = 0;
          this.overallTotalPlots = 0;
          this.overallSoldPlots = 0;
          this.overallUnsoldPlots = 0;
          this.cdr.detectChanges();
        },
      });
  }

  onDistrictChange(): void {
    const districtId = Number(this.districtCtrl.value) || 0;
    this.mcCtrl.setValue('');
    this.committees = [];

    if (districtId > 0) {
      this.loadMarketCommittees(districtId);
    }
    this.loadData(true);
  }

  onMcChange(): void {
    this.loadData(true);
  }

  clearFilters(): void {
    this.districtCtrl.setValue('');
    this.mcCtrl.setValue('');
    this.committees = [];
    this.loadData(true);
  }

  exportToExcel(): void {
    if (!this.totalRecords && !this.allRows.length) return;

    const districtId = Number(this.districtCtrl.value) || 0;
    const branchId = Number(this.mcCtrl.value) || 0;

    this.isExportingExcel = true;
    this.cdr.detectChanges();

    this.reportService
      .exportPlotSoldUnsoldDetails(districtId, branchId)
      .pipe(
        finalize(() => {
          this.isExportingExcel = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const timestamp = new Date().toISOString().split('T')[0];
          link.download = `PlotSoldUnsoldDetails_${timestamp}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err: any) => {
          console.error('Error downloading Excel file:', err);
          alert('Failed to export Excel file. Please try again.');
        },
      });
  }

  exportToPdf(): void {
    if (!this.totalRecords && !this.allRows.length) return;

    const districtId = Number(this.districtCtrl.value) || 0;
    const branchId = Number(this.mcCtrl.value) || 0;

    this.isExportingPdf = true;
    this.cdr.detectChanges();

    this.reportService
      .exportPlotSoldUnsoldDetailsPdf(districtId, branchId)
      .pipe(
        finalize(() => {
          this.isExportingPdf = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const timestamp = new Date().toISOString().split('T')[0];
          link.download = `PlotSoldUnsoldDetails_${timestamp}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err: any) => {
          console.error('Error downloading PDF file:', err);
          alert('Failed to export PDF file. Please try again.');
        },
      });
  }

  // Alias for backward compatibility if template calls exportExcel
  exportExcel(): void {
    this.exportToExcel();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadData();
  }
}
