import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { SharedModule } from '../../shared/shared.module';
import { Sidebar } from './sidebar/sidebar';
import { Header } from './header/header';
import { Footer } from './footer/footer';

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
            path: 'register-property',
            loadChildren: () =>
              import('../register-property/register-property.module')
                .then((m) => m.RegisterPropertyModule),
          },
          {
            path: 'property-bidder-registration',
            loadChildren: () =>
              import('../property-bidder-registration/property-bidder-registration.module')
                .then((m) => m.PropertyBidderRegistrationModule),
          },
          {
            path: 'property-verification',
            loadChildren: () =>
              import('../property-verification/property-verification.module')
                .then((m) => m.PropertyVerificationModule),
          },
          {
            path: 'profile',
            loadChildren: () =>
              import('./profile/profile.module')
                .then((m) => m.ProfileModule),
          },
          {
            path: 'user-verification',
            loadChildren: () =>
              import('../verification-view/verification-view.module')
                .then((m) => m.VerificationViewModule),
          },
          // {
          //   path: 'verification',
          //   loadComponent: () =>
          //     import('../deo-verification/deo-verification')
          //       .then((m) => m.DeoVerification),
          // },
          {
            path: 'registration-status',
            loadComponent: () =>
              import('../deo-registration-status/deo-registration-status')
                .then((m) => m.DeoRegistrationStatus),
          },
          {
            path: 'property-details',
            loadComponent: () =>
              import('../property-balance-calculate/property-balance-calculate')
                .then((m) => m.PropertyBalanceCalculate),
          },
          {
            path: 'dashboard-citizen-services',
            loadComponent: () =>
              import('../citizen-services/citizen-services')
                .then((m) => m.CitizenServices),
          },
          {
            path: 'role-management',
            loadComponent: () =>
              import('../admin-pages/role-management/role-management')
                .then((m) => m.RoleManagement),
          },
          {
            path: 'online-payment-details',
            loadComponent: () =>
              import('../../features/online-payment-detail/online-payment-detail')
                .then((m) => m.OnlinePaymentDetail),
          },
          // deo verification view route 
          {
            path : 'verification',
            loadComponent: () =>
              import('../../features/data-entry-operator-verification-view/data-entry-operator-verification-view')
                .then((m) => m.DataEntryOperatorVerificationView),
          },
          {
            path: 'mandi-wise-allotment-summary',
            loadComponent: () =>
              import('../../features/mandi-wise-allotment-summary/mandi-wise-allotment-summary')
                .then((m) => m.MandiWiseAllotmentSummary),
          },
          {
            path: 'plot-wise-consolidate-details',
            loadComponent: () =>
              import('../../features/plot-wise-consolidate-details/plot-wise-consolidate-details')
                .then((m) => m.PlotWiseConsolidateDetails),
          },
          {
            path : 'property-ownership-verification',
            loadComponent: () =>
              import('../../features/property-ownership-verification/property-ownership-verification')
                .then((m) => m.PropertyOwnershipVerification),
          },
          {
            path : 'application-status',
            loadComponent: () =>
              import('../../features/user-registration-status/user-registration-status')
                .then((m) => m.UserRegistrationStatus),
          },
          {
            path: 'coming-soon',
            loadComponent: () =>
              import('../../features/comming-soon-pages/comming-soon-pages')
                .then((m) => m.CommingSoonPages),
          }
        ]
      }
    ])
  ]
})
export class DashboardModule {}
