import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PlotWiseConsolidateDetail {
  plotType: string;
  plotSize: string;
  totalPlots: number;
  totalSoldPlots: number;
  totalUnsoldPlots: number;
  allPlots: string;
  soldPlots: string;
  unsoldPlots: string;
}

export interface MandiForPropertyReport {
  mandiId: number;
  mandiName: string;
  districtId: number;
}

export interface PlotSoldUnsoldDetail {
  srNo: number;
  districtId: number;
  districtName: string;
  branchId: number;
  marketCommittee: string;
  totalPlots: number;
  soldPlots: number;
  unsoldPlots: number;
}

export interface DigitizationPropertyDayWiseDto {
  createdDate: string;
  count: number;
}

export interface DigitizationPropertyDayWiseDetailsDto {
  propertyCode: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPlotWiseConsolidateDetails(mandiId: number | string): Observable<any> {
    const params = new HttpParams().set('mandiId', mandiId.toString());
    return this.http.get<any>(`${this.baseUrl}/Report/GetPlotWiseConsolidateDetails`, { params });
  }

  getMandisForPropertyReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Report/GetMandisForPropertyReport`);
  }

  getMandiWiseAllotmentSummary(districtId: number = 0, branchId: number = 0, mandiId: number = 0): Observable<any> {
    let params = new HttpParams();
    params = params.set('districtId', (districtId || 0).toString());
    params = params.set('branchId', (branchId || 0).toString());
    params = params.set('mandiId', (mandiId || 0).toString());

    return this.http.get<any>(`${this.baseUrl}/Report/GetMandiWiseAllotmentSummary`, { params });
  }

  getPlotSoldUnsoldDetails(districtId: number = 0, branchId: number = 0): Observable<any> {
    let params = new HttpParams();
    params = params.set('districtId', (districtId || 0).toString());
    params = params.set('branchId', (branchId || 0).toString());

    return this.http.get<any>(`${this.baseUrl}/Report/GetPlotSoldUnsoldDetails`, { params });
  }

  getDigitizationPropertyDayWiseCountAsync(fromDate: string, toDate: string): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<any>(`${this.baseUrl}/Report/GetDigitizationPropertyDayWiseCountAsync`, { params });
  }

  getDigitizationPropertyDayWiseCount(fromDate: string, toDate: string): Observable<any> {
    return this.getDigitizationPropertyDayWiseCountAsync(fromDate, toDate);
  }

  getDigitizationPropertyDayWiseCountDetailsAsync(fromDate: string): Observable<any> {
    const params = new HttpParams()
      .set('fromDate', fromDate);
    return this.http.get<any>(`${this.baseUrl}/Report/GetDigitizationPropertyDayWiseCountDetailsAsync`, { params });
  }

  getDigitizationPropertyDayWiseCountDetails(fromDate: string): Observable<any> {
    return this.getDigitizationPropertyDayWiseCountDetailsAsync(fromDate);
  }
}

