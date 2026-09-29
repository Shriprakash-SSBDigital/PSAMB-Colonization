import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, finalize } from 'rxjs';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { Userservice } from '../../core/service/UserService/userservice';
import { Common } from '../../core/service/CommonService/common';
import { FileService, FileUploadPayload } from '../../core/service/FileService/file-service';

@Component({
  selector: 'app-register-property',
  standalone: false,
  templateUrl: './register-property.html',
  styleUrl: './register-property.scss',
})
export class RegisterProperty implements OnInit {

  readonly allowedFileTypes = '.jpeg,.jpg,.png,.pdf';

  readonly documents = [
    { key: 'allotmentLetter', label: 'Allotment Letter' },
    { key: 'lastPaymentReceipt', label: 'Last Payment Receipt', hint: 'Any one from last three receipts' },
    { key: 'noDueCertificate', label: 'No Due Certificate' },
    { key: 'bForm', label: 'B.Form' },
    { key: 'conveyanceDeed', label: 'Conveyance Deed' },
    { key: 'saleDeed', label: 'Sale Deed' },
    { key: 'transferOrder', label: 'Transfer Order' },
    { key: 'legalHeirCertificate', label: 'Legal Heir Certificate' },
  ];

  protected propertyForm: FormGroup;
  isSubmitting = false;
  districts: any[] = [];
  bidderDistricts: any[] = [];
  states: any[] = [];
  cities: any[] = [];
  marketCommittees: any[] = [];
  mandis: any[] = [];
  plotTypes: any[] = [];
  plotNumbers: any[] = [];
  plotSizes: any[] = [];

  isDistrictDropdownOpen = false;
  isMarketCommitteeDropdownOpen = false;
  isMandiDropdownOpen = false;
  isPlotTypeDropdownOpen = false;
  isPlotNumberDropdownOpen = false;
  isPlotSizeDropdownOpen = false;
  isStateDropdownOpen = false;
  isOwnerDistrictDropdownOpen = false;
  isCityDropdownOpen = false;

  districtSearchText = '';
  marketCommitteeSearchText = '';
  mandiSearchText = '';
  plotTypeSearchText = '';
  plotNumberSearchText = '';
  plotSizeSearchText = '';
  stateSearchText = '';
  ownerDistrictSearchText = '';
  citySearchText = '';
  propertyData: any;
  isOwnerInfoReadOnly = false;

  aadhaarDocPath: string | null = null;
  panDocPath: string | null = null;
  passportDocPath: string | null = null;
  addrDocPath: string | null = null;
  propertyTypes: any[] = [];

  sessionId: string = crypto.randomUUID();

  readonly documentTypeMap: Record<string, number> = {
    allotmentLetter: 1,
    lastPaymentReceipt: 2,
    noDueCertificate: 3,
    bForm: 4,
    conveyanceDeed: 5,
    saleDeed: 6,
    transferOrder: 7,
    legalHeirCertificate: 8,
  };

  uploadingStates: Record<string, boolean> = {};
  uploadedDocData: Record<string, { userDocumentId: number; storedFileName: string; relativePath: string; fileUrl: string }> = {};

  constructor(
    private fb: FormBuilder,
    private service: Propertybidderregn,
    private userService: Userservice,
    private commonService: Common,
    private fileService: FileService,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    const documentControls = this.documents.reduce<Record<string, unknown>>((controls, document) => {
      controls[`${document.key}Selected`] = [false];
      controls[`${document.key}File`] = [null];
      return controls;
    }, {});

    this.propertyForm = this.fb.group(
      {
        allotteeCode: [''],
        districtId: ['', Validators.required],
        branchId: ['', Validators.required],
        mandiId: ['', Validators.required],
        plotNumber: ['', Validators.required],
        plotTypeId: ['', Validators.required],
        plotSize: ['', Validators.required],
        currentOwnerName: ['', Validators.required],
        guardianName: ['', Validators.required],
        mobileNumber: ['', [Validators.required, Validators.pattern(/^[1-9]\d{9}$/)]],
        email: ['', [Validators.required, Validators.email]],
        state: ['', Validators.required],
        ownerDistrict: ['', Validators.required],
        city: ['', Validators.required],
        address: ['', Validators.required],
        aadhaarNumber: ['', [Validators.required, Validators.pattern(/^XXXXXXXX \d{0,4}$/)]],
        // aadhaarProof: [null, [Validators.required, this.fileTypeValidator()]],
        panNo: [''],
        // passportProof: [null, this.fileTypeValidator()],
        ...documentControls,
      },
      { validators: this.atLeastOneDocumentValidator() },
    );
  }

  closeAllDropdowns() {
    this.isDistrictDropdownOpen = false;
    this.isMarketCommitteeDropdownOpen = false;
    this.isMandiDropdownOpen = false;
    this.isPlotTypeDropdownOpen = false;
    this.isPlotNumberDropdownOpen = false;
    this.isPlotSizeDropdownOpen = false;
    this.isStateDropdownOpen = false;
    this.isOwnerDistrictDropdownOpen = false;
    this.isCityDropdownOpen = false;
    this.districtSearchText = '';
    this.marketCommitteeSearchText = '';
    this.mandiSearchText = '';
    this.plotTypeSearchText = '';
    this.plotNumberSearchText = '';
    this.plotSizeSearchText = '';
    this.stateSearchText = '';
    this.ownerDistrictSearchText = '';
    this.citySearchText = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    this.closeAllDropdowns();
  }

  ngOnInit(): void {
    this.loadStates();
    this.loadDistricts();
    // this.onSearch();
    this.propertyForm.get('districtId')?.valueChanges.subscribe((districtId) => {
      this.marketCommittees = [];
      this.propertyForm.get('branchId')?.setValue('', { emitEvent: false });
      this.mandis = [];
      this.propertyForm.get('mandiId')?.setValue('', { emitEvent: false });
      this.plotTypes = [];
      this.propertyForm.get('plotTypeId')?.setValue('', { emitEvent: false });
      this.plotNumbers = [];
      this.propertyForm.get('plotNumber')?.setValue('', { emitEvent: false });
      this.plotSizes = [];
      this.propertyForm.get('plotSize')?.setValue('', { emitEvent: false });
      if (districtId) {
        this.loadMarketCommittees(districtId);
      }
    });

    this.propertyForm.get('branchId')?.valueChanges.subscribe((branchId) => {
      this.mandis = [];
      this.propertyForm.get('mandiId')?.setValue('', { emitEvent: false });
      this.plotTypes = [];
      this.propertyForm.get('plotTypeId')?.setValue('', { emitEvent: false });
      this.plotNumbers = [];
      this.propertyForm.get('plotNumber')?.setValue('', { emitEvent: false });
      this.plotSizes = [];
      this.propertyForm.get('plotSize')?.setValue('', { emitEvent: false });
      if (branchId) {
        this.loadMandis(branchId);
      }
    });

    this.propertyForm.get('mandiId')?.valueChanges.subscribe((mandiId) => {
      this.plotTypes = [];
      this.propertyForm.get('plotTypeId')?.setValue('', { emitEvent: false });
      this.plotNumbers = [];
      this.propertyForm.get('plotNumber')?.setValue('', { emitEvent: false });
      this.plotSizes = [];
      this.propertyForm.get('plotSize')?.setValue('', { emitEvent: false });
      if (mandiId) {
        this.loadPlotTypes(mandiId);
      }
    });

    this.propertyForm.get('plotTypeId')?.valueChanges.subscribe((plotTypeId) => {
      this.plotNumbers = [];
      this.propertyForm.get('plotNumber')?.setValue('', { emitEvent: false });
      this.plotSizes = [];
      this.propertyForm.get('plotSize')?.setValue('', { emitEvent: false });
      const mandiId = this.propertyForm.get('mandiId')?.value;
      if (mandiId && plotTypeId) {
        this.loadPlotNumbers(mandiId, plotTypeId);
      }
    });

    this.propertyForm.get('plotNumber')?.valueChanges.subscribe((plotNumber) => {
      this.plotSizes = [];
      this.propertyForm.get('plotSize')?.setValue('', { emitEvent: false });
      if (plotNumber) {
        this.loadPlotSizes(plotNumber);
      }
    });

    this.propertyForm.get('state')?.valueChanges.subscribe((stateId) => {
      this.propertyForm.get('ownerDistrict')?.setValue('', { emitEvent: false });
      this.propertyForm.get('city')?.setValue('', { emitEvent: false });
      this.cities = [];
      this.bidderDistricts = [];
      if (stateId) {
        this.loadDistricts();
      }
    });

    this.propertyForm.get('ownerDistrict')?.valueChanges.subscribe((districtId) => {
      this.cities = [];
      this.propertyForm.get('city')?.setValue('', { emitEvent: false });
      if (districtId) {
        this.loadCities(districtId);
      }
    });
  }

  onSearch() {
    const codeControl = this.propertyForm.get('allotteeCode');
    const code = codeControl?.value?.trim();
    if (!code) {
      codeControl?.markAsTouched();
      this.toastr.warning('Please enter an Allottee Code to search.', 'Warning');
      return;
    }

    const handleSuccessData = (d: any) => {
      this.propertyData = d;
      this.isOwnerInfoReadOnly = true;

      const patchFormValues = () => {
        let districtId: any = null;
        let branchId: any = null;
        let mandiId: any = null;
        let plotTypeId: any = null;

        // DISTRICT
        if (d.districtId !== null && d.districtId !== undefined && d.districtId !== '') {
          const districtValue = String(d.districtId).trim();
          const match = this.districts?.find((p: any) =>
            String(p.districtId ?? '').trim() === districtValue ||
            String(p.id ?? '').trim() === districtValue ||
            String(p.districtName ?? '').trim().toLowerCase() === districtValue.toLowerCase()
          );
          districtId = match ? (match.districtId ?? match.id) : d.districtId;
        }

        // BRANCH / MARKET COMMITTEE
        if (d.branchId !== null && d.branchId !== undefined && d.branchId !== '') {
          const branchValue = String(d.branchId).trim();
          const match = this.marketCommittees?.find((p: any) =>
            String(p.branchId ?? '').trim() === branchValue ||
            String(p.id ?? '').trim() === branchValue ||
            String(p.marketCommitteeName ?? '').trim().toLowerCase() === branchValue.toLowerCase()
          );
          branchId = match ? (match.branchId ?? match.id ?? match.marketCommitteeId) : d.branchId;
        }

        // MANDI
        if (d.mandiId !== null && d.mandiId !== undefined && d.mandiId !== '') {
          const mandiValue = String(d.mandiId).trim();
          const match = this.mandis?.find((p: any) =>
            String(p.mandiId ?? '').trim() === mandiValue ||
            String(p.id ?? '').trim() === mandiValue ||
            String(p.mandiName ?? '').trim().toLowerCase() === mandiValue.toLowerCase()
          );
          mandiId = match ? (match.mandiId ?? match.id) : d.mandiId;
        }

        // PLOT TYPE
        if (d.plotTypeId !== null && d.plotTypeId !== undefined && d.plotTypeId !== '') {
          const typeValue = String(d.plotTypeId).trim();
          const match = this.plotTypes?.find((t: any) =>
            String(t.plotTypeId ?? t.id ?? '').trim() === typeValue ||
            String(t.plotType ?? t.name ?? '').trim().toLowerCase() === typeValue.toLowerCase()
          );
          plotTypeId = match ? (match.plotTypeId ?? match.id ?? match.plotType) : d.plotTypeId;
        }

        const patchValues = {
          allotteeCode: d.propertyCode || d.allotteeCode || code,
          districtId: districtId,
          branchId: branchId,
          mandiId: mandiId,
          plotNumber: d.plotNo || d.plotNumber || '',
          plotTypeId: plotTypeId,
          plotSize: d.plotSize || d.plotsize || '',
          currentOwnerName: d.bidderName || d.currentOwnerName || '',
          guardianName: d.fatherOrHusbandName || d.guardianName || '',
          mobileNumber: d.mobileNo || d.mobileNumber || '',
          email: d.email || '',
          state: d.ownerStateID || d.state || '',
          ownerDistrict: d.ownerDistrtictID || d.ownerDistrict || '',
          city: d.ownerCityID || d.city || '',
          address: d.address || '',
          aadhaarNumber: d.aadhaarNo || d.aadhaarNumber || '',
          panNo: d.panNo || d.panNumber || '',
        };

        this.propertyForm.patchValue(patchValues, { emitEvent: false });
        this.cdr.detectChanges();
        this.toastr.success('Record found and loaded successfully.', 'Success');
      };

      const proceedToBidderLocationPatch = () => {
        const stateVal = (d.ownerStateID && d.ownerStateID !== 0 && d.ownerStateID !== '0') ? d.ownerStateID : ((d.state && d.state !== 0 && d.state !== '0') ? d.state : null);
        const districtVal = (d.ownerDistrtictID && d.ownerDistrtictID !== 0 && d.ownerDistrtictID !== '0') ? d.ownerDistrtictID : ((d.ownerDistrict && d.ownerDistrict !== 0 && d.ownerDistrict !== '0') ? d.ownerDistrict : null);
        const tasks: { districts?: any; cities?: any } = {};
        if (stateVal) tasks.districts = this.commonService.getAllDistrict(stateVal);
        if (districtVal) tasks.cities = this.commonService.GetAllCityByDistrictID(districtVal);

        if (Object.keys(tasks).length > 0) {
          forkJoin(tasks).subscribe({
            next: (resps: any) => {
              if (resps.districts) this.bidderDistricts = resps.districts.data || resps.districts || [];
              if (resps.cities) this.cities = resps.cities.data || resps.cities || [];
              patchFormValues();
            },
            error: () => {
              patchFormValues();
            }
          });
        } else {
          patchFormValues();
        }
      };

      const proceedToMandiAndPlotTypePatch = () => {
        if (d.mandiId) {
          this.loadPlotTypes(d.mandiId, () => {
            if (d.plotTypeId) {
              this.loadPlotNumbers(d.mandiId, d.plotTypeId, () => {
                if (d.plotNo || d.plotNumber) {
                  this.loadPlotSizes(d.plotNo || d.plotNumber, d.mandiId, d.plotTypeId, proceedToBidderLocationPatch);
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
      };

      if (d.districtId) {
        this.loadMarketCommittees(d.districtId, () => {
          if (d.branchId) {
            this.loadMandis(d.branchId, proceedToMandiAndPlotTypePatch);
          } else {
            proceedToMandiAndPlotTypePatch();
          }
        });
      } else {
        proceedToMandiAndPlotTypePatch();
      }
    };

    // Call EAuction property details API first
    this.service.GetPropertyEAuctionDetailsByPropertyCodeAsync(code).subscribe({
      next: (res: any) => {
        const d = res?.data;
        const hasValidData = !!res?.success && !!d && ((d.id && d.id > 0) || (d.propertyId && d.propertyId > 0) || !!d.propertyCode || !!d.plotNo || !!d.bidderName);
        if (hasValidData) {
          handleSuccessData(d);
        } else {
          // Fallback to property registration search
          this.service.getPropertyByCode(code).subscribe({
            next: (resFallback: any) => {
              const dFallback = resFallback?.data;
              const hasFallbackData = !!resFallback?.success && !!dFallback && ((dFallback.id && dFallback.id > 0) || !!dFallback.propertyCode || !!dFallback.plotNo);
              if (hasFallbackData) {
                handleSuccessData(dFallback);
              } else {
                this.toastr.warning('No records found related to this Allottee Code', 'Warning');
                this.resetForm();
                this.propertyForm.patchValue({ allotteeCode: code });
              }
            },
            error: () => {
              this.toastr.warning('No records found related to this Allottee Code', 'Warning');
              this.resetForm();
              this.propertyForm.patchValue({ allotteeCode: code });
            }
          });
        }
      },
      error: () => {
        // Fallback to property registration search
        this.service.getPropertyByCode(code).subscribe({
          next: (resFallback: any) => {
            const dFallback = resFallback?.data;
            const hasFallbackData = !!resFallback?.success && !!dFallback;
            if (hasFallbackData) {
              handleSuccessData(dFallback);
            } else {
              this.toastr.warning('No records found related to this Allottee Code', 'Warning');
              this.resetForm();
              this.propertyForm.patchValue({ allotteeCode: code });
            }
          },
          error: () => {
            this.toastr.warning('No records found related to this Allottee Code', 'Warning');
            this.resetForm();
            this.propertyForm.patchValue({ allotteeCode: code });
          }
        });
      }
    });
  }

  get filteredDistricts(): any[] {
    if (!this.districtSearchText?.trim()) {
      return this.districts;
    }
    const query = this.districtSearchText.toLowerCase().trim();
    return this.districts
      .filter(d => (d?.districtName || d?.name || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a?.districtName || a?.name || '').toLowerCase();
        const nameB = (b?.districtName || b?.name || '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredMarketCommittees(): any[] {
    if (!this.marketCommitteeSearchText?.trim()) {
      return this.marketCommittees;
    }
    const query = this.marketCommitteeSearchText.toLowerCase().trim();
    return this.marketCommittees
      .filter(c => (c?.marketCommitteeName || c?.name || c?.branchName || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a?.marketCommitteeName || a?.name || a?.branchName || '').toLowerCase();
        const nameB = (b?.marketCommitteeName || b?.name || b?.branchName || '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredMandis(): any[] {
    if (!this.mandiSearchText?.trim()) {
      return this.mandis;
    }
    const query = this.mandiSearchText.toLowerCase().trim();
    return this.mandis
      .filter(m => (m?.mandiName || m?.name || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a?.mandiName || a?.name || '').toLowerCase();
        const nameB = (b?.mandiName || b?.name || '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredPlotTypes(): any[] {
    if (!this.plotTypeSearchText?.trim()) {
      return this.plotTypes;
    }
    const query = this.plotTypeSearchText.toLowerCase().trim();
    return this.plotTypes
      .filter(t => (t?.plotType || t?.plotTypeName || t?.name || String(t)).toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a?.plotType || a?.plotTypeName || a?.name || String(a)).toLowerCase();
        const nameB = (b?.plotType || b?.plotTypeName || b?.name || String(b)).toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredPlotNumbers(): any[] {
    if (!this.plotNumberSearchText?.trim()) {
      return this.plotNumbers;
    }
    const query = this.plotNumberSearchText.toLowerCase().trim();
    return this.plotNumbers
      .filter(p => String(p?.plotNo ?? p?.plotNumber ?? p ?? '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = String(a?.plotNo ?? a?.plotNumber ?? a ?? '').toLowerCase();
        const nameB = String(b?.plotNo ?? b?.plotNumber ?? b ?? '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredPlotSizes(): any[] {
    if (!this.plotSizeSearchText?.trim()) {
      return this.plotSizes;
    }
    const query = this.plotSizeSearchText.toLowerCase().trim();
    return this.plotSizes
      .filter(s => String(s?.plotSize ?? s?.size ?? s ?? '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = String(a?.plotSize ?? a?.size ?? a ?? '').toLowerCase();
        const nameB = String(b?.plotSize ?? b?.size ?? b ?? '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredStates(): any[] {
    if (!this.stateSearchText?.trim()) {
      return this.states;
    }
    const query = this.stateSearchText.toLowerCase().trim();
    return this.states
      .filter(s => (s?.stateName || s?.name || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a?.stateName || a?.name || '').toLowerCase();
        const nameB = (b?.stateName || b?.name || '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredOwnerDistricts(): any[] {
    const list = this.bidderDistricts.length ? this.bidderDistricts : this.districts;
    if (!this.ownerDistrictSearchText?.trim()) {
      return list;
    }
    const query = this.ownerDistrictSearchText.toLowerCase().trim();
    return list
      .filter(d => (d?.districtName || d?.name || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a?.districtName || a?.name || '').toLowerCase();
        const nameB = (b?.districtName || b?.name || '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  get filteredCities(): any[] {
    if (!this.citySearchText?.trim()) {
      return this.cities;
    }
    const query = this.citySearchText.toLowerCase().trim();
    return this.cities
      .filter(c => (c?.cityName || c?.name || '').toLowerCase().includes(query))
      .sort((a, b) => {
        const nameA = (a?.cityName || a?.name || '').toLowerCase();
        const nameB = (b?.cityName || b?.name || '').toLowerCase();
        const aStarts = nameA.startsWith(query);
        const bStarts = nameB.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return nameA.localeCompare(nameB);
      });
  }

  // District Dropdown
  toggleDistrictDropdown(event: Event) {
    event.stopPropagation();
    if (!this.isDistrictDropdownOpen) {
      this.closeAllDropdowns();
      this.isDistrictDropdownOpen = true;
      this.districtSearchText = '';
    }
  }

  onDistrictSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.districtSearchText = input.value;
    this.isDistrictDropdownOpen = true;
  }

  selectDistrict(districtId: any) {
    this.propertyForm.get('districtId')?.setValue(districtId);
    this.propertyForm.get('districtId')?.markAsTouched();
    this.isDistrictDropdownOpen = false;
    this.districtSearchText = '';
  }

  getSelectedDistrictName(): string {
    const value = this.propertyForm?.get('districtId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.districts?.find(d => String(d.districtId) === String(value));
    return selected ? selected.districtName : '';
  }

  isDistrictSelected(item: any): boolean {
    const value = this.propertyForm?.get('districtId')?.value;
    if (value === undefined || value === null || value === '') return false;
    return String(item?.districtId) === String(value);
  }

  // Market Committee Dropdown
  toggleMarketCommitteeDropdown(event: Event) {
    event.stopPropagation();
    if (!this.isMarketCommitteeDropdownOpen) {
      this.closeAllDropdowns();
      this.isMarketCommitteeDropdownOpen = true;
      this.marketCommitteeSearchText = '';
    }
  }

  onMarketCommitteeSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.marketCommitteeSearchText = input.value;
    this.isMarketCommitteeDropdownOpen = true;
  }

  selectMarketCommittee(branchId: any) {
    this.propertyForm.get('branchId')?.setValue(branchId);
    this.propertyForm.get('branchId')?.markAsTouched();
    this.isMarketCommitteeDropdownOpen = false;
    this.marketCommitteeSearchText = '';
  }

  getSelectedMarketCommitteeName(): string {
    const value = this.propertyForm?.get('branchId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.marketCommittees?.find(c => {
      const id = c?.marketCommitteeId ?? c?.id ?? c?.branchId;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.marketCommitteeName ?? selected.name ?? selected.branchName ?? selected;
  }

  isMarketCommitteeSelected(item: any): boolean {
    const value = this.propertyForm?.get('branchId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.marketCommitteeId ?? item?.id ?? item?.branchId;
    return String(id) === String(value);
  }

  // Mandi Dropdown
  toggleMandiDropdown(event: Event) {
    event.stopPropagation();
    if (!this.isMandiDropdownOpen) {
      this.closeAllDropdowns();
      this.isMandiDropdownOpen = true;
      this.mandiSearchText = '';
    }
  }

  onMandiSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.mandiSearchText = input.value;
    this.isMandiDropdownOpen = true;
  }

  selectMandi(mandiId: any) {
    this.propertyForm.get('mandiId')?.setValue(mandiId);
    this.propertyForm.get('mandiId')?.markAsTouched();
    this.isMandiDropdownOpen = false;
    this.mandiSearchText = '';
  }

  getSelectedMandiName(): string {
    const value = this.propertyForm?.get('mandiId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.mandis?.find(m => {
      const id = m?.mandiId ?? m?.id ?? m;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.mandiName ?? selected.name ?? selected;
  }

  isMandiSelected(item: any): boolean {
    const value = this.propertyForm?.get('mandiId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.mandiId ?? item?.id ?? item;
    return String(id) === String(value);
  }

  // Plot Type Dropdown
  togglePlotTypeDropdown(event: Event) {
    event.stopPropagation();
    if (!this.isPlotTypeDropdownOpen) {
      this.closeAllDropdowns();
      this.isPlotTypeDropdownOpen = true;
      this.plotTypeSearchText = '';
    }
  }

  onPlotTypeSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.plotTypeSearchText = input.value;
    this.isPlotTypeDropdownOpen = true;
  }

  selectPlotType(val: any) {
    this.propertyForm.get('plotTypeId')?.setValue(val);
    this.propertyForm.get('plotTypeId')?.markAsTouched();
    this.isPlotTypeDropdownOpen = false;
    this.plotTypeSearchText = '';
  }

  getSelectedPlotTypeName(): string {
    const value = this.propertyForm?.get('plotTypeId')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.plotTypes?.find(t => {
      const id = t?.plotTypeId ?? t?.id ?? t;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.plotType ?? selected.plotTypeName ?? selected.name ?? selected;
  }

  isPlotTypeSelected(item: any): boolean {
    const value = this.propertyForm?.get('plotTypeId')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.plotTypeId ?? item?.id ?? item;
    return String(id) === String(value);
  }

  // Plot Number Dropdown
  togglePlotNumberDropdown(event: Event) {
    event.stopPropagation();
    if (!this.isPlotNumberDropdownOpen) {
      this.closeAllDropdowns();
      this.isPlotNumberDropdownOpen = true;
      this.plotNumberSearchText = '';
    }
  }

  onPlotNumberSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.plotNumberSearchText = input.value;
    this.isPlotNumberDropdownOpen = true;
  }

  selectPlotNumber(val: any) {
    this.propertyForm.get('plotNumber')?.setValue(val);
    this.propertyForm.get('plotNumber')?.markAsTouched();
    this.isPlotNumberDropdownOpen = false;
    this.plotNumberSearchText = '';
  }

  getSelectedPlotNumberName(): string {
    const value = this.propertyForm?.get('plotNumber')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.plotNumbers?.find(p => {
      const id = p?.plotNo ?? p?.plotNumber ?? p?.id ?? p;
      return String(id) === String(value);
    });
    if (!selected) return String(value);
    return String(selected.plotNo ?? selected.plotNumber ?? selected);
  }

  isPlotNumberSelected(item: any): boolean {
    const value = this.propertyForm?.get('plotNumber')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.plotNo ?? item?.plotNumber ?? item?.id ?? item;
    return String(id) === String(value);
  }

  // Plot Size Dropdown
  togglePlotSizeDropdown(event: Event) {
    event.stopPropagation();
    if (!this.isPlotSizeDropdownOpen) {
      this.closeAllDropdowns();
      this.isPlotSizeDropdownOpen = true;
      this.plotSizeSearchText = '';
    }
  }

  onPlotSizeSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.plotSizeSearchText = input.value;
    this.isPlotSizeDropdownOpen = true;
  }

  selectPlotSize(val: any) {
    this.propertyForm.get('plotSize')?.setValue(val);
    this.propertyForm.get('plotSize')?.markAsTouched();
    this.isPlotSizeDropdownOpen = false;
    this.plotSizeSearchText = '';
  }

  getSelectedPlotSizeName(): string {
    const value = this.propertyForm?.get('plotSize')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.plotSizes?.find(s => {
      const id = s?.plotSize ?? s?.size ?? s?.id ?? s;
      return String(id) === String(value);
    });
    if (!selected) return String(value);
    return String(selected.plotSize ?? selected.size ?? selected);
  }

  isPlotSizeSelected(item: any): boolean {
    const value = this.propertyForm?.get('plotSize')?.value;
    if (value === undefined || value === null || value === '') return false;
    const id = item?.plotSize ?? item?.size ?? item?.id ?? item;
    return String(id) === String(value);
  }

  // State Dropdown
  toggleStateDropdown(event: Event) {
    if (this.isOwnerInfoReadOnly) return;
    event.stopPropagation();
    if (!this.isStateDropdownOpen) {
      this.closeAllDropdowns();
      this.isStateDropdownOpen = true;
      this.stateSearchText = '';
    }
  }

  onStateSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.stateSearchText = input.value;
    this.isStateDropdownOpen = true;
  }

  selectState(stateId: any) {
    this.propertyForm.get('state')?.setValue(stateId);
    this.propertyForm.get('state')?.markAsTouched();
    this.isStateDropdownOpen = false;
    this.stateSearchText = '';
  }

  getSelectedStateName(): string {
    const value = this.propertyForm?.get('state')?.value;
    if (value === undefined || value === null || value === '') return '';
    const selected = this.states?.find(s => String(s.stateId || s.id || s) === String(value));
    return selected ? (selected.stateName || selected.name || selected) : '';
  }

  isStateSelected(item: any): boolean {
    const value = this.propertyForm?.get('state')?.value;
    if (value === undefined || value === null || value === '') return false;
    return String(item?.stateId || item?.id || item) === String(value);
  }

  // Owner District Dropdown
  toggleOwnerDistrictDropdown(event: Event) {
    if (this.isOwnerInfoReadOnly) return;
    event.stopPropagation();
    if (!this.isOwnerDistrictDropdownOpen) {
      this.closeAllDropdowns();
      this.isOwnerDistrictDropdownOpen = true;
      this.ownerDistrictSearchText = '';
    }
  }

  onOwnerDistrictSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.ownerDistrictSearchText = input.value;
    this.isOwnerDistrictDropdownOpen = true;
  }

  selectOwnerDistrict(districtId: any) {
    this.propertyForm.get('ownerDistrict')?.setValue(districtId);
    this.propertyForm.get('ownerDistrict')?.markAsTouched();
    this.isOwnerDistrictDropdownOpen = false;
    this.ownerDistrictSearchText = '';
  }

  getSelectedOwnerDistrictName(): string {
    const value = this.propertyForm?.get('ownerDistrict')?.value;
    if (value === undefined || value === null || value === '') return '';
    const list = this.bidderDistricts.length ? this.bidderDistricts : this.districts;
    const selected = list?.find(d => String(d.districtId || d.id || d) === String(value));
    return selected ? (selected.districtName || selected.name || selected) : '';
  }

  isOwnerDistrictSelected(item: any): boolean {
    const value = this.propertyForm?.get('ownerDistrict')?.value;
    if (value === undefined || value === null || value === '') return false;
    return String(item?.districtId || item?.id || item) === String(value);
  }

  // City Dropdown
  toggleCityDropdown(event: Event) {
    if (this.isOwnerInfoReadOnly) return;
    event.stopPropagation();
    if (!this.isCityDropdownOpen) {
      this.closeAllDropdowns();
      this.isCityDropdownOpen = true;
      this.citySearchText = '';
    }
  }

  onCitySearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.citySearchText = input.value;
    this.isCityDropdownOpen = true;
  }

  selectCity(cityId: any) {
    this.propertyForm.get('city')?.setValue(cityId);
    this.propertyForm.get('city')?.markAsTouched();
    this.isCityDropdownOpen = false;
    this.citySearchText = '';
  }

  getSelectedCityName(): string {
    const value = this.propertyForm?.get('city')?.value;
    if (value === undefined || value === null || value === '' || value === 0 || value === '0') return '';
    const selected = this.cities?.find(c => {
      const id = c?.cityId ?? c?.CityId ?? c?.id ?? c?.Id ?? c;
      return String(id) === String(value);
    });
    if (!selected) return '';
    return selected.cityName ?? selected.CityName ?? selected.name ?? selected.Name ?? selected;
  }

  isCitySelected(item: any): boolean {
    const value = this.propertyForm?.get('city')?.value;
    if (value === undefined || value === null || value === '' || value === 0 || value === '0') return false;
    const id = item?.cityId ?? item?.CityId ?? item?.id ?? item?.Id ?? item;
    return String(id) === String(value);
  }

  loadDistricts(callback?: () => void) {
    this.service.getPropertyDistricts().subscribe({
      next: (res: any) => {
        this.districts = res.data || res || [];
        if (callback) callback();
      },
      error: (err: any) => {
        // console.error('Error fetching property districts:', err);
      }
    });
  }

  loadStates() {
    this.commonService.getAllStates().subscribe({
      next: (res: any) => {
        this.states = res.data || [];
      },
      error: (err: any) => {
        // console.error('Error fetching states:', err);
      }
    });
  }

  onDistrictChange(): void {
    // Handled reactively by valueChanges
  }

  onMarketCommitteeChange(): void {
    // Handled reactively by valueChanges
  }

  onMandiChange(): void {
    // Handled reactively by valueChanges
  }

  onPlotTypeChange(): void {
    // Handled reactively by valueChanges
  }

  loadMarketCommittees(districtId: any, callback?: () => void) {
    if (!districtId) {
      this.marketCommittees = [];
      if (callback) callback();
      return;
    }
    this.service.getPropertyMandiBranchesByDistrict(districtId).subscribe({
      next: (res: any) => {
        this.marketCommittees = res?.data || res || [];
        if (callback) callback();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        // console.error('Error fetching market committees:', err);
        this.marketCommittees = [];
        if (callback) callback();
      }
    });
  }

  loadMandis(branchId: any, callback?: () => void) {
    if (!branchId) {
      this.mandis = [];
      if (callback) callback();
      return;
    }
    this.service.getPropertyMandiBranchesByBranchId(branchId).subscribe({
      next: (res: any) => {
        this.mandis = res?.data || res || [];
        if (callback) callback();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        // console.error('Error fetching mandis:', err);
        this.mandis = [];
        if (callback) callback();
      }
    });
  }

  loadCities(districtId: any, callback?: () => void) {
    this.commonService.GetAllCityByDistrictID(districtId).subscribe({
      next: (res: any) => {
        this.cities = res.data || [];
        if (callback) callback();
      },
      error: (err: any) => {
        // console.error('Error fetching cities:', err);
      }
    });
  }

  loadPlotTypes(mandiId?: any, callback?: () => void) {
    if (!mandiId) {
      this.plotTypes = [];
      if (callback) callback();
      return;
    }
    this.service.getPropertyPlotTypesAsync(mandiId).subscribe({
      next: (res: any) => {
        this.plotTypes = res?.data || res || [];
        if (callback) callback();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        // console.error('Error fetching plot types by mandi:', err);
        this.plotTypes = [];
        if (callback) callback();
      }
    });
  }

  loadPlotNumbers(mandiId?: any, plotTypeId?: any, callback?: () => void) {
    const currentMandiId = mandiId ?? this.propertyForm.get('mandiId')?.value;
    const currentPlotTypeId = plotTypeId ?? this.propertyForm.get('plotTypeId')?.value;

    if (!currentMandiId || !currentPlotTypeId) {
      this.plotNumbers = [];
      if (callback) callback();
      return;
    }
    this.service.getPlotsByPlotTypesAsync(currentMandiId, currentPlotTypeId).subscribe({
      next: (res: any) => {
        this.plotNumbers = res?.data || res || [];
        if (callback) callback();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        // console.error('Error fetching plot numbers by plot type:', err);
        this.plotNumbers = [];
        if (callback) callback();
      }
    });
  }

  clearOwnerInformation(): void {
    this.propertyData = null;
    this.isOwnerInfoReadOnly = false;
    this.aadhaarDocPath = null;
    this.panDocPath = null;
    this.passportDocPath = null;
    this.addrDocPath = null;
    this.cities = [];
    this.bidderDistricts = [];

    const clearPatch: any = {
      allotteeCode: '',
      currentOwnerName: '',
      guardianName: '',
      mobileNumber: '',
      email: '',
      state: '',
      ownerDistrict: '',
      city: '',
      address: '',
      aadhaarNumber: '',
      panNo: ''
    };

    this.documents.forEach((doc) => {
      clearPatch[`${doc.key}Selected`] = false;
      clearPatch[`${doc.key}File`] = null;
    });

    this.propertyForm.patchValue(clearPatch, { emitEvent: false });
    this.cdr.detectChanges();
  }

  loadPlotSizes(plotNo?: any, mandiId?: any, plotTypeId?: any, callback?: () => void) {
    const currentMandiId = mandiId ?? this.propertyForm.get('mandiId')?.value;
    const currentPlotTypeId = plotTypeId ?? this.propertyForm.get('plotTypeId')?.value;
    const currentPlotNo = plotNo ?? this.propertyForm.get('plotNumber')?.value;

    this.propertyForm.get('plotSize')?.setValue('', { emitEvent: false });
    this.plotSizes = [];

    if (!currentPlotNo || !currentMandiId || !currentPlotTypeId) {
      if (callback) callback();
      return;
    }

    this.userService.GetMandiPlotSizeByPlotNo(currentMandiId, currentPlotTypeId, currentPlotNo).subscribe({
      next: (res: any) => {
        this.plotSizes = res?.data || res || [];
        this.cdr.detectChanges();
        if (callback) callback();
      },
      error: (err: any) => {
        this.plotSizes = [];
        this.propertyForm.get('plotSize')?.setValue('', { emitEvent: false });
        if (callback) callback();
      }
    });
  }

  viewDocument(filePath?: string | null, controlName?: string) {
    if (controlName) {
      const docKey = controlName.replace(/File$/, '');
      if (this.uploadedDocData[docKey]?.relativePath) {
        filePath = this.uploadedDocData[docKey].relativePath;
      }
    }
    const file = controlName ? (this.propertyForm.get(controlName)?.value as File | null) : null;
    if (file && file instanceof File) {
      const fileUrl = URL.createObjectURL(file);
      window.open(fileUrl, '_blank');
      return;
    }
    if (filePath) {
      let fullUrl = filePath;
      if (!filePath.startsWith('http://') && !filePath.startsWith('https://')) {
        const apiBase = this.commonService.baseUrl.replace(/\/api\/?$/, '');
        const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        fullUrl = `${apiBase}/${cleanPath}`;
      }
      window.open(fullUrl, '_blank');
    } else {
      this.toastr.info('No document available to view.', 'Info');
    }
  }

  maskInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Strip out the prefix temporarily to see what the user typed
    let digits = value.replace(/^XXXXXXXX\s?/, '').replace(/\D/g, '');

    // Limit the actual typed digits to 4
    if (digits.length > 4) {
      digits = digits.substring(0, 4);
    }

    // Combine the mask with the typed digits
    const maskedValue = 'XXXXXXXX' + ' ' + digits;

    // Update the form control and input display value
    this.propertyForm.get('aadhaarNumber')?.setValue(maskedValue, { emitEvent: false });
    input.value = maskedValue;
  }

  isInvalid(controlName: string): boolean {
    const control = this.propertyForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  hasDocumentError(): boolean {
    return !!this.propertyForm.hasError('documentRequired') && (this.propertyForm.dirty || this.propertyForm.touched);
  }

  fileName(controlName: string): string {
    const file = this.propertyForm.get(controlName)?.value as File | null;
    return file?.name ?? 'No file chosen';
  }

  onFileChange(event: Event, controlName: string, docKey?: string): void {
    // debugger
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const control = this.propertyForm.get(controlName);

    control?.setValue(file);
    control?.markAsDirty();
    control?.updateValueAndValidity();

    if (!docKey && controlName.endsWith('File')) {
      docKey = controlName.replace(/File$/, '');
    }

    if (file && docKey && this.documentTypeMap[docKey]) {
      const selectedControl = this.propertyForm.get(`${docKey}Selected`);
      if (selectedControl && !selectedControl.value) {
        selectedControl.setValue(true);
      }

      this.uploadingStates[docKey] = true;
      const typeId = this.documentTypeMap[docKey];

      const payload: FileUploadPayload = {
        file,
        documentCategoryId: 4, // Property Document
        documentTypeId: typeId,
        documentNumber: '',
        sessionId: this.sessionId,
      };

      this.fileService.UploadFile(payload).subscribe({
        next: (response) => {
          this.uploadingStates[docKey!] = false;
          if (response?.success && response?.data) {
            this.uploadedDocData[docKey!] = {
              userDocumentId: response.data.userDocumentId,
              storedFileName: response.data.storedFileName,
              relativePath: response.data.relativePath,
              fileUrl: response.data.fileUrl || response.data.relativePath,
            };
            const docLabel = this.documents.find(d => d.key === docKey)?.label || 'Document';
            this.toastr.success(`${docLabel} uploaded successfully.`, 'Upload Success');
          } else {
            this.toastr.error(response?.message || 'File upload failed.', 'Upload Error');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.uploadingStates[docKey!] = false;
          const msg = err?.error?.message || err?.message || 'Failed to upload document.';
          this.toastr.error(msg, 'Upload Error');
          this.cdr.detectChanges();
        }
      });
    } else if (!file && docKey) {
      delete this.uploadedDocData[docKey];
    }
  }

  onSubmit(): void {
    // Check if any file is currently uploading
    const isAnyUploading = Object.values(this.uploadingStates).some(state => state);
    if (isAnyUploading) {
      this.toastr.info('Please wait, documents are still being uploaded.', 'Uploading');
      return;
    }

    if (this.propertyForm.invalid) {
      this.propertyForm.markAllAsTouched();
      this.toastr.warning('Please fill in all required fields and upload at least one document.', 'Validation Error');
      return;
    }

    const formValue = this.propertyForm.value;

    const uploadedIds: number[] = [];
    Object.keys(this.uploadedDocData).forEach(k => {
      if (this.uploadedDocData[k]?.userDocumentId) {
        uploadedIds.push(this.uploadedDocData[k].userDocumentId);
      }
    });

    const payload: any = {
      districtId: Number(formValue.districtId),
      branchId: Number(formValue.branchId),
      mandiId: Number(formValue.mandiId),
      plotTypeId: formValue.plotTypeId ? Number(formValue.plotTypeId) : null,
      plotNo: formValue.plotNumber ? Number(formValue.plotNumber) : null,
      plotSize: formValue.plotSize ? String(formValue.plotSize) : '',
      currentOwnerName: formValue.currentOwnerName || '',
      fatherHusbandName: formValue.guardianName || '',
      mobileNumber: formValue.mobileNumber || '',
      email: formValue.email || '',
      ownerStateID: formValue.state ? Number(formValue.state) : null,
      ownerDistrtictID: formValue.ownerDistrict ? Number(formValue.ownerDistrict) : null,
      ownerCityID: formValue.city ? Number(formValue.city) : null,
      address: formValue.address || '',
      aadhaarNumber: formValue.aadhaarNumber ? String(formValue.aadhaarNumber).trim() : '',
      panNumber: formValue.panNo ? String(formValue.panNo).trim() : '',
      propertyCode: formValue.allotteeCode || this.propertyData?.propertyCode || this.propertyData?.allotteeCode || '',
      applicantId: this.getApplicantId(),
      planId: this.propertyData?.planId || null,
      verificationUserEndStatusId: 1,

      // Document flags: '1' = uploaded, '0' = not uploaded
      uploadAllotmentLetter: (formValue.allotmentLetterSelected && (this.uploadedDocData['allotmentLetter'] || formValue.allotmentLetterFile)) ? '1' : '0',
      receiptDocument: (formValue.lastPaymentReceiptSelected && (this.uploadedDocData['lastPaymentReceipt'] || formValue.lastPaymentReceiptFile)) ? '1' : '0',
      uploadNoDuesCertificate: (formValue.noDueCertificateSelected && (this.uploadedDocData['noDueCertificate'] || formValue.noDueCertificateFile)) ? '1' : '0',
      bForm: (formValue.bFormSelected && (this.uploadedDocData['bForm'] || formValue.bFormFile)) ? '1' : '0',
      conveyanceDeed: (formValue.conveyanceDeedSelected && (this.uploadedDocData['conveyanceDeed'] || formValue.conveyanceDeedFile)) ? '1' : '0',
      saleDeed: (formValue.saleDeedSelected && (this.uploadedDocData['saleDeed'] || formValue.saleDeedFile)) ? '1' : '0',
      transferOrder: (formValue.transferOrderSelected && (this.uploadedDocData['transferOrder'] || formValue.transferOrderFile)) ? '1' : '0',
      upload1: (formValue.legalHeirCertificateSelected && (this.uploadedDocData['legalHeirCertificate'] || formValue.legalHeirCertificateFile)) ? '1' : '0',

      sessionId: this.sessionId,
      documentIds: uploadedIds
    };

    this.isSubmitting = true;
    this.userService.UserPropertyRegistration(payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res?.success) {
            this.toastr.success(res?.message || 'Property registered successfully.', 'Success');
            this.resetForm();
          } else {
            this.toastr.error(res?.message || 'Failed to register property.', 'Error');
          }
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || err?.error?.title || err?.message || 'Something went wrong while registering property.';
          this.toastr.error(errorMsg, 'Error');
          // console.error('Error in UserPropertyRegistration:', err);
        }
      });
  }

  private getApplicantId(): number {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const applicantIdClaim = payload?.ApplicantId || payload?.applicantId || payload?.ApplicantID;
        if (applicantIdClaim && !isNaN(Number(applicantIdClaim)) && Number(applicantIdClaim) > 0) {
          return Number(applicantIdClaim);
        }
      }
    } catch (e) {
      // console.error('Error decoding token for applicantId:', e);
    }

    try {
      const sessionStr = sessionStorage.getItem('cp_session') || localStorage.getItem('cp_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.applicantId && !isNaN(Number(session.applicantId)) && Number(session.applicantId) > 0) {
          return Number(session.applicantId);
        }
        if (session?.userId && !isNaN(Number(session.userId)) && Number(session.userId) > 0) {
          return Number(session.userId);
        }
      }
    } catch (e) {
      // console.error('Error parsing session for applicantId:', e);
    }

    return this.propertyData?.applicantId ? Number(this.propertyData.applicantId) : 0;
  }

  resetForm(): void {
    this.isOwnerInfoReadOnly = false;
    this.propertyForm.reset();
    this.marketCommittees = [];
    this.mandis = [];
    this.plotTypes = [];
    this.plotNumbers = [];
    this.plotSizes = [];
    this.cities = [];
    this.aadhaarDocPath = null;
    this.panDocPath = null;
    this.passportDocPath = null;
    this.addrDocPath = null;
    this.sessionId = crypto.randomUUID();
    this.uploadedDocData = {};
    this.uploadingStates = {};
  }

  private fileTypeValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File | null;

      if (!file) {
        return null;
      }

      const allowedExtensions = ['jpeg', 'jpg', 'png', 'pdf'];
      const extension = file.name.split('.').pop()?.toLowerCase();

      return extension && allowedExtensions.includes(extension) ? null : { fileType: true };
    };
  }

  private atLeastOneDocumentValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const hasUploadedDocument = this.documents.some((document) => {
        return !!group.get(`${document.key}Selected`)?.value && !!group.get(`${document.key}File`)?.value;
      });

      return hasUploadedDocument ? null : { documentRequired: true };
    };
  }
}

