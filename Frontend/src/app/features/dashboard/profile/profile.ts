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
  uploadedPhotoFileName = '';
  uploadedDocumentId: number = 0;
  email: string = '';
  userName = '';
  isLoadingProfile = false;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

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
    this.loadProfileFromApi();
    this.openChangePasswordMenu();
    this.getProfileImage();
  }

  private buildProfileForm(): void {
    this.profileForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      mobile: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{10}$/)
        ]
      ],
      altMobile: [
        '',
        [Validators.pattern(/^[0-9]{10}$/)]
      ],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      district: ['', [Validators.required]],
      state: ['', [Validators.required]],
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

  /** Calls getProfileDetailsByUserId API and patches form with all profile data */
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

        // Merge firstName + lastName into full name
        const fullName = [d.firstName, d.lastName]
          .filter((n: string) => n && n.trim())
          .join(' ');

        this.email = d.email ?? '';

        this.profileForm.patchValue({
          name: fullName,
          email: d.email ?? '',
          mobile: d.mobileNo ?? '',
          address: d.individualPlotStreetLandmark ?? '',
          state: d.stateName ?? '',
          district: d.districtName ?? '',
          city: d.cityName ?? '',
          pincode: d.individualPinCode ?? ''
        }, { emitEvent: false });

        this.initialFormState = this.profileForm.getRawValue();
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
        sessionId: 'a7e6d175-7bbd-4a7f-9d65-7a3e37415be2'
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

    const payload = {
      ...this.profileForm.getRawValue(),
      avatarUrl: this.avatarUrl,
      photoFileName: this.uploadedPhotoFileName,
      photoDocumentId: this.uploadedDocumentId
    };
    this.initialFormState = this.profileForm.getRawValue();
    this.showSuccess();
  }

  show() {
    this.toastr.error('Error message', 'Major Error');
  }

  showSuccess() {
    this.toastr.success('Profile updated successfully!', 'Success');
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

  //get profile image 

  getProfileImage(): string {
    this.commonService.GetProfileImageByUserId().subscribe({
      next: (response: Blob) => {
        const url = URL.createObjectURL(response);
        this.avatarUrl = url;
      }
    });
    return this.avatarUrl;
  }
}