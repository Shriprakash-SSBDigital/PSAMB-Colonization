import { Component, OnInit, OnDestroy, HostListener, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { Common } from '../../core/service/CommonService/common';

export interface Receipt {
  receiptNo: string;
  receiptDate: string;
  treasuryReceiptDate: string;
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
  isEditing?: boolean;
}

// Complete structural model representation for structural visualization grid loops
export interface InstallmentScheduleView {
  index: number;
  installmentLabel: string;
  dueDate: string;
  baseAmountDue: number;
  interestAmount: number;
  totalWithInterest: number;
}

@Component({
  selector: 'app-property-bidder-registration',
  standalone: false,
  templateUrl: './property-bidder-registration.html',
  styleUrl: './property-bidder-registration.scss',
})
export class PropertyBidderRegistration implements OnInit, OnDestroy, OnChanges {

  registerationForm!: FormGroup;

  branches = ['Main Corporate Branch', 'North Zone Mandi', 'South Zone Branch', 'Head Office'];
  districts: any[] = [];
  bidderDistricts: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  mandis: any[] = [];
  isLoadingMandis = false;
  plotTypes: any[] = [];
  isLoadingPlotTypes = false;
  propertyCategories: any[] = [];
  bidderTypes: any[] = [];
  plans: any[] = [];
  relations = ['Son of (S/o)', 'Daughter of (D/o)', 'Wife of (W/o)'];
  auctionPropertyTypes: any[] = [];
  installments = ['Installment 1', 'Installment 2', 'Installment 3', 'Installment 4', 'Installment 5', 'Installment 6'];
  paidStatuses = ['Pending', 'Fully Paid', 'Partially Paid'];
  plotStatuses = [
    { label: 'Sold', value: '1' },
    { label: 'Unsold', value: '0' }
  ];
  calculatedSchedulesMatrix: InstallmentScheduleView[] = [];
  marketCommittees: any[] = [];
  isLoadingCommittees = false;
  installmentDateError: string | null = null;
  statusFields = [
    { control: 'isAssetResumed', label: 'Asset Resumed' },
    { control: 'isAssetSurrendered', label: 'Asset Surrendered' },
    { control: 'isAssetLocked', label: 'Is Asset Locked' },
    { control: 'isDefaulter', label: 'Is Defaulter' },
    { control: 'anyComplaint', label: 'Any Complaint' },
    { control: 'ndcGenerated', label: 'NDC Generated' },
    { control: 'ndcIssued', label: 'NDC Issued' },
    { control: 'assetVerified', label: 'Asset Verified' },
    { control: 'isCourtCase', label: 'Is Court Case' }
  ];

  private auctionRequiredControls = [
    'auctionDate',
    // 'bidderTypeId',
    // 'email',
    'bidderName',
    'relation',
    'fatherOrHusbandName',
    // 'auctionPropertyType',
    'address',
    'finalBidPrice',
    // 'formPaidAmount',
    'allotmentDate',
    // 'allotmentAmount',
    // 'AllotmentTransactionDate',
    'installmentNo',
    'dueDate',
    'paidStatus',
    'dueAmount',
    'accumulatedInterest',
  ];

  @Input() mode: 'view' | 'edit' | 'create' = 'create';
  @Input() propertyCode: string = '';
  @Input() hideActionButtons: boolean = false;
  @Output() dataLoaded = new EventEmitter<any>();

  readonlyMode = false;
  showPreview = false;
  previewConfirmed = false;
  private destroy$ = new Subject<void>();
  propertyData: any;
  propTypes: any;
  showRemarksReadOnly = false;
  remarksReadOnly: string | null = null;

  constructor(
    private fb: FormBuilder,
    private service: Propertybidderregn,
    private commonService: Common,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.registerationForm = this.fb.group({

      branchId: ['', Validators.required],
      districtId: ['', Validators.required],
      mandiId: ['', Validators.required],
      // mandi: ['', Validators.required],
      propertycode: [''],

      plotsize: ['', Validators.required],
      plotTypeId: ['', Validators.required],
      plotNo: ['', Validators.required],
      planId: ['', Validators.required],
      plotStatus: ['', Validators.required],
      propertyCategoryId: ['', Validators.required],

      isAssetResumed: [false],
      isAssetSurrendered: [false],
      isAssetLocked: [false],
      isDefaulter: [false],
      anyComplaint: [false],
      ndcIssued: [false],
      ndcGenerated: [false],
      assetVerified: [false],
      isCourtCase: [false],
      isAuctioned: [false],
      auctionDate: [''],
      bidderTypeId: [''],
      email: ['', [Validators.email]],
      bidderName: [''],
      transferredNames: this.fb.array([]),
      isTransferred: [false],

      relation: [''],
      fatherOrHusbandName: [''],

      panNo: ['', [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],

      aadhaarNo: ['', [Validators.pattern(/^XXXXXXXX\d{4}$/)]],

      mobileNo: ['', [Validators.pattern(/^[6-9]\d{9}$/), Validators.minLength(10), Validators.maxLength(10)]],

      auctionPropertyType: [''],
      address: ['', Validators.required],

      reservePrice: [''],
      finalBidPrice: ['', Validators.required],

      formTransactionId: [''],
      formTxnDate: [''],
      formPaidAmount: [''],

      emdTxnId: [''],
      emdDate: [''],
      emdAmount: [''],
      //25% form values 
      allotmentDate: ['', Validators.required],
      allotmentTxnId: [''],
      allotmentTransactionDate: [''],
      //allotement form fields 
      allotmentAmount: [''],
      dueAmount: [''],
      accumulatedInterest: [0],
      totalDueWithInterest: [{ value: '', disabled: true }],

      installmentNo: ['Installment 1'],
      paidStatus: ['Pending'],
      dueDate: [''],

      receiptsFormArray: this.fb.array([]),
      remarks: [],
      ownerStateID: [''],
      ownerDistrtictID: [''],
      ownerCityID: ['']

    });
  }

  receiptList: Receipt[] = [];

  createReceiptForm(receipt?: any): FormGroup {
    return this.fb.group({
      receiptNo: [receipt?.receiptNo || ''],
      receiptDate: [receipt?.receiptDate || ''],
      treasuryReceiptDate: [receipt?.treasuryReceiptDate || ''],
      draftNo: [receipt?.draftNo || ''],
      draftAmount: [receipt?.draftAmount || 0],
      draftDate: [receipt?.draftDate || ''],
      draftBank: [receipt?.draftBank || ''],
      principalAmount: [receipt?.principalAmount || 0],
      interestAmount: [receipt?.interestAmount || 0],
      otherAmount: [receipt?.otherAmount || 0],
      penaltyAmount: [receipt?.penaltyAmount || 0],
      penaltyType: [receipt?.penaltyType || ''],
      remarks: [receipt?.remarks || '']
    });
  }

  isPlanDropdownOpen = false;
  isDistrictDropdownOpen = false;
  isPlotNoDropdownOpen = false;
  isPlotTypeDropdownOpen = false;
  isPlotSizeDropdownOpen = false;
  isPropTypeDropdownOpen = false;
  isMandiDropdownOpen = false;
  isStateDropdownOpen = false;
  isBidderDistrictDropdownOpen = false;
  isCityDropdownOpen = false;
  isBranchDropdownOpen = false;
  isPropertyCategoryDropdownOpen = false;
  isBidderTypeDropdownOpen = false;

  districtSearchText = '';
  mandiSearchText = '';
  plotNoSearchText = '';
  plotTypeSearchText = '';
  plotSizeSearchText = '';
  planSearchText = '';
  propTypeSearchText = '';
  stateSearchText = '';
  bidderDistrictSearchText = '';
  citySearchText = '';
  branchSearchText = '';
  propertyCategorySearchText = '';
  bidderTypeSearchText = '';

  plotNos: any[] = [];
  plotSizes: any[] = [];

  togglePlanDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isPlanDropdownOpen = !this.isPlanDropdownOpen;
    this.isDistrictDropdownOpen = false;
    this.isPlotNoDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPlotSizeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
  }

  selectPlan(planVal: any) {
    this.registerationForm.get('planId')?.setValue(planVal);
    this.registerationForm.get('planId')?.markAsTouched();
    this.isPlanDropdownOpen = false;
    this.planSearchText = '';
  }

  closeAllDropdowns(): void {
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPlotNoDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPlotSizeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isBranchDropdownOpen = false;
    this.isPropertyCategoryDropdownOpen = false;
    this.isBidderTypeDropdownOpen = false;
  }

  openDropdown(openProperty: string): void {
    if (this.readonlyMode) return;
    this.closeAllDropdowns();
    (this as any)[openProperty] = true;
  }

  onDropdownInput(controlName: string, searchProperty: string, event: Event, openProperty: string): void {
    const value = (event.target as HTMLInputElement).value;
    (this as any)[searchProperty] = value;
    this.closeAllDropdowns();
    (this as any)[openProperty] = true;
    this.registerationForm.get(controlName)?.setValue(value, { emitEvent: false });
  }

  getSelectedPlanName(): string {
    const value = this.registerationForm?.get('planId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.plans?.find(p => {
      const id = p?.planId ?? p?.PlanId ?? p?.id ?? p;
      const name = p?.planName ?? p?.PlanName ?? p?.name;
      return String(id) === String(value) || String(name) === String(value);
    });
    if (selected) {
      return selected.planName ?? selected.PlanName ?? selected.name ?? String(selected);
    }
    if (this.propertyData?.planName || this.propertyData?.PlanName) {
      return this.propertyData.planName || this.propertyData.PlanName;
    }
    return '';
  }

  isPlanSelected(plan: any): boolean {
    const value = this.registerationForm?.get('planId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const planId = plan?.planId ?? plan?.PlanId ?? plan?.id ?? plan;
    const planName = plan?.planName ?? plan?.PlanName ?? plan?.name;
    return String(planId) === String(value) || String(planName) === String(value);
  }

  toggleDistrictDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isDistrictDropdownOpen = !this.isDistrictDropdownOpen;
    this.isPlanDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
  }

  selectDistrict(districtId: any) {
    this.registerationForm.get('districtId')?.setValue(districtId);
    this.registerationForm.get('districtId')?.markAsTouched();
    this.isDistrictDropdownOpen = false;
    this.districtSearchText = '';
  }

  getSelectedDistrictName(): string {
    const value = this.registerationForm?.get('districtId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.districts?.find(d => String(d.districtId) === String(value));
    return selected ? selected.districtName : '';
  }

  isDistrictSelected(item: any): boolean {
    const value = this.registerationForm?.get('districtId')?.value;
    if (value === undefined || value === null || value === '') return false;
    return String(item?.districtId) === String(value);
  }

  togglePlotNoDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isPlotNoDropdownOpen = !this.isPlotNoDropdownOpen;
    this.isDistrictDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPlotSizeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isBranchDropdownOpen = false;
    this.isPropertyCategoryDropdownOpen = false;
    this.isBidderTypeDropdownOpen = false;
  }

  selectPlotNo(val: any) {
    this.registerationForm.get('plotNo')?.setValue(val);
    this.registerationForm.get('plotNo')?.markAsTouched();
    this.isPlotNoDropdownOpen = false;
    this.plotNoSearchText = '';
    this.registerationForm.get('plotsize')?.setValue('', { emitEvent: false });
    this.plotSizes = [];

    const mandiId = this.registerationForm.get('mandiId')?.value;
    const plotTypeId = this.registerationForm.get('plotTypeId')?.value;
    if (mandiId && plotTypeId && val) {
      this.loadPlotSizesByPlotNo(mandiId, plotTypeId, val);
    }
  }

  loadPlotSizesByPlotNo(mandiId: any, plotTypeId: any, plotNo: any, callback?: () => void) {
    if (!mandiId || !plotTypeId || !plotNo) {
      this.plotSizes = [];
      this.registerationForm.get('plotsize')?.setValue('', { emitEvent: false });
      if (callback) callback();
      return;
    }
    this.service.GetPlotSizebyPlotNo(mandiId, plotTypeId, plotNo).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.plotSizes = data.map((item: any) => ({
          plotSizeId: item.plotSizeId ?? item.PlotSizeId ?? item.plotSize ?? item.PlotSize ?? item,
          plotSize: item.plotSize ?? item.PlotSize ?? item.name ?? item
        }));
        // this.cdr.detectChanges();
        if (callback) callback();
      },
      error: (err: any) => {
        // console.error('Error fetching plot sizes by plot no:', err);
        this.plotSizes = [];
        this.registerationForm.get('plotsize')?.setValue('', { emitEvent: false });
        if (callback) callback();
      }
    });
  }

  getSelectedPlotNoName(): string {
    const value = this.registerationForm?.get('plotNo')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.plotNos?.find(p => {
      const id = p?.plotNo ?? p?.id ?? p;
      return String(id) === String(value) || String(p?.label) === String(value);
    });
    if (!selected) return String(value);
    return selected.plotNo ? String(selected.plotNo) : (selected.label ? String(selected.label) : String(selected));
  }

  isPlotNoSelected(item: any): boolean {
    const value = this.registerationForm?.get('plotNo')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.plotNo ?? item?.id ?? item;
    return String(id) === String(value) || String(item?.label) === String(value);
  }

  togglePlotTypeDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isPlotTypeDropdownOpen = !this.isPlotTypeDropdownOpen;
    this.isPlotNoDropdownOpen = false;
    this.isPlotSizeDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isBranchDropdownOpen = false;
    this.isPropertyCategoryDropdownOpen = false;
    this.isBidderTypeDropdownOpen = false;
  }

  selectPlotType(val: any) {
    this.registerationForm.get('plotTypeId')?.setValue(val);
    this.registerationForm.get('plotTypeId')?.markAsTouched();
    this.isPlotTypeDropdownOpen = false;
    this.plotTypeSearchText = '';
  }

  getSelectedPlotTypeName(): string {
    const value = this.registerationForm?.get('plotTypeId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.plotTypes?.find(t => {
      const id = t?.plotTypeId ?? t?.id ?? t;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.plotType ?? selected.plotTypeName ?? selected.name ?? selected;
  }

  isPlotTypeSelected(item: any): boolean {
    const value = this.registerationForm?.get('plotTypeId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.plotTypeId ?? item?.id ?? item;
    return String(id) === String(value);
  }

  togglePlotSizeDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isPlotSizeDropdownOpen = !this.isPlotSizeDropdownOpen;
    this.isPlotNoDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isBranchDropdownOpen = false;
    this.isPropertyCategoryDropdownOpen = false;
    this.isBidderTypeDropdownOpen = false;
  }

  selectPlotSize(val: any) {
    this.registerationForm.get('plotsize')?.setValue(val);
    this.registerationForm.get('plotsize')?.markAsTouched();
    this.isPlotSizeDropdownOpen = false;
    this.plotSizeSearchText = '';

    const mandiId = this.registerationForm.get('mandiId')?.value;
    const plotTypeId = this.registerationForm.get('plotTypeId')?.value;
    const plotNo = this.registerationForm.get('plotNo')?.value;
    const plotSize = this.registerationForm.get('plotsize')?.value;

    if (mandiId && plotTypeId && plotNo && plotSize) {
      this.fetchAndPatchPropertyDetailsByMandiPlot(mandiId, plotTypeId, plotNo, plotSize);
    }
  }

  getSelectedPlotSizeName(): string {
    const value = this.registerationForm?.get('plotsize')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.plotSizes?.find(s => {
      const id = s?.plotSizeId ?? s?.id ?? s?.plotSize ?? s;
      const name = s?.plotSize ?? s?.name ?? s;
      return String(id) === String(value) || String(name) === String(value);
    });
    if (!selected) return String(value);
    return selected.plotSize ?? selected.name ?? String(selected);
  }

  isPlotSizeSelected(item: any): boolean {
    const value = this.registerationForm?.get('plotsize')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.plotSizeId ?? item?.id ?? item?.plotSize ?? item;
    const name = item?.plotSize ?? item?.name ?? item;
    return String(id) === String(value) || String(name) === String(value);
  }

  togglePropTypeDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isPropTypeDropdownOpen = !this.isPropTypeDropdownOpen;
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
  }

  selectPropType(val: any) {
    this.registerationForm.get('auctionPropertyType')?.setValue(val);
    this.registerationForm.get('auctionPropertyType')?.markAsTouched();
    this.isPropTypeDropdownOpen = false;
    this.propTypeSearchText = '';
  }

  getSelectedPropTypeName(): string {
    const value = this.registerationForm?.get('auctionPropertyType')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.auctionPropertyTypes?.find(t => {
      const id = t?.propertyTypeId ?? t?.id ?? t;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.propertyTypeName ?? selected.name ?? selected.propertyType ?? selected;
  }

  isPropTypeSelected(item: any): boolean {
    const value = this.registerationForm?.get('auctionPropertyType')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.propertyTypeId ?? item?.id ?? item;
    return String(id) === String(value);
  }

  toggleMandiDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isMandiDropdownOpen = !this.isMandiDropdownOpen;
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
  }

  selectMandi(mandiId: any) {
    this.registerationForm.get('mandiId')?.setValue(mandiId);
    this.registerationForm.get('mandiId')?.markAsTouched();
    this.isMandiDropdownOpen = false;
    this.mandiSearchText = '';
  }

  getSelectedMandiName(): string {
    const value = this.registerationForm?.get('mandiId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.mandis?.find(m => {
      const id = m?.mandiId ?? m?.id ?? m;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.mandiName ?? selected.name ?? selected;
  }

  isMandiSelected(item: any): boolean {
    const value = this.registerationForm?.get('mandiId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.mandiId ?? item?.id ?? item;
    return String(id) === String(value);
  }

  getSelectedMarketCommitteeName(): string {
    const value = this.registerationForm?.get('branchId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.marketCommittees?.find(m => {
      const id = m?.marketCommitteeId ?? m?.id ?? m?.branchId;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.marketCommitteeName ?? selected.name ?? selected.branchName ?? '';
  }

  getSelectedPropertyCategoryName(): string {
    const value = this.registerationForm?.get('propertyCategoryId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.propertyCategories?.find(c => {
      const id = c?.propertyCategoryId ?? c?.id ?? c;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.categoryName ?? selected.name ?? selected.propertyCategoryName ?? selected;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (target.closest('.custom-select-wrapper')) {
      return;
    }
    this.closeAllDropdowns();
  }

  ngOnInit(): void {
    // debugger
    this.loadStates();
    this.loadPropertyDistricts();
    this.loadPropertyCategories();
    this.loadBidderTypes();
    this.loadPlans();
    this.getPropertyTypes();
    this.setupCalculationListeners();
    this.registerationForm.get('districtId')?.valueChanges.subscribe((districtId) => {
      this.marketCommittees = [];
      this.registerationForm.get('branchId')?.setValue('', { emitEvent: false });
      this.mandis = [];
      this.registerationForm.get('mandiId')?.setValue('', { emitEvent: false });
      this.plotTypes = [];
      this.registerationForm.get('plotTypeId')?.setValue('', { emitEvent: false });
      this.plotNos = [];
      this.registerationForm.get('plotNo')?.setValue('', { emitEvent: false });
      this.registerationForm.get('plotsize')?.setValue('', { emitEvent: false });
      if (districtId) {
        this.loadMarketCommittees(districtId);
      }
    });
    this.registerationForm.get('ownerStateID')?.valueChanges.subscribe((stateId) => {
      this.registerationForm.get('ownerDistrtictID')?.setValue('', { emitEvent: false });
      this.registerationForm.get('ownerCityID')?.setValue('', { emitEvent: false });
      this.cities = [];
      this.bidderDistricts = [];
      if (stateId) {
        this.loadDistricts(stateId, true);
      }
    });
    this.registerationForm.get('ownerDistrtictID')?.valueChanges.subscribe((districtId) => {
      this.cities = [];
      this.registerationForm.get('ownerCityID')?.setValue('', { emitEvent: false });
      if (districtId) {
        this.loadCities(districtId);
      }
    });
    this.registerationForm.get('branchId')?.valueChanges.subscribe((branchId) => {
      this.mandis = [];
      this.registerationForm.get('mandiId')?.setValue('', { emitEvent: false });
      this.plotTypes = [];
      this.registerationForm.get('plotTypeId')?.setValue('', { emitEvent: false });
      this.plotNos = [];
      this.registerationForm.get('plotNo')?.setValue('', { emitEvent: false });
      this.registerationForm.get('plotsize')?.setValue('', { emitEvent: false });
      if (branchId) {
        this.loadMandis(branchId);
      }
    });
    this.registerationForm.get('mandiId')?.valueChanges.subscribe((mandiId) => {
      this.plotTypes = [];
      this.registerationForm.get('plotTypeId')?.setValue('', { emitEvent: false });
      this.plotNos = [];
      this.registerationForm.get('plotNo')?.setValue('', { emitEvent: false });
      this.registerationForm.get('plotsize')?.setValue('', { emitEvent: false });
      if (mandiId) {
        this.loadPlotTypes(mandiId);
      }
    });
    this.registerationForm.get('plotTypeId')?.valueChanges.subscribe((plotTypeId) => {
      this.plotNos = [];
      this.registerationForm.get('plotNo')?.setValue('', { emitEvent: false });
      this.registerationForm.get('plotsize')?.setValue('', { emitEvent: false });
      const mandiId = this.registerationForm.get('mandiId')?.value;
      if (mandiId && plotTypeId) {
        this.loadAuctionedPlots(mandiId, plotTypeId);
      }
    });
    this.registerationForm.get('plotStatus')?.valueChanges.subscribe((status) => {
      if (status === '1' || status === 'Sold') {
        this.registerationForm.get('isAuctioned')?.setValue(true);
      } else if (status === '0' || status === 'Unsold') {
        this.registerationForm.get('isAuctioned')?.setValue(false);
      }
    });
    this.registerationForm.get('propertycode')?.valueChanges.subscribe((code) => {
      if (this.propertyData && (this.propertyData.propertyCode !== code && this.propertyData.PropertyCode !== code)) {
        this.propertyData = null;
      }
    });

    this.updateAuctionValidators(this.registerationForm.get('isAuctioned')?.value);
    this.registerationForm.get('isAuctioned')?.valueChanges.subscribe((isAuctioned) => {
      this.updateAuctionValidators(isAuctioned);
      if (isAuctioned) {
        // this.loadReceiptData();
        this.calculateUIInstallments();
      }
    });
    this.registerationForm.get('isTransferred')?.valueChanges.subscribe(() => {
      this.updateBidderNameValidators();
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const mode = (params['mode'] as string) || this.mode;
      const propertyCode = params['propertyCode'] as string;
      const approvalStatus = (params['approvalStatus'] as string) || '';
      const remarksParam = (params['remarks'] as string) || '';

      // Show remarks read-only panel only when viewing an Objection record
      if (mode === 'view' && approvalStatus.trim().toLowerCase() === 'objection') {
        this.showRemarksReadOnly = true;
        this.remarksReadOnly = remarksParam || null;
      } else {
        this.showRemarksReadOnly = false;
        this.remarksReadOnly = null;
      }

      this.setMode(mode);
      if (propertyCode) {
        this.registerationForm.patchValue({ propertycode: propertyCode }, { emitEvent: false });
        this.onSearch();
      }
    });

    if (this.propertyCode && !this.route.snapshot.queryParams['propertyCode']) {
      this.setMode(this.mode);
      this.registerationForm.patchValue({ propertycode: this.propertyCode }, { emitEvent: false });
      this.onSearch();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] && this.mode) {
      this.setMode(this.mode);
    }
    if (changes['propertyCode'] && this.propertyCode && !changes['propertyCode'].firstChange) {
      this.registerationForm.patchValue({ propertycode: this.propertyCode }, { emitEvent: false });
      this.setMode(this.mode);
      this.onSearch();
    }
  }

  loadPropertyDistricts(callback?: () => void) {
    this.service.getPropertyDistricts().subscribe({
      next: (res: any) => {
        this.districts = res.data || res || [];
        if (callback) callback();
      },
      error: (err: any) => {
        console.error('Error fetching property districts:', err);
      }
    });
  }

  loadMarketCommittees(districtId: any, callback?: () => void) {
    this.isLoadingCommittees = true;
    this.registerationForm.get('branchId')?.disable({ emitEvent: false });
    this.service.getPropertyBranches(districtId).subscribe({
      next: (res: any) => {
        // console.log('API Market Committees:', res);
        this.marketCommittees = res.data || res || [];
        this.isLoadingCommittees = false;
        if (!this.readonlyMode) {
          this.registerationForm.get('branchId')?.enable({ emitEvent: false });
        }
        if (callback) callback();
      },
      error: (err: any) => {
        // console.error('Error fetching market committees:', err);
        this.isLoadingCommittees = false;
        if (!this.readonlyMode) {
          this.registerationForm.get('branchId')?.enable({ emitEvent: false });
        }
      }
    });
  }

  loadMandis(branchId: any, callback?: () => void) {
    this.isLoadingMandis = true;
    this.registerationForm.get('mandiId')?.disable({ emitEvent: false });
    this.service.getPropertyMandis(branchId).subscribe({
      next: (res: any) => {
        // console.log('API Mandis:', res);
        this.mandis = res.data || res || [];
        this.isLoadingMandis = false;
        if (!this.readonlyMode) {
          this.registerationForm.get('mandiId')?.enable({ emitEvent: false });
        }
        if (callback) callback();
      },
      error: (err: any) => {
        // console.error('Error fetching mandis:', err);
        this.isLoadingMandis = false;
        if (!this.readonlyMode) {
          this.registerationForm.get('mandiId')?.enable({ emitEvent: false });
        }
      }
    });
  }

  loadPropertyCategories() {
    this.commonService.getPropertyCategories().subscribe({
      next: (res: any) => {
        // console.log('API Property Categories:', res);
        this.propertyCategories = Array.isArray(res.data || res) ? (res.data || res) : [];
      },
      error: (err: any) => {
        console.error('Error fetching property categories:', err);
      }
    });
  }

  loadBidderTypes() {
    this.commonService.getBidderTypes().subscribe({
      next: (res: any) => {
        this.bidderTypes = Array.isArray(res.data || res) ? (res.data || res) : [];
      },
      error: (err: any) => {
        console.error('Error fetching bidder types:', err);
      }
    });
  }
  loadPlans() {
    this.commonService.getPlans().subscribe({
      next: (res: any) => {
        // console.log('API Plans:', res);
        this.plans = Array.isArray(res.data || res) ? (res.data || res) : [];
      },
      error: (err: any) => {
        console.error('Error fetching plans:', err);
      }
    });
  }
  loadPlotTypes(mandiId?: any, callback?: () => void) {
    if (!mandiId) {
      this.plotTypes = [];
      if (callback) callback();
      return;
    }
    this.isLoadingPlotTypes = true;
    this.registerationForm.get('plotTypeId')?.disable({ emitEvent: false });
    this.service.getPropertyPlotTypes(mandiId).subscribe({
      next: (res: any) => {
        // console.log('API Plot Types:', res);
        this.plotTypes = Array.isArray(res.data || res) ? (res.data || res) : [];
        this.isLoadingPlotTypes = false;
        if (!this.readonlyMode) {
          this.registerationForm.get('plotTypeId')?.enable({ emitEvent: false });
        }
        if (callback) callback();
      },
      error: (err: any) => {
        console.error('Error fetching plot types:', err);
        this.isLoadingPlotTypes = false;
        if (!this.readonlyMode) {
          this.registerationForm.get('plotTypeId')?.enable({ emitEvent: false });
        }
      }
    });
  }

  loadAuctionedPlots(mandiId: any, plotTypeId: any, callback?: () => void) {
    if (!mandiId || !plotTypeId) {
      this.plotNos = [];
      if (callback) callback();
      return;
    }
    this.service.getAuctionedPlots(mandiId, plotTypeId).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.plotNos = data.map((item: any) => {
          const num = item.plotNo ?? item.PlotNo ?? item;
          return {
            plotNo: num,
            label: `${num}`,
            plotSize: item.plotSize ?? item.PlotSize,
            plotSizeId: item.plotSizeId ?? item.PlotSizeId,
            ...item
          };
        });

        if (callback) callback();
      },
      error: (err: any) => {
        console.error('Error fetching auctioned plots:', err);
        this.plotNos = [];
      }
    });
  }

  loadPlotSizes() {
    this.commonService.getPlotSizes().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (data.length > 0) {
          this.plotSizes = data;
        } else {
          this.setDefaultPlotSizes();
        }
      },
      error: (err: any) => {
        console.error('Error fetching plot sizes:', err);
        this.setDefaultPlotSizes();
      }
    });
  }

  setDefaultPlotSizes() {
    this.plotSizes = [
      { plotSizeId: '50', plotSize: '50 Sq. Yards' },
      { plotSizeId: '100', plotSize: '100 Sq. Yards' },
      { plotSizeId: '150', plotSize: '150 Sq. Yards' },
      { plotSizeId: '200', plotSize: '200 Sq. Yards' },
      { plotSizeId: '250', plotSize: '250 Sq. Yards' },
      { plotSizeId: '300', plotSize: '300 Sq. Yards' },
      { plotSizeId: '400', plotSize: '400 Sq. Yards' },
      { plotSizeId: '500', plotSize: '500 Sq. Yards' },
      { plotSizeId: '1000', plotSize: '1000 Sq. Yards' }
    ];
  }

  initPlotNos() {
    this.plotNos = Array.from({ length: 200 }, (_, i) => {
      const num = (i + 1).toString();
      return { plotNo: num, label: `${num}` };
    });
  }
  getPropertyTypes() {
    this.commonService.getPropertyTypes().subscribe({
      next: (res: any) => {
        // console.log('API prop Types:', res);
        this.auctionPropertyTypes = Array.isArray(res.data || res) ? (res.data || res) : [];
      },
      error: (err: any) => {
        console.error('Error fetching property types:', err);
      }
    });
  }
  get receiptsFormArray(): FormArray {
    return this.registerationForm.get('receiptsFormArray') as FormArray;
  }

  get bidderNamesFormArray(): FormArray {
    return this.registerationForm.get('transferredNames') as FormArray;
  }

  formatDate(date: string) {
    if (!date) return '';
    const d = new Date(date);
    return `${('0' + d.getDate()).slice(-2)}/${('0' + (d.getMonth() + 1)).slice(-2)
      }/${d.getFullYear()}`;
  }

  loadDistricts(stateid: any, isBidder: boolean = false, callback?: () => void) {
    if (!stateid) {
      if (callback) callback();
      return;
    }
    this.commonService.getAllDistrict(stateid).subscribe({
      next: (res: any) => {
        // console.log('API1:', res);

        if (isBidder) {
          this.bidderDistricts = res.data || res || [];
        } else {
          this.districts = res.data || res || [];
        }
        if (callback) callback();
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  loadStates() {
    this.commonService.getAllStates().subscribe({
      next: (res: any) => {
        this.states = res.data || res || [];
        // console.log('s', this.states);

      },
      error: (err: any) => {
        console.error('Error fetching states:', err);
      }
    });
  }

  loadCities(districtId: any, callback?: () => void) {
    this.commonService.GetAllCityByDistrictID(districtId).subscribe({
      next: (res: any) => {
        this.cities = res.data || res || [];
        if (callback) callback();
      },
      error: (err: any) => {
        console.error('Error fetching cities:', err);
      }
    });
  }

  toggleStateDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isStateDropdownOpen = !this.isStateDropdownOpen;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
  }

  selectState(stateId: any) {
    this.registerationForm.get('ownerStateID')?.setValue(stateId);
    this.registerationForm.get('ownerStateID')?.markAsTouched();
    this.isStateDropdownOpen = false;
    this.stateSearchText = '';
  }

  getSelectedStateName(): string {
    const value = this.registerationForm?.get('ownerStateID')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.states?.find(s => String(s.stateId) === String(value));
    return selected ? selected.stateName : '';
  }

  isStateSelected(item: any): boolean {
    const value = this.registerationForm?.get('ownerStateID')?.value;
    if (value === undefined || value === null || value === '') return false;
    return String(item?.stateId) === String(value);
  }

  toggleBidderDistrictDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isBidderDistrictDropdownOpen = !this.isBidderDistrictDropdownOpen;
    this.isStateDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
  }

  selectBidderDistrict(districtId: any) {
    this.registerationForm.get('ownerDistrtictID')?.setValue(districtId);
    this.registerationForm.get('ownerDistrtictID')?.markAsTouched();
    this.isBidderDistrictDropdownOpen = false;
    this.bidderDistrictSearchText = '';
  }

  getSelectedBidderDistrictName(): string {
    const value = this.registerationForm?.get('ownerDistrtictID')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.bidderDistricts?.find(d => String(d.districtId) === String(value));
    return selected ? selected.districtName : '';
  }

  isBidderDistrictSelected(item: any): boolean {
    const value = this.registerationForm?.get('ownerDistrtictID')?.value;
    if (value === undefined || value === null || value === '') return false;
    return String(item?.districtId) === String(value);
  }

  toggleCityDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isCityDropdownOpen = !this.isCityDropdownOpen;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isDistrictDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
  }

  selectCity(cityId: any) {
    this.registerationForm.get('ownerCityID')?.setValue(cityId);
    this.registerationForm.get('ownerCityID')?.markAsTouched();
    this.isCityDropdownOpen = false;
    this.citySearchText = '';
  }

  getSelectedCityName(): string {
    const value = this.registerationForm?.get('ownerCityID')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.cities?.find(c => String(c.cityId) === String(value));
    return selected ? selected.cityName : '';
  }

  isCitySelected(item: any): boolean {
    const value = this.registerationForm?.get('ownerCityID')?.value;
    if (value === undefined || value === null || value === '') return false;
    return String(item?.cityId) === String(value);
  }

  toggleBranchDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isBranchDropdownOpen = !this.isBranchDropdownOpen;
    this.isDistrictDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isPropertyCategoryDropdownOpen = false;
    this.isBidderTypeDropdownOpen = false;
  }

  selectBranch(branchId: any) {
    this.registerationForm.get('branchId')?.setValue(branchId);
    this.registerationForm.get('branchId')?.markAsTouched();
    this.isBranchDropdownOpen = false;
    this.branchSearchText = '';
  }

  getSelectedBranchName(): string {
    const value = this.registerationForm?.get('branchId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.marketCommittees?.find(m => {
      const id = m?.marketCommitteeId ?? m?.id ?? m?.branchId;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.marketCommitteeName ?? selected.name ?? selected.branchName ?? '';
  }

  isBranchSelected(item: any): boolean {
    const value = this.registerationForm?.get('branchId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.marketCommitteeId ?? item?.id ?? item?.branchId;
    return String(id) === String(value);
  }

  togglePropertyCategoryDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isPropertyCategoryDropdownOpen = !this.isPropertyCategoryDropdownOpen;
    this.isDistrictDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isBranchDropdownOpen = false;
    this.isBidderTypeDropdownOpen = false;
  }

  selectPropertyCategory(categoryId: any) {
    this.registerationForm.get('propertyCategoryId')?.setValue(categoryId);
    this.registerationForm.get('propertyCategoryId')?.markAsTouched();
    this.isPropertyCategoryDropdownOpen = false;
    this.propertyCategorySearchText = '';
  }

  isPropertyCategorySelected(item: any): boolean {
    const value = this.registerationForm?.get('propertyCategoryId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.propertyCategoryId ?? item?.id ?? item;
    return String(id) === String(value);
  }

  toggleBidderTypeDropdown(event: Event) {
    if (this.readonlyMode) return;
    event.stopPropagation();
    this.isBidderTypeDropdownOpen = !this.isBidderTypeDropdownOpen;
    this.isDistrictDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isPlanDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPropTypeDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isBidderDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.isBranchDropdownOpen = false;
    this.isPropertyCategoryDropdownOpen = false;
  }

  selectBidderType(typeId: any) {
    this.registerationForm.get('bidderTypeId')?.setValue(typeId);
    this.registerationForm.get('bidderTypeId')?.markAsTouched();
    this.isBidderTypeDropdownOpen = false;
    this.bidderTypeSearchText = '';
  }

  getSelectedBidderTypeName(): string {
    const value = this.registerationForm?.get('bidderTypeId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.bidderTypes?.find(t => {
      const id = t?.bidderTypeId ?? t?.id ?? t;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.bidderTypeName ?? selected.name ?? selected;
  }

  isBidderTypeSelected(item: any): boolean {
    const value = this.registerationForm?.get('bidderTypeId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.bidderTypeId ?? item?.id ?? item;
    return String(id) === String(value);
  }

  onDistrictBlur() {
    setTimeout(() => {
      this.isDistrictDropdownOpen = false;
    }, 150);
  }

  onBranchBlur() {
    setTimeout(() => {
      this.isBranchDropdownOpen = false;
    }, 150);
  }

  onMandiBlur() {
    setTimeout(() => {
      this.isMandiDropdownOpen = false;
    }, 150);
  }

  onPlotNoBlur() {
    setTimeout(() => {
      this.isPlotNoDropdownOpen = false;
    }, 150);
  }

  onPlotTypeBlur() {
    setTimeout(() => {
      this.isPlotTypeDropdownOpen = false;
    }, 150);
  }

  onPlotSizeBlur() {
    setTimeout(() => {
      this.isPlotSizeDropdownOpen = false;
    }, 150);
  }

  onPlanBlur() {
    setTimeout(() => {
      this.isPlanDropdownOpen = false;
    }, 150);
  }

  onPropertyCategoryBlur() {
    setTimeout(() => {
      this.isPropertyCategoryDropdownOpen = false;
    }, 150);
  }

  onBidderTypeBlur() {
    setTimeout(() => {
      this.isBidderTypeDropdownOpen = false;
    }, 150);
  }

  onStateBlur() {
    setTimeout(() => {
      this.isStateDropdownOpen = false;
    }, 150);
  }

  onBidderDistrictBlur() {
    setTimeout(() => {
      this.isBidderDistrictDropdownOpen = false;
    }, 150);
  }

  onCityBlur() {
    setTimeout(() => {
      this.isCityDropdownOpen = false;
    }, 150);
  }

  onPropTypeBlur() {
    setTimeout(() => {
      this.isPropTypeDropdownOpen = false;
    }, 150);
  }

  mapBidderType(id: number) {
    return id === 1 ? 'Individual' : 'Company';
  }
  onSearch() {
    // debugger
    const propertycodeControl = this.registerationForm.get('propertycode');
    if (!propertycodeControl || propertycodeControl.invalid) {
      propertycodeControl?.markAsTouched();
      return;
    }
    const propertyCode = propertycodeControl.value;

    const fetchFromEAuction = () => {
      this.service.GetPropertyEAuctionDetailsByPropertyCodeAsync(propertyCode, false).subscribe({
        next: (res: any) => {
          const d = res.data;
          const hasValidData = !!res.success && !!d && ((d.id && d.id > 0) || (d.propertyId && d.propertyId > 0) || !!d.propertyCode || !!d.plotNo || !!d.bidderName);
          if (hasValidData) {
            this.patchPropertyData(d, false);
          } else {
            this.toastr.warning('No records found related to this Allottee Code', 'Error');
            this.propertyData = null;
            this.resetForm();
            this.registerationForm.patchValue({ propertycode: propertyCode });
          }
        },
        error: (err: any) => {
          this.toastr.warning('No records found related to this Allottee Code', 'Error');
          this.propertyData = null;
          this.resetForm();
          this.registerationForm.patchValue({ propertycode: propertyCode });
        }
      });
    };

    if (this.mode === 'edit' || this.mode === 'view') {
      this.service.getPropertyByCode(propertyCode).subscribe({
        next: (res: any) => {
          const d = res?.data;
          const hasValidData = !!res?.success && !!d && ((d.id && d.id > 0) || !!d.propertyCode);
          if (hasValidData) {
            this.patchPropertyData(d, false);
          } else {
            fetchFromEAuction();
          }
        },
        error: () => {
          fetchFromEAuction();
        }
      });
    } else {
      fetchFromEAuction();
    }
  }

  fetchAndPatchPropertyDetailsByMandiPlot(mandiId: any, plotTypeId: any, plotNo: any, plotSize: any) {
    if (!mandiId || !plotTypeId || !plotNo) return;
    this.service.getPropertyDetailsByMandiPlot(mandiId, plotTypeId, plotNo, plotSize, false).subscribe({
      next: (res: any) => {
        const d = res?.data || res;
        const hasValidData = !!d && ((d.id && d.id > 0) || (d.propertyId && d.propertyId > 0) || !!d.propertyCode || !!d.plotNo || !!d.bidderName || !!d.plotSize);
        if (hasValidData) {
          this.patchPropertyData(d, true);
        }
      },
      error: (err: any) => {
        console.error('Error fetching property details by mandi plot:', err);
      }
    });
  }

  patchPropertyData(d: any, isFromPlotSelection: boolean = false) {
    this.propertyData = d;

    const patchFormValues = () => {
      this.bidderNamesFormArray.clear();
      let displayBidderName = d.bidderName;
      if (d.isTransferred && d.bidderName) {
        const names = d.bidderName.split(',').map((n: string) => n.trim());
        displayBidderName = '';
        names.forEach((name: string) => {
          this.bidderNamesFormArray.push(this.fb.control(name, Validators.required));
        });
      }
      let districtId: number | null = null;
      let branchId: number | null = null;
      let mandiId: number | null = null;
      let propertyCategoryId: number | null = null;
      let bidderTypeId: number | null = null;

      // DISTRICT
      if (d.districtId !== null && d.districtId !== undefined && d.districtId !== '') {
        const districtValue = String(d.districtId).trim();
        const match = this.districts?.find((p: any) =>
          String(p.districtId ?? '').trim() === districtValue ||
          String(p.id ?? '').trim() === districtValue ||
          String(p.districtName ?? '').trim().toLowerCase() === districtValue.toLowerCase()
        );
        if (match) {
          districtId = Number(match.districtId ?? match.id);
        }
      }

      // BRANCH / MARKET COMMITTEE
      if (d.branchId !== null && d.branchId !== undefined && d.branchId !== '') {
        const branchValue = String(d.branchId).trim();
        const match = this.marketCommittees?.find((p: any) =>
          String(p.marketCommitteeId ?? '').trim() === branchValue ||
          String(p.branchId ?? '').trim() === branchValue ||
          String(p.id ?? '').trim() === branchValue ||
          String(p.marketCommitteeName ?? '').trim().toLowerCase() === branchValue.toLowerCase()
        );
        if (match) {
          branchId = Number(match.marketCommitteeId ?? match.branchId ?? match.id);
        }
      }

      // MANDI
      if (d.mandiId !== null && d.mandiId !== undefined && d.mandiId !== '') {
        const mandiValue = String(d.mandiId).trim();
        const match = this.mandis?.find((p: any) =>
          String(p.mandiId ?? '').trim() === mandiValue ||
          String(p.id ?? '').trim() === mandiValue ||
          String(p.mandiName ?? '').trim().toLowerCase() === mandiValue.toLowerCase()
        );
        if (match) {
          mandiId = Number(match.mandiId ?? match.id);
        }
      }

      if (d.propertyCategoryId !== null && d.propertyCategoryId !== undefined && d.propertyCategoryId !== '') {
        const propertyCategoryIdValue = String(d.propertyCategoryId).trim();
        const match = this.propertyCategories?.find((p: any) =>
          String(p.propertyCategoryId ?? '').trim() === propertyCategoryIdValue ||
          String(p.id ?? '').trim() === propertyCategoryIdValue ||
          String(p.categoryName ?? p.propertyCategoryName ?? '').trim().toLowerCase() === propertyCategoryIdValue.toLowerCase()
        );
        if (match) {
          propertyCategoryId = Number(match.propertyCategoryId ?? match.id);
        }
      }

      if (d.bidderTypeId !== null && d.bidderTypeId !== undefined && d.bidderTypeId !== '') {
        const bidderTypeIdValue = String(d.bidderTypeId).trim();
        const match = this.bidderTypes?.find((p: any) =>
          String(p.bidderTypeId ?? '').trim() === bidderTypeIdValue ||
          String(p.id ?? '').trim() === bidderTypeIdValue ||
          String(p.bidderTypeName ?? '').trim().toLowerCase() === bidderTypeIdValue.toLowerCase()
        );
        if (match) {
          bidderTypeId = Number(match.bidderTypeId ?? match.id);
        }
      }

      let planId: any = null;
      const rawPlanId = d.planId ?? d.PlanId;
      const rawPlanName = d.planName ?? d.PlanName ?? d.plan ?? d.Plan;
      if (rawPlanId || rawPlanName) {
        const match = this.plans?.find((p: any) => {
          const pId = p?.planId ?? p?.PlanId ?? p?.id;
          const pName = p?.planName ?? p?.PlanName ?? p?.name;
          if (rawPlanId && String(pId) === String(rawPlanId)) return true;
          if (rawPlanName && String(pName).trim().toLowerCase() === String(rawPlanName).trim().toLowerCase()) return true;
          return false;
        });
        if (match) {
          planId = match.planId ?? match.PlanId ?? match.id;
        } else {
          if (rawPlanId && rawPlanName && rawPlanName !== String(rawPlanId)) {
            this.plans.push({ planId: rawPlanId, planName: rawPlanName });
          }
          planId = rawPlanId ?? rawPlanName;
        }
      }

      let mappedPlotStatus = '';
      if (d.plotStatus !== null && d.plotStatus !== undefined && d.plotStatus !== '') {
        const statusStr = String(d.plotStatus).trim().toLowerCase();
        if (statusStr === '1' || statusStr === 'true' || statusStr === 'sold') {
          mappedPlotStatus = '1';
        } else if (statusStr === '0' || statusStr === 'false' || statusStr === 'unsold') {
          mappedPlotStatus = '0';
        } else {
          mappedPlotStatus = String(d.plotStatus).trim();
        }
      }

      const isAuctionedValue = mappedPlotStatus === '1' ? true : (mappedPlotStatus === '0' ? false : !!d.isAuctioned);

      const patchValues: any = {
        districtId: isFromPlotSelection ? this.registerationForm.get('districtId')?.value : (districtId || d.districtId),
        branchId: isFromPlotSelection ? this.registerationForm.get('branchId')?.value : (branchId || d.branchId),
        mandiId: isFromPlotSelection ? this.registerationForm.get('mandiId')?.value : (mandiId || d.mandiId),
        plotTypeId: isFromPlotSelection ? this.registerationForm.get('plotTypeId')?.value : (d.plotTypeId),
        plotNo: d.plotNo !== undefined && d.plotNo !== null ? String(d.plotNo) : this.registerationForm.get('plotNo')?.value,
        plotsize: d.plotSize ?? d.PlotSize ?? this.registerationForm.get('plotsize')?.value,
        planId: planId ?? (d.planId ?? d.PlanId),
        plotStatus: mappedPlotStatus,
        propertyCategoryId: d.propertyCategoryId,
        propertycode: d.propertyCode || this.registerationForm.get('propertycode')?.value,
        isAssetResumed: d.assetResumed,
        isCourtCase: d.isCourtCase,
        isAssetSurrendered: d.assetSurrendered,
        isAssetLocked: d.isAssetLocked,
        isDefaulter: d.isDefaulter,
        anyComplaint: d.anyComplaint,
        ndcGenerated: d.ndcGenerated,
        ndcIssued: d.ndcIssued,
        assetVerified: d.assetVerified,
        isAuctioned: isAuctionedValue,
        auctionDate: d.auctionDate ? d.auctionDate.substring(0, 16) : '',
        bidderTypeId: d.bidderTypeId,
        email: d.email,
        bidderName: displayBidderName,
        isTransferred: d.isTransferred,
        relation: d.relation,
        fatherOrHusbandName: d.fatherOrHusbandName,
        panNo: d.panNo,
        aadhaarNo: d.aadhaarNo,
        mobileNo: d.mobileNo,
        address: d.address,
        auctionPropertyType: d.propertyTypeId,
        reservePrice: d.reservePrice,
        finalBidPrice: d.finalBidPrice,
        formTransactionId: d.formTransactionId,
        formTxnDate: d.formTxnDate ? d.formTxnDate.split('T')[0] : '',
        formPaidAmount: d.formPaidAmount,
        emdTxnId: d.emdTxnId,
        emdDate: d.emdDate ? d.emdDate.split('T')[0] : '',
        allotmentTxnId: d.allotmentTxnId ?? d.AllotmentTxnId,
        allotmentDate: d.allotmentDate ? d.allotmentDate.split('T')[0] : (d.AllotmentDate ? d.AllotmentDate.split('T')[0] : ''),
        allotmentTransactionDate: d.allotmentTransactionDate ? d.allotmentTransactionDate.split('T')[0] : (d.AllotmentTransactionDate ? d.AllotmentTransactionDate.split('T')[0] : (d.allotmentTxnDate ? d.allotmentTxnDate.split('T')[0] : (d.AllotmentTxnDate ? d.AllotmentTxnDate.split('T')[0] : ''))),
        allotmentAmount: d.allotmentAmount ?? d.AllotmentAmount,
        dueAmount: d.dueAmount,
        accumulatedInterest: d.totalDueWithInterest - d.dueAmount,
        totalDueWithInterest: d.totalDueWithInterest,
        ownerStateID: d.ownerStateID,
        ownerDistrtictID: d.ownerDistrtictID,
        ownerCityID: d.ownerCityID
      };

      this.registerationForm.patchValue(patchValues, { emitEvent: false });

      const receiptsFromDb = d.installments || d.Installments || d.receipts || d.receiptList || d.receiptsFormArray || d.receiptAllocations || d.propertyBidderReceipts;
      if (receiptsFromDb && Array.isArray(receiptsFromDb)) {
        this.receiptList = receiptsFromDb.map((rec: any) => {
          const receiptNo = rec.receiptNo || rec.ReceiptNo || '';
          const receiptDate = rec.receiptDate || rec.ReceiptDate || '';
          const treasuryReceiptDate = rec.treasuryReceiptDate || rec.TreasuryReceiptDate || '';
          const draftNo = rec.draftNo || rec.DraftNo || '';
          const draftAmount = rec.draftAmount !== undefined ? rec.draftAmount : rec.DraftAmount;
          const draftDate = rec.draftDate || rec.DraftDate || '';
          const draftBank = rec.draftBank || rec.DraftBank || '';
          const principalAmount = rec.principalAmount !== undefined ? rec.principalAmount : rec.PrincipalAmount;
          const interestAmount = rec.interestAmount !== undefined ? rec.interestAmount : rec.InterestAmount;
          const otherAmount = rec.otherAmount !== undefined ? rec.otherAmount : rec.OtherAmount;
          const penaltyAmount = rec.penaltyAmount !== undefined ? rec.penaltyAmount : rec.PenaltyAmount;
          const penaltyType = rec.penaltyType || rec.PenaltyType || 'N/A';
          const remarks = rec.remarks || rec.Remarks || '';
          const isVerified = rec.isVerified !== undefined ? rec.isVerified : rec.IsVerified;

          return {
            receiptNo,
            receiptDate: receiptDate ? receiptDate.split('T')[0] : '',
            treasuryReceiptDate: treasuryReceiptDate ? treasuryReceiptDate.split('T')[0] : '',
            draftNo,
            draftAmount: draftAmount || 0,
            draftDate: draftDate ? draftDate.split('T')[0] : '',
            draftBank,
            principalAmount: principalAmount || 0,
            interestAmount: interestAmount || 0,
            otherAmount: otherAmount || 0,
            penaltyAmount: penaltyAmount || 0,
            penaltyType,
            remarks,
            isVerified
          };
        });
        this.populateReceiptsFormArray();
      }

      this.updateAuctionValidators(isAuctionedValue);
      if (isAuctionedValue) {
        this.calculateUIInstallments();
      }
      this.updateBidderNameValidators();
      this.setMode(this.mode);
      this.dataLoaded.emit(d);
      this.toastr.success('Record found and loaded successfully.', 'Success');
    };

    const proceedToBidderLocationPatch = () => {
      if (d.ownerStateID) {
        this.loadDistricts(d.ownerStateID, true, () => {
          if (d.ownerDistrtictID) {
            this.loadCities(d.ownerDistrtictID, () => {
              patchFormValues();
            });
          } else {
            patchFormValues();
          }
        });
      } else {
        patchFormValues();
      }
    };

    if (!isFromPlotSelection && d.districtId) {
      this.loadMarketCommittees(d.districtId, () => {
        if (d.branchId) {
          this.loadMandis(d.branchId, () => {
            if (d.mandiId) {
              this.loadPlotTypes(d.mandiId, proceedToBidderLocationPatch);
            } else {
              proceedToBidderLocationPatch();
            }
          });
        } else {
          proceedToBidderLocationPatch();
        }
      });
    } else {
      proceedToBidderLocationPatch();
    }
  }

  private populateReceiptsFormArray(): void {
    this.receiptsFormArray.clear();
    this.receiptList.forEach(receipt => {
      this.receiptsFormArray.push(this.createReceiptRowFormGroup(receipt));
    });
  }
  private createReceiptRowFormGroup(receipt: Partial<Receipt>): FormGroup {
    return this.fb.group({
      receiptNo: [receipt.receiptNo || ''],
      receiptDate: [receipt.receiptDate || ''],
      treasuryReceiptDate: [receipt.treasuryReceiptDate || ''],
      draftNo: [receipt.draftNo || ''],
      draftAmount: [receipt.draftAmount ?? 0, [Validators.min(0)]],
      draftDate: [receipt.draftDate || ''],
      draftBank: [receipt.draftBank || ''],
      principalAmount: [receipt.principalAmount ?? 0, [Validators.min(0)]],
      interestAmount: [receipt.interestAmount ?? 0, [Validators.min(0)]],
      otherAmount: [receipt.otherAmount ?? 0, [Validators.min(0)]],
      penaltyAmount: [receipt.penaltyAmount ?? 0, [Validators.min(0)]],
      penaltyType: [receipt.penaltyType || 'N/A'],
      remarks: [receipt.remarks || ''],
      isEditing: [receipt.isEditing || false]
    });
  }
  //Add new receipt row with default values and set it to editing mode
  addNewReceiptRow(): void {
    const newEmptyRecord: Partial<Receipt> = {
      receiptNo: `REC-2026-00${this.receiptsFormArray.length + 1}`,
      receiptDate: new Date().toISOString().split('T')[0],
      treasuryReceiptDate: new Date().toISOString().split('T')[0],
      draftDate: new Date().toISOString().split('T')[0],
      draftAmount: 0,
      principalAmount: 0,
      interestAmount: 0,
      otherAmount: 0,
      penaltyAmount: 0,
      penaltyType: 'N/A',
      isEditing: true
    };

    this.receiptsFormArray.push(this.createReceiptRowFormGroup(newEmptyRecord));
  }

  addBidderName(): void {
    const bidderControl = this.registerationForm.get('bidderName');
    const bidderName = (bidderControl?.value || '').trim();
    if (!bidderName) {
      return;
    }

    this.bidderNamesFormArray.push(this.fb.control(bidderName, Validators.required));
    bidderControl?.setValue('');
    this.updateBidderNameValidators();
  }

  removeBidderName(index: number): void {
    this.bidderNamesFormArray.removeAt(index);
    this.updateBidderNameValidators();
  }

  get hasActiveReceiptRowEditing(): boolean {
    return this.receiptsFormArray.controls.some((control) => control.get('isEditing')?.value);
  }

  enableRowEditing(index: number): void {
    this.receiptsFormArray.at(index).get('isEditing')?.setValue(true);
  }

  saveRowData(index: number): void {
    const rowGroup = this.receiptsFormArray.at(index) as FormGroup;
    if (rowGroup.invalid) {
      rowGroup.markAllAsTouched();
      return;
    }
    rowGroup.get('isEditing')?.setValue(false);

    this.receiptList[index] = rowGroup.getRawValue();

    const totalReceiptInterest = this.receiptList.reduce((acc, rec) => acc + (Number(rec.interestAmount) || 0), 0);
    this.registerationForm.get('accumulatedInterest')?.setValue(totalReceiptInterest, { emitEvent: false });

    this.calculateUIInstallments();
  }

  cancelRowEditing(index: number, isNew: boolean): void {
    if (isNew && !this.receiptList[index]) {
      this.removeReceiptRow(index);
    } else {
      const originalValue = this.receiptList[index];
      if (originalValue) {
        originalValue.isEditing = false;
        this.receiptsFormArray.at(index).patchValue(originalValue);
      }
    }
  }

  removeReceiptRow(index: number): void {
    this.receiptsFormArray.removeAt(index);
    if (this.receiptList[index]) {
      this.receiptList.splice(index, 1);
    }

    const totalReceiptInterest = this.receiptList.reduce((acc, rec) => acc + (Number(rec.interestAmount) || 0), 0);
    this.registerationForm.get('accumulatedInterest')?.setValue(totalReceiptInterest, { emitEvent: false });

    this.calculateUIInstallments();
  }


  maskInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    let digits = value.replace(/^XXXXXXXX/, '').replace(/\D/g, '');

    if (digits.length > 4) {
      digits = digits.substring(0, 4);
    }

    const maskedValue = 'XXXXXXXX' + digits;
    this.registerationForm.get('aadharNo')?.setValue(maskedValue, { emitEvent: false });
    input.value = maskedValue;
  }

  private readonly ddmmyyyyPattern = /^\d{2}\/\d{2}\/\d{4}$/;

  private setMode(mode: string | undefined): void {
    if (mode === 'edit') {
      this.mode = 'edit';
      this.readonlyMode = false;
      this.registerationForm.enable({ emitEvent: false });
      this.registerationForm.get('totalDueWithInterest')?.disable({ emitEvent: false });
      this.enableReceiptRows();
    } else if (mode === 'view') {
      this.mode = 'view';
      this.readonlyMode = true;
      this.registerationForm.disable({ emitEvent: false });
      this.registerationForm.get('totalDueWithInterest')?.disable({ emitEvent: false });
      this.disableReceiptRows();
    } else {
      this.mode = 'create';
      this.readonlyMode = false;
      this.registerationForm.enable({ emitEvent: false });
      this.registerationForm.get('totalDueWithInterest')?.disable({ emitEvent: false });
      this.enableReceiptRows();
    }
  }

  goBack(): void {
    if (this.readonlyMode || this.mode === 'edit') {
      window.history.back();
    } else {
      this.resetForm();
    }
  }

  private disableReceiptRows(): void {
    this.receiptsFormArray.controls.forEach(row => row.disable({ emitEvent: false }));
  }

  private enableReceiptRows(): void {
    this.receiptsFormArray.controls.forEach(row => row.enable({ emitEvent: false }));
  }

  formatDisplayDate(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = this.parseDdMmYyyy(value);
    if (!date) {
      return '';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseDdMmYyyy(value: string | Date): Date | null {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    const stringValue = String(value).trim();
    if (this.ddmmyyyyPattern.test(stringValue)) {
      const parts = stringValue.split('/').map((part) => parseInt(part, 10));
      const [day, month, year] = parts;
      const parsed = new Date(year, month - 1, day);
      if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) {
        return parsed;
      }
    }

    const fallbackDate = new Date(stringValue);
    return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
  }

  get filteredDistricts(): any[] {
    const term = this.districtSearchText?.toLowerCase().trim();
    if (!term) return this.districts;
    return this.districts.filter(d => (d.districtName || '').toLowerCase().includes(term));
  }

  get filteredMandis(): any[] {
    const term = this.mandiSearchText?.toLowerCase().trim();
    if (!term) return this.mandis;
    return this.mandis.filter(m => (m.mandiName || m.name || '').toLowerCase().includes(term));
  }

  get filteredPlotNos(): any[] {
    const term = this.plotNoSearchText?.toLowerCase().trim();
    if (!term) return this.plotNos;
    return this.plotNos.filter(p => {
      const text = `${p?.plotNo ?? ''} ${p?.label ?? ''}`;
      return text.toLowerCase().includes(term);
    });
  }

  get filteredPlotTypes(): any[] {
    const term = this.plotTypeSearchText?.toLowerCase().trim();
    if (!term) return this.plotTypes;
    return this.plotTypes.filter(t => (t.plotType || t.plotTypeName || t.name || '').toLowerCase().includes(term));
  }

  get filteredPlotSizes(): any[] {
    const term = this.plotSizeSearchText?.toLowerCase().trim();
    if (!term) return this.plotSizes;
    return this.plotSizes.filter(s => {
      const text = s?.plotSize ?? s?.name ?? s?.plotSizeId ?? String(s);
      return String(text).toLowerCase().includes(term);
    });
  }

  get filteredPlans(): any[] {
    const term = this.planSearchText?.toLowerCase().trim();
    if (!term) return this.plans;
    return this.plans.filter(p => (p.planName || p.PlanName || p.name || '').toLowerCase().includes(term));
  }

  get filteredPropertyTypes(): any[] {
    const term = this.propTypeSearchText?.toLowerCase().trim();
    if (!term) return this.auctionPropertyTypes;
    return this.auctionPropertyTypes.filter(t => (t.propertyTypeName || t.name || t.propertyTypeName || '').toLowerCase().includes(term));
  }

  get filteredStates(): any[] {
    const term = this.stateSearchText?.toLowerCase().trim();
    if (!term) return this.states;
    return this.states.filter(s => (s.stateName || '').toLowerCase().includes(term));
  }

  get filteredBidderDistricts(): any[] {
    const term = this.bidderDistrictSearchText?.toLowerCase().trim();
    if (!term) return this.bidderDistricts;
    return this.bidderDistricts.filter(d => (d.districtName || '').toLowerCase().includes(term));
  }

  get filteredCities(): any[] {
    const term = this.citySearchText?.toLowerCase().trim();
    if (!term) return this.cities;
    return this.cities.filter(c => (c.cityName || '').toLowerCase().includes(term));
  }

  get filteredMarketCommittees(): any[] {
    const term = this.branchSearchText?.toLowerCase().trim();
    if (!term) return this.marketCommittees;
    return this.marketCommittees.filter(m => (m.marketCommitteeName || m.name || m.branchName || '').toLowerCase().includes(term));
  }

  get filteredPropertyCategories(): any[] {
    const term = this.propertyCategorySearchText?.toLowerCase().trim();
    if (!term) return this.propertyCategories;
    return this.propertyCategories.filter(c => (c.categoryName || c.name || c.propertyCategoryName || '').toLowerCase().includes(term));
  }

  get filteredBidderTypes(): any[] {
    const term = this.bidderTypeSearchText?.toLowerCase().trim();
    if (!term) return this.bidderTypes;
    return this.bidderTypes.filter(t => (t.bidderTypeName || t.name || '').toLowerCase().includes(term));
  }

  isInvalid(controlName: string): boolean {
    const control = this.registerationForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: string, label: string): string {
    const control = this.registerationForm.get(controlName);
    if (control?.hasError('email')) {
      return 'Please enter a valid email address.';
    }
    return `${label} is required.`;
  }

  getPendingRequiredFieldLabels(): string[] {
    const labels: Record<string, string> = {
      districtId: 'District',
      branchId: 'Market Committee',
      mandiId: 'Mandi',
      plotNo: 'Plot No.',
      plotsize: 'Plot Size',
      plotTypeId: 'Plot Type',
      plotStatus: 'Plot Status',
      planId: 'Plan',
      propertyCategoryId: 'Property Category',
      address: 'Permanent Communication Address',
      finalBidPrice: 'Highest Bidder / Allotment Amount',
      // allotmentTxnId: '25% Milestone Txn ID / Challan No.',
      auctionDate: 'Auction Date & Time',
      // bidderTypeId: 'Bidder Type',
      bidderName: 'Allotee Name',
      relation: 'Relation',
      fatherOrHusbandName: 'Father / Husband Name',
      // auctionPropertyType: 'Property Type',
      allotmentDate: 'Allotment Date',
      // allotmentAmount: 'Allotment Amount Paid',
      // mobileNo: 'Mobile No.'
    };
    return Object.keys(labels)
      .filter((controlName) => {
        const control = this.registerationForm.get(controlName);
        return !!control && control.invalid;
      })
      .map((controlName) => labels[controlName]);
  }

  onSubmit(): void {
    // debugger
    if (this.registerationForm.invalid) {
      this.registerationForm.markAllAsTouched();
      const invalidControls: string[] = [];
      const controls = this.registerationForm.controls;
      for (const name in controls) {
        if (controls[name].invalid) {
          invalidControls.push(name);
        }
      }
      const isAuctioned = !!this.registerationForm.get('isAuctioned')?.value;
      const plotStatus = this.registerationForm.get('plotStatus')?.value;
      const isUnsold = plotStatus === '0' || plotStatus === 'Unsold';
      if (!isAuctioned || isUnsold) {
        return;
      }
      this.toastr.warning(`Please fill in all the required fields correctly: ${invalidControls.join(', ')}`, 'Validation Warning');
      return;
    }

    const formRaw = this.registerationForm.getRawValue();

    const cleanReceipts = (formRaw.receiptsFormArray || []).map((receipt: any) => {
      const cleanedReceipt: any = {};
      const receiptNumericFields = [
        'draftAmount', 'principalAmount', 'interestAmount', 'otherAmount', 'penaltyAmount'
      ];
      Object.keys(receipt).forEach((key) => {
        const val = receipt[key];
        let cleanedVal = val;
        if (val === '') {
          cleanedVal = null;
        } else if (receiptNumericFields.includes(key) && val !== null && val !== undefined) {
          cleanedVal = Number(val);
        }

        cleanedReceipt[key] = cleanedVal;
      });

      cleanedReceipt['isVerified'] = receipt.isVerified || false;

      return cleanedReceipt;
    });

    const token = sessionStorage.getItem('token');
    let applicantId: number | null = null;
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token!.split('.')[1]));
        if (tokenPayload.ApplicantId) {
          applicantId = Number(tokenPayload.ApplicantId);
        }
      } catch (e) {
        // console.error('Error parsing token for ApplicantId:', e);
      }
    }

    let currentUserId: number | null = null;
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token!.split('.')[1]));
        if (tokenPayload.ApplicantId) {
          currentUserId = Number(tokenPayload.ApplicantId);
        }
      } catch (e) {
        // console.error('Error parsing token for currentUserId:', e);
      }
    }

    if (!applicantId && this.propertyData) {
      applicantId = this.propertyData?.applicantId || this.propertyData?.ApplicantId;
    }

    let finalBidderName = (formRaw.bidderName || '').trim();
    if (formRaw.isTransferred) {
      const allNames: string[] = [];

      const gridNames = this.bidderNamesFormArray.controls
        .map((c: any) => (c.value || '').trim())
        .filter((v: any) => v !== '');
      allNames.push(...gridNames);

      if (finalBidderName && !allNames.includes(finalBidderName)) {
        allNames.push(finalBidderName);
      }

      finalBidderName = allNames
        .map(n => n.trim())
        .filter((value, index, self) => value !== '' && self.indexOf(value) === index)
        .join(', ');
    }

    const hasValidPropertyData = !!this.propertyData && !!(this.propertyData.id || this.propertyData.propertyId || this.propertyData.propertyCode || this.propertyData.PropertyCode);
    const finalPropertyCode = hasValidPropertyData
      ? (formRaw.propertycode || this.propertyData.propertyCode || this.propertyData.PropertyCode || null)
      : null;

    const cleanSchedules = (this.calculatedSchedulesMatrix || []).map((s: InstallmentScheduleView) => ({
      installmentNo: s.index != null ? String(s.index) : null,
      calculatedDueDate: s.dueDate ? s.dueDate : null,
      basePrincipal: Number(s.baseAmountDue) || 0,
      interest: Number(s.interestAmount) || 0,
      totalEstimatedAmount: Number(s.totalWithInterest) || 0
    }));

    const payload: any = {

      districtId: formRaw.districtId,
      mandiId: formRaw.mandiId,
      branchId: formRaw.branchId,
      propertyCode: finalPropertyCode,

      ownerStateID: formRaw.ownerStateID,
      ownerDistrtictID: formRaw.ownerDistrtictID,
      ownerCityID: formRaw.ownerCityID,

      applicantId: applicantId,

      plotNo: formRaw.plotNo,
      plotTypeId: formRaw.plotTypeId,
      plotSize: formRaw.plotsize,
      planId: formRaw.planId,
      plotStatus: formRaw.plotStatus,
      propertyCategoryId: formRaw.propertyCategoryId,

      assetResumed: formRaw.isAssetResumed,
      isAssetResumed: formRaw.isAssetResumed,
      isCourtCase: formRaw.isCourtCase,
      assetSurrendered: formRaw.isAssetSurrendered,
      isAssetSurrendered: formRaw.isAssetSurrendered,

      isAssetLocked: formRaw.isAssetLocked,

      isDefaulter: formRaw.isDefaulter,

      anyComplaint: formRaw.anyComplaint,

      ndcGenerated: formRaw.ndcGenerated,

      ndcIssued: formRaw.ndcIssued,

      assetVerified: formRaw.assetVerified,

      isAuctioned: formRaw.isAuctioned,
      auctionDate: formRaw.auctionDate,
      bidderTypeId: formRaw.bidderTypeId,
      email: formRaw.email,
      bidderName: finalBidderName,
      isTransferred: formRaw.isTransferred,

      relation: formRaw.relation,
      fatherOrHusbandName: formRaw.fatherOrHusbandName,
      panNo: formRaw.panNo,
      aadhaarNo: formRaw.aadhaarNo,
      mobileNo: formRaw.mobileNo,
      address: formRaw.address,

      propertyTypeId: formRaw.auctionPropertyType,
      reservePrice: formRaw.reservePrice,
      finalBidPrice: formRaw.finalBidPrice,

      formTransactionId: formRaw.formTransactionId,
      formTxnDate: formRaw.formTxnDate,
      formPaidAmount: formRaw.formPaidAmount,

      emdTxnId: formRaw.emdTxnId,
      emdDate: formRaw.emdDate,
      emdAmount: formRaw.emdAmount,

      allotmentTxnId: formRaw.allotmentTxnId,
      allotmentDate: formRaw.allotmentDate,
      allotmentTransactionDate: formRaw.allotmentTransactionDate,
      allotmentAmount: formRaw.allotmentAmount,

      dueAmount: formRaw.dueAmount,
      totalDueWithInterest: formRaw.totalDueWithInterest,

      createdBy: this.propertyData?.createdBy || this.propertyData?.CreatedBy || currentUserId,
      modifiedBy: currentUserId,

      installments: cleanReceipts,

      installmentSchedules: cleanSchedules,

    };

    const propertyRecordId = Number(
      this.propertyData?.id ||
      this.propertyData?.Id ||
      this.propertyData?.propertyId ||
      this.propertyData?.PropertyId
    ) || 0;

    if (propertyRecordId > 0) {
      payload['id'] = propertyRecordId;
    }

    const numericFields = [
      'id', 'Id', 'propertyId', 'PropertyId',
      'districtId', 'mandiId', 'branchId', 'propertyCategoryId', 'bidderTypeId', 'plotTypeId', 'planId', 'propertyTypeId',
      'reservePrice', 'finalBidPrice', 'formPaidAmount', 'emdAmount', 'allotmentAmount',
      'dueAmount', 'totalDueWithInterest', 'accumulatedInterest', 'applicantId', 'ApplicantId',
      'createdBy', 'CreatedBy', 'modifiedBy', 'ModifiedBy', 'ownerStateID', 'ownerDistrtictID', 'ownerCityID'
    ];
    const cleanedPayload: any = {};
    Object.keys(payload).forEach((key) => {
      const val = (payload as any)[key];
      if (val === '') {
        cleanedPayload[key] = null;
      } else if (numericFields.includes(key) && val !== null && val !== undefined) {
        cleanedPayload[key] = Number(val);
      } else {
        cleanedPayload[key] = val;
      }
    });

    if (propertyRecordId > 0) {
      cleanedPayload['id'] = propertyRecordId;
    }

    // console.log('Submission Payload:', cleanedPayload);

    const isEditMode = this.mode === 'edit';

    if (isEditMode && propertyRecordId <= 0) {
      this.toastr.error('Unable to update: Valid Property ID not found.', 'Error');
      return;
    }

    const saveObservable = isEditMode
      ? this.service.UpdateRegisterPropertyAsync(cleanedPayload)
      : this.service.registerProperty(cleanedPayload);

    saveObservable.subscribe({
      next: (res: any) => {
        const msg = res.message || res.Message || '';
        const isAlreadyExists = msg.toLowerCase().includes('already exists');
        const isSuccess = res.success || res.status === 'Success';

        if (isAlreadyExists) {
          this.toastr.warning(msg, 'Warning');
        } else if (isSuccess) {
          const successMsg = isEditMode
            ? (msg || 'Property bidder registration updated successfully.')
            : (msg || 'Property bidder registration saved successfully.');
          this.toastr.success(successMsg, 'Success');
          this.closePreviewModal();
          if (isEditMode) {
            this.router.navigate(['/registration-status']);
          } else {
            this.resetForm();
          }
        } else {
          const failMsg = isEditMode
            ? (msg || 'Failed to update property registration.')
            : (msg || 'Failed to save property registration.');
          this.toastr.error(failMsg, 'Error');
        }
      },
      error: (err: any) => {
        // console.error('Submit error:', err);
        const errMsg = err.error?.message || err.error?.Message || err.message || (isEditMode ? 'Error occurred while updating.' : 'Error occurred while saving.');
        if (errMsg.toLowerCase().includes('already exists')) {
          this.toastr.warning(errMsg, 'Warning');
        } else {
          this.toastr.error(errMsg, 'Error');
        }
      }
    });
  }

  resetForm(): void {
    this.propertyData = null;
    this.registerationForm.reset({
      branchId: '',
      districtId: '',
      mandiId: '',
      propertycode: '',
      plotsize: '',
      plotTypeId: '',
      plotNo: '',
      planId: '',
      plotStatus: '',
      propertyCategoryId: '',
      isAssetResumed: false,
      isAssetSurrendered: false,
      isAssetLocked: false,
      isDefaulter: false,
      anyComplaint: false,
      ndcIssued: false,
      ndcGenerated: false,
      assetVerified: false,
      isCourtCase: false,
      isAuctioned: false,
      auctionDate: '',
      bidderTypeId: '',
      email: '',
      bidderName: '',
      isTransferred: false,
      relation: '',
      fatherOrHusbandName: '',
      panNo: '',
      aadhaarNo: '',
      mobileNo: '',
      auctionPropertyType: '',
      address: '',
      reservePrice: '',
      finalBidPrice: '',
      formTransactionId: '',
      formTxnDate: '',
      formPaidAmount: '',
      emdTxnId: '',
      emdDate: '',
      emdAmount: '',
      //25% form fields
      allotmentDate: '',
      allotmentTxnId: '',
      allotmentAmount: '',
      allotmentTransactionDate: '',
      dueAmount: '',
      accumulatedInterest: 0,
      totalDueWithInterest: '',
      installmentNo: 'Installment 1',
      paidStatus: 'Pending',
      ownerStateID: '',
      ownerDistrtictID: '',
      ownerCityID: ''
    });
    this.cities = [];
    this.bidderDistricts = [];
    this.marketCommittees = [];
    this.mandis = [];
    this.plotTypes = [];
    this.receiptsFormArray.clear();
    this.bidderNamesFormArray.clear();
    this.calculatedSchedulesMatrix = [];
    this.propertyData = null;
    this.showPreview = false;
    this.previewConfirmed = false;
    this.districtSearchText = '';
    this.mandiSearchText = '';
    this.plotTypeSearchText = '';
    this.planSearchText = '';
    this.propTypeSearchText = '';
    this.stateSearchText = '';
    this.bidderDistrictSearchText = '';
    this.citySearchText = '';
    this.branchSearchText = '';
    this.propertyCategorySearchText = '';
    this.bidderTypeSearchText = '';
  }

  letshowPreview(): void {
    if (this.readonlyMode || this.mode === 'view') {
      return;
    }
    this.updateAuctionValidators(!!this.registerationForm.get('isAuctioned')?.value);
    this.registerationForm.markAllAsTouched();

    if (this.registerationForm.invalid) {
      const invalidControls: string[] = [];
      const controls = this.registerationForm.controls;
      for (const name in controls) {
        if (controls[name].invalid) {
          invalidControls.push(name);
        }
      }

      const isAuctioned = !!this.registerationForm.get('isAuctioned')?.value;
      const plotStatus = this.registerationForm.get('plotStatus')?.value;
      const isUnsold = plotStatus === '0' || plotStatus === 'Unsold';
      if (!isAuctioned || isUnsold) {
        return;
      }

      this.toastr.warning(`Please fill in all the required fields correctly: ${invalidControls.join(', ')}`, 'Validation Warning');
      return;
    }

    this.showPreview = true;
    this.previewConfirmed = false;
  }

  closePreviewModal(): void {
    this.showPreview = false;
    this.previewConfirmed = false;
  }

  onPreviewConfirmChange(event: Event): void {
    this.previewConfirmed = (event.target as HTMLInputElement).checked;
  }

  private updateAuctionValidators(isAuctioned: boolean): void {
    this.auctionRequiredControls.forEach((controlName) => {
      if (controlName === 'bidderName') return;

      const control = this.registerationForm.get(controlName);
      if (!control) return;

      if (isAuctioned) {
        if (controlName === 'email') {
          control.setValidators([Validators.email]);
        } else if (controlName === 'aadhaarNo') {
          control.setValidators([Validators.pattern(/^XXXXXXXX\d{4}$/)]);
        } else if (controlName === 'mobileNo') {
          control.setValidators([Validators.required, Validators.pattern(/^[6-9]\d{9}$/), Validators.minLength(10), Validators.maxLength(10)]);
        } else {
          control.setValidators(Validators.required);
        }
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
    });

    this.updateBidderNameValidators();
  }

  private updateBidderNameValidators(): void {
    const bidderControl = this.registerationForm.get('bidderName');
    if (!bidderControl) return;

    const isAuctioned = this.registerationForm.get('isAuctioned')?.value;
    const isTransferred = this.registerationForm.get('isTransferred')?.value;
    const hasAddedNames = this.bidderNamesFormArray.length > 0;

    // bidderName input field is required if isAuctioned is true and (either transfer is off OR grid is empty)
    if (isAuctioned && (!isTransferred || !hasAddedNames)) {
      bidderControl.setValidators(Validators.required);
    } else {
      bidderControl.clearValidators();
    }
    bidderControl.updateValueAndValidity({ emitEvent: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupCalculationListeners(): void {
    // debugger
    this.registerationForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calculateUIInstallments();
      });
  }
  // CORE CALCULATION ALGORITHM

  private calculateUIInstallments(): void {
    if (!this.registerationForm.get('isAuctioned')?.value) {
      return;
    }
    // debugger
    // 1. Fetch form variables safely
    const finalBidderPrice = Number(this.registerationForm.get('finalBidPrice')?.value) || 0;
    const allotmentPaid_25_percentage = Number(this.registerationForm.get('allotmentAmount')?.value) || 0;
    const milestoneDateStr = this.registerationForm.get('allotmentDate')?.value;
    const selectedInstallmentString = this.registerationForm.get('installmentNo')?.value || 'Installment 1';

    // 2. Calculate TOTAL Outstanding Principal Balance
    const outstandingPrincipal = finalBidderPrice - allotmentPaid_25_percentage;

    // Compute the base installment principal (1/6th of total outstanding principal)
    let computedDueAmount = 0;
    if (outstandingPrincipal > 0) {
      computedDueAmount = outstandingPrincipal / 6;
      computedDueAmount = Math.round((computedDueAmount + Number.EPSILON) * 100) / 100;
    }

    // 3. Validate milestone date presence BEFORE computing any interest
    this.installmentDateError = null;
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

    if (!dateIsValid) {
      this.installmentDateError = 'Please select the 25% Allotment Transaction Date to calculate installment interest.';
    }

    // 4. Determine interest rate based on the allotment transaction year
    //    < 1992 -> 6%, >= 1992 -> 12%
    const rateOfInterest = dateIsValid ? (baseYear < 1992 ? 6 : 12) : 0;

    // 5. Generate the 6-part amortization amortization matrix table
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
        index: step,
        installmentLabel: currentLabel,
        dueDate: calculatedDateStr,
        baseAmountDue: computedDueAmount,
        interestAmount: computedInterestForStep,          // NEW: expose per-row interest to template
        totalWithInterest: Math.round((stepTotalWithInterest + Number.EPSILON) * 100) / 100
      });
    }

    this.calculatedSchedulesMatrix = generatedMatrix;
    totalInterestAcrossInstallments = Math.round((totalInterestAcrossInstallments + Number.EPSILON) * 100) / 100;

    // 6. Calculate total overall due (Full Principal + Sum of computed interest)
    const finalTotalDueIncludingInterest = outstandingPrincipal > 0
      ? (outstandingPrincipal + totalInterestAcrossInstallments)
      : 0;

    const activeNode = generatedMatrix.find(item => item.installmentLabel === selectedInstallmentString);
    const activeDueDate = activeNode ? activeNode.dueDate : '';

    // 7. Patch corrected, high-level overview values to UI inputs
    this.registerationForm.patchValue({
      dueAmount: outstandingPrincipal > 0 ? outstandingPrincipal : '',
      dueDate: activeDueDate,
      totalDueWithInterest: finalTotalDueIncludingInterest > 0 ? finalTotalDueIncludingInterest : ''
    }, { emitEvent: false });
  }
  //Total Interest, Principal and Total Due amount from calculatedSchedulesMatrix

  get totalInterest(): number {
    const totalInterest = this.calculatedSchedulesMatrix.reduce(
      (sum, schedule) => sum + (schedule.interestAmount || 0),
      0
    );
    return Math.round(totalInterest);
  }
  get totalBasePrincipal(): number {
    const totalBasePrincipal = this.calculatedSchedulesMatrix.reduce(
      (sum, schedule) => sum + (schedule.baseAmountDue || 0),
      0
    );
    return Math.round(totalBasePrincipal);
  }
  get totalDueAmount(): number {
    const totalDueAmount = this.calculatedSchedulesMatrix.reduce(
      (sum, schedule) => sum + (schedule.totalWithInterest || 0),
      0
    );
    return Math.round(totalDueAmount);
  }
}