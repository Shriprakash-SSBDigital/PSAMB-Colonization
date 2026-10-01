import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Userservice {
  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) { }

  UserPropertyRegistration(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/UserPropertyRegistration/UserPropertyRegistration`, payload);
  }

  GetMandiPlotSizeByPlotNo(mandiId: any, plotTypeId: any, plotNo: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/UserPropertyRegistration/GetMandiPlotSizeByPlotNo?MandiId=${mandiId}&PlotTypeId=${plotTypeId}&PlotNo=${encodeURIComponent(plotNo)}`);
  }

  // GetPropertyOwnerVerification(userId: any, districtId: any, branchId: any, mandiId: any): Observable<any> {
  //   return this.http.get<any>(`${this.baseUrl}/UserPropertyRegistration/GetPropertyOwnerVerification` +
  //     `?userId=${userId}&districtId=${districtId}&branchId=${branchId}&mandiId=${mandiId}`
  //   );
  // }


  GetPropertyOwnerVerification(searchCode?: string): Observable<any> {
    let url = `${this.baseUrl}/UserPropertyRegistration/GetPropertyOwnerVerification`;
    if (searchCode) {
      url += `?searchCode=${encodeURIComponent(searchCode)}`;
    }
    return this.http.get<any>(url);
  }
  VerifyByClerkForUser(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/UserPropertyRegistration/VerifyByClerkForUser`, payload);
  }
  ViewDocumentsByUserId(applicantID: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/UserPropertyRegistration/GetUserDocumentsByUserIDAsync?applicantID=${applicantID}`);
  }
}
