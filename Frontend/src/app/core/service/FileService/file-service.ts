import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FileUploadPayload {
  file: File;
  documentCategoryId: number;
  documentTypeId: number;
  documentNumber: string;
  sessionId: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) { }

    // DocumentCategoryId:
    //   1 = Upload Your Photo
    //   2 = Identification Document
    //   3 = Address Document
    //   4 = Property Document
   
    // DocumentTypeId (Category 2 – Identification):
    //   1 = Aadhaar Card, 2 = Voter Card, 3 = Passport, 4 = Other Gov. Photo ID
   
    // DocumentTypeId (Category 3 – Address):
    //   1 = Aadhaar Card, 2 = Passport, 3 = Electricity Bill, 4 = Water Bill, 5 = Rent Agreement, 6 = Registry Deed
    // DocumentTypeId (Category 1 – Photo): pass 0

    // DocumentTypeId (Category 4 – Property Document):
    //   1 = Allotment Letter, 2 = Last Payment Receipt, 3 = No Due Certificate, 4 = B.Form,
    //   5 = Conveyance Deed, 6 = Sale Deed, 7 = Transfer Order, 8 = Legal Heir Certificate
   
  UploadFile(payload: FileUploadPayload): Observable<any> {
    const formData = new FormData();
    formData.append('File', payload.file, payload.file.name);
    formData.append('DocumentCategoryId', String(payload.documentCategoryId));
    formData.append('DocumentTypeId', String(payload.documentTypeId));
    formData.append('DocumentNumber', payload.documentNumber);
    formData.append('SessionId', payload.sessionId);
    return this.http.post<any>(`${this.baseUrl}/File/upload`, formData);
  }
}

