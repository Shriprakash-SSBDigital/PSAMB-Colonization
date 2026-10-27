import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Propertybidderregn {
  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) { }

  registerProperty(payload: any): Observable<any> {
    // debugger
    return this.http.post<any>(`${this.baseUrl}/PropertyBidderRegn/registerProperty`, payload);
  }
  GetAllRegisterPropertyById() {
    return this.http.get<any>(
      `${this.baseUrl}/PropertyBidderRegn/GetAllRegisterPropertyById`
    );
  }
  getRegistrationById(id: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/getRegistrationById?id=${id}`);
  }

  getAllPropertyRegistrations(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/getAllPropertyRegistrations`);
  }

  getPropertyByCode(propertyCode: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/search/${encodeURIComponent(propertyCode)}`);
  }
  GetPropertyEAuctionDetailsByPropertyCodeAsync(propertyCode: string, isSold: boolean = false): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyEAuctionDetailsByPropertyCodeAsync/${encodeURIComponent(propertyCode)}?isSold=${isSold}`);
  }
  UpdateRegisterPropertyAsync(payload: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/PropertyBidderRegn/UpdateRegisterPropertyAsync`, payload);
  }


  GetPendingForClerk(searchCode?: string): Observable<any> {
    let url = `${this.baseUrl}/PropertyBidderRegn/GetPendingForClerk`;
    if (searchCode) {
      url += `?searchCode=${encodeURIComponent(searchCode)}`;
    }
    return this.http.get<any>(url);
  }

  getPropertyHistory(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyTimelineHistory/${id}`);
  }

  VerifyByClerk(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/PropertyBidderRegn/VerifyByClerk`, payload);
  }

  getPropertyDistricts(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyDistricts`);
  }

  getPropertyBranches(districtId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyBranches/${districtId}`);
  }

  getPropertyMandis(branchId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyMandis/${branchId}`);
  }

  getPropertyPlotTypes(mandiId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyPlotTypes/${mandiId}`);
  }

  getAuctionedPlots(mandiId: any, plotTypeId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetAuctionedPlots?mandiId=${mandiId}&plotTypeId=${plotTypeId}`);
  }

  getPropertyDetailsByMandiPlot(mandiId: any, plotTypeId: any, plotNo: any, PlotSize: any, isSold: boolean = false): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyDetailsByMandiPlot?MandiId=${mandiId}&PlotTypeId=${plotTypeId}&PlotNo=${encodeURIComponent(plotNo)}&PlotSize=${encodeURIComponent(PlotSize)}&isSold=${isSold}`);
  }

  getPropertyMandiBranchesByDistrict(districtId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyMandiBrancheByDistrictIdAsync/${districtId}`);
  }

  getPropertyMandiBranchesByBranchId(branchId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyMandisByBranchIdAsync/${branchId}`);
  }

  getPropertyPlotTypesAsync(mandiId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPropertyMandiPlotTypesAsync/${mandiId}`);
  }

  getPlotsByPlotTypesAsync(mandiId: any, plotTypeId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPlotsByPlotTypeAsync?mandiId=${mandiId}&plotTypeId=${plotTypeId}`);
  }
  GetBiderPropertyDetailsByMandiPlotAsync(mandiId: any, plotTypeId: any, plotNo: any, plotSize: any, isSold: boolean = true): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetBiderPropertyDetailsByMandiPlotAsync?MandiId=${mandiId}&PlotTypeId=${plotTypeId}&PlotNo=${encodeURIComponent(plotNo)}&PlotSize=${encodeURIComponent(plotSize)}&isSold=${isSold}`);
  }

  GetPlotSizebyPlotNo(mandiId: any, plotTypeId: any, plotNo: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/PropertyBidderRegn/GetPlotSizebyPlotNo?MandiId=${mandiId}&PlotTypeId=${plotTypeId}&PlotNo=${encodeURIComponent(plotNo)}`);
  }
}
