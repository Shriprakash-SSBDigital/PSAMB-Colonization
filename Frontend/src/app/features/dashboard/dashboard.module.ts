import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { SharedModule } from '../../shared/shared.module';
import { Sidebar } from './sidebar/sidebar';
import { Header } from './header/header';
import { Footer } from './footer/footer';
import { RoleGuard } from '../../core/guards/role-guard';

@NgModule({
  declarations: [DashboardComponent, Sidebar, Header, Footer],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        component: DashboardComponent,
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./dashboard-home/dashboard-home')
                .then((m) => m.DashboardHome),
          },
          {
            path: 'profile',
            loadChildren: () =>
              import('./profile/profile.module')
                .then((m) => m.ProfileModule),
          },
          {
            path: 'coming-soon',
            loadComponent: () =>
              import('../../features/comming-soon-pages/comming-soon-pages')
                .then((m) => m.CommingSoonPages),
          },
          {
            path: 'dashboard-citizen-services',
            canActivate: [RoleGuard],
            data: { roles: ['User'] },
            loadComponent: () =>
              import('../citizen-services/citizen-services')
                .then((m) => m.CitizenServices),
          },
          {
            path: 'register-property',
            canActivate: [RoleGuard],
            data: { roles: ['User'] },
            loadChildren: () =>
              import('../register-property/register-property.module')
                .then((m) => m.RegisterPropertyModule),
          },
          {
            path: 'property-bidder-registration',
            canActivate: [RoleGuard],
            data: { roles: ['DEO'] },
            loadChildren: () =>
              import('../property-bidder-registration/property-bidder-registration.module')
                .then((m) => m.PropertyBidderRegistrationModule),
          },
          {
            path: 'property-details',
            canActivate: [RoleGuard],
            data: { roles: ['User', 'DEO', 'Clerk', 'Senior Assistant', 'Superintendent', 'Deputy Director', 'Director'] },
            loadComponent: () =>
              import('../property-balance-calculate/property-balance-calculate')
                .then((m) => m.PropertyBalanceCalculate),
          },
          {
            path: 'registration-status',
            canActivate: [RoleGuard],
            data: { roles: ['DEO'] },
            loadComponent: () =>
              import('../deo-registration-status/deo-registration-status')
                .then((m) => m.DeoRegistrationStatus),
          },
          {
            path: 'verification',
            canActivate: [RoleGuard],
            data: { roles: ['DEO'] },
            loadComponent: () =>
              import('../../features/data-entry-operator-verification-view/data-entry-operator-verification-view')
                .then((m) => m.DataEntryOperatorVerificationView),
          },
          {
            path: 'property-verification',
            canActivate: [RoleGuard],
            data: { roles: ['Clerk', 'Senior Assistant', 'Superintendent', 'Deputy Director', 'Director'] },
            loadChildren: () =>
              import('../property-verification/property-verification.module')
                .then((m) => m.PropertyVerificationModule),
          },
          {
            path: 'user-verification',
            canActivate: [RoleGuard],
            data: { roles: ['Clerk', 'Senior Assistant', 'Superintendent', 'Deputy Director', 'Director'] },
            loadChildren: () =>
              import('../verification-view/verification-view.module')
                .then((m) => m.VerificationViewModule),
          },
          {
            path: 'property-ownership-verification',
            canActivate: [RoleGuard],
            data: { roles: ['Clerk', 'Senior Assistant', 'Superintendent', 'Deputy Director', 'Director'] },
            loadComponent: () =>
              import('../../features/property-ownership-verification/property-ownership-verification')
                .then((m) => m.PropertyOwnershipVerification),
          },
          {
            path: 'mandi-wise-allotment-summary',
            canActivate: [RoleGuard],
            data: { roles: ['Clerk', 'Senior Assistant', 'Superintendent', 'Deputy Director', 'Director'] },
            loadComponent: () =>
              import('../../features/mandi-wise-allotment-summary/mandi-wise-allotment-summary')
                .then((m) => m.MandiWiseAllotmentSummary),
          },
          {
            path: 'plot-wise-consolidate-details',
            canActivate: [RoleGuard],
            data: { roles: ['Clerk', 'Senior Assistant', 'Superintendent', 'Deputy Director', 'Director'] },
            loadComponent: () =>
              import('../../features/plot-wise-consolidate-details/plot-wise-consolidate-details')
                .then((m) => m.PlotWiseConsolidateDetails),
          },
          {
            path : 'online-payment-details',
            canActivate: [RoleGuard],
            data: { roles: ['User'] },
            loadComponent: () =>
              import('../../features/online-payment-detail/online-payment-detail')
                .then((m) => m.OnlinePaymentDetail),
          },
          {
            path : 'application-status',
            canActivate: [RoleGuard],
            data: { roles: ['User'] },
            loadComponent: () =>
              import('../../features/user-registration-status/user-registration-status')
                .then((m) => m.UserRegistrationStatus),
          },
          {
            path: 'role-management',
            canActivate: [RoleGuard],
            data: { roles: ['Deputy Director', 'Director'] },
            loadComponent: () =>
              import('../admin-pages/role-management/role-management')
                .then((m) => m.RoleManagement),
          }
        ]
      }
    ])
  ]
})
export class DashboardModule {}
