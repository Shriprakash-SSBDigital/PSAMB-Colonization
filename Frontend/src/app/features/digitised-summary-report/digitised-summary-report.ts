import { Component, ChangeDetectorRef, ViewChild, inject } from '@angular/core';
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
import { Observable, delay, finalize, of } from 'rxjs';

export interface SummaryRow {
  date: string;
  count: number;
}

// Group validator: From Date must not be after To Date
function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const from = group.get('fromDate')?.value;
  const to = group.get('toDate')?.value;
  return from && to && from > to ? { dateRange: true } : null;
}

// Local-time yyyy-MM-dd (safe for IST, unlike toISOString)
function toInputDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
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
export class DigitisedSummaryReport {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  displayedColumns: string[] = ['index', 'date', 'count', 'action'];
  dataSource = new MatTableDataSource<SummaryRow>([]);
  loading = false;

  pageIndex = 0;
  pageSize = 10;

  // Paginator lives inside an *ngIf, so attach it with a setter
  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
    }
  }

  filterForm = this.fb.group(
    {
      fromDate: [this.defaultFromDate(), Validators.required],
      toDate: [toInputDate(new Date()), Validators.required],
    },
    { validators: dateRangeValidator }
  );

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

  search(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    const { fromDate, toDate } = this.filterForm.getRawValue();

    this.loading = true;
    this.pageIndex = 0;

    this.fetchReport(fromDate!, toDate!)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          this.dataSource.data = res;
        },
        error: () => {
          this.dataSource.data = [];
        },
      });
  }

  exportExcel(): void {
    if (this.filterForm.invalid || !this.rows.length) return;
    const { fromDate, toDate } = this.filterForm.getRawValue();
  }

  viewDetail(row: SummaryRow): void {
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.cdr.detectChanges();
  }

  private fetchReport(from: string, to: string): Observable<SummaryRow[]> {
    const mock: SummaryRow[] = [
      { date: '06/08/2026', count: 2 },
      { date: '07/08/2026', count: 1 },
      { date: '10/08/2026', count: 1 },
      { date: '19/08/2026', count: 1 },
      { date: '21/08/2026', count: 1 },
      { date: '26/08/2026', count: 1 },
      { date: '15/09/2026', count: 305 },
      { date: '16/09/2026', count: 4 },
      { date: '17/09/2026', count: 56 },
      { date: '23/09/2026', count: 1 },
      { date: '28/09/2026', count: 2 },
    ];
    return of(mock).pipe(delay(500));
  }

  private defaultFromDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return toInputDate(d);
  }
}