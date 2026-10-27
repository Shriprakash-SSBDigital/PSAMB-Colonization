import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { InstallmentScheduleView, PropertyBidderRegistrationModel } from './../../models/property-bidder-registration.model';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { Common } from '../../core/service/CommonService/common';

export type ClerkDecision = 'APPROVED' | 'REJECTED';

export interface VerificationHistoryEntry {
  role: string;
  actorName: string;
  action: 'Approved' | 'Sent Back' | 'Submitted';
  remarks: string;
  date: string;
}

export interface ReceiptView {
  receiptNo: string;
  receiptDate: string;
  draftNo: string;
  draftAmount: number;
  draftDate: string;
  draftBank: string;
  principalAmount: number;
  interestAmount: number;
  otherAmount: number;
  penaltyAmount: number;
  penaltyType: string;
  remarks: string;
}

/** Local-only, UI-side concern — not part of the backend model. */
export interface ClerkHistoryEntry {
  id: string;
  action: 'Submitted' | 'Edited & Resubmitted' | 'Approved' | 'Rejected';
  actionBy: string;
  actionRole: 'Data Entry Operator' | 'Clerk';
  actionDate: string;
  remarks: string;
  status: 'PENDING' | 'EDITED' | 'APPROVED' | 'REJECTED';
}

const PLOT_STATUS_OPTIONS = ['Sold', 'Unsold'];
const RELATION_OPTIONS = ['Son of (S/o)', 'Daughter of (D/o)', 'Wife of (W/o)'];

@Component({
  selector: 'app-deo-verification',
  imports: [CommonModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './deo-verification.html',
  styleUrl: './deo-verification.scss',
})
export class DeoVerification implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private service = inject(Propertybidderregn);
  activeDecision: 'approve' | 'sendback' | null = null;
  @Input() registration: PropertyBidderRegistrationModel | null = null;
  @Input() isBusy = false;

  @Output() approved = new EventEmitter<{
    remarks: string;
    data: PropertyBidderRegistrationModel;
  }>();
  @Output() rejected = new EventEmitter<{
    remarks: string;
    data: PropertyBidderRegistrationModel;
  }>();

  receiptsList: ReceiptView[] = [];
  bidderNamesList: string[] = [];

  readonly relationOptions = RELATION_OPTIONS;

  readonly plotStatusOptions = PLOT_STATUS_OPTIONS;
  readonly assetStatusFlags: { key: string; label: string }[] = [
    { key: 'assetResumed', label: 'Asset Resumed' },
    { key: 'assetSurrendered', label: 'Asset Surrendered' },
    { key: 'isAssetLocked', label: 'Is Asset Locked' },
    { key: 'isDefaulter', label: 'Is Defaulter' },
    { key: 'anyComplaint', label: 'Any Complaint' },
    { key: 'ndcGenerated', label: 'NDC Generated' },
    { key: 'ndcIssued', label: 'NDC Issued' },
    { key: 'assetVerified', label: 'Asset Verified' },
    { key: 'isCourtCase', label: 'Court Case' },
  ];

  history: VerificationHistoryEntry[] = [
    {
      role: 'Clerk',
      actorName: 'Test',
      action: 'Submitted',
      remarks: 'Forwarded after initial document check.',
      date: '25 Jul 2026, 11:42 AM',
    },
  ];

  installmentSchedules: InstallmentScheduleView[] = [];

  isEditMode = signal(false);
  showHistoryPanel = signal(false);
  showDecisionModal = signal(false);
  pendingDecision = signal<ClerkDecision | null>(null);
  currentStage = 'Clerk';
  userRole = '';
  verificationStatus = 'Pending';
  verificationStatusClass = 'status-pending';
  showValidationHint = false;
  submitting = false;
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  isAlreadyVerified = false;
  form!: FormGroup;
  remarksControl = this.fb.nonNullable.control('', [
    Validators.maxLength(500),
  ]);

  originalRegistrationDto: any;
  localHistory = signal<ClerkHistoryEntry[]>([]);
  @Input() historyEntries: ClerkHistoryEntry[] = [];
  districts: any;
  auctionPropertyTypes: any;
  plotTypes: any;
  plans: any;
  bidderTypes: any;
  propertyCategories: any;
  mandis: any;
  marketCommittees: any;
  states: any[] = [];
  bidderDistricts: any[] = [];
  cities: any[] = [];

  constructor(private commonService: Common) { }

  ngOnInit(): void {
    this.buildForm();
    this.localHistory.set(this.historyEntries?.length ? this.historyEntries : []);

    this.loadDistricts();
    this.loadPlotTypes();
    this.loadPropertyCategories();
    this.loadPlans();
    this.loadBidderTypes();
    this.loadAuctionPropertyTypes();
    this.loadStates();

    this.form.get('ownerStateID')?.valueChanges.subscribe((stateId) => {
      this.form.get('ownerDistrtictID')?.setValue('', { emitEvent: false });
      this.form.get('ownerCityID')?.setValue('', { emitEvent: false });
      this.cities = [];
      this.bidderDistricts = [];
      if (stateId) {
        this.loadDistrictsForState(stateId);
      }
    });

    this.form.get('ownerDistrtictID')?.valueChanges.subscribe((districtId) => {
      this.cities = [];
      this.form.get('ownerCityID')?.setValue('', { emitEvent: false });
      if (districtId) {
        this.loadCitiesForDistrict(districtId);
      }
    });

    this.route.queryParams.subscribe(params => {
      const encryptedId = params['id'];
      const queryRole = params['role'];
      if (queryRole) {
        this.userRole = queryRole;
      } else {
        this.userRole = this.getCurrentUserRole() || 'Clerk';
      }
      this.currentStage = this.userRole;

      if (encryptedId) {
        const navigationState = history.state as { registrationData?: Record<string, unknown> };
        if (navigationState.registrationData) {
          this.originalRegistrationDto = navigationState.registrationData;
          this.patchForm(navigationState.registrationData);
          this.checkVerificationStatus(
            navigationState.registrationData['applicationStatusId'] as number | undefined,
          );
        } else {
          this.loadRegistrationDetails(encryptedId);
        }
      } else {
        // this.patchForm(this.registration ?? this.getDemoData());
      }
    });

    this.form.disable({ emitEvent: false });
  }

  loadRegistrationDetails(encryptedId: string): void {
    try {
      const id = Number(atob(encryptedId));
      if (!isNaN(id)) {
        this.service.getRegistrationById(id).subscribe({
          next: (res: any) => {
            if (res && res.data) {
              this.originalRegistrationDto = res.data;
              this.patchForm(res.data);

              this.checkVerificationStatus(res.data.applicationStatusId);
            }
          },
          error: (err: any) => {
            console.error('Error fetching registration by id:', err);
          }
        });
      }
    } catch (e) {
      console.error('Error decrypting id:', e);
    }
  }

  loadDistricts(stateid: any = 1): void {
    this.commonService.getAllDistrict(stateid).subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.districts = res.data || res || [];
          if (this.originalRegistrationDto || this.registration) {
            this.patchForm(this.originalRegistrationDto || this.registration);
          }
        });
      },
      error: (err: any) => console.error('Error fetching districts:', err)
    });
  }

  loadPlotTypes(): void {
    this.commonService.getPlotTypes().subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.plotTypes = res.data || res || [];
          if (this.originalRegistrationDto || this.registration) {
            this.patchForm(this.originalRegistrationDto || this.registration);
          }
        });
      },
      error: (err: any) => console.error('Error fetching plot types:', err)
    });
  }

  loadPlans(): void {
    this.commonService.getPlans().subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.plans = res.data || res || [];

          if (this.originalRegistrationDto || this.registration) {
            this.patchForm(this.originalRegistrationDto || this.registration);
          }
        });
      },
      error: (err: any) => console.error('Error fetching plans:', err)
    });
  }

  loadBidderTypes(): void {
    this.commonService.getBidderTypes().subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.bidderTypes = res.data || res || [];
          if (this.originalRegistrationDto || this.registration) {
            this.patchForm(this.originalRegistrationDto || this.registration);
          }
        });
      },
      error: (err: any) => console.error('Error fetching bidder types:', err)
    });
  }

  loadPropertyCategories(): void {
    this.commonService.getPropertyCategories().subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.propertyCategories = res.data || res || [];
          if (this.originalRegistrationDto || this.registration) {
            this.patchForm(this.originalRegistrationDto || this.registration);
          }
        });
      },
      error: (err: any) => console.error('Error fetching property categories:', err)
    });
  }

  loadAuctionPropertyTypes(): void {
    this.commonService.getPropertyTypes().subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.auctionPropertyTypes = res.data || res || [];
          if (this.originalRegistrationDto || this.registration) {
            this.patchForm(this.originalRegistrationDto || this.registration);
          }
        });
      },
      error: (err: any) => console.error('Error fetching auction property types:', err)
    });
  }

  loadStates(): void {
    this.commonService.getAllStates().subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.states = res.data || [];
        });
      },
      error: (err: any) => console.error('Error fetching states:', err)
    });
  }

  loadDistrictsForState(stateId: any, callback?: () => void): void {
    if (!stateId) {
      if (callback) callback();
      return;
    }
    this.commonService.getAllDistrict(stateId).subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.bidderDistricts = res.data || [];
          if (callback) callback();
        });
      },
      error: (err: any) => console.error('Error fetching districts:', err)
    });
  }

  loadCitiesForDistrict(districtId: any, callback?: () => void): void {
    if (!districtId) {
      if (callback) callback();
      return;
    }
    this.commonService.GetAllCityByDistrictID(districtId).subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.cities = res.data || [];
          if (callback) callback();
        });
      },
      error: (err: any) => console.error('Error fetching cities:', err)
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['registration'] && !changes['registration'].firstChange && this.form) {
      if (this.registration) this.patchForm(this.registration);
      this.form.disable({ emitEvent: false });
    }
    if (changes['historyEntries'] && this.historyEntries) {
      this.localHistory.set(this.historyEntries);
    }
  }

  // Form construction — control names match PropertyBidderRegistrationModel exactly
  private buildForm(): void {
    this.form = this.fb.group({
      // Property Information
      propertyCode: this.fb.nonNullable.control({ value: '', disabled: true }),
      districtId: this.fb.nonNullable.control('', Validators.required),
      branchId: this.fb.nonNullable.control('', Validators.required),
      mandiId: this.fb.nonNullable.control('', Validators.required),
      plotSize: this.fb.nonNullable.control('', Validators.required),
      plotTypeId: this.fb.nonNullable.control('', Validators.required),
      plotNo: this.fb.nonNullable.control('', Validators.required),
      planId: this.fb.nonNullable.control('', Validators.required),
      plotStatus: this.fb.nonNullable.control('', Validators.required),
      propertyCategoryId: this.fb.nonNullable.control('', Validators.required),

      // Asset Status
      assetResumed: this.fb.nonNullable.control(false),
      assetSurrendered: this.fb.nonNullable.control(false),
      isAssetLocked: this.fb.nonNullable.control(false),
      isDefaulter: this.fb.nonNullable.control(false),
      anyComplaint: this.fb.nonNullable.control(false),
      ndcGenerated: this.fb.nonNullable.control(false),
      ndcIssued: this.fb.nonNullable.control(false),
      assetVerified: this.fb.nonNullable.control(false),
      isCourtCase: this.fb.nonNullable.control(false),

      // Auction Information
      isAuctioned: this.fb.nonNullable.control(true),
      auctionDate: this.fb.nonNullable.control(''),
      bidderTypeId: this.fb.nonNullable.control('Individual'),
      emailId: this.fb.nonNullable.control('', [Validators.email]),
      bidderName: this.fb.nonNullable.control(''),
      isTransferred: this.fb.nonNullable.control(false),
      relation: this.fb.nonNullable.control(''),
      fatherOrHusbandName: this.fb.nonNullable.control(''),
      panNo: this.fb.nonNullable.control('', [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]),
      aadhaarNo: this.fb.nonNullable.control('', [Validators.pattern(/^\d{12}$/)]),
      mobileNo: this.fb.nonNullable.control('', [Validators.pattern(/^[6-9]\d{9}$/)]),
      propertyTypeId: this.fb.nonNullable.control(''),
      address: this.fb.nonNullable.control(''),
      ownerStateID: this.fb.nonNullable.control(''),
      ownerDistrtictID: this.fb.nonNullable.control(''),
      ownerCityID: this.fb.nonNullable.control(''),

      // Financial Details
      reservePrice: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
      finalBidPrice: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),

      // Form Fee
      formTransactionId: this.fb.nonNullable.control(''),
      formTxnDate: this.fb.nonNullable.control(''),
      formPaidAmount: this.fb.nonNullable.control(0, [Validators.min(0)]),

      // EMD Details
      emdTxnId: this.fb.nonNullable.control('', Validators.required),
      emdDate: this.fb.nonNullable.control('', Validators.required),
      emdAmount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),

      // 25% Allotment Details
      allotmentTxnId: this.fb.nonNullable.control('', Validators.required),
      allotmentDate: this.fb.nonNullable.control('', Validators.required),
      allotmentTransactionDate: this.fb.nonNullable.control(''),
      allotmentAmount: this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),

      // Outstanding Dues
      installmentNo: this.fb.nonNullable.control(''),
      dueDate: this.fb.nonNullable.control(''),
      paidStatus: this.fb.nonNullable.control(''),
      dueAmount: this.fb.nonNullable.control(0, [Validators.min(0)]),
      accumulatedInterest: this.fb.nonNullable.control(0, [Validators.min(0)]),
      totalDueWithInterest: this.fb.nonNullable.control(0, [Validators.min(0)]),
      decision: this.fb.group({
        remarks: [''],
      }),
    });

    this.form
      .get('isAuctioned')!
      .valueChanges.subscribe((auctioned) => this.setAuctionValidators(!!auctioned));
  }

  private setAuctionValidators(auctioned: boolean): void {
    const requiredWhenAuctioned = [
      'auctionDate',
      'bidderName',
      'fatherOrHusbandName',
      'address',
    ];
    requiredWhenAuctioned.forEach((name) => {
      const control = this.form.get(name)!;
      auctioned
        ? control.addValidators(Validators.required)
        : control.removeValidators(Validators.required);
      control.updateValueAndValidity({ emitEvent: false });
    });
  }

  private formatToInputDate(dateStr: any): string {
    if (!dateStr) return '';
    try {
      if (typeof dateStr === 'string' && dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch (e) {
      console.error('Error formatting date:', dateStr, e);
    }
    return '';
  }

  private formatToLocalDateTime(dateStr: any): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
      }
    } catch (e) {
      console.error('Error formatting datetime:', dateStr, e);
    }
    return '';
  }

  private normalizeToDto(data: any): any {
    if (!data) return {};

    // Helper to resolve string values to IDs from option lists
    let plotTypeId = data.plotTypeId ?? '';
    if (plotTypeId && isNaN(Number(plotTypeId)) && this.plotTypes) {
      const match = this.plotTypes.find((p: any) => p.plotType === plotTypeId || p.plotTypeName === plotTypeId);
      if (match) plotTypeId = match.plotTypeId || match.id;
    } else if (!plotTypeId && data.plottype && this.plotTypes) {
      const match = this.plotTypes.find((p: any) => p.plotType === data.plottype || p.plotTypeName === data.plottype);
      if (match) plotTypeId = match.plotTypeId || match.id;
    }

    let propertyCategoryId = data.propertyCategoryId ?? '';
    if (propertyCategoryId && isNaN(Number(propertyCategoryId)) && this.propertyCategories) {
      const match = this.propertyCategories.find((c: any) => c.categoryName === propertyCategoryId || c.name === propertyCategoryId);
      if (match) propertyCategoryId = match.propertyCategoryId || match.id;
    } else if (!propertyCategoryId && data.propertycategory && this.propertyCategories) {
      const match = this.propertyCategories.find((c: any) => c.categoryName === data.propertycategory || c.name === data.propertycategory);
      if (match) propertyCategoryId = match.propertyCategoryId || match.id;
    }

    let bidderTypeId = data.bidderTypeId ?? '';
    if (bidderTypeId && isNaN(Number(bidderTypeId)) && this.bidderTypes) {
      const match = this.bidderTypes.find((b: any) => b.bidderTypeName === bidderTypeId || b.name === bidderTypeId);
      if (match) bidderTypeId = match.bidderTypeId || match.id;
    } else if (!bidderTypeId && data.bidderType && this.bidderTypes) {
      const match = this.bidderTypes.find((b: any) => b.bidderTypeName === data.bidderType || b.name === data.bidderType);
      if (match) bidderTypeId = match.bidderTypeId || match.id;
    }

    let propertyTypeId = data.propertyTypeId ?? '';
    if (propertyTypeId && isNaN(Number(propertyTypeId)) && this.auctionPropertyTypes) {
      const match = this.auctionPropertyTypes.find((t: any) => t.propertyTypeName === propertyTypeId || t.name === propertyTypeId);
      if (match) propertyTypeId = match.propertyTypeId || match.id;
    } else if (!propertyTypeId && data.auctionPropertyType && this.auctionPropertyTypes) {
      const match = this.auctionPropertyTypes.find((t: any) => t.propertyTypeName === data.auctionPropertyType || t.name === data.auctionPropertyType);
      if (match) propertyTypeId = match.propertyTypeId || match.id;
    }

    let plotStatus = data.plotStatus ?? data.plotstatus ?? '';
    if (plotStatus && typeof plotStatus === 'string') {
      plotStatus = plotStatus.trim();
      const match = PLOT_STATUS_OPTIONS.find(o => o.toLowerCase() === plotStatus.toLowerCase());
      if (match) {
        plotStatus = match;
      }
    }
    let planVal = data.planName ?? '';
    if (!planVal) {
      const rawPlan = data.planId ?? data.plan ?? '';
      if (rawPlan && this.plans) {
        const match = this.plans.find((p: any) => String(p.planId || p.id) === String(rawPlan));
        if (match) {
          planVal = match.planName || match.name || rawPlan;
        } else {
          planVal = rawPlan;
        }
      } else {
        planVal = rawPlan;
      }
    }
    return {
      propertyCode: data.propertyCode ?? data.propertycode ?? '',
      districtId: data.districtName ?? data.districtId ?? data.district ?? '',
      branchId: data.branchName ?? data.branchId ?? data.branch ?? '',
      mandiId: data.mandiName ?? data.mandiId ?? data.mandi ?? '',
      plotSize: data.plotSize ?? data.plotsize ?? '',
      plotTypeId: plotTypeId,
      plotNo: data.plotNo ?? data.plotno ?? '',
      planId: planVal,
      plotStatus: plotStatus,
      propertyCategoryId: propertyCategoryId,

      assetResumed: data.assetResumed ?? data.isAssetResumed ?? false,
      assetSurrendered: data.assetSurrendered ?? data.IsAssetSurrendered ?? false,
      isAssetLocked: data.isAssetLocked ?? data.IsLocked ?? false,
      isDefaulter: data.isDefaulter ?? data.IsDefaulter ?? false,
      anyComplaint: data.anyComplaint ?? data.IsAnyComplaint ?? false,
      ndcGenerated: data.ndcGenerated ?? data.IsNDCGenerated ?? false,
      ndcIssued: data.ndcIssued ?? data.IsNDCIssued ?? false,
      assetVerified: data.assetVerified ?? data.IsAssetVerified ?? false,
      isCourtCase: data.isCourtCase ?? data.IsCourtCase ?? false,

      isAuctioned: data.isAuctioned ?? data.Isauctioned ?? false,
      auctionDate: this.formatToLocalDateTime(data.auctionDate ?? data.auctionDateTime ?? ''),
      bidderTypeId: bidderTypeId,
      emailId: data.emailId ?? data.email ?? '',
      bidderName: data.bidderName ?? data.h1BidderName ?? '',
      isTransferred: data.isTransferred ?? data.transfered ?? false,
      relation: data.relation ?? '',
      fatherOrHusbandName: data.fatherOrHusbandName ?? data.guardianName ?? '',
      panNo: data.panNo ?? '',
      aadhaarNo: data.aadhaarNo ?? data.aadharNo ?? '',
      mobileNo: data.mobileNo ?? '',
      propertyTypeId: propertyTypeId,
      address: data.address ?? data.communicationAddress ?? '',
      ownerStateID: data.ownerStateID ?? data.OwnerStateID ?? '',
      ownerDistrtictID: data.ownerDistrtictID ?? data.OwnerDistrtictID ?? '',
      ownerCityID: data.ownerCityID ?? data.OwnerCityID ?? '',

      reservePrice: data.reservePrice ?? 0,
      finalBidPrice: data.finalBidPrice ?? data.h1BidderFinalPrice ?? 0,

      formTransactionId: data.formTransactionId ?? data.formFeeTransactionId ?? '',
      formTxnDate: this.formatToInputDate(data.formTxnDate ?? data.formFeeTransactionDate ?? ''),
      formPaidAmount: data.formPaidAmount ?? data.formFeePaidAmount ?? 0,

      emdTxnId: data.emdTxnId ?? data.emdTransactionId ?? '',
      emdDate: this.formatToInputDate(data.emdDate ?? data.emdTransactionDate ?? ''),
      emdAmount: data.emdAmount ?? data.emdPaidAmount ?? 0,

      allotmentTxnId: data.allotmentTxnId ?? data.allotmentTransactionId ?? '',
      allotmentDate: this.formatToInputDate(data.allotmentDate ?? ''),
      allotmentTransactionDate: this.formatToInputDate(data.allotmentTransactionDate),
      allotmentAmount: data.allotmentAmount ?? data.allotmentPaidAmount ?? 0,

      installmentNo: data.installmentNo ?? '',
      dueDate: this.formatToInputDate(data.dueDate ?? ''),
      paidStatus: data.paidStatus ?? '',
      dueAmount: data.dueAmount ?? 0,
      accumulatedInterest: data.accumulatedInterest ?? 0,
      totalDueWithInterest: data.totalDueWithInterest ?? data.totalDueAmount ?? 0,
    };
  }

  /** Populates the read-only Receipt Allocations table from the raw registration payload. */
  private deriveReceiptsList(data: any): ReceiptView[] {
    const raw = data?.installments || data?.Installments || data?.receipts ||
      data?.receiptList || data?.receiptsFormArray || data?.receiptAllocations ||
      data?.propertyBidderReceipts;
    if (!Array.isArray(raw)) return [];

    return raw.map((rec: any) => ({
      receiptNo: rec.receiptNo || rec.ReceiptNo || '',
      receiptDate: this.splitDatePart(rec.receiptDate || rec.ReceiptDate),
      draftNo: rec.draftNo || rec.DraftNo || '',
      draftAmount: rec.draftAmount ?? rec.DraftAmount ?? 0,
      draftDate: this.splitDatePart(rec.draftDate || rec.DraftDate),
      draftBank: rec.draftBank || rec.DraftBank || '',
      principalAmount: rec.principalAmount ?? rec.PrincipalAmount ?? 0,
      interestAmount: rec.interestAmount ?? rec.InterestAmount ?? 0,
      otherAmount: rec.otherAmount ?? rec.OtherAmount ?? 0,
      penaltyAmount: rec.penaltyAmount ?? rec.PenaltyAmount ?? 0,
      penaltyType: rec.penaltyType || rec.PenaltyType || 'N/A',
      remarks: rec.remarks || rec.Remarks || ''
    }));
  }

  /** Populates the read-only Allotee Names list when the property has been transferred. */
  private deriveBidderNamesList(data: any): string[] {
    const isTransferred = this.getBooleanValue(data, 'isTransferred', 'transfered', 'Transfered');
    const bidderName = data?.bidderName || data?.h1BidderName || '';
    if (isTransferred && bidderName) {
      return String(bidderName)
        .split(',')
        .map((n: string) => n.trim())
        .filter((n: string) => !!n);
    }
    return [];
  }

  private splitDatePart(value: any): string {
    return value ? String(value).split('T')[0] : '';
  }

  private patchForm(data: PropertyBidderRegistrationModel | Record<string, unknown>): void {
    setTimeout(() => {
      const dto = this.normalizeToDto(data);
      const auctionValue = this.getBooleanValue(
        dto,
        'isAuctioned',
        'Isauctioned',
        'IsAuctioned',
      );

      // Populate read-only display lists (receipts + allotee names)
      this.receiptsList = this.deriveReceiptsList(data);
      this.bidderNamesList = this.deriveBidderNamesList(data);

      const rawTimeline = (data as any)?.timelineHistory || (data as any)?.TimelineHistory;
      if (rawTimeline && Array.isArray(rawTimeline) && rawTimeline.length > 0) {
        this.history = rawTimeline.map((item: any) => ({
          role: item.statusName || (item.statusId === 1 ? 'DEO' : item.statusId === 2 ? 'Clerk' : 'Senior Assistant'),
          actorName: item.userName || item.userId || 'User',
          action: item.statusId === 2 || item.statusId === 3 ? 'Approved' : (item.statusId === 7 ? 'Sent Back' : 'Submitted'),
          remarks: item.remarks || '',
          date: item.date ? new Date(item.date).toLocaleString('en-IN') : ''
        }));
      }

      const proceedToPatch = () => {
        const milestoneTransactionDate = data?.['allotmentTransactionDate'];
        this.form.patchValue({
          ...dto,
          isAuctioned: auctionValue,
          allotmentTransactionDate: milestoneTransactionDate == null
            ? ''
            : this.formatToInputDate(milestoneTransactionDate),
        }, { emitEvent: false });
        this.setAuctionValidators(auctionValue);
        this.calculateUIInstallments();
        this.cdr.detectChanges();
      };

      if (dto.ownerStateID) {
        this.loadDistrictsForState(dto.ownerStateID, () => {
          if (dto.ownerDistrtictID) {
            this.loadCitiesForDistrict(dto.ownerDistrtictID, () => {
              proceedToPatch();
            });
          } else {
            proceedToPatch();
          }
        });
      } else {
        proceedToPatch();
      }
    });
  }

  private calculateUIInstallments(): void {
    if (!this.form.get('isAuctioned')?.value) {
      this.installmentSchedules = [];
      return;
    }

    // 1. Fetch form variables safely
    const finalBidderPrice = Number(this.form.get('finalBidPrice')?.value) || 0;
    const allotmentPaid_25_percentage = Number(this.form.get('allotmentAmount')?.value) || 0;
    const milestoneDateStr = this.form.get('allotmentDate')?.value || this.form.get('allotmentTransactionDate')?.value;
    const selectedInstallmentString = this.form.get('installmentNo')?.value || 'Installment 1';

    // 2. Calculate TOTAL Outstanding Principal Balance
    const outstandingPrincipal = finalBidderPrice - allotmentPaid_25_percentage;

    // Compute the base installment principal (1/6th of total outstanding principal)
    let computedDueAmount = 0;
    if (outstandingPrincipal > 0) {
      computedDueAmount = outstandingPrincipal / 6;
      computedDueAmount = Math.round((computedDueAmount + Number.EPSILON) * 100) / 100;
    }

    // 3. Validate milestone date presence BEFORE computing any interest
    let baseYear = 0, baseMonth = 0, baseDay = 0;
    let dateIsValid = false;

    if (milestoneDateStr) {
      const parts = milestoneDateStr.split('-');
      if (parts.length === 3) {
        baseYear = parseInt(parts[0], 10);
        baseMonth = parseInt(parts[1], 10) - 1;
        baseDay = parseInt(parts[2], 10);
        dateIsValid = !isNaN(baseYear) && !isNaN(baseMonth) && !isNaN(baseDay);
      }
    }

    // 4. Determine interest rate based on the allotment transaction year
    //    < 1992 -> 6%, >= 1992 -> 12%
    const rateOfInterest = dateIsValid ? (baseYear <= 1992 ? 6 : 12) : 0;

    // 5. Generate the 6-part amortization matrix table
    const generatedMatrix: InstallmentScheduleView[] = [];
    let totalInterestAcrossInstallments = 0;

    for (let step = 1; step <= 6; step++) {
      let calculatedDateStr = '';

      if (dateIsValid) {
        const targetTotalMonths = baseMonth + (step * 6);
        const targetYear = baseYear + Math.floor(targetTotalMonths / 12);
        const targetMonth = targetTotalMonths % 12;

        const targetDateObj = new Date(targetYear, targetMonth, baseDay);
        if (targetDateObj.getDate() !== baseDay) {
          targetDateObj.setDate(0);
        }

        const pad = (num: number) => num.toString().padStart(2, '0');
        calculatedDateStr = `${targetDateObj.getFullYear()}-${pad(targetDateObj.getMonth() + 1)}-${pad(targetDateObj.getDate())}`;
      }

      const currentLabel = `Installment ${step}`;

      // Declining-balance interest calculation
      // remainingPrincipal(i) = outstandingPrincipal - (computedDueAmount * (i - 1))
      let computedInterestForStep = 0;
      if (dateIsValid && outstandingPrincipal > 0 && computedDueAmount > 0) {
        const remainingPrincipal = outstandingPrincipal - (computedDueAmount * (step - 1));
        const basisForInterest = remainingPrincipal > 0 ? remainingPrincipal : 0;

        computedInterestForStep = (basisForInterest * rateOfInterest * 182.5) / (365 * 100);
        computedInterestForStep = Math.round((computedInterestForStep + Number.EPSILON) * 100) / 100;
      }

      totalInterestAcrossInstallments += computedInterestForStep;

      const stepTotalWithInterest = computedDueAmount > 0 ? (computedDueAmount + computedInterestForStep) : 0;

      generatedMatrix.push({
        installmentLabel: currentLabel,
        dueDate: calculatedDateStr,
        baseAmountDue: computedDueAmount,
        interestAmount: computedInterestForStep,
        totalWithInterest: Math.round((stepTotalWithInterest + Number.EPSILON) * 100) / 100
      });
    }

    this.installmentSchedules = generatedMatrix;
    totalInterestAcrossInstallments = Math.round((totalInterestAcrossInstallments + Number.EPSILON) * 100) / 100;

    // 6. Calculate total overall due (Full Principal + Sum of computed interest)
    const finalTotalDueIncludingInterest = outstandingPrincipal > 0
      ? (outstandingPrincipal + totalInterestAcrossInstallments)
      : 0;

    const activeNode = generatedMatrix.find(item => item.installmentLabel === selectedInstallmentString);
    const activeDueDate = activeNode ? activeNode.dueDate : '';

    // 7. Patch corrected, high-level overview values to UI inputs
    this.form.patchValue({
      dueAmount: outstandingPrincipal > 0 ? outstandingPrincipal : 0,
      dueDate: activeDueDate,
      totalDueWithInterest: finalTotalDueIncludingInterest > 0 ? finalTotalDueIncludingInterest : 0
    }, { emitEvent: false });
  }

  get isAuctionSectionVisible(): boolean {
    return !!this.form?.get('isAuctioned')?.value;
  }

  private getBooleanValue(
    data: Record<string, unknown> | null | undefined,
    ...keys: string[]
  ): boolean {
    if (!data) return false;

    for (const key of keys) {
      const value = data[key];
      if (typeof value === 'boolean') {
        return value;
      }

      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true' || normalized === '1') {
          return true;
        }

        if (normalized === 'false' || normalized === '0') {
          return false;
        }
      }

      if (typeof value === 'number') {
        return value === 1;
      }
    }

    return false;
  }

  private normalizeInstallmentSchedules(
    data: Record<string, unknown> | null | undefined,
  ): InstallmentScheduleView[] {
    if (!data) {
      return [];
    }

    const rawSchedule =
      data['installmentSchedules'] ??
      data['installments'] ??
      data['schedule'] ??
      data['installmentSchedule'];
    if (Array.isArray(rawSchedule) && rawSchedule.length > 0) {
      return rawSchedule.map((item: any, index: number) => ({
        installmentLabel: String(
          item?.installmentLabel ?? item?.installmentNo ?? `Installment ${index + 1}`,
        ),
        dueDate: String(item?.dueDate ?? item?.due_date ?? item?.DueDate ?? ''),
        baseAmountDue: Number(item?.baseAmountDue ?? item?.baseAmount ?? item?.dueAmount ?? 0),
        interestAmount: Number(item?.interestAmount ?? item?.interest ?? 0),
        totalWithInterest: Number(item?.totalWithInterest ?? item?.totalDue ?? 0),
      }));
    }

    const fallbackLabel = String(data['installmentNo'] ?? 'Installment 1');
    const fallbackDueDate = String(data['dueDate'] ?? '');
    const fallbackBaseAmount = Number(data['dueAmount'] ?? 0);
    const fallbackInterest = Number(data['accumulatedInterest'] ?? 0);
    const fallbackTotal = Number(data['totalDueAmount'] ?? 0);

    if (fallbackBaseAmount || fallbackInterest || fallbackTotal || fallbackDueDate) {
      return [
        {
          installmentLabel: fallbackLabel,
          dueDate: fallbackDueDate,
          baseAmountDue: fallbackBaseAmount,
          interestAmount: fallbackInterest,
          totalWithInterest: fallbackTotal,
        },
      ];
    }

    return [];
  }

  // Approve / Reject
  openDecisionModal(decision: ClerkDecision): void {
    this.pendingDecision.set(decision);
    this.remarksControl.reset('');
    this.showDecisionModal.set(true);
  }

  closeDecisionModal(): void {
    this.showDecisionModal.set(false);
    this.pendingDecision.set(null);
  }

  confirmDecision(): void {
    if (this.remarksControl.invalid) {
      this.remarksControl.markAsTouched();
      return;
    }
    const decision = this.pendingDecision();
    if (!decision) return;

    const value = this.form.getRawValue() as PropertyBidderRegistrationModel;
    const remarks = this.remarksControl.value;

    if (decision === 'APPROVED') {
      this.approved.emit({ remarks, data: value });
    } else {
      this.rejected.emit({ remarks, data: value });
    }

    this.showDecisionModal.set(false);
    this.pendingDecision.set(null);
  }

  // Template helpers
  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  errorFor(controlName: string): ValidationErrors | null {
    return this.form.get(controlName)?.errors ?? null;
  }

  formatDisplayDate(value: string): string {
    if (!value) {
      return 'Waiting on base milestone date...';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  selectDecision(decision: 'approve' | 'sendback'): void {
    this.activeDecision = decision;
    this.showValidationHint = false;
    if (decision === 'sendback') {
      this.remarksControl?.setValidators([Validators.required, Validators.minLength(10)]);
    } else {
      this.remarksControl?.setValidators([]);
    }
    this.remarksControl?.updateValueAndValidity();
  }

  submitDecision(): void {
    if (!this.activeDecision) {
      return;
    }
    if (this.activeDecision === 'sendback' && this.remarksControl?.invalid) {
      this.showValidationHint = true;
      this.remarksControl.markAsTouched();
      return;
    }

    this.submitting = true;

    const token = sessionStorage.getItem('token');
    let currentUserId = 0;
    let sessionUserId: string | null = null;
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const rawId = tokenPayload.ApplicantId || tokenPayload.UserId || tokenPayload.id;
        if (rawId) {
          currentUserId = Number(rawId);
        }
        sessionUserId = tokenPayload?.nameid || tokenPayload?.sub || tokenPayload?.UserId || tokenPayload?.userId || tokenPayload?.IdentityUserId || null;
      } catch (e) {
        console.error('Error parsing token for currentUserId:', e);
      }
    }

    try {
      const cpSession = sessionStorage.getItem('cp_session');
      if (cpSession) {
        const sessionObj = JSON.parse(cpSession);
        if (sessionObj?.userId || sessionObj?.id) {
          sessionUserId = String(sessionObj.userId || sessionObj.id);
        }
      }
    } catch (e) { }

    const payload = {
      id: this.originalRegistrationDto?.id || 0,
      remarks: this.remarksControl?.value || '',
      decision: this.activeDecision,
      modifiedBy: currentUserId,
      modifiedDate: new Date().toISOString(),
      role: this.userRole,
      userId: sessionUserId || (currentUserId ? String(currentUserId) : null)
    };

    this.service.VerifyByClerk(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;

        const actionText = this.activeDecision === 'approve' ? 'approved' : 'sent back for changes';
        this.toastr.success(`Application has been successfully ${actionText}!`, 'Success');

        this.isAlreadyVerified = true;
        this.setVerificationStatus(this.activeDecision === 'approve' ? 2 : 7);
        this.remarksControl.disable({ emitEvent: false });

        const entry: VerificationHistoryEntry = {
          role: this.currentStage,
          actorName: 'You',
          action: this.activeDecision === 'approve' ? 'Approved' : 'Sent Back',
          remarks: payload.remarks,
          date: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        };
        this.history.unshift(entry);

        this.activeDecision = null;
        setTimeout(() => {
          this.router.navigate(['/property-verification']);
        }, 1500);
      },
      error: (err: any) => {
        this.submitting = false;
        console.error('Error submitting clerk decision:', err);
        const errorMsg = err?.error?.message || 'Something went wrong while submitting the decision.';
        this.toastr.error(errorMsg, 'Error');
      }
    });
  }

  getCurrentUserRole(): string {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const rawRole = tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
          || tokenPayload.role
          || tokenPayload.Role
          || tokenPayload.roles
          || tokenPayload.Roles;
        return rawRole ? String(rawRole).trim() : '';
      } catch (e) {
        console.error('Error parsing token for role:', e);
      }
    }
    return '';
  }

  checkVerificationStatus(statusId: number | null | undefined): void {
    this.setVerificationStatus(statusId);
    const role = this.userRole?.toLowerCase() || 'clerk';
    let canAction = false;

    if (role.includes('clerk')) {
      canAction = (statusId === 1 || !statusId);
    } else if (role.includes('assistant')) {
      canAction = (statusId === 2 || statusId === 1 || !statusId);
    } else if (role.includes('superintendent')) {
      canAction = (statusId === 3 || statusId === 2 || statusId === 1 || !statusId);
    } else if (role.includes('director')) {
      canAction = (statusId === 4 || statusId === 3 || statusId === 2 || statusId === 1 || !statusId);
    }

    if (canAction) {
      this.isAlreadyVerified = false;
      this.activeDecision = null;
      this.remarksControl.setValue('');
      this.remarksControl.enable({ emitEvent: false });
    } else {
      this.isAlreadyVerified = true;
      if (statusId === 2 || statusId === 3 || statusId === 4) {
        this.activeDecision = 'approve';
      } else if (statusId === 7) {
        this.activeDecision = 'sendback';
      } else {
        this.activeDecision = null;
      }
      const existingRemarks = this.originalRegistrationDto?.remarks || this.originalRegistrationDto?.clerkRemarks || '';
      this.remarksControl.setValue(existingRemarks);
      this.remarksControl.disable({ emitEvent: false });
    }
  }

  private setVerificationStatus(statusId: number | null | undefined): void {
    if (statusId === 2 || statusId === 3 || statusId === 4) {
      this.verificationStatus = 'Verified';
      this.verificationStatusClass = 'status-verified';
    } else if (statusId === 7) {
      this.verificationStatus = 'Objection';
      this.verificationStatusClass = 'status-objection';
    } else {
      this.verificationStatus = 'Pending';
      this.verificationStatusClass = 'status-pending';
    }
  }

  mapDtoToModel(d: any): PropertyBidderRegistrationModel {
    return {
      propertycode: d.propertyCode || '',
      district: d.districtName || '',
      branch: d.branchName || '',
      mandi: d.mandiName || '',
      plotsize: d.plotSize ? d.plotSize.toString() : '',
      plottype: d.plotType || 'Commercial',
      plotno: d.plotNo ? d.plotNo.toString() : '',
      plan: d.planName || 'Standard Allocation',
      plotstatus: d.plotStatus || 'Vacant',
      propertycategory: d.categoryName || 'General',

      isAssetResumed: d.assetResumed || false,
      IsAssetSurrendered: d.assetSurrendered || false,
      IsLocked: d.isAssetLocked || false,
      IsDefaulter: d.isDefaulter || false,
      IsAnyComplaint: d.anyComplaint || false,
      IsNDCGenerated: d.ndcGenerated || false,
      IsNDCIssued: d.ndcIssued || false,
      IsAssetVerified: d.assetVerified || false,
      IsCourtCase: d.isCourtCase || false,

      Isauctioned: d.isAuctioned || false,
      auctionDateTime: d.auctionDate ? d.auctionDate.substring(0, 16) : '',
      bidderType: d.bidderTypeId === 1 ? 'Individual' : 'Company',
      emailId: d.email || '',
      h1BidderName: d.bidderName || '',
      transfered: d.isTransferred || false,
      relation: d.relation || 'Son of (S/o)',
      guardianName: d.fatherOrHusbandName || '',
      panNo: d.panNo || '',
      aadharNo: d.aadhaarNo || '',
      mobileNo: d.mobileNo || '',
      auctionPropertyType: d.propertyTypeId === 1 ? 'Commercial Plots' : 'Residential Plots',
      communicationAddress: d.address || '',

      reservePrice: d.reservePrice || 0,
      h1BidderFinalPrice: d.finalBidPrice || 0,

      formFeeTransactionId: d.formTransactionId || '',
      formFeeTransactionDate: d.formTxnDate ? d.formTxnDate.substring(0, 10) : '',
      formFeePaidAmount: d.formPaidAmount || 0,

      emdTransactionId: d.emdTxnId || '',
      emdTransactionDate: d.emdDate ? d.emdDate.substring(0, 10) : '',
      emdPaidAmount: d.emdAmount || 0,

      allotmentTransactionId: d.allotmentTxnId || '',
      allotmentTransactionDate: d.allotmentTransactionDate ? d.allotmentTransactionDate.substring(0, 10) : '',
      allotmentPaidAmount: d.allotmentAmount || 0,

      installmentNo: d.installmentNo || '1',
      dueDate: d.dueDate ? d.dueDate.substring(0, 10) : '',
      paidStatus: d.paidStatus || 'Unpaid',
      dueAmount: d.dueAmount || 0,
      accumulatedInterest: d.accumulatedInterest || 0,
      totalDueAmount: d.totalDueWithInterest || 0
    };
  }
  handleApprove(): void {
    this.activeDecision = 'approve';
    this.submitDecision();
  }
  handleSendBack(): void {
    if (this.activeDecision !== 'sendback') {
      this.activeDecision = 'sendback';
    } else {
      this.submitDecision();
    }
  }
}