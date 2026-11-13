import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MenuService } from '../../../core/service/MenuService/menu.service';
import { AuthService } from '../../../core/service/auth.service';
import { Common } from '../../../core/service/CommonService/common';
import { FileService, FileUploadPayload } from '../../../core/service/FileService/file-service';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

// Custom validator: passwords must match
export function passwordsMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  passwordModalOpen = false;
  passwordError = '';
  errorMessage: string | null = null;
  showNewPassword = false;
  showConfirmPassword = false;

  avatarUrl: string = '';
  isUploading = false;
  isSaving = false;
  uploadedPhotoFileName = '';
  uploadedDocumentId: number = 0;
  profileSessionId: string = '';
  email: string = '';
  userName = '';
  isLoadingProfile = false;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // Dropdown lists for state, district, city
  stateList: any[] = [];
  districtList: any[] = [];
  cityList: any[] = [];
  isLoadingStates = false;
  isLoadingDistricts = false;
  isLoadingCities = false;

  private initialFormState: any;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private menuService: MenuService,
    private authService: AuthService,
    private commonService: Common,
    private fileService: FileService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.buildProfileForm();
    this.buildPasswordForm();
    this.initialFormState = this.profileForm.getRawValue();
    this.loadStates();
    this.loadProfileFromApi();
    this.openChangePasswordMenu();
    this.getProfileImage();
  }

  private buildProfileForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      // Email and mobile are read-only
      email: [{ value: '', disabled: true }],
      mobile: [{ value: '', disabled: true }],
      altMobile: [
        '',
        [Validators.pattern(/^[0-9]{10}$/)]
      ],
      fatherName: ['', [Validators.required]],
      motherName: ['', [Validators.required]],
      address: ['', [Validators.required]],
      // Dropdowns store numeric IDs
      state: [null, [Validators.required]],
      district: [null, [Validators.required]],
      city: [null, [Validators.required]],
      pincode: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{6}$/)
        ]
      ]
    });
  }

  private buildPasswordForm(): void {
    this.passwordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(50)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(50)]]
      },
      { validators: passwordsMatchValidator() }
    );
  }

  // Convenience getters for template access
  get f() {
    return this.profileForm.controls;
  }

  get pf() {
    return this.passwordForm.controls;
  }

  /** Loads all states into the state dropdown */
  loadStates(): void {
    this.isLoadingStates = true;
    this.commonService.getAllStates().subscribe({
      next: (res: any) => {
        this.isLoadingStates = false;
        this.stateList = res?.data ?? res ?? [];
        this.cdr.detectChanges();
      },
      error: () => { this.isLoadingStates = false; }
    });
  }

  /** State dropdown changed — load districts, reset district & city */
  onStateChange(stateId: any): void {
    this.districtList = [];
    this.cityList = [];
    this.profileForm.patchValue({ district: null, city: null }, { emitEvent: false });
    if (!stateId) return;

    this.isLoadingDistricts = true;
    this.commonService.getAllDistrict(stateId).subscribe({
      next: (res: any) => {
        this.isLoadingDistricts = false;
        this.districtList = res?.data ?? res ?? [];
        this.cdr.detectChanges();
      },
      error: () => { this.isLoadingDistricts = false; }
    });
  }

  /** District dropdown changed — load cities, reset city */
  onDistrictChange(districtId: any): void {
    this.cityList = [];
    this.profileForm.patchValue({ city: null }, { emitEvent: false });
    if (!districtId) return;

    this.isLoadingCities = true;
    this.commonService.GetAllCityByDistrictID(districtId).subscribe({
      next: (res: any) => {
        this.isLoadingCities = false;
        this.cityList = res?.data ?? res ?? [];
        this.cdr.detectChanges();
      },
      error: () => { this.isLoadingCities = false; }
    });
  }

  /** Calls getProfileDetailsByUserId API and patches form, then cascade-loads dropdowns */
  private loadProfileFromApi(): void {
    this.isLoadingProfile = true;
    this.commonService.getProfileDetailsByUserId().subscribe({
      next: (res: any) => {
        this.isLoadingProfile = false;
        const d = res?.data;
        console.log('data', d);

        if (!res?.success || !d) {
          return;
        }

        const stateId    = d.individualStateId    ?? null;
        const districtId = d.individualDistrictId ?? null;
        const cityId     = d.individualCityId     ?? null;

        // Merge firstName + lastName into full name
        const fullName = [d.firstName, d.lastName]
          .filter((n: string) => n && n.trim())
          .join(' ');

        this.email = d.email ?? '';

        const fatherName = [d.fatherHusbandFirstName, d.fatherHusbandLastName]
          .filter((n: string) => n && n.trim())
          .join(' ');

        const motherName = [d.motherFirstName, d.motherLastName]
          .filter((n: string) => n && n.trim())
          .join(' ');

        // Patch all scalar fields
        this.profileForm.patchValue({
          name: fullName,
          email: d.email ?? '',
          mobile: d.mobileNo ?? '',
          altMobile: d.altMobile ?? '',
          fatherName: fatherName,
          motherName: motherName,
          address: d.individualPlotStreetLandmark ?? '',
          pincode: d.individualPinCode ?? ''
        }, { emitEvent: false });

        // Cascade-load dropdowns and pre-select the saved state → district → city
        if (stateId) {
          this.profileForm.patchValue({ state: stateId }, { emitEvent: false });
          this.isLoadingDistricts = true;
          this.commonService.getAllDistrict(stateId).subscribe({
            next: (dRes: any) => {
              this.isLoadingDistricts = false;
              this.districtList = dRes?.data ?? dRes ?? [];
              if (districtId) {
                this.profileForm.patchValue({ district: districtId }, { emitEvent: false });
                this.isLoadingCities = true;
                this.commonService.GetAllCityByDistrictID(districtId).subscribe({
                  next: (cRes: any) => {
                    this.isLoadingCities = false;
                    this.cityList = cRes?.data ?? cRes ?? [];
                    if (cityId) {
                      this.profileForm.patchValue({ city: cityId }, { emitEvent: false });
                    }
                    this.initialFormState = this.profileForm.getRawValue();
                    this.cdr.detectChanges();
                  },
                  error: () => { this.isLoadingCities = false; }
                });
              } else {
                this.initialFormState = this.profileForm.getRawValue();
                this.cdr.detectChanges();
              }
            },
            error: () => { this.isLoadingDistricts = false; }
          });
        } else {
          this.initialFormState = this.profileForm.getRawValue();
        }
      },
      error: (err: any) => {
        this.isLoadingProfile = false;
        console.error('Error loading profile:', err);
      }
    });
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSizeInBytes = 200 * 1024; // 200 KB

      if (file.size > maxSizeInBytes) {
        this.errorMessage = 'Image size must be less than 200 KB.';
        this.toastr.warning(this.errorMessage, 'Warning');
        input.value = '';
        return;
      }
      this.errorMessage = null;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);

      const payload: FileUploadPayload = {
        file: file,
        documentCategoryId: 1,
        documentTypeId: 0,
        documentNumber: '',
        sessionId: this.profileSessionId
      };

      this.isUploading = true;
      this.cdr.detectChanges();

      this.fileService.UploadFile(payload).subscribe({
        next: (response) => {
          this.isUploading = false;
          this.uploadedPhotoFileName = response?.data?.storedFileName ?? file.name;
          this.uploadedDocumentId = response?.data?.userDocumentId ?? 0;
          this.toastr.success(response?.message || 'Profile image uploaded successfully!', 'Success');
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.isUploading = false;
          const msg = error?.error?.message || error?.error || 'Failed to upload profile image.';
          this.errorMessage = typeof msg === 'string' ? msg : 'Failed to upload profile image.';
          this.toastr.error(this.errorMessage, 'Upload Failed');
          this.cdr.detectChanges();
        }
      });
    }
  }

  changePassword(): void {
    this.openPasswordModal();
  }

  openPasswordModal(): void {
    this.passwordModalOpen = true;
    this.passwordError = '';
    this.passwordForm.reset();
  }

  closePasswordModal(): void {
    this.passwordModalOpen = false;
    this.passwordError = '';
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();

      const newPasswordErrors = this.pf['newPassword'].errors;
      const confirmPasswordErrors = this.pf['confirmPassword'].errors;

      if (newPasswordErrors?.['required'] || confirmPasswordErrors?.['required']) {
        this.passwordError = 'Please enter and confirm your new password.';
      } else if (newPasswordErrors?.['minlength'] || confirmPasswordErrors?.['minlength']) {
        this.passwordError = 'Password must be at least 8 characters long.';
      } else if (this.passwordForm.errors?.['passwordMismatch']) {
        this.passwordError = 'New password and confirmation do not match.';
      } else {
        this.passwordError = 'Please fill the password fields correctly.';
      }
      return;
    }

    const email = this.email.trim();
    if (!email) {
      this.passwordError = 'Unable to find your registered email address.';
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    this.passwordError = '';

    this.authService.forgotPassword({
      email,
      newPassword,
      confirmNewPassword: confirmPassword
    }).subscribe({
      next: () => {
        this.closePasswordModal();
        this.passwordForm.reset();
        this.toastr.success('Password updated successfully!', 'Success');
      },
      error: (error) => {
        const response = error?.error;
        this.passwordError = typeof response === 'string'
          ? response
          : response?.message || 'Password update failed. Please try again.';
      }
    });
  }

  resetForm(): void {
    this.profileForm.reset(this.initialFormState);
    this.avatarUrl = '';
    this.uploadedPhotoFileName = '';
    this.uploadedDocumentId = 0;
    this.passwordModalOpen = false;
    this.passwordError = '';
    this.cdr.detectChanges();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();

    // Split full name into first / last
    const nameParts = (raw.name ?? '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');

    // Split father name into first / last
    const fatherParts = (raw.fatherName ?? '').trim().split(/\s+/);
    const fatherHusbandFirstName = fatherParts[0] ?? '';
    const fatherHusbandLastName = fatherParts.slice(1).join(' ');

    // Split mother name into first / last
    const motherParts = (raw.motherName ?? '').trim().split(/\s+/);
    const motherFirstName = motherParts[0] ?? '';
    const motherLastName = motherParts.slice(1).join(' ');

    const payload = {
      name: raw.name ?? '',
      firstName,
      lastName,
      altMobile: raw.altMobile ?? '',
      fatherName: raw.fatherName ?? '',
      fatherHusbandFirstName,
      fatherHusbandLastName,
      motherName: raw.motherName ?? '',
      motherFirstName,
      motherLastName,
      individualPlotStreetLandmark: raw.address ?? '',
      individualStateId: raw.state ?? 0,
      individualDistrictId: raw.district ?? 0,
      individualCityId: raw.city ?? 0,
      individualPinCode: raw.pincode ?? ''
    };

    this.isSaving = true;
    this.commonService.SaveProfileChanges(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.initialFormState = this.profileForm.getRawValue();
        this.toastr.success(res?.message || 'Profile updated successfully!', 'Success');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.error || 'Failed to save profile. Please try again.';
        this.toastr.error(typeof msg === 'string' ? msg : 'Failed to save profile. Please try again.', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  getEmailforChangePassword(): string {
    const email = this.profileForm.get('email')?.value;
    return email || '';
  }

  openChangePasswordMenu(): void {
    this.menuService.profile$.subscribe(profile => {
      if (!profile) {
        return;
      }

      this.email = profile.email ?? '';
      this.userName = profile.userName ?? '';

      // Only patch from menuService if API hasn't loaded data yet
      if (!this.profileForm.get('name')?.value) {
        this.profileForm.patchValue({
          name: profile.fullName ?? '',
          email: this.email,
          mobile: profile.phoneNumber ?? profile.mobileNo ?? ''
        }, { emitEvent: false });
      }
    });
  }

  // Get profile image
  getProfileImage(): void {
    this.commonService.GetProfileImageByUserId().subscribe({
      next: (response: any) => {
        if (response?.success && response?.data) {
          const imageData = response.data;
        this.avatarUrl = imageData.base64Image ?? '';
        this.profileSessionId = imageData.tempSessionId ?? '';
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error fetching profile image:', err);
      }
    });
  }
}