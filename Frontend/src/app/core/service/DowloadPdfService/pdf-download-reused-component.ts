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
    const payload = { mandiId, plotTypeId, plotNo, PlotSize, isSold };
    return this.http.post(`${this.baseUrl}/Report/GetPdfReport`, payload, { responseType: 'blob' });
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
}
