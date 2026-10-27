import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { PropertyBidderRegistrationModule } from '../property-bidder-registration/property-bidder-registration.module';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Common } from '../../core/service/CommonService/common';
import { Propertybidderregn } from '../../core/service/Property-Bidder-RegnService/propertybidderregn';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

export interface VerificationHistoryEntry {
  role: string;
  actorName: string;
  action: 'Approved' | 'Sent Back' | 'Submitted';
  remarks: string;
  date: string;
}


@Component({
  selector: 'app-data-entry-operator-verification-view',
  standalone: true,
  imports: [PropertyBidderRegistrationModule, CommonModule, ReactiveFormsModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './data-entry-operator-verification-view.html',
  styleUrl: './data-entry-operator-verification-view.scss',
})
export class DataEntryOperatorVerificationView implements OnInit {
  propertyCode = '';
  originalRegistrationDto: any = null;
  history: VerificationHistoryEntry[] = [];
  verificationStatusClass = 'status-pending';
  verificationStatus = 'Pending';
  submitting = false;
  activeDecision: 'approve' | 'sendback' | null = null;
  applicationStatusId: number | null = null;
  showActionButtons = true;
  showRemarksReadOnly = false;
  remarksReadOnly: string | null = null;
  private readonly fb = inject(FormBuilder);
  private readonly toastr = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(Propertybidderregn);
  private readonly commonService = inject(Common);
  private readonly confirmationService = inject(ConfirmationService);

  showValidationHint = false;
  currentStage = 'Clerk';
  remarksControl = this.fb.nonNullable.control('', [
    Validators.maxLength(500),
  ]);
  userRole = '';
  isAlreadyVerified = false;

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
        if (rawRole) return String(rawRole).trim();
      } catch (e) {
        console.error('Error parsing token for role:', e);
      }
    }
    return sessionStorage.getItem('role') || 'Clerk';
  }

  ngOnInit(): void {
    const role = this.getCurrentUserRole();
    this.userRole = role;
    this.currentStage = role;

    this.route.queryParams.subscribe(params => {
      const codeFromQuery = params['propertyCode'];
      if (codeFromQuery) {
        this.propertyCode = codeFromQuery;
      }
      const roleFromQuery = params['role'];
      if (roleFromQuery) {
        this.userRole = roleFromQuery;
        this.currentStage = roleFromQuery;
      }
      const encryptedId = params['id'];
      if (encryptedId) {
        try {
          const id = Number(atob(encryptedId));
          if (!isNaN(id) && id > 0) {
            this.service.getRegistrationById(id).subscribe({
              next: (res: any) => {
                if (res && res.data) {
                  this.onPropertyLoaded(res.data);
                }
              },
              error: (err: any) => console.error('Error fetching registration by id:', err)
            });
          }
        } catch (e) {
          console.error('Error decoding id', e);
        }
      }
    });

    const navState = history.state as { registrationData?: any };
    if (navState?.registrationData) {
      this.onPropertyLoaded(navState.registrationData);
    }
  }

  onPropertyLoaded(data: any): void {
    if (!data) return;
    this.originalRegistrationDto = data;
    if (data.propertyCode || data.allotteeCode) {
      this.propertyCode = data.propertyCode || data.allotteeCode;
    }
    const statusId = data.applicationStatusId ?? data.statusId;
    // Use ?? so null from API is captured; falls back to other field names if undefined
    this.remarksReadOnly =
      data.remarks ??
      data.Remarks ??
      data.remark ??
      data.Remark ??
      data.sendBackRemarks ??
      data.objectionRemarks ??
      data.comment ??
      data.Comment ??
      this.checkVerificationStatus(statusId);

    if (data.timelineHistory && Array.isArray(data.timelineHistory)) {
      this.history = data.timelineHistory.map((item: any) => ({
        role: item.statusName || (item.statusId === 1 ? 'DEO' : item.statusId === 2 ? 'Clerk' : 'Senior Assistant'),
        actorName: item.userName || item.userId || 'User',
        action: item.statusId === 2 || item.statusId === 3 ? 'Approved' : (item.statusId === 7 ? 'Sent Back' : 'Submitted'),
        remarks: item.remarks || '',
        date: item.date ? new Date(item.date).toLocaleString('en-IN') : ''
      }));
    }
  }

  private canCurrentRoleAct(statusId: number | null | undefined): boolean {
    const role = this.userRole.trim().toLowerCase();

    if (role.includes('senior assistant')) {
      return statusId === 2;
    }
    if (role.includes('superintendent')) {
      return statusId === 3;
    }
    if (role.includes('deputy director')) {
      return statusId === 4;
    }
    if (role.includes('director')) {
      return statusId === 5;
    }

    // Clerk is the first approval stage and also handles an uninitialised status.
    return role.includes('clerk') || role.includes('data entry operator')
      ? statusId === 1 || statusId == null
      : statusId === 1 || statusId == null;
  }

  private getApprovedStatusForCurrentRole(): number {
    const role = this.userRole.trim().toLowerCase();

    if (role.includes('senior assistant')) return 3;
    if (role.includes('superintendent')) return 4;
    if (role.includes('deputy director')) return 5;
    if (role.includes('director')) return 6;
    return 2;
  }

  private checkVerificationStatus(statusId: number | null | undefined): void {
    this.setVerificationStatus(statusId);
    this.isAlreadyVerified = !this.canCurrentRoleAct(statusId);

    if (this.isAlreadyVerified) {
      const existingRemarks = this.remarksReadOnly ||
        this.originalRegistrationDto?.clerkRemarks || '';
      this.remarksReadOnly = existingRemarks || null;
      this.remarksControl.setValue(existingRemarks);
      this.remarksControl.disable({ emitEvent: false });
      return;
    }

    this.activeDecision = null;
    this.showValidationHint = false;
    this.remarksControl.enable({ emitEvent: false });
    this.remarksControl.clearValidators();
    this.remarksControl.addValidators(Validators.maxLength(500));
    this.remarksControl.updateValueAndValidity({ emitEvent: false });
  }

  private setVerificationStatus(statusId: number | null | undefined): void {
    this.applicationStatusId = statusId ?? null;

    // label & badge class
    if (statusId === 6) {
      this.verificationStatus = 'Approved by Director';
      this.verificationStatusClass = 'status-verified';
    } else if (statusId === 5) {
      this.verificationStatus = 'Verified by Deputy Director';
      this.verificationStatusClass = 'status-verified';
    } else if (statusId === 4) {
      this.verificationStatus = 'Verified by Superitendent';
      this.verificationStatusClass = 'status-verified';
    } else if (statusId === 3) {
      this.verificationStatus = 'Verified by Senior Assistant';
      this.verificationStatusClass = 'status-verified';
    } else if (statusId === 2) {
      this.verificationStatus = 'Verified by Clerk';
      this.verificationStatusClass = 'status-verified';
    } else if (statusId === 7) {
      this.verificationStatus = 'Objection';
      this.verificationStatusClass = 'status-objection';
    } else {
      // statusId === 1 or unknown → Pending
      this.verificationStatus = 'Pending';
      this.verificationStatusClass = 'status-pending';
    }

    // The action area is shared by all approval roles; eligibility is role-based.
    this.showActionButtons = true;

    // Show read-only remarks when Objection (7)
    this.showRemarksReadOnly = (statusId === 7);
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
        const nextStatus = this.activeDecision === 'approve'
          ? this.getApprovedStatusForCurrentRole()
          : 7;
        this.setVerificationStatus(nextStatus);
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

  handleApprove(): void {
    this.confirmationService.confirm({
      header: 'Confirm Approval',
      message: 'Are you sure you want to approve this property registration?',
      icon: 'fa-solid fa-circle-question text-success fs-4 me-2',
      acceptLabel: 'Approve',
      rejectLabel: 'Cancel',
      acceptButtonProps: {
        severity: 'primary',
      },
      rejectButtonProps: {
        severity: 'secondary',
        outlined: true
      },
      accept: () => {
        this.activeDecision = 'approve';
        this.remarksControl.setValidators([Validators.maxLength(500)]);
        this.remarksControl.updateValueAndValidity({ emitEvent: false });
        this.submitDecision();
      }
    });
  }

  handleSendBack(): void {
    if (this.activeDecision !== 'sendback') {
      this.activeDecision = 'sendback';
      this.showValidationHint = false;
      this.remarksControl.setValidators([
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(500),
      ]);
      this.remarksControl.updateValueAndValidity({ emitEvent: false });
    } else {
      this.submitDecision();
    }
  }
}
