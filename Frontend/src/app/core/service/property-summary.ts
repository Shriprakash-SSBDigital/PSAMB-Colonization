import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { Common } from './CommonService/common';

export interface PropertySummaryData {
  totalProperties?: number;
  soldProperties?: number;
  unsoldProperties?: number;
  digitizedProperties?: number;
  forfeitedProperties?: number;
  monthlyCollection?: number;
  monthlyDues?: number;
  ndcIssued?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PropertySummary {
  private readonly storageKey = 'property_summary';
  private request$: Observable<PropertySummaryData> | null = null;

  constructor(private common: Common) {}

  getPropertySummary(): Observable<PropertySummaryData> {
    const cachedSummary = this.readCachedSummary();
    if (cachedSummary) {
      return of(cachedSummary);
    }

    if (!this.request$) {
      this.request$ = this.common.GetPropertySummary().pipe(
        map((response) => {
          if (!response?.success || !this.isValidSummary(response.responseData)) {
            throw new Error('Property Summary API returned an unsuccessful or invalid response.');
          }

          return response.responseData;
        }),
        tap((summary) => this.writeCachedSummary(summary)),
        catchError((error: unknown) => {
          this.request$ = null;
          return throwError(() => error);
        }),
        finalize(() => {
          this.request$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.request$;
  }

  private readCachedSummary(): PropertySummaryData | null {
    try {
      const storedSummary = sessionStorage.getItem(this.storageKey);
      if (!storedSummary) {
        return null;
      }

      const summary: unknown = JSON.parse(storedSummary);
      if (this.isValidSummary(summary)) {
        return summary;
      }

      sessionStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to read cached property summary:', error);
      this.removeCachedSummary();
    }

    return null;
  }

  private writeCachedSummary(summary: PropertySummaryData): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(summary));
    } catch (error) {
      console.error('Failed to cache property summary:', error);
    }
  }

  private removeCachedSummary(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to remove cached property summary:', error);
    }
  }

  private isValidSummary(value: unknown): value is PropertySummaryData {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const summary = value as Record<string, unknown>;
    const summaryFields = [
      'totalProperties',
      'soldProperties',
      'unsoldProperties',
      'digitizedProperties',
      'forfeitedProperties',
      'monthlyCollection',
      'monthlyDues',
      'ndcIssued',
    ];

    return summaryFields.some((field) => typeof summary[field] === 'number' && Number.isFinite(summary[field]));
  }
}
