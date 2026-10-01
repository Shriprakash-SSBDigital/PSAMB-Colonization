import { Component, ChangeDetectorRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, delay, finalize, of } from 'rxjs';

export interface PlotRow {
  district: string;
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
  private route = inject(ActivatedRoute);

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
  reportDate = '';

  pageIndex = 0;
  pageSize = 10;

  districtCtrl = new FormControl('', { nonNullable: true });
  mcCtrl = new FormControl('', { nonNullable: true });

  allDistricts: string[] = [];
  allCommittees: string[] = [];

  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
    }
  }

  get hasData(): boolean {
    return this.dataSource.data.length > 0;
  }

  get filtered(): PlotRow[] {
    return this.dataSource.filteredData;
  }

  get totalPlots(): number {
    return this.filtered.reduce((s, r) => s + r.totalPlots, 0);
  }

  get totalSold(): number {
    return this.filtered.reduce((s, r) => s + r.soldPlots, 0);
  }

  get totalUnsold(): number {
    return this.filtered.reduce((s, r) => s + r.unsoldPlots, 0);
  }

  percent(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  serialNo(index: number): number {
    return this.pageIndex * this.pageSize + index + 1;
  }

  ngOnInit(): void {
    this.reportDate = this.route.snapshot.queryParamMap.get('date') ?? '';

    this.dataSource.filterPredicate = (row: PlotRow) => {
      const selectedDist = this.districtCtrl.value.trim().toLowerCase();
      const selectedMc = this.mcCtrl.value.trim().toLowerCase();

      const matchDist = !selectedDist || row.district.toLowerCase() === selectedDist;
      const matchMc = !selectedMc || row.mcName.toLowerCase() === selectedMc;
      return matchDist && matchMc;
    };

    this.load();
  }

  load(): void {
    this.loading = true;
    this.fetchReport(this.reportDate)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.allRows = res || [];
          this.dataSource.data = this.allRows;
          this.populateDropdowns();
          this.applyFilters();
        },
        error: () => {
          this.allRows = [];
          this.dataSource.data = [];
        },
      });
  }

  populateDropdowns(): void {
    this.allDistricts = Array.from(
      new Set(this.allRows.map((r) => r.district).filter(Boolean)),
    ).sort();
    this.updateCommitteesList();
  }

  updateCommitteesList(): void {
    const selectedDist = this.districtCtrl.value;
    const rows = selectedDist
      ? this.allRows.filter((r) => r.district === selectedDist)
      : this.allRows;
    this.allCommittees = Array.from(new Set(rows.map((r) => r.mcName).filter(Boolean))).sort();

    if (this.mcCtrl.value && !this.allCommittees.includes(this.mcCtrl.value)) {
      this.mcCtrl.setValue('');
    }
  }

  onDistrictChange(): void {
    this.updateCommitteesList();
    this.applyFilters();
  }

  onMcChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.districtCtrl.setValue('');
    this.mcCtrl.setValue('');
    this.updateCommitteesList();
    this.applyFilters();
  }

  applyFilters(): void {
    const filterKey = `${this.districtCtrl.value}|${this.mcCtrl.value}`;
    this.dataSource.filter = filterKey;
    this.pageIndex = 0;
    this.cdr.detectChanges();
  }

  exportExcel(): void {
    if (!this.filtered.length) return;
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.cdr.detectChanges();
  }

  private fetchReport(date: string): Observable<PlotRow[]> {
    const mock: PlotRow[] = [
      {
        district: 'AMRITSAR',
        mcName: 'AMRITSAR-I',
        totalPlots: 200,
        soldPlots: 106,
        unsoldPlots: 94,
      },
      {
        district: 'AMRITSAR',
        mcName: 'AMRITSAR-II',
        totalPlots: 46,
        soldPlots: 35,
        unsoldPlots: 11,
      },
      { district: 'AMRITSAR', mcName: 'MAJITHA', totalPlots: 116, soldPlots: 82, unsoldPlots: 34 },
      { district: 'AMRITSAR', mcName: 'RAYYA', totalPlots: 685, soldPlots: 551, unsoldPlots: 134 },
      { district: 'AMRITSAR', mcName: 'AJNALA', totalPlots: 331, soldPlots: 209, unsoldPlots: 122 },
      { district: 'AMRITSAR', mcName: 'ATTARI', totalPlots: 1, soldPlots: 1, unsoldPlots: 0 },
      {
        district: 'JALANDHAR',
        mcName: 'JALANDHAR CITY',
        totalPlots: 160,
        soldPlots: 98,
        unsoldPlots: 62,
      },
      { district: 'JALANDHAR', mcName: 'NAKODAR', totalPlots: 46, soldPlots: 0, unsoldPlots: 46 },
      { district: 'LUDHIANA', mcName: 'KHANNA', totalPlots: 317, soldPlots: 121, unsoldPlots: 196 },
      { district: 'PATIALA', mcName: 'NABHA', totalPlots: 1, soldPlots: 1, unsoldPlots: 0 },
    ];
    return of(mock).pipe(delay(400));
  }
}
