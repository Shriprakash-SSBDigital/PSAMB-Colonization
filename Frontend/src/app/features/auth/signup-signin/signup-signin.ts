import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Navbar } from '../../navbar/navbar';
import { DocumentsAndAddress } from './documents-and-address/documents-and-address';
import { PersonalDetails } from './personal-details/personal-details';
import { BusinessDetails } from './business-details/business-details';
import { Procurement } from './procurement/procurement';
import { AuthService } from '../../../core/service/auth.service';
import { Common } from '../../../core/service/CommonService/common';
import { MenuService } from '../../../core/service/MenuService/menu.service';
import { IdleTimeoutService } from '../../../core/service/idle-timeout.service';
import { FileService } from '../../../core/service/FileService/file-service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

interface EntityType {
  id: string;
  label: string;
  icon: string;
  desc: string;
}
interface ResetPasswordModel {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

@Component({
  selector: 'app-signup-signin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatButtonModule, MatCardModule, PersonalDetails, DocumentsAndAddress, BusinessDetails, Procurement,ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './signup-signin.html',
  styleUrl: './signup-signin.css',
})
export class SignupSignin implements OnInit {
  isLoggedIn = false;

  // Unique session ID generated when the signup form is opened. Passed to every file upload.
  sessionId: string = '';
  loginMethod: 'password' | 'otp' = 'password';

  sectionsExpanded = {
    documents: true,
    business: true
  };

  toggleSection(section: 'documents' | 'business') {
    this.sectionsExpanded[section] = !this.sectionsExpanded[section];
  }

  entityTypes: EntityType[] = [
    { id: 'Individual', label: 'Individual', icon: 'person', desc: 'Any individual citizen of India' },
    { id: 'Sole Proprietorship', label: 'Sole Proprietorship', icon: 'work', desc: 'Single-owner business or trade' },
    { id: 'HUF', label: 'Hindu Undivided Family (HUF)', icon: 'groups', desc: 'Family-owned traditional business' },
    { id: 'Partnership Firm', label: 'Partnership Firm', icon: 'handshake', desc: 'Business managed by partnership deed' },
    { id: 'Public Limited Company', label: 'Public Limited Company', icon: 'business', desc: 'Registered Public Corporation' },
    { id: 'Private Limited Company', label: 'Private Limited Company', icon: 'business', desc: 'Registered Private Corporation' },
    { id: 'Limited Liability Partnership', label: 'Limited Liability Partnership', icon: 'business', desc: 'Hybrid business structure' },
    { id: 'Procurement Agency', label: 'Procurement Agency', icon: 'assignment', desc: 'Government or private procurement agency' }
  ];

  idDocTypes = ['Aadhaar Card', 'Voter Card', 'Passport', 'Other Government issued Photo ID'];
  addressDocTypes = ['Aadhaar Card', 'Passport', 'Electricity Bill', 'Water Bill', 'Rent Agreement', 'Registry Deed'];

  selectedEntityType = '';
  authMode: 'landing' | 'signin' | 'signup' = 'signin';
  otpModalOpen = false;
  proceedToForm = false;


  uploadProgress: { [key: string]: number } = {};
  uploadingStates: { [key: string]: boolean } = {};
  signUpData = {
    // Personal
    gender: '',
    dob: '',
    firstName: '',
    lastName: '',
    relationType: 'father', // Default to 'father' for initial state
    fatherFirstName: '',
    fatherLastName: '',
    motherFirstName: '',
    motherLastName: '',
    spouseFirstName: '',
    spouseLastName: '',
    fatherSectionVisible: false,
    spouseSectionVisible: false,
    isManagingPartner: null,
    emailAddress: '',
    mobileNumber: '',
    emailVerified: false,
    mobileVerified: false,
    password: '',
    confirmPassword: '',

    // Documents
    idDocumentType: '',
    idDocumentTypeId: 0,
    idDocumentNumber: '',
    idDocumentFileName: '',
    idDocumentId: 0,
    shareAadhaarDetails: false,
    panNumber: '',
    panFileName: '',
    panDocumentId: 0,
    photoFileName: '',
    photoDocumentId: 0,

    // Address
    addressState: '',
    addressStateId: 0,
    addressDistrict: '',
    addressDistrictId: 0,
    addressCity: '',
    addressCityId: 0,
    addressPincode: '',
    addressLandmark: '',
    addressDocType: '',
    addressDocTypeId: 0,
    addressDocNumber: '',
    addressDocFileName: '',
    addressDocumentId: 0,

    // Business
    firmName: '',
    gstNumber: '',
    isSameAddress: false,
    businessState: '',
    businessStateId: 0,
    businessDistrict: '',
    businessDistrictId: 0,
    businessCity: '',
    businessCityId: 0,
    businessPincode: '',
    businessLandmark: '',
    officePhotoFileName: '',
    officePhotoDocumentId: 0,
    mandiPropertyCode: ''
  }
  // OTP data (Signup)
  otpData = {
    mobileOtpInput: '',
    emailOtpInput: '',
    sentMobileOtp: '',
    sentEmailOtp: '',
    mobileSent: false,
    emailSent: false,
    mobileVerified: false,
    emailVerified: false,
    mobileTimer: 0,
    emailTimer: 0
  };

  // Generated info
  generatedUserId = '';
  generatedPassword = '';

  // Sign-In data
  loginData = {
    userId: '',
    password: ''
  };

  // Reset Password Model 
  resetPasswordData: ResetPasswordModel = {
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  };
  showResetPassword = false;
  pendingFirstLoginToken: string | null = null;
  @ViewChild('resetPasswordModal') resetPasswordModal!: ElementRef;
  private bootstrapModal: any = null;

  // Captcha & Role OTP states
  captchaText = '';
  captchaInput = '';
  loginOtpModalOpen = false;
  loginOtpInput = '';
  loginOtpTimer = 0;
  pendingLoginUser: any = null;
  // 0 = User, 1 = Officer
  loginRole: boolean | number = false; // Default to User

  loginOtpData = {
    mobileNumber: '',
    otpInput: '',
    sentOtp: '',
    otpSent: false,
    timer: 0
  };

  // Loading state flags — prevent double-submits and give the user visual feedback
  // while the API call is in flight.
  isSigningIn = false;       // true while password-login OR otp-verify API is pending
  isSendingLoginOtp = false; // true while Send OTP API is pending

  // Toast Alerts & Notification states
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  showToast = false;
  errorMessage = '';
  private toastHideTimer: any = null;
  requiredIdDocs = ['Aadhaar Card', 'Voter Card', 'Passport', 'Other Government issued Photo ID'];
  requiredAddressDocs = ['Utility Bill', 'Rental Agreement', 'Bank Statement'];
  showViewModal = false;
  showInstructionsModal = false;
  showPassword = false;

  loggedInUser = {
    userId: '',
    fullName: '',
    entityType: '',
    mobile: ''
  };

  forgotPasswordMode = false;
  forgotPasswordStep: 1 | 2 | 3 = 1;
  forgotPasswordErrorMessage = '';
  forgotPasswordForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(100)]),
    otp: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]),
    confirmNewPassword: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(50)])
  });
  forgotPasswordOtpSent = false;
  forgotPasswordTimerValue = 0;
  private forgotPasswordTimer: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private common: Common,
    private menuService: MenuService,
    private idleTimeoutService: IdleTimeoutService,
    private fileService: FileService,
    private confirmationService: ConfirmationService
  ) { }

  ngOnInit() {
    // Generate a new session ID for the current form session
    this.sessionId = this.generateSessionId();


    const session = sessionStorage.getItem('cp_session');
    if (session) {
      this.loggedInUser = JSON.parse(session);
      this.isLoggedIn = true;
    }

    this.generateCaptcha();

    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      const url = this.router.url;

      if (mode === 'signin') {
        this.router.navigate(['/auth/login']);
        return;
      }
      if (mode === 'signup') {
        this.router.navigate(['/auth/register']);
        return;
      }

      sessionStorage.removeItem('cp_session');
      this.isLoggedIn = false;
      this.loggedInUser = { userId: '', fullName: '', entityType: '', mobile: '' };

      if (url.includes('/register')) {
        this.openSignUp();
      } else {
        this.openSignIn();
        const successAlert = sessionStorage.getItem('registration_success');
        const registeredUserId = sessionStorage.getItem('registered_user_id');
        if (successAlert === 'true') {
          this.loginData.userId = registeredUserId || '';
          sessionStorage.removeItem('registration_success');
          sessionStorage.removeItem('registered_user_id');
          setTimeout(() => this.showRegistrationSuccessDialog(), 0);
        }
      }
    });
  }

  private showRegistrationSuccessDialog(): void {
    this.confirmationService.confirm({
      header: 'Registration Successful',
      message: 'Your credentials have been sent to your email / ਤੁਹਾਡੇ ਕ੍ਰੈਡਿਟਸ਼ੀਅਲ ਤੁਹਾਡੀ ਈਮੇਲ ਤੇ ਭੇਜ ਦਿੱਤੇ ਗਏ ਹਨ।',
      icon: 'fa-solid fa-circle-check text-success fs-4 me-2',
      acceptLabel: 'OK',
      rejectVisible: false,
      acceptButtonStyleClass: 'btn btn-success px-4',
    });

    setTimeout(() => {
      this.confirmationService.close();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.toastHideTimer) {
      clearTimeout(this.toastHideTimer);
      this.toastHideTimer = null;
    }
  }
  private hideToast(): void {
    this.showToast = false;
    this.toastMessage = '';
    this.cdr.detectChanges();
  }

  // Toast Helper
  triggerToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (this.toastHideTimer) {
      clearTimeout(this.toastHideTimer);
    }

    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    this.cdr.detectChanges();

    this.toastHideTimer = setTimeout(() => {
      this.hideToast();
      this.toastHideTimer = null;
    }, 5000);
  }

  getPunjabiLabel(typeId: string): string {
    switch (typeId) {
      case 'Individual': return 'ਵਿਅਕਤੀਗਤ';
      case 'Sole Proprietorship': return 'ਇਕੱਲੇ ਮਾਲਕ';
      case 'HUF': return 'ਹਿੰਦੂ ਅਣਵੰਡਿਆ ਪਰਿਵਾਰ';
      case 'Partnership Firm': return 'ਭਾਈਵਾਲੀ ਫਰਮ';
      case 'Company': return 'ਕੰਪਨੀ';
      case 'Procurement Agency': return 'ਖਰੀਦ ਏਜੰਸੀ';
      case 'Public Limited Company': return 'ਪਬਲਿਕ ਲਿਮਟਿਡ ਕੰਪਨੀ';
      case 'Private Limited Company': return 'ਪ੍ਰਾਈਵੇਟ ਲਿਮਟਿਡ ਕੰਪਨੀ';
      case 'Limited Liability Partnership': return 'ਸੀਮਿਤ ਜ਼ਿੰਮੇਵਾਰੀ ਭਾਈਵਾਲੀ';
      default: return 'Individual';
    }
  }

  shouldShowBusinessDetails(): boolean {
    return this.selectedEntityType !== 'Individual' && this.selectedEntityType !== 'Procurement Agency';
  }

  shouldShowProcurementSection(): boolean {
    return this.selectedEntityType === 'Procurement Agency';
  }

  onEntityTypeChange() {
    this.resetSignUpForm();
    this.triggerToast(`Category changed to: ${this.selectedEntityType}`, 'info');
  }

  openSignUp() {
    if (!this.router.url.includes('/register')) {
      this.router.navigate(['/auth/register']);
      return;
    }
    this.authMode = 'signup';
    this.selectedEntityType = ''; // Default to empty so the form is hidden initially
    this.resetSignUpForm();
    this.errorMessage = '';
    this.proceedToForm = false;
  }

  onProceedToForm() {
    if (!this.selectedEntityType) {
      this.triggerToast('Please select Category / ਸ਼੍ਰੇਣੀ ਚੁਣੋ', 'error');
      return;
    }
    this.proceedToForm = true;
    window.scrollTo(0, 0);
  }

  onBackToInstructions() {
    // Reset the form so stale values (address, business, documents)
    this.resetSignUpForm();
    this.proceedToForm = false;
    window.scrollTo(0, 0);
  }

  openSignIn() {
    if (!this.router.url.includes('/login')) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.authMode = 'signin';
    this.loginMethod = 'password'; // Ensure we start with username/password login
    this.resetSignInForm();
    this.generateCaptcha();
    this.errorMessage = '';
  }

  toggleLoginMethod(method: 'password' | 'otp') {
    this.loginMethod = method;
    this.errorMessage = '';
    this.resetSignInForm();
    if (method === 'password') {
      this.generateCaptcha();
    }
  }
  
  setLoginRole(flag: boolean) {
    this.loginRole = flag;
  }
  goBackFromLogin() {
    if (this.loginMethod === 'otp') {
      this.toggleLoginMethod('password');
      return;
    }

    this.goBackToLanding();
  }

  goBackToLanding() {
    this.router.navigate(['/']);
  }

  // Captcha Generator
  generateCaptcha() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.captchaText = code;
    this.captchaInput = '';
  }

  refreshCaptcha() {
    this.generateCaptcha();
    // this.triggerToast('Captcha refreshed / ਕੈਪਚਾ ਰਿਫ੍ਰੈਸ਼ ਕੀਤਾ ਗਿਆ', 'info');
  }

  // Role-based OTP Check
  requiresLoginOtp(user: any): boolean {
    const isStaff = user.userId.toLowerCase().startsWith('pmb');
    const isBusiness = user.entityType !== 'Individual' && user.entityType !== 'Other';
    return isStaff || isBusiness;
  }

  // Step 1 Validation
  validateStep1(): boolean {
    if (!this.selectedEntityType) {
      this.triggerToast('Please select Applicant Registration Type / ਰਜਿਸਟ੍ਰੇਸ਼ਨ ਕਿਸਮ ਦੀ ਚੋਣ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.gender) {
      this.triggerToast('Please select Gender / ਲਿੰਗ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.dob) {
      this.triggerToast('Please enter Date of Birth / ਜਨਮ ਤਾਰੀਖ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.firstName || this.signUpData.firstName.trim() === '') {
      this.triggerToast('Please enter First Name / ਪਹਿਲਾ ਨਾਂ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (this.signUpData.fatherSectionVisible) {
      if (!this.signUpData.fatherFirstName || this.signUpData.fatherFirstName.trim() === '') {
        this.triggerToast("Please enter Father's/Husband First Name / ਪਿਤਾ/ਪਤੀ ਦਾ ਪਹਿਲਾ ਨਾਂ ਦਰਜ ਕਰੋ", 'error');
        return false;
      }
      if (!this.signUpData.motherFirstName || this.signUpData.motherFirstName.trim() === '') {
        this.triggerToast("Please enter Mother's First Name / ਮਾਤਾ ਦਾ ਪਹਿਲਾ ਨਾਂ ਦਰਜ ਕਰੋ", 'error');
        return false;
      }
    }
    if (this.signUpData.spouseSectionVisible) {
      if (!this.signUpData.spouseFirstName || this.signUpData.spouseFirstName.trim() === '') {
        this.triggerToast("Please enter Spouse First Name / ਪਤਨੀ ਦਾ ਪਹਿਲਾ ਨਾਂ ਦਰਜ ਕਰੋ", 'error');
        return false;
      }
      if (!this.signUpData.spouseLastName || this.signUpData.spouseLastName.trim() === '') {
        this.triggerToast("Please enter Spouse Last Name / ਪਤਨੀ ਦਾ ਆਖਰੀ ਨਾਂ ਦਰਜ ਕਰੋ", 'error');
        return false;
      }
    }
    if (!this.signUpData.emailAddress || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.signUpData.emailAddress)) {
      this.triggerToast('Please enter a valid Email ID / ਸਹੀ ਈ-ਮੇਲ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.mobileNumber || !/^\d{10}$/.test(this.signUpData.mobileNumber)) {
      this.triggerToast('Please enter a valid 10-digit Mobile Number / 10-ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.mobileVerified) {
      this.triggerToast('Please verify your Mobile Number before submitting', 'error');
      return false;
    }
    if (!this.signUpData.emailVerified) {
      this.triggerToast('Please verify your Email ID before submitting', 'error');
      return false;
    }
    return true;
  }

  // Called by the personal-details child whenever email/mobile verification status changes.
  onVerificationChanged(event: { emailVerified: boolean; mobileVerified: boolean }): void {
    this.signUpData.emailVerified  = event.emailVerified;
    this.signUpData.mobileVerified = event.mobileVerified;
  }

  // Step 2 Validation
  validateStep2(): boolean {
    if (!this.signUpData.idDocumentType) {
      this.triggerToast('Please select Identification Document / ਪਛਾਣ ਦਸਤਾਵੇਜ਼ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.idDocumentNumber || this.signUpData.idDocumentNumber.trim() === '') {
      this.triggerToast('Please enter Document Number / ਨੰਬਰ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.idDocumentFileName) {
      this.triggerToast('Please upload Identification Document / ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.photoFileName) {
      this.triggerToast('Please upload Your Photo / ਆਪਣੀ ਫੋਟੋ ਅਪਲੋਡ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressState) {
      this.triggerToast('Please select State / ਰਾਜ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressDistrict) {
      this.triggerToast('Please select District / ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressCity) {
      this.triggerToast('Please select City / ਸ਼ਹਿਰ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressPincode || !/^\d{6}$/.test(this.signUpData.addressPincode)) {
      this.triggerToast('Please enter a valid 6-digit Pin Code / ਪਿੰਨ ਕੋਡ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressLandmark || this.signUpData.addressLandmark.trim() === '') {
      this.triggerToast('Please enter Plot/Street/Landmark / ਪਲਾਟ/ਗਲੀ/ਲੈਂਡਮਾਰਕ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressDocType) {
      this.triggerToast('Please select Address Document / ਪਤਾ ਦਸਤਾਵੇਜ਼ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressDocNumber || this.signUpData.addressDocNumber.trim() === '') {
      this.triggerToast('Please enter Address Document Number / ਨੰਬਰ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.addressDocFileName) {
      this.triggerToast('Please upload Address Document / ਦਸਤਾਵੇਜ਼ ਅਪਲੋਡ ਕਰੋ', 'error');
      return false;
    }
    return true;
  }

  // Unified Full-Form Validation
  validateFullForm(): boolean {
    if (!this.validateStep1()) return false;
    if (!this.validateStep2()) return false;

    if (!this.shouldShowBusinessDetails()) {
      return true;
    }

    // Validate Step 3 Business Details
    if (!this.signUpData.firmName || this.signUpData.firmName.trim() === '') {
      this.triggerToast('Please enter Firm Name / ਫਰਮ ਦਾ ਨਾਮ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.businessState) {
      this.triggerToast('Please select Business Office State / ਰਾਜ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.businessDistrict) {
      this.triggerToast('Please select Business Office District / ਜ਼ਿਲ੍ਹਾ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.businessCity) {
      this.triggerToast('Please select Business Office City / ਸ਼ਹਿਰ ਚੁਣੋ', 'error');
      return false;
    }
    if (!this.signUpData.businessPincode || !/^\d{6}$/.test(this.signUpData.businessPincode)) {
      this.triggerToast('Please enter a valid 6-digit Business Office Pin Code / ਪਿੰਨ ਕੋਡ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!this.signUpData.businessLandmark || this.signUpData.businessLandmark.trim() === '') {
      this.triggerToast('Please enter Business Office Plot/Street/Landmark / ਪਲਾਟ/ਗਲੀ/ਲੈਂਡਮਾਰਕ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    return true;
  }

  // Submit handler (called by single Submit button)
  onSubmitSignup() {
    if (this.signUpData.isSameAddress) {
      this.signUpData.businessState = this.signUpData.addressState;
      this.signUpData.businessDistrict = this.signUpData.addressDistrict;
      this.signUpData.businessCity = this.signUpData.addressCity;
      this.signUpData.businessPincode = this.signUpData.addressPincode;
      this.signUpData.businessLandmark = this.signUpData.addressLandmark;
    }

    if (!this.validateFullForm()) {
      return;
    }

    //this.openOtpModal();
    this.completeRegistration();
  }

  // File Upload

  // Maps a docType string to the DocumentCategoryId expected by the API.
  private getDocumentCategoryId(docType: string): number {
    switch (docType) {
      case 'photo':      return 1;  // Upload Your Photo
      case 'idDoc':      return 2;  // Identification Document
      case 'addressDoc': return 3;  // Address Document
      default:           return 0;
    }
  }
    // Maps a document-type label to its API DocumentTypeId.
    // Category 2 (Identification): Aadhaar=1, Voter Card=2, Passport=3, Other=4
    // Category 3 (Address):        Aadhaar=1, Passport=2, Electricity Bill=3, Water Bill=4, Rent Agreement=5, Registry Deed=6
    // Category 1 (Photo):
 
  private getDocumentTypeId(docType: string): number {
    if (docType === 'idDoc') {
      const idDocTypeMap: Record<string, number> = {
        'Aadhaar Card':                      1,
        'Voter Card':                        2,
        'Passport':                          3,
        'Other Government issued Photo ID':  4,
      };
      return idDocTypeMap[this.signUpData.idDocumentType] ?? 0;
    }
    if (docType === 'addressDoc') {
      const addrDocTypeMap: Record<string, number> = {
        'Aadhaar Card':      1,
        'Passport':          2,
        'Electricity Bill':  3,
        'Water Bill':        4,
        'Rent Agreement':    5,
        'Registry Deed':     6,
      };
      return addrDocTypeMap[this.signUpData.addressDocType] ?? 0;
    }
    return 0;
  }

  // Returns the document number associated with the given docType.
  private getDocumentNumber(docType: string): string {
    if (docType === 'idDoc')      return this.signUpData.idDocumentNumber ?? '';
    if (docType === 'addressDoc') return this.signUpData.addressDocNumber ?? '';
    return ''; // photo has no document number
  }

  // Generates a UUID v4 to use as the session identifier.
  private generateSessionId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /** Handles file selection, builds the multipart payload and calls the upload API. */
  onFileSelected(event: any, docType: string) {
    const file: File | undefined = event.target?.files?.[0];
    if (!file) return;

    this.uploadingStates[docType] = true;
    this.uploadProgress[docType] = 0;

    const payload = {
      file,
      documentCategoryId: this.getDocumentCategoryId(docType),
      documentTypeId:     this.getDocumentTypeId(docType),
      documentNumber:     this.getDocumentNumber(docType),
      sessionId:          this.sessionId,
    };

    this.fileService.UploadFile(payload).subscribe({
      next: (response) => {
        this.uploadingStates[docType] = false;
        this.uploadProgress[docType] = 100;

        // Store the returned filename (or fall back to the local file name)
        const uploadedFileName  = response?.data?.storedFileName ?? file.name;
        const uploadedDocumentId: number = response?.data?.userDocumentId ?? 0;

        if (docType === 'idDoc') {
          this.signUpData.idDocumentFileName = uploadedFileName;
          this.signUpData.idDocumentId       = uploadedDocumentId;
        } else if (docType === 'pan') {
          this.signUpData.panFileName   = uploadedFileName;
          this.signUpData.panDocumentId = uploadedDocumentId;
        } else if (docType === 'photo') {
          this.signUpData.photoFileName   = uploadedFileName;
          this.signUpData.photoDocumentId = uploadedDocumentId;
        } else if (docType === 'addressDoc') {
          this.signUpData.addressDocFileName = uploadedFileName;
          this.signUpData.addressDocumentId  = uploadedDocumentId;
        } else if (docType === 'officePhoto') {
          this.signUpData.officePhotoFileName   = uploadedFileName;
          this.signUpData.officePhotoDocumentId = uploadedDocumentId;
        }

        this.triggerToast('Document uploaded successfully!', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadingStates[docType] = false;
        this.uploadProgress[docType] = 0;
        console.error(`File upload failed for docType '${docType}':`, err);
        this.triggerToast(
          err?.error?.message ?? 'File upload failed. Please try again.',
          'error'
        );
        this.cdr.detectChanges();
      },
    });
  }

  // OTP Modal management (Signup)
  openOtpModal() {
    this.otpModalOpen = true;
    this.otpData.mobileVerified = false;
    this.otpData.emailVerified = false;
    this.otpData.mobileOtpInput = '';
    this.otpData.emailOtpInput = '';
    // this.sendMobileOtp();
    // this.sendEmailOtp();
  }

  closeOtpModal() {
    this.otpModalOpen = false;
  }

  verifyMobileOtp() {
    if (this.otpData.mobileOtpInput === this.otpData.sentMobileOtp) {
      this.otpData.mobileVerified = true;
      this.triggerToast('Mobile Number verified successfully!', 'success');
      this.checkOtpVerificationProgress();
    } else {
      this.triggerToast('Invalid Mobile OTP. Please try again.', 'error');
    }
  }

  verifyEmailOtp() {
    if (this.otpData.emailOtpInput === this.otpData.sentEmailOtp) {
      this.otpData.emailVerified = true;
      this.triggerToast('Email Address verified successfully!', 'success');
      this.checkOtpVerificationProgress();
    } else {
      this.triggerToast('Invalid Email OTP. Please try again.', 'error');
    }
  }

  checkOtpVerificationProgress() {
    if (this.otpData.mobileVerified && this.otpData.emailVerified) {
      setTimeout(() => {
        this.completeRegistration();
      }, 600);
    }
  }
  completeRegistration() {
    this.closeOtpModal();

    // Backend ke hisaab se request banao
    const request = {
      categoryId: this.getCategoryId(this.selectedEntityType),
      gender: this.signUpData.gender === 'Male' ? 1 : 2,
      dateOfBirth: this.signUpData.dob,
      firstName: this.signUpData.firstName,
      lastName: this.signUpData.lastName,
      relationType:this.signUpData.relationType === 'father' ? 1 : 2, 
      fatherHusbandFirstName: this.signUpData.fatherFirstName,
      fatherHusbandLastName: this.signUpData.fatherLastName,
      motherFirstName: this.signUpData.motherFirstName,
      motherLastName: this.signUpData.motherLastName,
      spouseFirstName:this.signUpData.spouseFirstName,
      spouseLastName:this.signUpData.spouseLastName,
      email: this.signUpData.emailAddress,
      mobileNo: this.signUpData.mobileNumber,
      // password: this.signUpData.password,
      // confirmPassword: this.signUpData.confirmPassword,

      // Documents
      identDocTypeId: this.signUpData.idDocumentTypeId,
      identDocNumber: this.signUpData.idDocumentNumber,
      identDocId: this.signUpData.idDocumentId,          // userDocumentId from upload
      photoDocId: this.signUpData.photoDocumentId,       // userDocumentId from upload
      panNumber: this.signUpData.panNumber,
      ...(this.shouldShowBusinessDetails() && {
        panDocId: this.signUpData.panDocumentId,         // only for non-Individual / non-Sole Proprietorship
      }),

      // Address
      individualStateId: this.signUpData.addressStateId,
      individualDistrictId: this.signUpData.addressDistrictId,
      individualCityId: this.signUpData.addressCityId,
      individualPinCode: this.signUpData.addressPincode,
      individualPlotStreetLandmark: this.signUpData.addressLandmark,
      addrDocTypeId: this.signUpData.addressDocTypeId,
      addrDocNumber: this.signUpData.addressDocNumber,
      addrDocId: this.signUpData.addressDocumentId,
      sessionId: this.sessionId,

      // Business
      firmName: this.signUpData.firmName,
      gstNumber: this.signUpData.gstNumber,
      mandiPropertyCode: this.signUpData.mandiPropertyCode,
      isSameAsIndividualAddress: this.signUpData.isSameAddress,
      businessStateId: this.signUpData.businessStateId,
      businessDistrictId: this.signUpData.businessDistrictId,
      businessCityId: this.signUpData.businessCityId,
      businessPinCode: this.signUpData.businessPincode,
      businessPlotStreetLandmark: this.signUpData.businessLandmark,
      ...(this.shouldShowBusinessDetails() && {
        officePropertyPhotoDocId: this.signUpData.officePhotoDocumentId, // only for non-Individual / non-Sole Proprietorship
      }),
    };

    this.authService.register(request).subscribe({
      next: (response) => {
        // Token save karo
        sessionStorage.setItem('token', response.data.token);

        const sessionData = {
          userId: response.data.userId,
          fullName: response.data.fullName,
          email: response.data.email,
          entityType: this.selectedEntityType
        };
        sessionStorage.setItem('cp_session', JSON.stringify(sessionData));

        sessionStorage.setItem('registration_success', 'true');
        sessionStorage.setItem('registered_user_id', response.data.userId);

        this.idleTimeoutService.start();
        this.router.navigate(['/auth/login']);
        this.triggerToast('Account registered successfully!', 'success');
      },
      error: (err) => {
        this.triggerToast(err.message || 'Registration failed. Please try again.', 'error');
      }
    });
  }
  getCategoryId(entityType: string): number {
    const map: { [key: string]: number } = {
      'Individual': 1,
      'Sole Proprietorship': 2,
      'HUF': 3,
      'Partnership Firm': 4,
      'Company': 5,
      'Procurement Agency': 6,
      'Other': 7
    };
    return map[entityType] || 1;
  }
 

  resetSignUpForm() {
    this.signUpData = {
      // Personal
      gender: '',
      dob: '',
      firstName: '',
      lastName: '',
      relationType: 'father', // Default to 'father' for initial state
      fatherFirstName: '',
      fatherLastName: '',
      motherFirstName: '',
      motherLastName: '',
      spouseFirstName: '',
      spouseLastName: '',
      fatherSectionVisible: false,
      spouseSectionVisible: false,
      isManagingPartner: null,
      emailAddress: '',
      mobileNumber: '',
      emailVerified: false,
      mobileVerified: false,
      password: '',
      confirmPassword: '',

      // Documents
      idDocumentType: '',
      idDocumentTypeId: 0,
      idDocumentNumber: '',
      idDocumentFileName: '',
      idDocumentId: 0,
      shareAadhaarDetails: false,
      panNumber: '',
      panFileName: '',
      panDocumentId: 0,
      photoFileName: '',
      photoDocumentId: 0,

      // Address
      addressState: '',
      addressStateId: 0,
      addressDistrict: '',
      addressDistrictId: 0,
      addressCity: '',
      addressCityId: 0,
      addressPincode: '',
      addressLandmark: '',
      addressDocType: '',
      addressDocTypeId: 0,
      addressDocNumber: '',
      addressDocFileName: '',
      addressDocumentId: 0,

      // Business
      firmName: '',
      gstNumber: '',
      isSameAddress: false,
      businessState: '',
      businessStateId: 0,
      businessDistrict: '',
      businessDistrictId: 0,
      businessCity: '',
      businessCityId: 0,
      businessPincode: '',
      businessLandmark: '',
      officePhotoFileName: '',
      officePhotoDocumentId: 0,
      mandiPropertyCode: ''
    }
    this.otpData = {
      mobileOtpInput: '',
      emailOtpInput: '',
      sentMobileOtp: '',
      sentEmailOtp: '',
      mobileSent: false,
      emailSent: false,
      mobileVerified: false,
      emailVerified: false,
      mobileTimer: 0,
      emailTimer: 0
    };
  }

  resetSignInForm() {
    this.loginData = { userId: '', password: '' };
    this.captchaInput = '';
    this.loginOtpData = { mobileNumber: '', otpInput: '', sentOtp: '', otpSent: false, timer: 0 };
    // Always reset loading flags here — guards against stale `true` if the user
    // switches login method while an in-flight request is somehow still pending.
    this.isSigningIn = false;
    this.isSendingLoginOtp = false;
  }

  // Sign-In via user/pass + captcha + role-based OTP
  onSignInSubmit() {
    this.errorMessage = '';
    const { userId, password } = this.loginData;

    if (!userId || !password) {
      this.triggerToast('Please enter User ID and Password', 'error');
      return;
    }

    if (!this.captchaInput || this.captchaInput.trim() !== this.captchaText) {
      this.triggerToast('Invalid Captcha / ਅਵੈਧ ਕੈਪਚਾ', 'error');
      this.generateCaptcha();
      return;
    }
    this.loginRole= this.loginRole === true ? 1 : 0 ;
    // Guard: prevent double-submit if a request is already in flight.
    if (this.isSigningIn) { return; }
    this.isSigningIn = true;

    this.authService.login(userId, password, this.loginRole).subscribe({
      next: (response) => {
        // Token save karo
        sessionStorage.setItem('token', response.data.token);

        if (response.data.isFirstLogin === true) {
          // First-login path: show the reset-password modal.
          // Must reset isSigningIn here because we return early — we never reach
          // the navigation below, so the flag would otherwise stay true forever.
          this.isSigningIn = false;
          this.pendingFirstLoginToken = response.data.token;
          this.resetPasswordData = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
          this.showResetPassword = true;
          this.isLoggedIn = false;
          sessionStorage.removeItem('cp_session');
          window.sessionStorage.setItem('token', response.data.token);
          this.cdr.detectChanges();

          setTimeout(() => {
            const modalEl = document.getElementById('resetPasswordModal');
            if (modalEl) {
              this.bootstrapModal = new (window as any).bootstrap.Modal(modalEl);
              this.bootstrapModal.show();
            }
          }, 0);
          return;
        }

        // Session save karo
        const sessionData = {
          userId: response.data.user?.id || '',
          fullName: response.data.user?.fullName || '',
          email: response.data.user?.email || '',
          entityType: response.data.entityType || 'Individual'
        };
        sessionStorage.setItem('cp_session', JSON.stringify(sessionData));

        // isSigningIn stays true intentionally until navigation completes —
        // keeps button disabled during the router transition so the user
        // cannot re-submit while the dashboard is loading.
        // NOTE: Do NOT call menuService.clearMenusCache() here.
        // authService.logout() already removes 'cp_menus' from sessionStorage on
        // every logout path. Clearing it again right before navigation forces the
        // Sidebar to always hit GET /Auth/profile — adding a blocking round-trip
        // to every login. The cache will always be empty at this point anyway.
        this.idleTimeoutService.start();
        this.triggerToast(`Welcome back!`, 'success');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // Always reset on error so the user can retry.
        this.isSigningIn = false;
        this.errorMessage = err.error?.message || 'Invalid User ID or Password.';
        this.triggerToast(this.errorMessage, 'error');
        this.generateCaptcha();
      }
    });
  }



  onSignInOtpSubmit() {
    this.errorMessage = '';
    const { mobileNumber, otpInput } = this.loginOtpData;

    if (!mobileNumber || !otpInput) {
      this.triggerToast('Please enter Mobile Number and OTP', 'error');
      return;
    }
    // Derive the role flag as a proper boolean for the API call.
    // loginRole is boolean | number (true = officer, false/0 = user).
    const isOfficer: boolean = this.loginRole === true || this.loginRole === 1;
    // Guard: prevent double-submit if a request is already in flight.
    if (this.isSigningIn) { return; }
    this.isSigningIn = true;
    this.authService.loginWithOtp(mobileNumber, otpInput, isOfficer).subscribe({
      next: (response) => {
        sessionStorage.setItem('token', response.data.token);
        const sessionData = {
          userId: response.data.user?.id || '',
          fullName: response.data.user?.fullName || '',
          email: response.data.user?.email || '',
          entityType: 'Individual'
        };
        sessionStorage.setItem('cp_session', JSON.stringify(sessionData));
        // NOTE: Do NOT call menuService.clearMenusCache() here — see comment
        // in onSignInSubmit() for the full explanation.
        // isSigningIn stays true intentionally until navigation completes.
        this.idleTimeoutService.start();
        this.triggerToast('Welcome back!', 'success');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // Always reset on error so the user can retry.
        this.isSigningIn = false;
        this.errorMessage = err.error?.message || 'Invalid OTP';
        this.triggerToast(this.errorMessage, 'error');
      }
    });
  }

  sendLoginOtp() {
    if (!this.loginOtpData.mobileNumber || !/^\d{10}$/.test(this.loginOtpData.mobileNumber)) {
      this.triggerToast('Please enter a valid registered 10-digit Mobile Number', 'error');
      return;
    }

    // Guard: prevent double-tap while OTP request is already in flight.
    if (this.isSendingLoginOtp) { return; }
    this.isSendingLoginOtp = true;

    this.authService.sendLoginOtp(this.loginOtpData.mobileNumber).subscribe({
      next: (res) => {
        this.isSendingLoginOtp = false;
        if (res.success) {
          this.loginOtpData.otpSent = true;
          this.triggerToast('OTP sent to your mobile', 'success');
        } else {
          // API returned 200 but success=false (e.g. mobile not registered)
          this.triggerToast(res.message || 'Failed to send OTP. Please try again.', 'error');
        }
      },
      error: (err) => {
        this.isSendingLoginOtp = false;
        this.triggerToast(err.error?.message || 'Failed to send OTP', 'error');
      }
    });
  }

  loginSuccess(user: any) {
    this.loggedInUser = {
      userId: user.userId,
      fullName: user.fullName,
      entityType: user.entityType || 'Individual',
      mobile: user.mobile
    };
    sessionStorage.setItem('cp_session', JSON.stringify(this.loggedInUser));
    this.isLoggedIn = true;
    this.menuService.clearMenusCache();
    this.triggerToast(`Welcome back, ${user.fullName}!`, 'success');

    if (user.userId.toLowerCase() === 'dataentryoprt') {
      this.router.navigate(['/register']);
    }
  }

  // Reset Password Methods
  validateResetPassword(): boolean {
    const { currentPassword, newPassword, confirmNewPassword } = this.resetPasswordData;

    if (!currentPassword || currentPassword.trim() === '') {
      this.triggerToast('Please enter your current password / ਮੌਜੂਦਾ ਪਾਸਵਰਡ ਦਰਜ ਕਰੋ', 'error');
      return false;
    }
    if (!newPassword || newPassword.length < 6) {
      this.triggerToast('New password must be at least 6 characters / ਨਵਾਂ ਪਾਸਵਰਡ ਘੱਟੋ-ਘੱਟ 6 ਅੱਖਰਾਂ ਦਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ', 'error');
      return false;
    }
    if (newPassword !== confirmNewPassword) {
      this.triggerToast('Passwords do not match / ਪਾਸਵਰਡ ਮੇਲ ਨਹੀਂ ਖਾਂਦੇ', 'error');
      return false;
    }
    if (currentPassword === newPassword) {
      this.triggerToast('New password must be different from current password / ਨਵਾਂ ਪਾਸਵਰਡ ਮੌਜੂਦਾ ਪਾਸਵਰਡ ਤੋਂ ਵੱਖਰਾ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ', 'error');
      return false;
    }
    return true;
  }

  onResetPasswordSubmit() {
    if (!this.validateResetPassword()) {
      return;
    }

    const payload = {
      currentPassword: this.resetPasswordData.currentPassword,
      newPassword: this.resetPasswordData.newPassword,
      confirmNewPassword: this.resetPasswordData.confirmNewPassword
    };

    this.authService.resetPassword(payload).subscribe({
      next: (response) => {
        this.closeResetPasswordModal();
        this.pendingFirstLoginToken = null;
        this.triggerToast('Password updated successfully! Please login with your new password / ਪਾਸਵਰਡ ਸਫਲਤਾਪੂਰਵਕ ਅੱਪਡੇਟ ਹੋ ਗਿਆ!', 'success');
        this.resetSignInForm();
        this.generateCaptcha();
      },
      error: (err) => {
        console.error('First-login password reset failed:', {
          status: err.status,
          response: err.original?.error ?? err.error
        });
        const responseBody = err.original?.error ?? err.error;
        const message = typeof responseBody === 'string'
          ? responseBody
          : responseBody?.message || err.message || 'Password reset failed. Please try again.';
        this.triggerToast(message, 'error');
      }
    });
  }

  closeResetPasswordModal() {
    if (this.bootstrapModal) {
      this.bootstrapModal.hide();
      this.bootstrapModal.dispose();
      this.bootstrapModal = null;
    }
    this.showResetPassword = false;
    this.pendingFirstLoginToken = null;
    this.idleTimeoutService.stop();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refresh_token');
    this.resetPasswordData = { currentPassword: '', newPassword: '', confirmNewPassword: '' };
    this.resetSignInForm();
    this.generateCaptcha();
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    this.triggerToast('Copied to clipboard!', 'success');
  }
  closeViewModal() {
    if (this.bootstrapModal) {
      this.bootstrapModal.hide();
      this.bootstrapModal.dispose();
      this.bootstrapModal = null;
    }
    this.showViewModal = false;
    this.showInstructionsModal = false;
  }

  checkAndShowModal() {
    if (this.selectedEntityType && this.proceedToForm && !this.shouldShowProcurementSection()) {
      this.showViewModal = true;
    }
  }
   toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }
//forgot password methods
  openForgotPassword() {
    this.forgotPasswordMode = true;
    this.forgotPasswordStep = 1;
    this.forgotPasswordErrorMessage = '';
    this.resetForgotPasswordForm();
  }

  closeForgotPassword() {
    this.forgotPasswordMode = false;
    this.forgotPasswordStep = 1;
    this.forgotPasswordErrorMessage = '';
    this.resetForgotPasswordForm();
    if (this.forgotPasswordTimer) {
      clearInterval(this.forgotPasswordTimer);
      this.forgotPasswordTimer = null;
    }
  }

  resetForgotPasswordForm() {
    this.forgotPasswordForm.reset();
    this.forgotPasswordOtpSent = false;
    this.forgotPasswordTimerValue = 0;
    if (this.forgotPasswordTimer) {
      clearInterval(this.forgotPasswordTimer);
      this.forgotPasswordTimer = null;
    }
  }

  get forgotEmail() {
    return this.forgotPasswordForm.get('email')?.value;
  }

  get forgotOtp() {
    return this.forgotPasswordForm.get('otp')?.value;
  }

  get forgotNewPassword() {
    return this.forgotPasswordForm.get('newPassword')?.value;
  }

  get forgotConfirmNewPassword() {
    return this.forgotPasswordForm.get('confirmNewPassword')?.value;
  }

  startForgotPasswordTimer() {
    if (this.forgotPasswordTimer) {
      clearInterval(this.forgotPasswordTimer);
    }
    this.forgotPasswordTimerValue = 30;
    this.cdr.detectChanges();

    this.forgotPasswordTimer = setInterval(() => {
      this.forgotPasswordTimerValue--;
      this.cdr.detectChanges();

      if (this.forgotPasswordTimerValue <= 0) {
        clearInterval(this.forgotPasswordTimer);
        this.forgotPasswordTimer = null;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  sendForgotPasswordOtp() {
    const email = (this.forgotEmail || '').trim();

    if (!email) {
      this.forgotPasswordErrorMessage = 'Please enter your registered Email / ਰਜਿਸਟਰਡ ਈਮੇਲ ਦਰਜ ਕਰੋ';
      this.cdr.detectChanges();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.forgotPasswordErrorMessage = 'Please enter a valid Email ID';
      this.cdr.detectChanges();
      return;
    }

    this.authService.sendEmailOtp(email).subscribe({
      next: () => {
        this.forgotPasswordOtpSent = true;
        this.forgotPasswordStep = 2;
        this.forgotPasswordErrorMessage = '';
        this.forgotPasswordForm.get('otp')?.reset();
        this.startForgotPasswordTimer();
        this.triggerToast('OTP sent successfully. Please check your email', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        const message = err?.error?.message || 'Unable to send OTP right now. Please try again.';
        this.forgotPasswordErrorMessage = message;
        this.triggerToast(message, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  resendForgotPasswordOtp() {
    const email = (this.forgotEmail || '').trim();

    if (!email) {
      this.forgotPasswordErrorMessage = 'Please enter your registered Email';
      this.cdr.detectChanges();
      return;
    }

    this.authService.resendEmailOtp(email).subscribe({
      next: () => {
        this.forgotPasswordForm.get('otp')?.reset();
        this.startForgotPasswordTimer();
        this.triggerToast('OTP resent successfully', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        const message = err?.error?.message || 'Unable to resend OTP. Please try again.';
        this.forgotPasswordErrorMessage = message;
        this.triggerToast(message, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  verifyForgotPasswordOtp() {
    const email = (this.forgotEmail || '').trim();
    const otp = (this.forgotOtp || '').trim();

    if (!email) {
      this.forgotPasswordErrorMessage = 'Please enter your registered Email';
      this.cdr.detectChanges();
      return;
    }

    if (!otp) {
      this.forgotPasswordErrorMessage = 'Please enter OTP';
      this.cdr.detectChanges();
      return;
    }

    this.authService.verifyEmailOtp(email, otp).subscribe({
      next: (response) => {
        const isVerified = response?.verified === true || response?.success === true && response?.verified !== false;

        if (!isVerified) {
          const message = response?.message || 'Invalid OTP. Please try again.';
          this.forgotPasswordErrorMessage = message;
          this.triggerToast(message, 'error');
          this.forgotPasswordStep = 2;
          this.cdr.detectChanges();
          return;
        }

        this.forgotPasswordErrorMessage = '';
        this.forgotPasswordStep = 3;
        if (this.forgotPasswordTimer) {
          clearInterval(this.forgotPasswordTimer);
          this.forgotPasswordTimer = null;
        }
        this.forgotPasswordTimerValue = 0;
        this.triggerToast('OTP verified successfully', 'success');
        this.cdr.detectChanges();
      },
      error: (err) => {
        const message = err?.error?.message || 'Invalid OTP. Please try again.';
        this.forgotPasswordErrorMessage = message;
        this.triggerToast(message, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  resetPasswordWithOtp() {
    const email = (this.forgotEmail || '').trim();
    const newPassword = this.forgotNewPassword;
    const confirmNewPassword = this.forgotConfirmNewPassword;

    if (!email) {
      this.forgotPasswordErrorMessage = 'Please enter your registered Email';
      this.cdr.detectChanges();
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      this.forgotPasswordErrorMessage = 'New password must be at least 6 characters';
      this.cdr.detectChanges();
      return;
    }

    if (newPassword !== confirmNewPassword) {
      this.forgotPasswordErrorMessage = 'Passwords do not match';
      this.cdr.detectChanges();
      return;
    }

    this.authService.forgotPassword({
      email,
      newPassword,
      confirmNewPassword: confirmNewPassword
    }).subscribe({
      next: () => {
        this.triggerToast('Password reset successful! Please login with your new password', 'success');
        this.cdr.detectChanges();
        this.closeForgotPassword();
      },
      error: (err) => {
        const message = err?.error?.message || 'Password reset failed. Please try again.';
        this.forgotPasswordErrorMessage = message;
        this.triggerToast(message, 'error');
        this.cdr.detectChanges();
      }
    });
  }

  onForgotPasswordSubmit() {
    this.forgotPasswordErrorMessage = '';

    if (this.forgotPasswordStep === 1) {
      this.sendForgotPasswordOtp();
      return;
    }

    if (this.forgotPasswordStep === 2) {
      this.verifyForgotPasswordOtp();
      return;
    }

    this.resetPasswordWithOtp();
  }
}
