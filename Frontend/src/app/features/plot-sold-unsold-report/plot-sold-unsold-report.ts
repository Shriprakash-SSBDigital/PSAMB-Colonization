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

  districtCtrl = new FormControl('', { nonNullable: true });
  mcCtrl = new FormControl('', { nonNullable: true });

  districts: LookupItem[] = [];
  committees: LookupItem[] = [];

  isLoadingDistricts = false;
  isLoadingCommittees = false;

  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
    }
  }

  get hasData(): boolean {
    return this.dataSource.data.length > 0;
  }

  get filtered(): PlotRow[] {
    return this.dataSource.data;
  }

  get totalPlots(): number {
    return this.allRows.reduce((s, r) => s + (r.totalPlots || 0), 0);
  }

  get totalSold(): number {
    return this.allRows.reduce((s, r) => s + (r.soldPlots || 0), 0);
  }

  get totalUnsold(): number {
    return this.allRows.reduce((s, r) => s + (r.unsoldPlots || 0), 0);
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

  loadData(): void {
    this.loading = true;
    const districtId = Number(this.districtCtrl.value) || 0;
    const branchId = Number(this.mcCtrl.value) || 0;

    this.reportService
      .getPlotSoldUnsoldDetails(districtId, branchId)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res: any) => {
          const rawList = res?.data ?? (Array.isArray(res) ? res : []);
          this.allRows = Array.isArray(rawList)
            ? rawList.map((item: any) => ({
                srNo: item.srNo ?? item.SrNo ?? 0,
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
          this.pageIndex = 0;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error fetching plot sold unsold details:', err);
          this.allRows = [];
          this.dataSource.data = [];
          this.pageIndex = 0;
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
    this.loadData();
  }

  onMcChange(): void {
    this.loadData();
  }

  clearFilters(): void {
    this.districtCtrl.setValue('');
    this.mcCtrl.setValue('');
    this.committees = [];
    this.loadData();
  }

  exportExcel(): void {
    if (!this.allRows.length) return;

    const totalPlots = this.totalPlots;
    const totalSold = this.totalSold;
    const totalUnsold = this.totalUnsold;

    let tableRows = '';
    this.allRows.forEach((r, idx) => {
      tableRows += `
        <tr>
          <td style="border: 1px solid black; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.district || ''}</td>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.mcName || ''}</td>
          <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${r.totalPlots ?? 0}</td>
          <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${r.soldPlots ?? 0}</td>
          <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${r.unsoldPlots ?? 0}</td>
        </tr>`;
    });

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          th { border: 1px solid black; font-weight: bold; background-color: #d1e7dd; padding: 6px 10px; }
          td { padding: 6px 10px; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <th colspan="6" style="font-size: 14pt; text-align: center; height: 30px;">Plot Sold/Unsold Details</th>
          </tr>
          <tr>
            <th style="border: 1px solid black; text-align: center;">Sr. No</th>
            <th style="border: 1px solid black; text-align: left;">District</th>
            <th style="border: 1px solid black; text-align: left;">Market Committee</th>
            <th style="border: 1px solid black; text-align: right;">Total Plots</th>
            <th style="border: 1px solid black; text-align: right;">Sold Plots</th>
            <th style="border: 1px solid black; text-align: right;">Unsold Plots</th>
          </tr>
          ${tableRows}
          <tr style="font-weight: bold; background-color: #f8f9fa;">
            <td style="border: 1px solid black; text-align: center;" colspan="3">Total</td>
            <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${totalPlots}</td>
            <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${totalSold}</td>
            <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${totalUnsold}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `PlotSoldUnsoldDetails_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.cdr.detectChanges();
  }
}
