import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

export interface CurrentAllottee {
  allotteeCode: string;
  name: string;
  fatherHusbandName: string;
  auctionDate: string | Date;
  allotmentDate: string | Date;
  allotmentAmount: number;
  mandiName: string;
  plotType: string;
  plotNumber: string;
  plotSize: string;
  address: string;
  ownershipShare: string | number;
  ownershipType: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface DocumentType {
  id: string;
  label: string;
}

interface FileRule {
  mimeTypes: string[];
  extensions: string[];
  maxMb: number;
  accept: string;
  hint: string;
  allowedLabel: string;
}

export interface TransferSubmission {
  newAllottee: {
    name: string;
    fatherHusbandName: string;
    mandiName: string;
    plotType: string;
    plotNumber: string;
    plotSize: string;
    address: string;
    ownershipShare: number;
    ownershipType: string;
    aadhaarNumber: string;
    phoneNumber?: string;
    email?: string;
  };
  photo: File;
  documents: { typeId: string; file: File }[];
}

type DocumentGroup = FormGroup<{
  typeId: FormControl<string>;
  file: FormControl<File | null>;
}>;

const DEFAULT_DOCUMENT_TYPES: DocumentType[] = [
  { id: 'ndc', label: 'NDC Certificate' },
  { id: 'allotment-letter', label: 'Allotment Letter' },
  { id: 'possession-letter', label: 'Possession Letter' },
  { id: 'sale-deed', label: 'Registered Sale Deed / Transfer Deed' },
  { id: 'tax-receipt', label: 'Property Tax / Payment Receipt' },
  { id: 'other', label: 'Other Supporting Documents' },
];

const DEFAULT_OWNERSHIP_TYPES: SelectOption[] = [
  { value: 'sole', label: 'Sole' },
  { value: 'joint', label: 'Joint' },
];

const DEFAULT_PLOT_TYPES: SelectOption[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
];

const TEMP_CURRENT_ALLOTTEE: CurrentAllottee = {
  allotteeCode: 'ALT-000000',
  name: 'Sample Allottee',
  fatherHusbandName: 'Sample Father Name',
  auctionDate: '2015-03-12',
  allotmentDate: '2015-04-20',
  allotmentAmount: 1250000,
  mandiName: 'Sample Mandi',
  plotType: 'Residential',
  plotNumber: '24-B',
  plotSize: '200 sq. yd.',
  address: 'Sample address, District, State - 000000',
  ownershipShare: 100,
  ownershipType: 'Sole',
};

const PHOTO_RULE: FileRule = {
  mimeTypes: ['image/jpeg', 'image/png'],
  extensions: ['jpg', 'jpeg', 'png'],
  maxMb: 2,
  accept: '.jpg,.jpeg,.png',
  hint: 'JPG or PNG, up to 2 MB',
  allowedLabel: 'JPG, JPEG or PNG',
};

const DOCUMENT_RULE: FileRule = {
  mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  extensions: ['pdf', 'jpg', 'jpeg', 'png'],
  maxMb: 5,
  accept: '.pdf,.jpg,.jpeg,.png',
  hint: 'PDF, JPG or PNG, up to 5 MB',
  allowedLabel: 'PDF, JPG, JPEG or PNG',
};

const PHOTO_KEY = 'photo';
const SUBMIT_DELAY_MS = 800;

const PERSON_NAME = /^[\p{L}][\p{L} .'-]*$/u;
const PLOT_NUMBER = /^[A-Za-z0-9][A-Za-z0-9 \-\/]*$/;
const AADHAAR_PATTERN = /^\d{12}$/;

function notBlank(control: AbstractControl): ValidationErrors | null {
  const v = control.value;
  return typeof v === 'string' && v.length > 0 && v.trim() === '' ? { blank: true } : null;
}

@Component({
  selector: 'app-transfer-property',
  imports: [ReactiveFormsModule],
  standalone: true,
  templateUrl: './transfer-property.html',
  styleUrl: './transfer-property.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferProperty {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentAllottee = input<CurrentAllottee | null>(TEMP_CURRENT_ALLOTTEE);
  readonly documentTypes = input<DocumentType[]>(DEFAULT_DOCUMENT_TYPES);
  readonly ownershipTypes = input<SelectOption[]>(DEFAULT_OWNERSHIP_TYPES);
  readonly plotTypes = input<SelectOption[]>(DEFAULT_PLOT_TYPES);

  readonly submitted = output<TransferSubmission>();
  readonly cancelled = output<void>();

  readonly photoRule = PHOTO_RULE;
  readonly documentRule = DOCUMENT_RULE;
  readonly photoKey = PHOTO_KEY;

  readonly showTransferForm = signal(false);
  readonly submitting = signal(false);
  readonly submitSuccess = signal(false);
  readonly selectedIds = signal<string[]>([]);
  readonly fileErrors = signal<Record<string, string>>({});
  readonly previews = signal<Record<string, string>>({});

  private readonly objectUrls = new Map<string, string>();
  private submitTimer: ReturnType<typeof setTimeout> | null = null;

  readonly textFields = [
    { key: 'name', label: 'Name of Allottee', placeholder: 'Full name', maxLength: 100 },
    { key: 'fatherHusbandName', label: "Allottee's Father/Husband Name", placeholder: 'Father or husband name', maxLength: 100 },
    { key: 'mandiName', label: 'Mandi Name', placeholder: 'Mandi name', maxLength: 100 },
    { key: 'plotNumber', label: 'Plot Number', placeholder: 'e.g. 24-B', maxLength: 30 },
    { key: 'plotSize', label: 'Size of Plot', placeholder: 'e.g. 200 sq. yd.', maxLength: 50 },
  ] as const;

  readonly form = this.fb.group({
    newAllottee: this.fb.group({
      name: ['', [Validators.required, notBlank, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(PERSON_NAME)]],
      fatherHusbandName: ['', [Validators.required, notBlank, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(PERSON_NAME)]],
      mandiName: ['', [Validators.required, notBlank, Validators.maxLength(100)]],
      plotType: ['', Validators.required],
      plotNumber: ['', [Validators.required, notBlank, Validators.maxLength(30), Validators.pattern(PLOT_NUMBER)]],
      plotSize: ['', [Validators.required, notBlank, Validators.maxLength(50)]],
      address: ['', [Validators.required, notBlank, Validators.minLength(10), Validators.maxLength(300)]],
      ownershipShare: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(100)]],
      ownershipType: ['', Validators.required],
      aadhaarNumber: ['', [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(12),
        Validators.pattern(AADHAAR_PATTERN),
      ]],
      phoneNumber: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(/^\d{10}$/),
      ]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      photo: new FormControl<File | null>(null, Validators.required),
    }),
    documents: this.fb.array<DocumentGroup>([]),
    declaration: [false, Validators.requiredTrue],
  });

  readonly newAllottee = this.form.controls.newAllottee;
  readonly documents = this.form.controls.documents;

  readonly availableDocuments = computed(() => {
    const picked = new Set(this.selectedIds());
    return this.documentTypes().filter((d) => !picked.has(d.id));
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.revokeAll();
      if (this.submitTimer) clearTimeout(this.submitTimer);
    });
  }


  openTransferForm(): void {
    this.submitSuccess.set(false);
    this.showTransferForm.set(true);
  }

  closeTransferForm(): void {
    this.resetForm();
    this.showTransferForm.set(false);
    this.cancelled.emit();
  }

  handleNewAllotteeInfo(): TransferSubmission['newAllottee'] {
    const v = this.newAllottee.getRawValue();
    return {
      name: v.name.trim(),
      fatherHusbandName: v.fatherHusbandName.trim(),
      mandiName: v.mandiName.trim(),
      plotType: v.plotType,
      plotNumber: v.plotNumber.trim(),
      plotSize: v.plotSize.trim(),
      address: v.address.trim(),
      ownershipShare: Number(v.ownershipShare),
      ownershipType: v.ownershipType,
      phoneNumber: v.phoneNumber,
      email: v.email,
      aadhaarNumber: v.aadhaarNumber,
    };
  }

  digitsOnly(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '');
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.newAllottee.controls.aadhaarNumber.setValue(cleaned);
    }
  }

  addDocument(typeId: string): void {
    if (!typeId || this.selectedIds().includes(typeId)) return;
    this.documents.push(
      this.fb.group({
        typeId: [typeId],
        file: new FormControl<File | null>(null, Validators.required),
      }),
    );
    this.selectedIds.update((ids) => [...ids, typeId]);
  }

  removeDocument(index: number): void {
    const typeId = this.documents.at(index).controls.typeId.value;
    this.clearFile(typeId);
    this.documents.removeAt(index);
    this.selectedIds.update((ids) => ids.filter((id) => id !== typeId));
  }

  documentLabel(typeId: string): string {
    return this.documentTypes().find((d) => d.id === typeId)?.label ?? typeId;
  }

  handleFileSelect(event: Event, key: string, control: AbstractControl<File | null>, rule: FileRule): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    // User opened the picker and cancelled: keep any previously valid file.
    if (!file) return;

    control.markAsTouched();
    const error = this.validateFile(file, rule);
    if (error) {
      input.value = '';
      this.clearFile(key, control);
      this.setFileError(key, error);
      return;
    }

    this.setFileError(key, null);
    this.revoke(key);
    const url = URL.createObjectURL(file);
    this.objectUrls.set(key, url);
    this.previews.update((p) => ({ ...p, [key]: url }));
    control.setValue(file);
  }

  removeFile(key: string, control: AbstractControl<File | null>, input?: HTMLInputElement): void {
    if (input) input.value = '';
    this.clearFile(key, control);
    control.markAsTouched();
  }

  validateFile(file: File, rule: FileRule): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!rule.mimeTypes.includes(file.type) || !rule.extensions.includes(ext)) {
      return `Invalid file type. Allowed types: ${rule.allowedLabel}.`;
    }
    if (file.size === 0) {
      return 'This file is empty. Please choose a valid file.';
    }
    if (file.size > rule.maxMb * 1024 * 1024) {
      return `File is too large. Maximum size is ${rule.maxMb} MB.`;
    }
    return null;
  }

  validateSelectedDocuments(): boolean {
    return this.documents.controls.every((g) => !!g.controls.file.value);
  }

  errorMessage(ctrl: AbstractControl | null, label: string): string | null {
    if (!ctrl || !ctrl.invalid || !(ctrl.touched || ctrl.dirty)) return null;
    const e = ctrl.errors ?? {};
    if (e['required'] || e['requiredTrue']) return `${label} is required.`;
    if (e['blank']) return `${label} cannot be blank.`;
    if (e['minlength']) return `${label} must be at least ${e['minlength'].requiredLength} characters.`;
    if (e['maxlength']) return `${label} must be at most ${e['maxlength'].requiredLength} characters.`;
    if (e['min'] || e['max']) return `${label} must be between 0.01 and 100.`;
    if (e['pattern']) return `${label} contains invalid characters.`;
    return `${label} is invalid.`;
  }

  isInvalid(ctrl: AbstractControl | null): boolean {
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  resetForm(): void {
    this.revokeAll();
    this.documents.clear();
    this.selectedIds.set([]);
    this.fileErrors.set({});
    this.previews.set({});
    this.form.reset({
      newAllottee: {
        name: '', fatherHusbandName: '', mandiName: '', plotType: '', plotNumber: '',
        plotSize: '', address: '', ownershipShare: null, ownershipType: '',
        aadhaarNumber: '', photo: null,
      },
      declaration: false,
    });
  }

  handleSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.validateSelectedDocuments() || this.submitting()) return;

    const payload: TransferSubmission = {
      newAllottee: this.handleNewAllotteeInfo(),
      photo: this.newAllottee.controls.photo.value as File,
      documents: this.documents.controls.map((g) => ({
        typeId: g.controls.typeId.value,
        file: g.controls.file.value as File,
      })),
    };

    this.submitting.set(true);
    this.submitTimer = setTimeout(() => {
      this.submitting.set(false);
      this.submitSuccess.set(true);
      this.submitted.emit(payload);
      this.resetForm();
      this.showTransferForm.set(false);
    }, SUBMIT_DELAY_MS);
  }

  private clearFile(key: string, control?: AbstractControl<File | null>): void {
    this.revoke(key);
    this.setFileError(key, null);
    this.previews.update((p) => {
      const { [key]: _removed, ...rest } = p;
      return rest;
    });
    control?.setValue(null);
  }

  private setFileError(key: string, message: string | null): void {
    this.fileErrors.update((errors) => {
      const { [key]: _removed, ...rest } = errors;
      return message ? { ...rest, [key]: message } : rest;
    });
  }

  private revoke(key: string): void {
    const url = this.objectUrls.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      this.objectUrls.delete(key);
    }
  }

  private revokeAll(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();
  }

  formatDate(value: any): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  formatAmount(value: number): string {
    return Number.isFinite(value) ? '₹' + value.toLocaleString('en-IN') : String(value ?? '');
  }
}