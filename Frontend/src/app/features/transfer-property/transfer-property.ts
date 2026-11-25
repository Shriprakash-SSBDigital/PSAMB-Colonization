import { Component, OnInit, HostListener, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { Userservice } from '../../core/service/UserService/userservice';
import { Common } from '../../core/service/CommonService/common';
import { environment } from '../../../environments/environment';


export interface DocumentConfig {
  key: string;
  label: string;
  visible: string[];
  requiredForTransferType: boolean;
}

@Component({
  selector: 'app-transfer-property',
  imports: [CommonModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './transfer-property.html',
  styleUrl: './transfer-property.scss',
})
export class TransferProperty implements OnInit {

  @ViewChild('aadhaarNumberInput') private aadhaarNumberInput?: ElementRef<HTMLInputElement>;

  readonly allowedFileTypes = '.jpeg,.jpg,.png,.pdf';

  readonly TransferCases = [
    { key: 'normal', label: 'Normal Property ' },
    { key: 'death', label: 'Due to Death' },
    { key: 'multiple_owners', label: 'Multiple Owners' },
  ];

  readonly commonDocuments: DocumentConfig[] = [
    {
      key: 'conveyanceDeed',
      label: 'Conveyance Deed (Form B)',
      visible: ['normal', 'death', 'multiple_owners'],
      requiredForTransferType: false
    },
    {
      key: 'bankNoc',
      label: 'NOC from Concerned Bank',
      visible: ['normal', 'death', 'multiple_owners'],
      requiredForTransferType: false
    },
    {
      key: 'saleDeed',
      label: 'Registered Sale Deed (Certified Copy)',
      visible: ['normal','multiple_owners'],
      requiredForTransferType: true
    },
    {
      key: 'powerOfAttorney',
      label: 'Power of Attorney, if applicable',
      visible: ['normal'],
      requiredForTransferType: true
    },
    {
      key: 'partnershipDeed',
      label: 'Partnership Deed',
      visible: ['normal', 'multiple_owners'],
      requiredForTransferType: true
    },
    {
      key: 'deathCertificate',
      label: 'Death Certificate of Deceased',
      visible: ['death:withoutWill', 'death:withWill'],
      requiredForTransferType: true
    },
    {
      key: 'legalHeirCertificate',
      label: 'Legal Heirs Report',
      visible: ['death:withoutWill', 'death:withWill'],
      requiredForTransferType: true
    },
    {
      key: 'registeredWill',
      label: 'Registered Will of Deceased',
      visible: ['death:withWill'],
      requiredForTransferType: true
    },
    {
      key: 'requiredNotarizedDoc',
      label: 'Required Notarized Document',
      visible: ['multiple_owners'],
      requiredForTransferType: true
    },
  ];

  get documents(): DocumentConfig[] {
    if (!this.selectedTransferType) {
      return [];
    }

    const category = this.selectedTransferType === 'death' && this.selectedWillOption
      ? `death:${this.selectedWillOption}`
      : '';
    return this.commonDocuments.filter((document) =>
      document.visible.includes(this.selectedTransferType) || document.visible.includes(category)
    );
  }

  selectedTransferType = '';
  selectedWillOption = '';

  protected propertyForm: FormGroup;
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

  sessionId = '';

  uploadedDocData: Record<string, { userDocumentId: number; storedFileName: string; relativePath: string; fileUrl: string }> = {};

  constructor(
    private fb: FormBuilder,
    private service: Propertybidderregn,
    private userService: Userservice,
    private commonService: Common,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    const documentControls = this.commonDocuments.reduce<Record<string, unknown>>((controls, document) => {
      controls[`${document.key}Selected`] = [false];
      controls[`${document.key}File`] = [null];
      return controls;
    }, {});

    this.propertyForm = this.fb.group(
      {
        transferType: ['', Validators.required],
        deathWillOption: ['', Validators.required],
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
        aadhaarNumber: ['', Validators.pattern(/^\d{12}$/)],
        aadhaarProof: [null],
        panNo: ['', Validators.pattern(/^[A-Z]{5}\d{4}[A-Z]$/i)],
        panProof: [null],
        ...documentControls,
      },
      { validators: this.conditionalDocumentValidator() },
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
        this.loadOwnerDistricts(stateId);
      }
    });

    this.propertyForm.get('ownerDistrict')?.valueChanges.subscribe((districtId) => {
      this.cities = [];
      this.propertyForm.get('city')?.setValue('', { emitEvent: false });
      if (districtId) {
        this.loadCities(districtId);
      }
    });

    this.loadProfileAndPatchOwnerInfo(true);
  }

  // Loads the logged-in user's profile and pre-fills the editable owner information.
  private loadProfileAndPatchOwnerInfo(patchOwnerInfo = true): void {
    this.commonService.getProfileDetailsByUserId().subscribe({
      next: (res: any) => {
        const d = res?.data;
        if (!res?.success || !d) return;
        this.sessionId = String(d.userSessionId ?? '').trim();

        if (!patchOwnerInfo) return;

        // Name & contact 
        const fullName = [d.firstName, d.lastName]
          .filter((n: string) => n && n.trim())
          .join(' ');

        const fatherName = [d.fatherHusbandFirstName, d.fatherHusbandLastName]
          .filter((n: string) => n && n.trim())
          .join(' ');

        const patchValues: any = {
          currentOwnerName: fullName    || '',
          guardianName:     fatherName  || '',
          mobileNumber:     d.mobileNo  || '',
          email:            d.email     || '',
          address:          d.individualPlotStreetLandmark || '',
          aadhaarNumber:    this.normalizeAadhaarValue(d.identDocNumber || ''),
        };

        const stateId    = d.individualStateId    ?? null;
        const districtId = d.individualDistrictId ?? null;
        const cityId     = d.individualCityId     ?? null;

        if (stateId) {
          patchValues['state'] = stateId;
        }

        this.propertyForm.patchValue(patchValues, { emitEvent: false });
        this.maskPatchedAadhaar();

        //  Aadhaar card document: set uploadedDocData so the view-eye button appears
        if (d.identDocPath) {
          this.aadhaarDocPath = d.identDocPath;
          this.uploadedDocData['aadhaarProof'] = {
            userDocumentId: 0,
            storedFileName: d.identDocPath.split('/').pop() || 'aadhaar.jpg',
            relativePath:   d.identDocPath,
            fileUrl:        d.identDocPath,
          };
        }

        if (stateId) {
          this.loadOwnerDistricts(stateId, () => {
            if (districtId) {
              this.propertyForm.get('ownerDistrict')?.setValue(districtId, { emitEvent: false });
              this.loadCities(districtId, () => {
                if (cityId) {
                  this.propertyForm.get('city')?.setValue(cityId, { emitEvent: false });
                }
                this.cdr.detectChanges();
              });
            } else {
              this.cdr.detectChanges();
            }
          });
        } else {
          this.cdr.detectChanges();
        }
      },
      error: (err: any) => {
        // console.error('Could not pre-fill owner info from profile:', err);
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
    const list = this.bidderDistricts;
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
    const list = this.bidderDistricts;
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

  loadOwnerDistricts(stateId: any, callback?: () => void): void {
    this.commonService.getAllDistrict(stateId).subscribe({
      next: (res: any) => {
        this.bidderDistricts = res?.data || res || [];
        if (callback) callback();
      },
      error: () => {
        this.bidderDistricts = [];
        if (callback) callback();
      }
    });
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

    this.commonDocuments.forEach((doc) => {
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
      window.open(this.getDocumentUrl(filePath), '_blank');
    } else {
      this.toastr.info('No document available to view.', 'Info');
    }
  }

  private getDocumentUrl(filePath: string): string {
    let normalizedPath = filePath.replace(/\\/g, '/');
    const documentRoot = 'colonizationdocuments/';
    const rootIndex = normalizedPath.toLowerCase().indexOf(documentRoot);

    if (rootIndex >= 0) {
      normalizedPath = normalizedPath.substring(rootIndex + documentRoot.length);
    } else if (/^https?:\/\//i.test(normalizedPath)) {
      normalizedPath = new URL(normalizedPath).pathname.replace(/^\/+/, '');
    }

    normalizedPath = normalizedPath.replace(/^\/+/, '');
    return `${environment.documentBaseUrl.replace(/\/+$/, '')}/ColonizationDocuments/${normalizedPath}`;
  }

  private normalizeAadhaarValue(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '').slice(0, 12);
  }

  onAadhaarInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = this.normalizeAadhaarValue(input.value);
    this.propertyForm.get('aadhaarNumber')?.setValue(digits, { emitEvent: false });
    input.value = digits;
  }

  showAadhaarInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = this.normalizeAadhaarValue(this.propertyForm.get('aadhaarNumber')?.value);
  }

  maskAadhaarInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = this.normalizeAadhaarValue(this.propertyForm.get('aadhaarNumber')?.value);
    input.value = digits ? `XXXXXXXX ${digits.slice(-4)}` : '';
  }

  private maskPatchedAadhaar(): void {
    setTimeout(() => {
      const input = this.aadhaarNumberInput?.nativeElement;
      const digits = this.normalizeAadhaarValue(this.propertyForm.get('aadhaarNumber')?.value);
      if (input) {
        input.value = digits ? `XXXXXXXX ${digits.slice(-4)}` : '';
      }
    });
  }

  isInvalid(controlName: string): boolean {
    const control = this.propertyForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onTransferTypeChange(event?: Event | string): void {
    let val = '';
    if (typeof event === 'string') {
      val = event;
    } else if (event && (event.target as HTMLSelectElement)) {
      val = (event.target as HTMLSelectElement).value;
    } else {
      val = this.propertyForm.get('transferType')?.value || '';
    }

    this.selectedTransferType = val;
    this.propertyForm.get('transferType')?.setValue(val, { emitEvent: false });
    this.propertyForm.get('transferType')?.markAsDirty();

    if (val === 'death') {
      this.propertyForm.get('deathWillOption')?.setValidators([Validators.required]);
    } else {
      this.selectedWillOption = '';
      this.propertyForm.get('deathWillOption')?.clearValidators();
      this.propertyForm.get('deathWillOption')?.setValue('', { emitEvent: false });
    }
    this.propertyForm.get('deathWillOption')?.updateValueAndValidity({ emitEvent: false });

    this.cleanupInactiveDocumentControls();
    this.propertyForm.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  onWillOptionChange(option: string): void {
    this.selectedWillOption = option;
    this.propertyForm.get('deathWillOption')?.setValue(option, { emitEvent: false });
    this.propertyForm.get('deathWillOption')?.markAsDirty();
    this.propertyForm.get('deathWillOption')?.updateValueAndValidity({ emitEvent: false });

    this.cleanupInactiveDocumentControls();
    this.propertyForm.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  private cleanupInactiveDocumentControls(): void {
    const activeKeys = new Set(this.documents.map((d) => d.key));

    this.commonDocuments.forEach((doc) => {
      if (!activeKeys.has(doc.key)) {
        this.propertyForm.get(`${doc.key}Selected`)?.setValue(false, { emitEvent: false });
        this.propertyForm.get(`${doc.key}Selected`)?.setErrors(null);

        this.propertyForm.get(`${doc.key}File`)?.setValue(null, { emitEvent: false });
        this.propertyForm.get(`${doc.key}File`)?.setErrors(null);

        delete this.uploadedDocData[doc.key];

        const fileInput = document.getElementById(`${doc.key}File`) as HTMLInputElement | null;
        if (fileInput) {
          fileInput.value = '';
        }
      }
    });
  }

  isTransferTypeInvalid(): boolean {
    const ctrl = this.propertyForm.get('transferType');
    return !!ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched);
  }

  hasWillOptionError(): boolean {
    const ctrl = this.propertyForm.get('deathWillOption');
    return (
      this.selectedTransferType === 'death' &&
      !this.selectedWillOption &&
      (!!ctrl?.touched || !!ctrl?.dirty || !!this.propertyForm.touched)
    );
  }

  fileName(controlName: string): string {
    const file = this.propertyForm.get(controlName)?.value as File | null;
    return file?.name ?? 'No file chosen';
  }

  onFileChange(event: Event, controlName: string, docKey?: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const control = this.propertyForm.get(controlName);

    control?.setValue(file);
    control?.markAsDirty();
    control?.updateValueAndValidity();

    if (!docKey && controlName.endsWith('File')) {
      docKey = controlName.replace(/File$/, '');
    }

    if (file && docKey) {
      const selectedControl = this.propertyForm.get(`${docKey}Selected`);
      if (selectedControl && !selectedControl.value) {
        selectedControl.setValue(true);
      }

      const documentNumber = docKey === 'aadhaarProof'
        ? this.normalizeAadhaarValue(this.propertyForm.get('aadhaarNumber')?.value)
        : docKey === 'panProof'
          ? String(this.propertyForm.get('panNo')?.value || '').trim().toUpperCase()
          : '';

      if (docKey === 'aadhaarProof' && !/^\d{12}$/.test(documentNumber)) {
        control?.setValue(null);
        input.value = '';
        this.toastr.warning('Enter a valid 12 digit Aadhaar number before uploading the card.', 'Aadhaar Number Required');
        return;
      }

      if (docKey === 'panProof' && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(documentNumber)) {
        control?.setValue(null);
        input.value = '';
        this.toastr.warning('Enter a valid PAN number before uploading the card.', 'PAN Number Required');
        return;
      }
    } else if (!file && docKey) {
      delete this.uploadedDocData[docKey];
    }
  }


  resetForm(): void {
    this.isOwnerInfoReadOnly = false;
    this.selectedTransferType = '';
    this.selectedWillOption = '';
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
    this.uploadedDocData = {};

    this.commonDocuments.forEach((doc) => {
      const fileInput = document.getElementById(`${doc.key}File`) as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
    });

    this.propertyForm.get('deathWillOption')?.clearValidators();
    this.propertyForm.get('deathWillOption')?.updateValueAndValidity({ emitEvent: false });
    this.propertyForm.updateValueAndValidity();
    this.cdr.detectChanges();
  }

  private conditionalDocumentValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const transferType = group.get('transferType')?.value || this.selectedTransferType;
      if (!transferType) {
        return null;
      }

      if (transferType === 'death') {
        const willOpt = group.get('deathWillOption')?.value || this.selectedWillOption;
        if (!willOpt) {
          return { willOptionRequired: true };
        }
      }

      const activeTypeDocs = this.documents.filter((document) => document.requiredForTransferType);
      if (!activeTypeDocs || activeTypeDocs.length === 0) {
        return null;
      }

      const hasUploadedTypeDoc = activeTypeDocs.some((document) => {
        return (
          !!group.get(`${document.key}Selected`)?.value &&
          (!!group.get(`${document.key}File`)?.value || !!this.uploadedDocData[document.key])
        );
      });

      return hasUploadedTypeDoc ? null : { documentRequired: true };
    };
  }
}