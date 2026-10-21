import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PropertyBalanceResponse } from '../../models/property-balance-calculatation.model';

@Component({
  selector: 'app-plot-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plot-details-modal.html',
  styleUrl: './plot-details-modal.scss',
})
export class PlotDetailsModal {
  @Input() balanceData: PropertyBalanceResponse | null = null;
  @Input() plotDetailLoading: boolean = false;
  @Input() plotDetailError: string = '';
  @Input() selectedPlotNo: string = '';
  @Input() header: string = 'Plot Details';

  @Output() modalClosed = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) { }

  onModalClose(): void {
    this.modalClosed.emit();
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

    return (year <= 1992) ? 6 : 12;
  }
}
