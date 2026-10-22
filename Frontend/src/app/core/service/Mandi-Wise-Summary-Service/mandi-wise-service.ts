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

  getAllMandisForMandiWiseAllotmentSummary(search: string = ''): Observable<any> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<any>(`${this.baseUrl}/Report/GetAllMandisForMandiWiseAllotmentSummaryAsync`, { params });
  }

  getMandiWiseAllotmentSummary(
    districtId: number = 0,
    branchId: number = 0,
    mandiId: number = 0,
    pageNumber: number = 1,
    pageSize: number = 10,
    fromDate?: string | null,
    toDate?: string | null
  ): Observable<any> {
    let params = new HttpParams();
    params = params.set('districtId', (districtId || 0).toString());
    params = params.set('branchId', (branchId || 0).toString());
    params = params.set('mandiId', (mandiId || 0).toString());
    params = params.set('pageNumber', (pageNumber || 1).toString());
    params = params.set('pageSize', (pageSize || 10).toString());
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }

    return this.http.get<any>(`${this.baseUrl}/Report/GetMandiWiseAllotmentSummary`, { params });
  }

  getPlotWiseConsolidateDetails(
    mandiId: number | string,
    pageNumber: number = 1,
    pageSize: number = 10
  ): Observable<any> {
    const params = new HttpParams()
      .set('mandiId', mandiId.toString())
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<any>(`${this.baseUrl}/Report/GetPlotWiseConsolidateDetails`, { params });
  }

  exportPlotWiseConsolidateDetails(mandiId: number | string): Observable<Blob> {
    const params = new HttpParams().set('mandiId', mandiId.toString());
    return this.http.get(`${this.baseUrl}/Report/ExportPlotWiseConsolidateDetails`, {
      params,
      responseType: 'blob',
    });
  }

  exportPlotWiseConsolidateDetailsPdf(mandiId: number | string): Observable<Blob> {
    const params = new HttpParams().set('mandiId', mandiId.toString());
    return this.http.get(`${this.baseUrl}/Report/ExportPlotWiseConsolidateDetailsPdf`, {
      params,
      responseType: 'blob',
    });
  }

  getMandisForPropertyReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Report/GetMandisForPropertyReport`);
  }

  exportMandiWiseAllotmentSummary(
    districtId: number = 0,
    branchId: number = 0,
    mandiId: number = 0,
    fromDate?: string | null,
    toDate?: string | null,
    columns?: string | null
  ): Observable<Blob> {
    let params = new HttpParams();
    params = params.set('districtId', (districtId || 0).toString());
    params = params.set('branchId', (branchId || 0).toString());
    params = params.set('mandiId', (mandiId || 0).toString());
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    if (columns) {
      params = params.set('columns', columns);
    }

    return this.http.get(`${this.baseUrl}/Report/ExportMandiWiseAllotmentSummary`, {
      params,
      responseType: 'blob',
    });
  }

  exportPdfMandiWiseAllotmentSummary(
    districtId: number = 0,
    branchId: number = 0,
    mandiId: number = 0,
    fromDate?: string | null,
    toDate?: string | null,
    columns?: string | null
  ): Observable<Blob> {
    let params = new HttpParams();
    params = params.set('districtId', (districtId || 0).toString());
    params = params.set('branchId', (branchId || 0).toString());
    params = params.set('mandiId', (mandiId || 0).toString());
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    if (columns) {
      params = params.set('columns', columns);
    }

    return this.http.get(`${this.baseUrl}/Report/ExportMandiWiseAllotmentSummaryPdf`, {
      params,
      responseType: 'blob',
    });
  }
}
