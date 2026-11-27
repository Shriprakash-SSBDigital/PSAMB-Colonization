import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PdfDownloadReusedComponent {

  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private DownloadPdf(mandiId: number, plotTypeId: number, plotNo: string, PlotSize: string, isSold: boolean): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/Report/GetPdfReport`, {
      params: { mandiId, plotTypeId, plotNo, PlotSize, isSold },
     responseType: 'blob',
    });
  }
  private DownloadPdfForPropertyDetails(propertyCode: string, isSold: boolean): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/Report/GetPdfReportforpropertyDetail`, {
      params: { propertyCode, isSold },
      responseType: 'blob' });
  }

  downloadPlotDetailsPdf(
    mandiId: number,
    plotTypeId: number,
    plotNo: string,
    plotSize: string,
    isSold: boolean
  ): Observable<void> {
    return this.DownloadPdf(mandiId, plotTypeId, plotNo, plotSize, isSold).pipe(
      tap((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Plot_Details_${plotNo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      }),
      map(() => undefined)
    );
  }

  downloadPropertyDetailsPdf(propertyCode: string, isSold: boolean): Observable<void> {
    return this.DownloadPdfForPropertyDetails(propertyCode, isSold).pipe(
      tap((blob) => this.savePdf(blob, `Property_Details_${propertyCode}.pdf`)),
      map(() => undefined)
    );
  }

  private savePdf(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
}
