import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MandiWiseService {
  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMandiWiseAllotmentSummary(districtId: number = 0, branchId: number = 0, mandiId: number = 0): Observable<any> {
    let params = new HttpParams();
    params = params.set('districtId', (districtId || 0).toString());
    params = params.set('branchId', (branchId || 0).toString());
    params = params.set('mandiId', (mandiId || 0).toString());

    return this.http.get<any>(`${this.baseUrl}/Report/GetMandiWiseAllotmentSummary`, { params });
  }
}
