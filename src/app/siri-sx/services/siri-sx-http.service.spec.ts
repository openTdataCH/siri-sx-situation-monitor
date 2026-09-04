import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SIRI_SX_ENDPOINT, SiriSxHttpService } from './siri-sx-http.service';

describe('SiriSxHttpService', () => {
  const endpoint = '/test/siri-sx.xml';
  let service: SiriSxHttpService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SIRI_SX_ENDPOINT, useValue: endpoint }
      ]
    });

    service = TestBed.inject(SiriSxHttpService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads the configured endpoint as XML', () => {
    let result: XMLDocument | undefined;
    service.getDocument().subscribe((document) => (result = document));

    const request = httpTesting.expectOne(endpoint);
    expect(request.request.responseType).toBe('text');
    request.flush('<Siri version="2.0"><ServiceDelivery /></Siri>');

    expect(result?.documentElement.localName).toBe('Siri');
  });

  it('reports malformed XML', () => {
    let error: unknown;
    service.getDocument().subscribe({ error: (value: unknown) => (error = value) });

    httpTesting.expectOne(endpoint).flush('<Siri>');

    expect(error).toEqual(jasmine.any(Error));
  });
});
