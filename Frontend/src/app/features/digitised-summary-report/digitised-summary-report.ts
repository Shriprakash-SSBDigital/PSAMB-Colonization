import { Component, ChangeDetectorRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { ReportService } from '../../core/service/ReportService/report.service';

export interface SummaryRow {
  date: string;
  rawDate: string;
  count: number;
}

export interface DetailRow {
  propertyCode: string;
}

// Group validator: From Date must not be after To Date
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value;
  const to = group.get('toDate')?.value;
  return from && to && from > to ? { dateRange: true } : null;
}

// Format any date value strictly to YYYY-MM-DD (e.g. 2015-01-09)
function formatDateToYYYYMMDD(dateVal: any): string {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-digitised-summary-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  templateUrl: './digitised-summary-report.html',
  styleUrl: './digitised-summary-report.scss',
})
export class DigitisedSummaryReport implements OnInit {
  private reportService = inject(ReportService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  // Main Summary Table
  displayedColumns: string[] = ['index', 'date', 'count', 'action'];
  dataSource = new MatTableDataSource<SummaryRow>([]);
  loading = false;

  pageIndex = 0;
  pageSize = 10;

  // Detail Modal State
  showDetailsModal = false;
  loadingDetails = false;
  loadingRowDate: string | null = null;
  private detailCache = new Map<string, DetailRow[]>();
  selectedDetailDate = '';
  selectedDetailCount = 0;
  detailRows: DetailRow[] = [];
  filteredDetailRows: DetailRow[] = [];
  detailSearchTerm = '';
  detailDisplayedColumns: string[] = ['index', 'propertyCode'];
  detailDataSource = new MatTableDataSource<DetailRow>([]);
  detailPageIndex = 0;
  detailPageSize = 10;
  copiedPropertyCode: string | null = null;

  @ViewChild('mainPaginator') set paginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
    }
  }

  @ViewChild('detailPaginator') set detailPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.detailDataSource.paginator = p;
    }
  }

  filterForm = this.fb.group(
    {
      fromDate: [this.defaultFromDate(), Validators.required],
      toDate: [formatDateToYYYYMMDD(new Date()), Validators.required],
    },
    { validators: dateRangeValidator }
  );

  ngOnInit(): void {
    this.search();
  }

  get f() {
    return this.filterForm.controls;
  }

  get rows(): SummaryRow[] {
    return this.dataSource.data;
  }

  get totalCount(): number {
    return this.rows.reduce((sum, r) => sum + r.count, 0);
  }

  get activeDays(): number {
    const fromVal = this.filterForm.get('fromDate')?.value;
    const toVal = this.filterForm.get('toDate')?.value;
    if (!fromVal || !toVal) return 0;

    const from = new Date(fromVal);
    const to = new Date(toVal);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return 0;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((to.getTime() - from.getTime()) / msPerDay) + 1;
  }

  serialNo(index: number): number {
    return this.pageIndex * this.pageSize + index + 1;
  }

  detailSerialNo(index: number): number {
    return this.detailPageIndex * this.detailPageSize + index + 1;
  }

  search(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { fromDate, toDate } = this.filterForm.getRawValue();
    const formattedFrom = formatDateToYYYYMMDD(fromDate);
    const formattedTo = formatDateToYYYYMMDD(toDate);

    this.loading = true;
    this.pageIndex = 0;
    this.detailCache.clear();

    this.reportService
      .getDigitizationPropertyDayWiseCountAsync(formattedFrom, formattedTo)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const rawList = res?.data ?? (Array.isArray(res) ? res : []);
          const mappedRows: SummaryRow[] = Array.isArray(rawList)
            ? rawList.map((item: any) => {
                const dateStr = formatDateToYYYYMMDD(item.createdDate ?? item.CreatedDate);
                return {
                  date: dateStr,
                  rawDate: dateStr,
                  count: Number(item.count ?? item.Count ?? 0),
                };
              })
            : [];

          this.dataSource.data = mappedRows;
          this.pageIndex = 0;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error fetching digitization property day-wise count:', err);
          this.dataSource.data = [];
          this.cdr.detectChanges();
        },
      });
  }

  viewDetail(row: SummaryRow): void {
    const formattedDate = formatDateToYYYYMMDD(row.rawDate || row.date);
    this.selectedDetailDate = formattedDate;
    this.selectedDetailCount = row.count;
    this.loadingRowDate = formattedDate;
    this.showDetailsModal = true;
    this.detailSearchTerm = '';
    this.detailPageIndex = 0;
    this.copiedPropertyCode = null;

    // Check if data is already cached
    if (this.detailCache.has(formattedDate)) {
      const cached = this.detailCache.get(formattedDate)!;
      this.detailRows = [...cached];
      this.filteredDetailRows = [...cached];
      this.detailDataSource.data = this.filteredDetailRows;
      this.loadingDetails = false;
      this.loadingRowDate = null;
      this.cdr.detectChanges();
      return;
    }

    this.loadingDetails = true;
    this.detailRows = [];
    this.filteredDetailRows = [];
    this.detailDataSource.data = [];
    this.cdr.detectChanges();

    this.reportService
      .getDigitizationPropertyDayWiseCountDetailsAsync(formattedDate)
      .pipe(
        finalize(() => {
          this.loadingDetails = false;
          this.loadingRowDate = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          const rawList = res?.data ?? (Array.isArray(res) ? res : []);
          this.detailRows = Array.isArray(rawList)
            ? rawList.map((d: any) => ({
                propertyCode: d.propertyCode ?? d.PropertyCode ?? '-',
              }))
            : [];
          this.detailCache.set(formattedDate, [...this.detailRows]);
          this.filteredDetailRows = [...this.detailRows];
          this.detailDataSource.data = this.filteredDetailRows;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error fetching digitization property details:', err);
          this.detailRows = [];
          this.filteredDetailRows = [];
          this.detailDataSource.data = [];
          this.cdr.detectChanges();
        },
      });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.copiedPropertyCode = null;
    this.cdr.detectChanges();
  }

  onDetailSearch(event: Event): void {
    const term = (event.target as HTMLInputElement)?.value?.trim().toLowerCase() || '';
    this.detailSearchTerm = term;
    if (!term) {
      this.filteredDetailRows = [...this.detailRows];
    } else {
      this.filteredDetailRows = this.detailRows.filter((r) =>
        r.propertyCode.toLowerCase().includes(term)
      );
    }
    this.detailDataSource.data = this.filteredDetailRows;
    this.detailPageIndex = 0;
    if (this.detailDataSource.paginator) {
      this.detailDataSource.paginator.firstPage();
    }
    this.cdr.detectChanges();
  }

  copyToClipboard(code: string): void {
    if (!code || code === '-') return;
    navigator.clipboard?.writeText(code).then(() => {
      this.copiedPropertyCode = code;
      setTimeout(() => {
        if (this.copiedPropertyCode === code) {
          this.copiedPropertyCode = null;
          this.cdr.detectChanges();
        }
      }, 2000);
      this.cdr.detectChanges();
    });
  }

  onDetailPageChange(event: PageEvent): void {
    this.detailPageSize = event.pageSize;
    this.detailPageIndex = event.pageIndex;
    this.cdr.detectChanges();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.cdr.detectChanges();
  }

  exportExcel(): void {
    if (this.filterForm.invalid || !this.rows.length) return;
    const { fromDate, toDate } = this.filterForm.getRawValue();
    const formattedFrom = formatDateToYYYYMMDD(fromDate);
    const formattedTo = formatDateToYYYYMMDD(toDate);

    let tableRows = '';
    this.rows.forEach((r, idx) => {
      tableRows += `
        <tr>
          <td style="border: 1px solid black; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid black; text-align: center; mso-number-format: '\\@';">${r.date}</td>
          <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${r.count}</td>
        </tr>`;
    });

    tableRows += `
      <tr style="font-weight: bold; background-color: #f1f5f9;">
        <td colspan="2" style="border: 1px solid black; text-align: right;">Total</td>
        <td style="border: 1px solid black; text-align: right; mso-number-format: '#,##0';">${this.totalCount}</td>
      </tr>`;

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
          <thead>
            <tr>
              <th style="border: 1px solid black; text-align: center;">S.No</th>
              <th style="border: 1px solid black; text-align: center;">Date</th>
              <th style="border: 1px solid black; text-align: right;">Count</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>`;

    this.downloadExcelBlob(excelHtml, `Digitization_Property_Summary_${formattedFrom}_to_${formattedTo}.xls`);
  }

  exportDetailsExcel(): void {
    if (!this.filteredDetailRows.length) return;

    let tableRows = '';
    this.filteredDetailRows.forEach((r, idx) => {
      tableRows += `
        <tr>
          <td style="border: 1px solid black; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid black; text-align: left; mso-number-format: '\\@';">${r.propertyCode}</td>
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
          <thead>
            <tr>
              <th style="border: 1px solid black; text-align: center;">S.No</th>
              <th style="border: 1px solid black; text-align: left;">Property Code</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>`;

    this.downloadExcelBlob(excelHtml, `Digitization_Property_Details_${this.selectedDetailDate}.xls`);
  }

  private downloadExcelBlob(html: string, fileName: string): void {
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private defaultFromDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return formatDateToYYYYMMDD(d);
  }
}