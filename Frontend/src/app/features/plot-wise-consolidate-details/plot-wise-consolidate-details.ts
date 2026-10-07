import { Component, OnDestroy, OnInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subject, takeUntil, finalize } from 'rxjs';
import { ReportService } from '../../core/service/ReportService/report.service';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';

export interface PlotSummaryRow {
  plotType: string;
  plotTypeId: number;
  plotSize: string;
  totalPlots: number;
  totalSoldPlots: number;
  totalUnsoldPlots: number;
  allPlots: string;
  soldPlots: string;
  unsoldPlots: string;
}

export interface MandiOption {
  mandiId: number;
  mandiName: string;
  districtId?: number;
  value: number | string;
  label: string;
}

@Component({
  selector: 'app-plot-wise-consolidate-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatPaginatorModule],
  templateUrl: './plot-wise-consolidate-details.html',
  styleUrl: './plot-wise-consolidate-details.scss',
})
export class PlotWiseConsolidateDetails implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  mandiOptions: MandiOption[] = [];

  allRows: PlotSummaryRow[] = [];
  pagedRows: PlotSummaryRow[] = [];

  loading = false;
  isLoadingMandis = false;
  searched = false;
  errorMessage = '';
  pageIndex = 0;
  pageSize = 10;
  selectedMandiId: number | null = null;
  selectedPlotNo: string = '';
  plotDetail: any = null;
  plotDetailLoading = false;
  plotDetailError = '';
  @ViewChild('plotDetailModal') plotDetailModalRef!: ElementRef;

  filterForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private service: Propertybidderregn,
    private cdr: ChangeDetectorRef
  ) {
    this.filterForm = this.fb.group({
      mandi: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadMandis();

    this.filterForm
      .get('mandi')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((mandi: string | number) => {
        if (mandi) {
          const found = this.mandiOptions.find((m) => m.value == mandi || m.mandiId == mandi);
          this.selectedMandiId = found?.mandiId ?? Number(mandi);
          this.fetchMandiSummary(mandi);
        } else {
          this.selectedMandiId = null;
          this.resetResults();
        }
      });
  }

  closePreviewModal(): void {
    this.plotDetail = null;
    this.plotDetailError = '';
    this.selectedPlotNo = '';
  }

  openPlotModal(plotNo: string, row: PlotSummaryRow): void {
    this.selectedPlotNo = plotNo;
    this.plotDetail = null;
    this.plotDetailError = '';
    this.plotDetailLoading = true;
    this.cdr.detectChanges();

    const mandiId    = this.selectedMandiId;
    const plotTypeId = row.plotTypeId;
    const plotSize   = row.plotSize;

    this.service
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
          this.plotDetail = {
            propertyCode:    d?.propertyCode    ?? d?.PropertyCode    ?? '',
            district:        d?.district        ?? d?.District        ?? '',
            marketCommittee: d?.marketCommittee ?? d?.MarketCommittee ?? '',
            mandi:           d?.mandi           ?? d?.Mandi           ?? '',
            plotNo:          d?.plotNo          ?? d?.PlotNo          ?? plotNo,
            plotType:        d?.plotType        ?? d?.PlotType        ?? row.plotType,
            plotSize:        d?.plotSize        ?? d?.PlotSize        ?? row.plotSize,
            plotStatus:      d?.plotStatus      ?? d?.PlotStatus      ?? 'Sold',
            plan:            d?.plan            ?? d?.Plan            ?? '',
            mandiCategory:   d?.mandiCategory   ?? d?.MandiCategory   ?? '',
            auctionDate:     d?.auctionDate     ?? d?.AuctionDate     ?? '',
            alloteeName:     d?.alloteeName     ?? d?.AlloteeName     ?? '',
            allotmentAmount: d?.allotmentAmount ?? d?.AllotmentAmount ?? '',
            allotmentDate:   d?.allotmentDate   ?? d?.AllotmentDate   ?? '',
            alloteeEmail:    d?.alloteeEmail    ?? d?.AlloteeEmail    ?? '',
            alloteePhone:    d?.alloteePhone    ?? d?.AlloteePhone    ?? '',
          };
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.plotDetailError = err?.error?.message || 'Failed to load plot details. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get mandiControl() {
    return this.filterForm.get('mandi');
  }

  get selectedMandiLabel(): string {
    const value = this.mandiControl?.value;
    if (!value) return '';
    const match = this.mandiOptions.find((m) => m.mandiId == value || m.value == value);
    return match?.mandiName ?? match?.label ?? '';
  }

  loadMandis(): void {
    this.isLoadingMandis = true;
    this.cdr.detectChanges();

    this.reportService
      .getMandisForPropertyReport()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingMandis = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const list = res?.data || (Array.isArray(res) ? res : []);
          this.mandiOptions = list.map((item: any) => ({
            mandiId: item.mandiId ?? item.MandiId,
            mandiName: item.mandiName ?? item.MandiName,
            districtId: item.districtId ?? item.DistrictId,
            value: item.mandiId ?? item.MandiId,
            label: item.mandiName ?? item.MandiName,
          }));
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error fetching mandis:', err);
          this.cdr.detectChanges();
        },
      });
  }

  private fetchMandiSummary(mandi: string | number): void {
    this.loading = true;
    this.searched = true;
    this.errorMessage = '';
    this.pageIndex = 0;
    this.cdr.detectChanges();

    this.reportService
      .getPlotWiseConsolidateDetails(mandi)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const list = res?.data || (Array.isArray(res) ? res : []);
          this.allRows = list.map((row: any) => ({
            plotType: row.plotType ?? row.PlotType ?? '',
            plotTypeId: Number(row.plotTypeId ?? row.PlotTypeId ?? 0),
            plotSize: row.plotSize ?? row.PlotSize ?? '',
            totalPlots: Number(row.totalPlots ?? row.TotalPlots ?? 0),
            totalSoldPlots: Number(row.totalSoldPlots ?? row.TotalSoldPlots ?? 0),
            totalUnsoldPlots: Number(row.totalUnsoldPlots ?? row.TotalUnsoldPlots ?? 0),
            allPlots: row.allPlots ?? row.AllPlots ?? '',
            soldPlots: row.soldPlots ?? row.SoldPlots ?? '',
            unsoldPlots: row.unsoldPlots ?? row.UnsoldPlots ?? '',
          }));

          if (this.allRows.length === 0 && res?.message) {
            this.errorMessage = res.message;
          }
          this.updatePagedRows();
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          this.errorMessage = err?.error?.message || 'Error fetching plot consolidate details.';
          this.allRows = [];
          this.pagedRows = [];
          this.cdr.detectChanges();
        },
      });
  }

  private resetResults(): void {
    this.allRows = [];
    this.pagedRows = [];
    this.searched = false;
    this.loading = false;
    this.errorMessage = '';
    this.pageIndex = 0;
    this.cdr.detectChanges();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagedRows();
    this.cdr.detectChanges();
  }

  private updatePagedRows(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.pagedRows = this.allRows.slice(start, end);
    this.cdr.detectChanges();
  }

  rowNumber(indexInPage: number): number {
    return this.pageIndex * this.pageSize + indexInPage + 1;
  }

  onClear(): void {
    this.filterForm.reset({ mandi: '' });
  }

  exportToExcel(): void {
    if (!this.allRows.length) return;

    const totalPlots = this.totalTotalPlots;
    const soldPlots = this.totalSoldPlots;
    const unsoldPlots = this.totalUnsoldPlots;

    let tableRows = '';
    for (const r of this.allRows) {
      tableRows += `
        <tr>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.plotType || ''}</td>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.plotSize || ''}</td>
          <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${r.totalPlots ?? 0}</td>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.allPlots || ''}</td>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.soldPlots || ''}</td>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.unsoldPlots || ''}</td>
        </tr>`;
    }

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sheet1</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          th { border: 1px solid black; font-weight: bold; background-color: #ffffff; padding: 4px 6px; }
          td { padding: 4px 6px; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr>
            <th style="border: 1px solid black; text-align: left;">Plot Type</th>
            <th style="border: 1px solid black; text-align: left;">Plot Size</th>
            <th style="border: 1px solid black; text-align: left;">Total Plot</th>
            <th style="border: 1px solid black; text-align: left;">AllPlotsNumber</th>
            <th style="border: 1px solid black; text-align: left;">Sold Plots</th>
            <th style="border: 1px solid black; text-align: left;">UnSold Plots</th>
          </tr>
          ${tableRows}
          <tr>
            <td style="border: 1px solid black;"></td>
            <td style="border: 1px solid black; font-weight: bold; text-align: right;">Total</td>
            <td style="border: 1px solid black; font-weight: bold; text-align: right; mso-number-format: '#,##0';">${totalPlots}</td>
            <td style="border: 1px solid black;"></td>
            <td style="border: 1px solid black; font-weight: bold; text-align: right; mso-number-format: '#,##0';">${soldPlots}</td>
            <td style="border: 1px solid black; font-weight: bold; text-align: right; mso-number-format: '#,##0';">${unsoldPlots}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `PlotWiseConsolidateDetails_${this.selectedMandiLabel || 'Report'}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printTable(): void {
    window.print();
  }

  get totalTotalPlots(): number {
    return this.allRows.reduce((sum, r) => sum + (Number(r.totalPlots) || 0), 0);
  }
  get totalSoldPlots(): number {
    return this.allRows.reduce((sum, r) => sum + (Number(r.totalSoldPlots) || 0), 0);
  }
  get totalUnsoldPlots(): number {
    return this.allRows.reduce((sum, r) => sum + (Number(r.totalUnsoldPlots) || 0), 0);
  }
}