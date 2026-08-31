import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable } from 'rxjs';

export const SIRI_SX_ENDPOINT = new InjectionToken<string>('SIRI_SX_ENDPOINT', {
  providedIn: 'root',
  factory: () => {
    return 'https://tools.opentransportdata.swiss/data/siri-sx/siri_sx-latest-prod.xml';
  }
});

export const SIRI_SX_ENDPOINTS = new InjectionToken<readonly string[]>('SIRI_SX_ENDPOINTS', {
  providedIn: 'root',
  factory: () => [
    inject(SIRI_SX_ENDPOINT),
    'https://tools.opentransportdata.swiss/data/siri-sx/siri_sx-unplanned-latest-prod.xml'
  ]
});

@Injectable({ providedIn: 'root' })
export class SiriSxHttpService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(SIRI_SX_ENDPOINT);

  /** Returns the response unchanged for diagnostics or downstream parsing. */
  public getXml(): Observable<string> {
    return this.http.get(this.endpoint, { responseType: 'text' });
  }

  /** Returns a browser XML document and rejects malformed XML responses. */
  public getDocument(): Observable<XMLDocument> {
    return this.getXml().pipe(map((xml) => this.parseXml(xml)));
  }

  private parseXml(xml: string): XMLDocument {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const parserError = document.getElementsByTagName('parsererror').item(0);

    if (parserError) {
      throw new Error(`Invalid SIRI-SX XML: ${parserError.textContent?.trim() ?? 'unknown parse error'}`);
    }

    return document;
  }
}
