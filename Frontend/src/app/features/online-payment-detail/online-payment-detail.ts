import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
 
interface PlotOption {
  plotNo: string;
  label: string;
}
 
interface PlotDetail {
  mandiName: string;
  plotNo: string;
  plotType: string;
  plotSize: string;
  reservePrice: number;
  salesAmount: number;
  initial25Amount: number;
  emdAmount: number;
  processingFees: number;
  initialPayableAmount: number;
  initialPenalty: number;
  totalToBePaidInitially: number;
  auctionDate: string;
  allotmentDate: string;
}
 
interface PaymentRecord {
  dateOfPayment: string;
  transactionRef: string;
  paymentType: string;
  paymentMode: string;
  status: 'Success' | 'Pending' | 'Failed';
  amount: number;
}
 
type PaymentTabKey = 'successful' | 'history' | 'installments' | 'awaited';
 
interface PaymentTab {
  key: PaymentTabKey;
  label: string;
  icon: string;
}
 
interface InstallmentRow {
  installmentNo: number;
  dueDate: string;
  principal: number;
  interest: number;
  totalDue: number;
  status: 'Paid' | 'Due' | 'Overdue';
}
 
@Component({
  selector: 'app-online-payment-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './online-payment-detail.html',
  styleUrl: './online-payment-detail.scss',
})
export class OnlinePaymentDetail implements OnInit, AfterViewInit {
 
  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService
  ) {}
 
  filterForm!: FormGroup;
  plotOptions: PlotOption[] = [
    { plotNo: '1', label: 'Plot No. 1' },
    { plotNo: '2', label: 'Plot No. 2' },
    { plotNo: '3', label: 'Plot No. 3' }
  ];
 
  paymentTypes: string[] = ['Installment', 'Full & Final Payment', 'Penalty Payment'];
  plotDetail: PlotDetail | null = null;
  //payments tabs icons
  tabs: PaymentTab[] = [
    { key: 'successful', label: 'Payment Successful', icon: 'fa-circle-check' },
    { key: 'history', label: 'Payment History', icon: 'fa-clock-rotate-left' },
    { key: 'installments', label: 'Installment Details', icon: 'fa-list-ol' },
    { key: 'awaited', label: 'Awaited / Failure', icon: 'fa-triangle-exclamation' }
  ];
  activeTab: PaymentTabKey = 'successful';
 
  successfulPayments: PaymentRecord[] = [];
  paymentHistory: PaymentRecord[] = [];
  awaitedFailures: PaymentRecord[] = [];
  installmentSchedule: InstallmentRow[] = [];
  loading = false;
 
  ngOnInit(): void {
    this.filterForm = this.fb.group({
      plotNo: [null, Validators.required],
      paymentType: [{ value: null, disabled: true }, Validators.required],
      totalAmount: [{ value: null, disabled: true }]
    });
 
    this.filterForm.get('plotNo')!.valueChanges.subscribe((plotNo: string | null) => {
      this.onPlotSelected(plotNo);
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.showUnderConstructionDialog();
    }, 100);
  }

  showUnderConstructionDialog(): void {
    this.confirmationService.confirm({
      header: 'Page Under Construction',
      message: 'Online Payment Detail page is currently under construction and not yet fully completed.',
      icon: 'fa-solid fa-triangle-exclamation text-warning fs-3 me-2',
      acceptLabel: 'OK',
      rejectVisible: false,
      acceptButtonStyleClass: 'btn btn-success px-4',
    });
  }
 
  get plotNoControl() {
    return this.filterForm.get('plotNo')!;
  }
 
  get paymentTypeControl() {
    return this.filterForm.get('paymentType')!;
  }
 
  get totalAmountControl() {
    return this.filterForm.get('totalAmount')!;
  }
 
  private onPlotSelected(plotNo: string | null): void {
    if (!plotNo) {
      this.plotDetail = null;
      this.paymentTypeControl.disable();
      this.paymentTypeControl.reset();
      this.totalAmountControl.disable();
      this.totalAmountControl.reset();
      return;
    }
 
    this.loading = true;
    this.paymentTypeControl.reset();
 
    setTimeout(() => {
      this.plotDetail = this.getMockPlotDetail(plotNo);
 
      this.paymentTypeControl.enable();
      this.totalAmountControl.enable();
      this.totalAmountControl.setValue(this.plotDetail.totalToBePaidInitially);
      this.totalAmountControl.disable(); 
 
      this.successfulPayments = this.getMockSuccessfulPayments();
      this.paymentHistory = this.successfulPayments;
      this.awaitedFailures = this.getMockAwaitedFailures();
      this.installmentSchedule = this.getMockInstallmentSchedule();
      this.loading = false;
    }, 300);
  }
 
  setActiveTab(tab: PaymentTabKey): void {
    this.activeTab = tab;
  }
 
  payNow(): void {
    if (this.paymentTypeControl.invalid) {
      this.paymentTypeControl.markAsTouched();
      return;
    }
    this.showUnderConstructionDialog();
  }
 
  get totalPaid(): number {
    return this.successfulPayments
      .filter(p => p.status === 'Success')
      .reduce((sum, p) => sum + p.amount, 0);
  }
 
  statusBadgeClass(status: string): string {
    switch (status) {
      case 'Success':
      case 'Paid':
        return 'badge-status badge-status--success';
      case 'Pending':
      case 'Due':
        return 'badge-status badge-status--pending';
      case 'Failed':
      case 'Overdue':
        return 'badge-status badge-status--failed';
      default:
        return 'badge-status';
    }
  }
 
  trackByRef(_index: number, row: PaymentRecord): string {
    return row.transactionRef + row.paymentType;
  }
 
  private getMockPlotDetail(plotNo: string): PlotDetail {
    return {
      mandiName: 'GRAIN MARKET',
      plotNo,
      plotType: 'SCF',
      plotSize: '16.6 x 66',
      reservePrice: 7000,
      salesAmount: 7800,
      initial25Amount: 150,
      emdAmount: 300,
      processingFees: 2360,
      initialPayableAmount: 750,
      initialPenalty: 0,
      totalToBePaidInitially: 60,
      auctionDate: '25-02-2025',
      allotmentDate: '10-06-2025'
    };
  }
 
  private getMockSuccessfulPayments(): PaymentRecord[] {
    return [
      { dateOfPayment: '27-02-2025', transactionRef: 'AXI9', paymentType: 'EMD - E-Auction Processing Fees', paymentMode: 'E-Tendering (ICICI Bank)', status: 'Success', amount: 23 },
      { dateOfPayment: '28-02-2025', transactionRef: 'A159', paymentType: 'EMD - Atleast Initial 25% Amount', paymentMode: 'E-Tendering (ICICI Bank)', status: 'Success', amount: 200 },
      { dateOfPayment: '20-03-2025', transactionRef: 'Y65', paymentType: 'EMD - Atleast Initial 25% Amount', paymentMode: 'E-Tendering (ICICI Bank)', status: 'Success', amount: 1750 },
      { dateOfPayment: '03-07-2025', transactionRef: '003892', paymentType: 'Installment', paymentMode: 'Draft', status: 'Success', amount: 1510 }
    ];
  }
 
  private getMockAwaitedFailures(): PaymentRecord[] {
    return [
      { dateOfPayment: '15-05-2025', transactionRef: 'HD45', paymentType: 'Installment', paymentMode: 'E-Tendering', status: 'Failed', amount: 400 }
    ];
  }
 
  private getMockInstallmentSchedule(): InstallmentRow[] {
    return [
      { installmentNo: 1, dueDate: '10-09-2025', principal: 90000, interest: 5400, totalDue: 95400, status: 'Paid' },
      { installmentNo: 2, dueDate: '10-12-2025', principal: 90000, interest: 5400, totalDue: 95400, status: 'Due' },
      { installmentNo: 3, dueDate: '10-03-2026', principal: 90000, interest: 5400, totalDue: 95400, status: 'Due' }
    ];
  }
}
 