import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Common {
  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAllStates(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getAllStates`);
  }

  getAllDistrict(stateid: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getAllDistrict`, { params: { stateid } });
  }

  GetAllCityByDistrictID(districtid: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/GetAllCityByDistrictID`, { params: { districtid } });
  }

  getMarketCommittees(districtId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getMarketCommittees`, { params: { districtId } });
  }

  getPlotTypes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getPlotTypes`);
  }

  getPlotSizes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getPlotSizes`);
  }

  getPlans(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getPlans`);
  }

  getPropertyTypes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getPropertyTypes`);
  }

  getBidderTypes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getBidderTypes`);
  }

  getApplicationStatuses(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getApplicationStatuses`);
  }

  getPropertyCategories(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getPropertyCategories`);
  }

  GetMandisByMarketCommiteeByDistrictAsync(branchID: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/GetMandisByMarketCommiteeByDistrictAsync`, { params: { branchID } });
  }

  getMenuItemsByRole(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Auth/profile`);
  }
  GetPlotTypesByMandiId(mandiId: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/GetPlotTypesByMandiId`, { params: { mandiId } });
  }

  GetPlotNoByPlotTypeID(ploytypeid: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/GetPlotNoByPlotTypeID`, { params: { ploytypeid } });
  }

  GetPlotSizeByPlotNo(plotNo: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/GetPlotSizeByPlotNo`, { params: { plotNo } });
  }

  GetPropertyDetailsByPlot(mandiId: any, plotTypeId: any, plotNo: any, plotSize: any): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/GetPropertyDetailsByPlot`, { params: { mandiId, plotTypeId, plotNo, plotSize } });
  }

  getProfileDetailsByUserId(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Common/getProfileDetailsByUserId`);
  }
  
    GetProfileImageByUserId(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/common/GetProfileImageByUserId`);
  }
}
