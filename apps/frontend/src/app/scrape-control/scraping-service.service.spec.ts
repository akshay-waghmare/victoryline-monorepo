import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { ScrapingService } from './scraping-service.service';

describe('ScrapingService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [HttpClientTestingModule]
  }));

  it('should be created', () => {
    const service: ScrapingService = TestBed.get(ScrapingService);
    expect(service).toBeTruthy();
  });
});
