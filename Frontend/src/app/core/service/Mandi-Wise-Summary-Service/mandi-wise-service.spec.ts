import { TestBed } from '@angular/core/testing';

import { MandiWiseService } from './mandi-wise-service';

describe('MandiWiseService', () => {
  let service: MandiWiseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MandiWiseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
