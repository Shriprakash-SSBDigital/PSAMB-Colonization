import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PdfDownloadReusedComponent {

  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {}

  downloadPlotDetailsPdf(
    mandiId: number,
    plotTypeId: number,
    plotNo: string,
    plotSize: string,
    isSold: boolean
  ): Observable<void> {

    const params = new HttpParams()
      .set('mandiId', mandiId)
      .set('plotTypeId', plotTypeId)
      .set('plotNo', plotNo)
      .set('PlotSize', plotSize)
      .set('isSold', isSold);

    return this.http.get(
      `${this.baseUrl}/Report/GetPdfReport`,
      {
        params,
        responseType: 'blob'
      }
    ).pipe(
      tap((blob) => this.triggerDownload(blob)),
      map(() => undefined)
    );
  }

  downloadPropertyDetailsPdf(
    propertyCode: string,
    isSold: boolean
  ): Observable<void> {

    const params = new HttpParams()
      .set('propertyCode', propertyCode)
      .set('isSold', isSold);

    return this.http.get(
      `${this.baseUrl}/Report/GetPdfReportforpropertyDetail`,
      {
        params,
        responseType: 'blob'
      }
    ).pipe(
      tap((blob) => this.triggerDownload(blob)),
      map(() => undefined)
    );
  }

  private triggerDownload(blob: Blob): void {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.target = '_blank';
    link.href = objectUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }
}
