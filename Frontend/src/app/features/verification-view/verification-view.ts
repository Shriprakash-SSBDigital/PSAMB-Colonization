import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Userservice } from '../../core/service/UserService/userservice';

export interface UploadedDocument {
  key: string;
  label: string;
  hint?: string;
  fileName: string | null;
  fileUrl: string | null;
  uploaded: boolean;
}

export interface DataField {
  label: string;
  value: string;
  maskedValue?: string;
  isMasked?: boolean;
  isSecret?: boolean;
  copyable?: boolean;
  isEmail?: boolean;
  isPhone?: boolean;
  fullWidth?: boolean;
}

type VerificationStatus = 'pending' | 'verified' | 'objection';
type DecisionType = 'approve' | 'sendback' | null;

@Component({
  selector: 'app-verification-view',
  standalone: false,
  templateUrl: './verification-view.html',
  styleUrl: './verification-view.scss',
  providers: [ConfirmationService, MessageService],
})
export class VerificationView implements OnInit {
  // ---- Header info ----
  propertyCode = '—';
  submittedOn = '—';
  verificationStatus: VerificationStatus = 'pending';

  // ---- Property Details ----
  propertyDetails: DataField[] = [
    { label: 'District', value: '—' },
    { label: 'Market Committee', value: '—' },
    { label: 'Mandi', value: '—' },
    { label: 'Plot Type', value: '—' },
    { label: 'Plot Number', value: '—', copyable: false },
    { label: 'Plot Size', value: '—' },
  ];

  // ---- Owner Information ----
  ownerDetails: DataField[] = [
    { label: 'Current Owner Name', value: '—' },
    { label: "Father's / Husband Name", value: '—' },
    { label: 'Mobile Number', value: '—', copyable: false, isPhone: false },
    { label: 'Email', value: '—', copyable: false, isEmail: false },
    { label: 'State', value: '—' },
    { label: 'District', value: '—' },
    { label: 'City', value: '—' },
    { label: 'Address', value: '—', fullWidth: true },
    {
      label: 'Aadhaar Number',
      value: '—',
      maskedValue: '—',
      isMasked: true,
      isSecret: false,
      copyable: false,
    },
    {
      label: 'PAN No.',
      value: '—',
      maskedValue: '—',
      isMasked: true,
      isSecret: false,
      copyable: false,
    },
  ];

  // ---- Uploaded Documents list ----
  documents: UploadedDocument[] = [
    { key: 'allotmentLetter', label: 'Allotment Letter', fileName: null, fileUrl: null, uploaded: false },
    { key: 'lastPaymentReceipt', label: 'Last Payment Receipt', hint: 'Any one from last three receipts', fileName: null, fileUrl: null, uploaded: false },
    { key: 'noDueCertificate', label: 'No Due Certificate', fileName: null, fileUrl: null, uploaded: false },
    { key: 'bForm', label: 'B.Form', fileName: null, fileUrl: null, uploaded: false },
    { key: 'conveyanceDeed', label: 'Conveyance Deed', fileName: null, fileUrl: null, uploaded: false },
    { key: 'saleDeed', label: 'Sale Deed', fileName: null, fileUrl: null, uploaded: false },
    { key: 'transferOrder', label: 'Transfer Order', fileName: null, fileUrl: null, uploaded: false },
    { key: 'legalHeirCertificate', label: 'Legal Heir Certificate', fileName: null, fileUrl: null, uploaded: false },
    { key: 'aadhaarProof', label: 'Aadhaar Card Proof', fileName: null, fileUrl: null, uploaded: false },
    { key: 'passportProof', label: 'Passport Proof', fileName: null, fileUrl: null, uploaded: false },
  ];

  decisionForm!: FormGroup;
  submitting = false;
  activeDecision: DecisionType = null;
  showValidationHint = false;
  remarksReadOnly = '';
  displayStatusText = '';
  previewDoc: UploadedDocument | null = null;
  previewDocSafeUrl: SafeResourceUrl | null = null;
  copiedField: string | null = null;
  applicantID: any = null;

  isUserView = false;
  propertyDataLoaded = false;

  // Populated from router state / queryParams
  private propertyId: number | null = null;
  private userRole = '';
  apiError = '';
  apiSuccess = '';

  constructor(
    private fb: FormBuilder,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private userService: Userservice,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.decisionForm = this.fb.group({
      decision: [null, Validators.required],
      remarks: [''],
    });

    // Role pehle set karo — bindData ke andar status mapping role use karti hai
    this.userRole = this.getUserRole();

    this.route.queryParams.subscribe(params => {
      if (!this.propertyId && params['id']) {
        this.propertyId = Number(params['id']);
      }
      if (params['createdBy']) {
        this.applicantID = Number(params['createdBy']);
      }
    });

    // Read data passed via router state (from viewDetails click)
    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { registrationData?: any } | undefined;
    const data = state?.registrationData ?? history.state?.registrationData;

    if (data) {
      this.propertyId = data.id ?? data.propertyId ?? null;
      this.bindData(data);
    }

    // Also read id and mode from queryParams
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'view') {
        this.isUserView = true;
      }
      if (!this.propertyId && params['id']) {
        this.propertyId = Number(params['id']);
      }
      const code = params['propertyCode'];
      // Fallback: If registration data was not available in navigation state, fetch it
      if (!this.propertyDataLoaded && (code || this.propertyId)) {
        this.loadDetails(code, this.propertyId || undefined);
      }
    });
  }

  loadDetails(code?: string, id?: number): void {
    if (this.isUserView) {
      this.userService.GetAllUserRegisterPropertyById().subscribe({
        next: (res: any) => {
          if (res?.success && Array.isArray(res.data)) {
            const found = res.data.find((item: any) =>
              (code && (item.allotteeCode === code || item.propertyCode === code)) ||
              (id && (item.id === id || item.propertyId === id))
            );
            if (found) {
              this.propertyId = found.id || found.propertyId;
              this.bindData(found);
            }
          }
        },
        error: (err: any) => {
          console.error('Error loading property details for user:', err);
        }
      });
    } else {
      if (code) {
        this.userService.GetPropertyOwnerVerification(code).subscribe({
          next: (res: any) => {
            if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
              this.propertyId = res.data[0].id;
              this.bindData(res.data[0]);
            }
          },
          error: (err: any) => {
            console.error('Error loading property details for verification:', err);
          }
        });
      }
    }
  }

  private bindData(d: any): void {
    this.propertyDataLoaded = true;

    // Header
    this.propertyCode = d.propertyCode || d.allotteeCode || '—';
    this.submittedOn = d.createdDate
      ? new Date(d.createdDate).toLocaleDateString('en-IN')
      : '—';

    // Status mapping — role-aware (mirrors list page mapStatus logic)
    const statusVal = d.status != null ? d.status : d.applicationStatusId;
    const statusId = statusVal != null ? Number(statusVal) : null;
    const role = this.userRole.trim().toLowerCase().replace('_', ' ');

    this.remarksReadOnly = d.remarks || d.objectionRemarks || '';
    const lvl = (d.levelId || '').trim().toLowerCase().replace('_', ' ');

    if (this.isUserView && d.applicationStatusName) {
      this.displayStatusText = d.applicationStatusName;
      const s = d.applicationStatusName.toLowerCase();
      if (s.includes('objection')) {
        this.verificationStatus = 'objection';
      } else if (s.includes('verified') || s.includes('approved')) {
        this.verificationStatus = 'verified';
      } else {
        this.verificationStatus = 'pending';
      }
    } else if (statusId === 7) {
      this.verificationStatus = 'objection';
      if (role.includes('clerk') && lvl.includes('senior assistant')) {
        this.displayStatusText = 'Objected by Senior Assistant';
      } else {
        this.displayStatusText = 'Objection';
      }
    } else if (role.includes('senior assistant')) {
      // SA: status=2 means clerk approved, SA must still act → pending
      // status=3/4 means SA already approved → verified
      this.verificationStatus = (statusId === 3 || statusId === 4) ? 'verified' : 'pending';
      this.displayStatusText = (statusId === 3 || statusId === 4) ? 'Verified' : 'Pending';
    } else if (role.includes('clerk')) {
      // Clerk: status=2 means clerk already approved → verified
      this.verificationStatus = (statusId === 2 || statusId === 3 || statusId === 4) ? 'verified' : 'pending';
      this.displayStatusText = (statusId === 2 || statusId === 3 || statusId === 4) ? 'Verified' : 'Pending';
    } else {
      this.verificationStatus = (statusId === 2 || statusId === 3 || statusId === 4) ? 'verified' : 'pending';
      this.displayStatusText = d.applicationStatusName || ((statusId === 2 || statusId === 3 || statusId === 4) ? 'Verified' : 'Pending');
    }

    // Property Details
    this.propertyDetails = [
      { label: 'District', value: d.districtName || '—' },
      { label: 'Market Committee', value: d.branchName || '—' },
      { label: 'Mandi', value: d.mandiName || '—' },
      { label: 'Plot Type', value: d.plotType || '—' },
      { label: 'Plot Number', value: d.plotNo?.toString() || '—', copyable: false },
      { label: 'Plot Size', value: d.plotSize?.toString() || '—' },
    ];

    // Owner Information
    // Aadhaar: API already returns it masked (e.g. "XXXXXXXX 6545"), display as-is
    const rawAadhaar = d.aadhaarNumber || d.aadhaarNo || d.aadharNumber || '';
    const aadhaarDisplay = rawAadhaar.trim() !== '' ? rawAadhaar.trim() : '—';

    // PAN: treat empty string as missing
    const rawPan = d.panNumber || d.panNo || '';
    const panDisplay = rawPan.trim() !== '' ? rawPan.trim() : '—';

    this.ownerDetails = [
      { label: 'Current Owner Name', value: d.currentOwnerName || d.allotteeName || '—' },
      { label: "Father's / Husband Name", value: d.fatherHusbandName || d.allotteeFatherName || d.fatherName || '—' },
      { label: 'Mobile Number', value: d.mobileNumber || d.allotteeMobileNo || d.mobileNo || d.mobile || '—', copyable: false, isPhone: false },
      { label: 'Email', value: d.email || d.allotteeEmail || d.emailId || '—', copyable: false, isEmail: false },
      { label: 'State', value: d.ownerStateName || d.ownerState || d.stateName || '—' },
      { label: 'District', value: d.ownerDistrtictName || d.ownerDistrict || d.districtName || '—' },
      { label: 'City', value: d.ownerCityName || d.ownerCity || d.cityName || '—' },
      { label: 'Address', value: d.address || d.allotteeAddress || d.permanentAddress || '—', fullWidth: true },
      {
        label: 'Aadhaar Number',
        value: aadhaarDisplay,
        maskedValue: aadhaarDisplay,  // already masked by server
        isMasked: false,
        isSecret: false,
        copyable: false,
      },
      {
        label: 'PAN No.',
        value: panDisplay,
        maskedValue: panDisplay,
        isMasked: false,
        isSecret: false,
        copyable: false,
      },
    ];

    const isDocUploaded = (val: any) =>
      val === 1 || val === '1' || val === true || val === 'true' ||
      (typeof val === 'string' && val.trim().length > 0 && val !== '0' && val !== 'false');

    this.documents.forEach(doc => {
      let isUploaded = false;
      let filePath: string | null = null;
      switch (doc.key) {
        case 'allotmentLetter':
          isUploaded = isDocUploaded(d.uploadAllotmentLetter ?? d.UploadAllotmentLetter);
          filePath = d.uploadAllotmentLetter ?? d.UploadAllotmentLetter;
          break;
        case 'lastPaymentReceipt':
          isUploaded = isDocUploaded(d.receiptDocument ?? d.ReceiptDocument);
          filePath = d.receiptDocument ?? d.ReceiptDocument;
          break;
        case 'noDueCertificate':
          isUploaded = isDocUploaded(d.uploadNoDuesCertificate ?? d.UploadNoDuesCertificate);
          filePath = d.uploadNoDuesCertificate ?? d.UploadNoDuesCertificate;
          break;
        case 'bForm':
          isUploaded = isDocUploaded(d.bForm ?? d.BForm);
          filePath = d.bForm ?? d.BForm;
          break;
        case 'conveyanceDeed':
          isUploaded = isDocUploaded(d.conveyanceDeed ?? d.ConveyanceDeed);
          filePath = d.conveyanceDeed ?? d.ConveyanceDeed;
          break;
        case 'saleDeed':
          isUploaded = isDocUploaded(d.saleDeed ?? d.SaleDeed);
          filePath = d.saleDeed ?? d.SaleDeed;
          break;
        case 'transferOrder':
          isUploaded = isDocUploaded(d.transferOrder ?? d.TransferOrder);
          filePath = d.transferOrder ?? d.TransferOrder;
          break;
        case 'legalHeirCertificate':
          isUploaded = isDocUploaded(d.upload1 ?? d.Upload1);
          filePath = d.upload1 ?? d.Upload1;
          break;
        case 'aadhaarProof':
          isUploaded = isDocUploaded(d.aadhaarProof ?? d.idProofDoc ?? d.IdProofDoc);
          filePath = d.aadhaarProof ?? d.idProofDoc ?? d.IdProofDoc;
          break;
        case 'passportProof':
          isUploaded = isDocUploaded(d.passportProof ?? d.passportDocument ?? d.PassportDocument);
          filePath = d.passportProof ?? d.passportDocument ?? d.PassportDocument;
          break;
      }
      doc.uploaded = isUploaded;
      if (filePath && typeof filePath === 'string' && filePath.length > 5 && (filePath.includes('/') || filePath.includes('\\') || filePath.includes('.'))) {
        doc.fileUrl = this.formatFileUrl(filePath);
        doc.fileName = filePath.split('/').pop()?.split('\\').pop() || `${doc.label}.pdf`;
      }
    });

    // If user's createdBy / applicantId is available, fetch all uploaded documents for preview/download
    const applicantId = d.createdBy || d.applicantId;
    if (applicantId && Number(applicantId) > 0) {
      this.userService.GetUserDocumentsByUserIDAsync(Number(applicantId)).subscribe({
        next: (res: any) => {
          if (res?.success && Array.isArray(res.data)) {
            const docMap: Record<number, string> = {
              1: 'allotmentLetter',
              2: 'lastPaymentReceipt',
              3: 'noDueCertificate',
              4: 'bForm',
              5: 'conveyanceDeed',
              6: 'saleDeed',
              7: 'transferOrder',
              8: 'legalHeirCertificate',
            };

            res.data.forEach((item: any) => {
              const key = docMap[item.documentTypeId];
              if (key) {
                const doc = this.documents.find(x => x.key === key);
                if (doc) {
                  doc.uploaded = true;
                  doc.fileName = item.originalFileName || `${doc.label}.pdf`;
                  doc.fileUrl = this.formatFileUrl(item.fileUrl || item.relativePath);
                }
              }
            });
          }
        },
        error: (err: any) => {
          console.error('Error fetching user documents:', err);
        }
      });
    }
  }

  get remarksControl() {
    return this.decisionForm.get('remarks')!;
  }

  get decisionControl() {
    return this.decisionForm.get('decision')!;
  }

  get showActionButtons(): boolean {
    if (this.isUserView) return false;
    const r = (this.userRole || '').trim().toLowerCase();
    const isStaff = r.includes('clerk') || r.includes('senior assistant') || r.includes('admin') || r.includes('officer');
    return isStaff && this.verificationStatus === 'pending';
  }

  get showRemarksReadOnly(): boolean {
    return this.verificationStatus === 'objection';
  }

  get isAlreadyVerified(): boolean {
    return this.verificationStatus === 'verified';
  }

  get verificationStatusClass(): string {
    switch (this.verificationStatus) {
      case 'verified':
        return 'bg-white text-success fw-semibold shadow-sm';
      case 'objection':
        return 'bg-white text-danger fw-semibold shadow-sm';
      default:
        return 'bg-white text-warning-emphasis fw-semibold shadow-sm';
    }
  }

  goBack(): void {
    if (this.isUserView) {
      this.router.navigate(['/user-registration-status']);
    } else {
      this.router.navigate(['/property-ownership-verification']);
    }
  }

  private formatFileUrl(filePath: string): string {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }
    const apiBase = this.userService.baseUrl.replace(/\/api\/?$/, '');
    const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    return `${apiBase}/${cleanPath}`;
  }

  toggleFieldMask(field: DataField): void {
    field.isMasked = !field.isMasked;
  }

  copyValue(value: string, label: string): void {
    if (value && value !== '—' && navigator?.clipboard) {
      navigator.clipboard.writeText(value);
      this.copiedField = label;
      setTimeout(() => {
        if (this.copiedField === label) {
          this.copiedField = null;
        }
      }, 2000);
    }
  }

 viewDocument(doc: UploadedDocument): void {
  if (!doc.uploaded || !this.applicantID) {
    return;
  }

  // Keep the selected document while API request is in progress
  this.previewDoc = { ...doc };
  this.previewDocSafeUrl = null;

  // Get the document URL from API using applicant ID
  this.userService.ViewDocumentsByUserId(this.applicantID).subscribe({
    next: (res: any) => {
      if (res?.success && res?.data) {
        const docData = res.data.find(
          (d: any) => d.key === doc.key
        );

        if (docData?.fileUrl) {

          // Use the fileUrl returned by API
          this.previewDoc = {
            ...doc,
            fileUrl: docData.fileUrl
          };

          // Keep the existing PDF preview functionality
          if (this.isPdf(this.previewDoc)) {
            this.previewDocSafeUrl =
              this.sanitizer.bypassSecurityTrustResourceUrl(
                this.previewDoc.fileUrl
              );
          } else {
            this.previewDocSafeUrl = null;
          }

        } else {
          console.warn(
            `Document with key "${doc.key}" not found in API response.`
          );

          this.previewDoc = null;
          this.previewDocSafeUrl = null;
        }
      }
    },

    error: (err: any) => {
      console.error(
        'Error occurred while fetching user documents:',
        err
      );

      this.previewDoc = null;
      this.previewDocSafeUrl = null;
    }
  });
}

  closePreview(): void {
    this.previewDoc = null;
    this.previewDocSafeUrl = null;
  }

  isPdf(doc: UploadedDocument | null): boolean {
    return !!doc?.fileUrl && doc.fileUrl.toLowerCase().endsWith('.pdf');
  }

  onDecisionChange(decision: 'approve' | 'sendback'): void {
    this.activeDecision = decision;
    this.decisionControl.setValue(decision);

    if (decision === 'sendback') {
      this.remarksControl.setValidators([Validators.required, Validators.minLength(10)]);
    } else {
      this.remarksControl.clearValidators();
    }
    this.remarksControl.updateValueAndValidity();
    this.showValidationHint = false;
  }

  handleApprove(): void {
    this.onDecisionChange('approve');
    this.apiError = '';
    this.apiSuccess = '';

    this.confirmationService.confirm({
      header: 'Confirm Approval',
      message: 'Are you sure you want to approve this property ownership verification? This action cannot be undone.',
      icon: 'fa-solid fa-circle-question text-success fs-4 me-2',
      acceptLabel: 'Yes, Approve',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'btn btn-success px-3',
      rejectButtonStyleClass: 'btn btn-outline-secondary px-3',
      accept: () => {
        this.callVerifyApi('approve', '');
      },
    });
  }

  handleSendBack(): void {
    debugger
    this.onDecisionChange('sendback');
    this.apiError = '';
    this.apiSuccess = '';

    if (this.remarksControl.invalid) {
      this.showValidationHint = true;
      return;
    }

    this.confirmationService.confirm({
      header: 'Confirm Send Back',
      message: 'Are you sure you want to send this back to the user?',
      icon: 'fa-solid fa-circle-question text-warning fs-4 me-2',
      acceptLabel: 'Yes, Send Back',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'btn btn-warning px-3',
      rejectButtonStyleClass: 'btn btn-outline-secondary px-3',
      accept: () => {
        this.callVerifyApi('sendback', this.remarksControl.value);
      },
    });
  }

  private callVerifyApi(decision: 'approve' | 'sendback', remarks: string): void {
    if (!this.propertyId) {
      this.apiError = 'Property ID not found. Please go back and try again.';
      return;
    }

    this.submitting = true;
    const userId = this.getCurrentUserId();

    let normalizedRole = this.userRole;
    const rLower = (this.userRole || '').toLowerCase();
    if (rLower.includes('senior assistant') || rLower.includes('senior_assistant')) {
      normalizedRole = 'Senior Assistant';
    } else if (rLower.includes('clerk')) {
      normalizedRole = 'Clerk';
    }

    const payload = {
      Id: Number(this.propertyId),
      Decision: decision,
      Remarks: remarks || '',
      Role: normalizedRole,
      ModifiedBy: userId > 0 ? userId : null,
    };

    this.userService.VerifyByClerkForUser(payload).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.success) {
          this.apiSuccess = decision === 'approve'
            ? 'Property approved successfully!'
            : 'Sent back to user successfully!';
          setTimeout(() => {
            this.router.navigate(['/property-ownership-verification']);
          }, 1500);
        } else {
          this.apiError = res?.message || 'Action failed. Please try again.';
        }
      },
      error: (err: any) => {
        this.submitting = false;
        this.apiError = err?.error?.message || 'Something went wrong. Please try again.';
        console.error('VerifyByClerkForUser error:', err);
      },
    });
  }

  private getUserRole(): string {
    try {
      const cpMenus = sessionStorage.getItem('cp_menus');
      if (cpMenus) {
        const user = JSON.parse(cpMenus);
        const role = user?.profile?.roles?.[0] || user?.roles?.[0] || user?.role;
        if (role) return String(role);
      }
    } catch (e) {
      console.error('Error reading role from cp_menus:', e);
    }

    try {
      const storedRole = sessionStorage.getItem('role');
      if (storedRole) return storedRole;
    } catch (e) {}

    try {
      const cpSession = sessionStorage.getItem('cp_session');
      if (cpSession) {
        const session = JSON.parse(cpSession);
        const role = session?.role || session?.userRole;
        if (role) return String(role);
      }
    } catch (e) {}

    return '';
  }

  private getCurrentUserId(): number {
    try {
      const sessionStr = sessionStorage.getItem('cp_session') || localStorage.getItem('cp_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        return session?.userId || session?.id || session?.applicantId || 0;
      }
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Number(payload?.UserId || payload?.userId || payload?.id || 0);
      }
    } catch (e) {
      console.error('Error reading userId:', e);
    }
    return 0;
  }
}

