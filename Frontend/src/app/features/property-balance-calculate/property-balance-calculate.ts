import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Common } from '../../core/service/CommonService/common';
import { MenuService } from '../../core/service/MenuService/menu.service';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { PropertyBalanceResponse } from '../../models/property-balance-calculatation.model';
import { Userservice } from '../../core/service/UserService/userservice';

@Component({
  selector: 'app-property-balance-calculate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './property-balance-calculate.html',
  styleUrl: './property-balance-calculate.scss',
})
export class PropertyBalanceCalculate implements OnInit {

  balanceForm!: FormGroup;

  districts: any[] = [];
  marketCommittees: any[] = [];
  propertyTypes: any[] = [];
  mandis: any[] = [];
  plotNumbers: any[] = [];
  plotTypes: any[] = [];
  plotSizes: any[] = [];

  isSearching = false;
  isCalculating = false;

  // Role and user-specific allottee codes
  isUser = false;
  allotteeCodes: any[] = [
    { allotteeCode: 'LJJ97-10252' },
    { allotteeCode: 'AAV10-22254' },
    { allotteeCode: 'FFF12-11537' }
  ];
  isLoadingAllotteeCodes = false;

  showResults = false;
  balanceData: PropertyBalanceResponse | null = null;
  propertyDetails: any = null;
  private readonly defaultStateId = 1;

  constructor(
    private fb: FormBuilder,
    private service: Propertybidderregn,
    private commonService: Common,
    private menuService: MenuService,
    private toastr: ToastrService,
    private userService: Userservice,
    private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.buildForm();
    this.initUserRoleAndAllotteeCodes();
    this.loadMasterData();
  }

  private buildForm(): void {
    this.balanceForm = this.fb.group({
      allotteeCode: [''],
      districtId: ['', Validators.required],
      branchId: ['', Validators.required],
      plotTypeId: ['', Validators.required],
      mandiId: ['', Validators.required],
      plotNo: ['', Validators.required],
      plotSize: ['', Validators.required]
    });
  }

  private initUserRoleAndAllotteeCodes(): void {
    this.isUser = this.checkIsUserRole();

    if (this.isUser) {
      this.loadUserAllotteeCodes();
    }

    this.menuService.profile$.subscribe(profile => {
      if (profile) {
        const roles = profile.roles || [];
        const isUserRole = this.hasUserRole(roles);
        if (isUserRole !== this.isUser) {
          this.isUser = isUserRole;
          if (this.isUser && (!this.allotteeCodes || this.allotteeCodes.length === 0)) {
            this.loadUserAllotteeCodes();
          }
          this.cdr.detectChanges();
        }
      }
    });
  }

  private hasUserRole(roles: any): boolean {
    if (!roles) return false;
    const isMatch = (r: any) => {
      const s = String(r || '').trim().toLowerCase();
      return s === 'user' || s === 'citizen' || s === 'applicant';
    };
    if (Array.isArray(roles)) {
      return roles.some(isMatch);
    }
    return isMatch(roles);
  }

  private checkIsUserRole(): boolean {
    // 1. Check JWT token claims
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const rawRole = tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
          || tokenPayload.role
          || tokenPayload.Role
          || tokenPayload.roles
          || tokenPayload.Roles;
        if (this.hasUserRole(rawRole)) {
          return true;
        }
      } catch (e) {
        console.error('Error parsing token for role:', e);
      }
    }

    // 2. Check cp_menus cached profile roles
    const cpMenus = sessionStorage.getItem('cp_menus');
    if (cpMenus) {
      try {
        const parsed = JSON.parse(cpMenus);
        const roles = parsed?.profile?.roles || parsed?.roles;
        if (this.hasUserRole(roles)) {
          return true;
        }
      } catch (e) { }
    }

    // 3. Check direct sessionStorage 'role'
    const storedRole = sessionStorage.getItem('role');
    if (this.hasUserRole(storedRole)) {
      return true;
    }

    // 4. Check cp_session
    const cpSession = sessionStorage.getItem('cp_session');
    if (cpSession) {
      try {
        const session = JSON.parse(cpSession);
        const role = session?.role || session?.userRole;
        if (this.hasUserRole(role)) {
          return true;
        }
      } catch (e) { }
    }

    return false;
  }

  loadUserAllotteeCodes(): void {
    // Temporary options while API is in progress
    this.allotteeCodes = [
      { allotteeCode: 'LJJ97-10252' },
      { allotteeCode: 'AAV10-22254' },
      { allotteeCode: 'FFF12-11537' }
    ];
    this.isLoadingAllotteeCodes = false;
    this.cdr.detectChanges();
  }

  onAllotteeCodeSelect(event?: any): void {
    const selectedCode = (
      event?.target?.value ??
      this.balanceForm.get('allotteeCode')?.value ??
      ''
    ).toString().trim();

    if (!selectedCode) {
      this.resetPropertyDetails();
      return;
    }

    this.balanceForm.patchValue({ allotteeCode: selectedCode });
    this.searchPropertyByAllotteeCode(selectedCode);
  }

  onAllotteeCodeChange(event?: any): void {
    this.onAllotteeCodeSelect(event);
  }

  private resetPropertyDetails(): void {
    this.showResults = false;
    this.balanceData = null;
    this.propertyDetails = null;
    this.cdr.detectChanges();
  }

  private loadMasterData(): void {
    this.service.getPropertyDistricts().subscribe({
      next: (res: any) => {
        this.districts = res?.data || res || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading districts:', err)
    });
  }

  onDistrictChange(): void {
    const districtId = this.balanceForm.get('districtId')?.value;
    this.balanceForm.patchValue({
      branchId: '',
      mandiId: '',
      plotNo: '',
      plotTypeId: '',
      plotSize: ''
    });
    this.marketCommittees = [];
    this.propertyTypes = [];
    this.mandis = [];
    this.plotNumbers = [];
    this.plotTypes = [];
    this.plotSizes = [];

    if (districtId) {
      this.service.getPropertyMandiBranchesByDistrict(districtId).subscribe({
        next: (res: any) => {
          this.marketCommittees = res?.data || res || [];
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading market committees:', err)
      });
    }
  }

  onMarketCommitteeChange(): void {
    const branchId = this.balanceForm.get('branchId')?.value;
    this.balanceForm.patchValue({
      mandiId: '',
      plotTypeId: '',
      plotNo: '',
      plotSize: ''
    });
    this.propertyTypes = [];
    this.mandis = [];
    this.plotNumbers = [];
    this.plotTypes = [];
    this.plotSizes = [];

    if (branchId) {
      this.service.getPropertyMandiBranchesByBranchId(branchId).subscribe({
        next: (res: any) => {
          this.mandis = res?.data || res || [];
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading mandis:', err)
      });
    }
  }

  onMandiChange(): void {
    const mandiId = this.balanceForm.get('mandiId')?.value;
    this.balanceForm.patchValue({ plotNo: '', plotTypeId: '', plotSize: '' });
    this.plotNumbers = [];
    this.plotTypes = [];
    this.plotSizes = [];

    if (mandiId) {
      this.service.getPropertyPlotTypesAsync(mandiId).subscribe({
        next: (res: any) => {
          this.plotTypes = res?.data || res || [];
          this.cdr.detectChanges();
        },
        error: (err: any) => console.error('Error loading plot types:', err)
      });
    }
  }

  onPlotTypeChange(): void {
    const mandiId = this.balanceForm.get('mandiId')?.value;
    const plotTypeId = this.balanceForm.get('plotTypeId')?.value;

    this.balanceForm.patchValue({ plotNo: '', plotSize: '' });
    this.plotNumbers = [];
    this.plotSizes = [];

    if (mandiId && plotTypeId) {
      this.loadPlotNumbers(mandiId, plotTypeId);
    }
  }

  onPlotNumberChange(preselectedPlotSize?: any): void {
    const mandiId = this.balanceForm.get('mandiId')?.value;
    const plotTypeId = this.balanceForm.get('plotTypeId')?.value;
    const plotNo = this.balanceForm.get('plotNo')?.value;

    this.balanceForm.patchValue({ plotSize: '' });
    this.plotSizes = [];

    if (!mandiId || !plotTypeId || !plotNo) {
      return;
    }

    const sizeRequest = this.isUser
      ? this.userService.GetMandiPlotSizeByPlotNo(mandiId, plotTypeId, plotNo)
      : this.service.GetPlotSizebyPlotNo(mandiId, plotTypeId, plotNo);

    sizeRequest.subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.plotSizes = data.map((item: any) => ({
          plotSizeId: item?.plotSizeId ?? item?.PlotSizeId ?? item?.plotSize ?? item?.PlotSize ?? item,
          plotSize: item?.plotSize ?? item?.PlotSize ?? item?.name ?? item
        }));

        if (preselectedPlotSize !== undefined && preselectedPlotSize !== null) {
          const selectedSize = this.plotSizes.find((size: any) =>
            String(size.plotSizeId) === String(preselectedPlotSize) ||
            String(size.plotSize) === String(preselectedPlotSize)
          );
          this.balanceForm.patchValue({
            plotSize: selectedSize?.plotSizeId ?? preselectedPlotSize
          });
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.plotSizes = [];
        console.error('Error loading plot sizes:', err);
        this.cdr.detectChanges();
      }
    });
  }

  get f() {
    return this.balanceForm.controls;
  }

  isInvalid(controlName: string): boolean {
    const control = this.balanceForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  onSearch(): void {
    const allotteeCodeControl = this.balanceForm.get('allotteeCode');
    const propertyCode = (allotteeCodeControl?.value || '').toString().trim();

    if (!propertyCode) {
      allotteeCodeControl?.markAsTouched();
      this.toastr.warning(
        this.isUser ? 'Please select an Allottee Code.' : 'Please enter an Allottee Code to search.',
        'Validation'
      );
      return;
    }

    this.searchPropertyByAllotteeCode(propertyCode);
  }

  searchPropertyByAllotteeCode(propertyCode: string): void {
    const code = (propertyCode || '').toString().trim();
    if (!code) {
      return;
    }

    this.isSearching = true;
    this.showResults = false;
    this.balanceData = null;
    this.propertyDetails = null;

    const handleSuccess = (d: any) => {
      this.isSearching = false;
      this.propertyDetails = d;
      this.bindPropertyDetails(d, () => {
        this.balanceData = this.buildBalanceDataFromResponse(d);
        this.showResults = true;
        this.cdr.detectChanges();
      });
      this.toastr.success('Property details loaded successfully.', 'Success');
    };

    const handleNotFound = () => {
      this.isSearching = false;
      this.toastr.warning('No records found related to this Allottee Code', 'Not Found');
      this.cdr.detectChanges();
    };

    const fetchFromRegistration = () => {
      this.service.getPropertyByCode(code).subscribe({
        next: (res: any) => {
          const d = res?.data;
          const hasValidData =
            !!res?.success && !!d && (
              (d.id && d.id > 0) ||
              (d.propertyId && d.propertyId > 0) ||
              !!d.propertyCode ||
              (d.plotNo !== null && d.plotNo !== undefined) ||
              !!d.bidderName
            );

          if (hasValidData) {
            handleSuccess(d);
          } else {
            handleNotFound();
          }
        },
        error: () => {
          handleNotFound();
        }
      });
    };

    this.service.GetPropertyEAuctionDetailsByPropertyCodeAsync(code, true).subscribe({
      next: (res: any) => {
        const d = res?.data;
        const hasValidData =
          !!res?.success && !!d && (
            (d.id && d.id > 0) ||
            (d.propertyId && d.propertyId > 0) ||
            !!d.propertyCode ||
            (d.plotNo !== null && d.plotNo !== undefined) ||
            !!d.bidderName
          );

        if (hasValidData) {
          handleSuccess(d);
        } else {
          fetchFromRegistration();
        }
      },
      error: () => {
        fetchFromRegistration();
      }
    });
  }

  private bindPropertyDetails(d: any, onComplete?: () => void): void {
    const districtId = d.districtId;
    const branchId = d.branchId;
    const plotTypeId = d.plotTypeId;
    const mandiId = d.mandiId;

    if (!districtId) {
      onComplete?.();
      return;
    }

    this.service.getPropertyBranches(districtId).subscribe({
      next: (res: any) => {
        this.marketCommittees = res?.data || res || [];
        if (branchId) {
          this.service.getPropertyMandis(branchId).subscribe({
            next: (mres: any) => {
              this.mandis = mres?.data || mres || [];
              this.patchFormAndLoadDependents(districtId, branchId, plotTypeId, mandiId, d, onComplete);
              this.cdr.detectChanges();
            },
            error: (err: any) => {
              console.error('Error loading mandis:', err);
              onComplete?.();
            }
          });
        } else {
          this.patchFormDistrict(districtId);
          this.cdr.detectChanges();
          onComplete?.();
        }
      },
      error: (err: any) => {
        console.error('Error loading market committees:', err);
        onComplete?.();
      }
    });
  }

  private patchFormDistrict(districtId: any): void {
    this.balanceForm.patchValue({ districtId: districtId ?? '' });
  }

  private patchFormAndLoadDependents(
    districtId: any,
    branchId: any,
    plotTypeId: any,
    mandiId: any,
    d: any,
    onComplete?: () => void
  ): void {
    this.balanceForm.patchValue({
      districtId: districtId ?? '',
      branchId: branchId ?? ''
    });

    if (!mandiId) {
      this.balanceForm.patchValue({
        mandiId: '',
        plotTypeId: '',
        plotNo: '',
        plotSize: ''
      });
      this.plotSizes = [];
      onComplete?.();
      return;
    }

    this.service.getPropertyPlotTypes(mandiId).subscribe({
      next: (res: any) => {
        this.plotTypes = res?.data || res || [];
        this.balanceForm.patchValue({
          mandiId: mandiId ?? '',
          plotTypeId: plotTypeId ?? '',
          plotNo: d.plotNo ?? ''
        });
        this.loadPlotNumbers(mandiId, plotTypeId);
        this.onPlotNumberChange(d.plotSize ?? d.PlotSize ?? d.plotSizeId ?? d.PlotSizeId);
        this.cdr.detectChanges();
        onComplete?.();
      },
      error: (err: any) => {
        console.error('Error loading plot types:', err);
        onComplete?.();
      }
    });
  }

  private loadPlotNumbers(mandiId: any, plotTypeId: any): void {
    this.service.getPlotsByPlotTypesAsync(mandiId, plotTypeId).subscribe({
      next: (res: any) => {
        this.plotNumbers = res?.data || res || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error('Error loading plots:', err)
    });
  }

  onCalculateBalance(): void {
    this.showResults = false;

    if (this.balanceForm.invalid) {
      this.balanceForm.markAllAsTouched();
      return;
    }

    const mandiId = this.balanceForm.get('mandiId')?.value;
    const plotTypeId = this.balanceForm.get('plotTypeId')?.value;
    const plotSizes = this.balanceForm.get('plotSize')?.value;
    const plotNo = this.balanceForm.get('plotNo')?.value;

    if (!mandiId || !plotTypeId || !plotNo || !plotSizes) {
      this.toastr.warning('Please select mandi, plot type, plot number and plot size.', 'Validation');
      return;
    }

    this.isCalculating = true;
    this.balanceData = null;
    this.propertyDetails = null;
    this.showResults = false;

    this.service.getPropertyDetailsByMandiPlot(mandiId, plotTypeId, plotNo, plotSizes, true).subscribe({
      next: (res: any) => {
        const d = res?.data ?? res ?? null;
        const apiSuccess = res?.success !== false;
        const hasValidData = !!d && (
          (d.id && d.id > 0) ||
          (d.propertyId && d.propertyId > 0) ||
          !!d.propertyCode ||
          (d.plotNo !== null && d.plotNo !== undefined) ||
          !!d.bidderName ||
          !!d.plotSize
        );

        if (apiSuccess && hasValidData) {
          this.propertyDetails = d;
          this.balanceData = this.buildBalanceDataFromResponse(d);
          this.showResults = true;
          this.toastr.success('Property balance details loaded successfully.', 'Success');
        } else {
          this.balanceData = null;
          this.propertyDetails = null;
          this.showResults = false;
          this.toastr.warning('No data found for the selected mandi, plot type and plot number.', 'Not Found');
        }
        this.isCalculating = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isCalculating = false;
        this.balanceData = null;
        this.propertyDetails = null;
        this.showResults = false;
        this.cdr.detectChanges();
        console.error('Error fetching property details by mandi plot:', err);
        this.toastr.warning('No data found for the selected mandi, plot type and plot number.', 'Error');
      }
    });
  }

  private formatDate(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  private coerceNumber(value: any): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  // private getMandiName(property: any): string {
  //   const responseMandiName = property?.mandiName ?? property?.MandiName;
  //   if (typeof responseMandiName === 'string' && responseMandiName.trim()) {
  //     return responseMandiName;
  //   }

  //   const selectedMandi = this.mandis.find((mandi: any) =>
  //     String(mandi.mandiId ?? mandi.id) === String(property?.mandiId)
  //   );

  //   return selectedMandi?.mandiName ?? selectedMandi?.name ?? '';
  // }

  private buildBalanceDataFromResponse(d: any): PropertyBalanceResponse {
    if (!d) {
      return {
        propertyInfo: {
          allotteeCode: '',
          agencyName: '',
          mandiName: '',
          nameOfAllottee: '',
          plotNo: '',
          address: '',
          sizeOfPlot: '',
          plotType: '',
          allotmentDate: '',
          // allotmentAmount: 0,
          finalBidPrice: 0,
          auctionDate: ''
        },
        initialDeposits: [],
        dueInstallments: [],
        installmentReceipts: [],
        futureInstallments: [],
        otherAmounts: [],
        summary: {
          rebate: 0,
          totalPaymentReceivedTillDate: 0,
          totalBalanceFromSaleOfPlot: 0,
          interestOnLateInstallments: 0,
          penaltyOnLateInstallments: 0,
          totalRecoverableAmount: 0
        }
      };
    }

    const installments: any[] = Array.isArray(d.installments) ? d.installments : [];
    const sorted = [...installments].sort((a, b) =>
      new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
    );

    const scheduleRows: any[] = Array.isArray(d.installmentSchedules)
      ? d.installmentSchedules
      : Array.isArray(d.installments)
        ? d.installments.filter((item: any) =>
          item && (
            item.installmentNo !== undefined ||
            item.installmentLabel !== undefined ||
            item.calculatedDueDate !== undefined ||
            item.dueDate !== undefined ||
            item.basePrincipal !== undefined ||
            item.dueAmount !== undefined ||
            item.interest !== undefined ||
            item.totalEstimatedAmount !== undefined ||
            item.totalDueAmount !== undefined
          )
        )
        : [];

    const dueInstallments = scheduleRows.map((item: any, index: number) => ({
      installmentNo: item.installmentNo ?? item.installmentLabel ?? `Installment ${index + 1}`,
      dueDate: this.formatDate(item.calculatedDueDate ?? item.dueDate ?? item.due_date),
      dueAmount: this.coerceNumber(item.basePrincipal ?? item.baseAmount ?? item.dueAmount ?? item.principalAmount ?? 0),
      interest: this.coerceNumber(item.interest ?? item.interestAmount ?? item.accumulatedInterest ?? 0),
      totalDueAmount: this.coerceNumber(
        item.totalEstimatedAmount ?? item.totalDueAmount ?? item.totalWithInterest ??
        (this.coerceNumber(item.basePrincipal ?? item.baseAmount ?? item.dueAmount ?? item.principalAmount ?? 0) +
          this.coerceNumber(item.interest ?? item.interestAmount ?? item.accumulatedInterest ?? 0))
      )
    }));

    const plotTypeObj = this.plotTypes.find((t: any) =>
      String(t.plotTypeId ?? t.id) === String(d.plotTypeId)
    );
    const plotTypeName = plotTypeObj
      ? (plotTypeObj.plotType ?? plotTypeObj.plotTypeName ?? plotTypeObj.name ?? '')
      : (d.plotType ?? d.plotTypeName ?? '');

    const initialDeposit = sorted[0]
      ? {
        receiptNo: sorted[0].receiptNo ?? '',
        receiptDate: this.formatDate(sorted[0].receiptDate),
        draftChequeRtgsNo: sorted[0].draftNo ?? '',
        draftChequeRtgsDate: this.formatDate(sorted[0].draftDate),
        paymentMode: sorted[0].paymentMode ?? '-',
        bank: sorted[0].draftBank ?? '-',
        amount: Number(sorted[0].draftAmount) || 0
      }
      : null;

    const installmentReceipts = sorted.slice(1).map((r: any) => ({
      receiptNo: r.receiptNo ?? '',
      receiptDate: this.formatDate(r.receiptDate),
      draftNo: r.draftNo ?? '',
      draftRtgsDate: this.formatDate(r.draftDate),
      paymentMode: r.paymentMode ?? '-',
      draftRtgsBank: r.draftBank ?? '-',
      draftAmount: Number(r.draftAmount) || 0
    }));

    const totalReceived = sorted.reduce(
      (sum, r) => sum + (Number(r.draftAmount) || 0),
      0
    );
    const finalBidPrice = Number(d.finalBidPrice) || 0;
    const totalBalance = Math.max(finalBidPrice - totalReceived, 0);

    return {
      propertyInfo: {
        allotteeCode: d.propertyCode ?? '',
        agencyName: 'Mandi Board',
        mandiName: d.mandiName ?? '',
        // mandiName: this.getMandiName(d),
        nameOfAllottee: d.bidderName ?? '',
        plotNo: d.plotNo != null ? String(d.plotNo) : '',
        address: d.address ?? '',
        sizeOfPlot: d.plotSize ?? '',
        plotType: plotTypeName,
        allotmentDate: this.formatDate(d.allotmentDate),
        // allotmentAmount: Number(d.allotmentAmount) || 0,
        finalBidPrice: Number(d.finalBidPrice) || 0,
        auctionDate: this.formatDate(d.auctionDate)
      },
      initialDeposits: initialDeposit ? [initialDeposit] : [],
      dueInstallments,
      installmentReceipts,
      futureInstallments: Array.isArray(d.futureInstallments) ? d.futureInstallments : [],
      otherAmounts: Array.isArray(d.otherAmounts) ? d.otherAmounts : [],
      summary: {
        rebate: 0,
        totalPaymentReceivedTillDate: totalReceived,
        totalBalanceFromSaleOfPlot: totalBalance,
        interestOnLateInstallments: 0,
        penaltyOnLateInstallments: 0,
        totalRecoverableAmount: totalBalance
      }
    };
  }

  printReport(): void {
    window.print();
  }

  // Sums a numeric field across a list of row objects for table footer totals.
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

    // Date format: DD-MM-YYYY
    const dateParts = propertyDate.split('-');

    if (dateParts.length !== 3) {
      return 0;
    }

    const year = Number(dateParts[2]);

    if (isNaN(year)) {
      return 0;
    }

    return year < 1992 ? 6 : 12;
  }
}