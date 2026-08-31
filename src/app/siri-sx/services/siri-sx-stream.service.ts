import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { PtSituation } from '../models';
import { SIRI_SX_ENDPOINTS } from './siri-sx-http.service';

export type SiriSxStreamEvent =
  | { type: 'situation'; situation: PtSituation; index: number }
  | { type: 'invalid-situation'; invalid: InvalidPtSituation }
  | { type: 'complete'; count: number; validCount: number; invalidCount: number };

export interface InvalidPtSituation {
  index: number;
  situationNumber?: string;
  message: string;
  xml: string;
}

type WorkerResponse =
  | { type: 'situation'; xml: string; index: number }
  | { type: 'complete'; count: number }
  | { type: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class SiriSxStreamService {
  private readonly endpoints = inject(SIRI_SX_ENDPOINTS);
  private readonly invalidPoolState = signal<readonly InvalidPtSituation[]>([]);

  public readonly invalidSituations = this.invalidPoolState.asReadonly();

  public streamSituations(): Observable<SiriSxStreamEvent> {
    return new Observable((subscriber) => {
      this.invalidPoolState.set([]);
      let validCount = 0;
      let processedCount = 0;
      let endpointIndex = 0;
      let worker: Worker | undefined;
      const seenSituations = new Set<string>();

      const startNextEndpoint = (): void => {
        const endpoint = this.endpoints[endpointIndex];
        if (!endpoint) {
          subscriber.next({
            type: 'complete',
            count: processedCount,
            validCount,
            invalidCount: this.invalidPoolState().length
          });
          subscriber.complete();
          return;
        }

        worker = new Worker(
          new URL('../workers/siri-sx-parser.worker', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
          if (data.type === 'situation') {
            processedCount += 1;
            try {
              const situation = PtSituation.initFromXml(data.xml);
              const situationKey = `${situation.id}\u0000${situation.version}`;
              if (seenSituations.has(situationKey)) return;
              seenSituations.add(situationKey);
              validCount += 1;
              subscriber.next({
                type: 'situation',
                situation,
                index: processedCount
              });
            } catch (error: unknown) {
              const invalid: InvalidPtSituation = {
                index: processedCount,
                situationNumber: extractSituationNumber(data.xml),
                message: error instanceof Error ? error.message : 'Unknown PtSituation construction error.',
                xml: data.xml
              };
              this.invalidPoolState.update((pool) => [...pool, invalid]);
              subscriber.next({ type: 'invalid-situation', invalid });
            }
            return;
          }

          if (data.type === 'complete') {
            worker?.terminate();
            worker = undefined;
            endpointIndex += 1;
            startNextEndpoint();
            return;
          }

          subscriber.error(new Error(`${endpoint}: ${data.message}`));
          worker?.terminate();
        };

        worker.onerror = (event) => {
          subscriber.error(new Error(`${endpoint}: ${event.message || 'SIRI-SX parser worker failed.'}`));
          worker?.terminate();
        };

        worker.postMessage({ type: 'parse', url: endpoint });
      };

      startNextEndpoint();
      return () => worker?.terminate();
    });
  }
}

function extractSituationNumber(xml: string): string | undefined {
  const match = /<SituationNumber>([^<]+)<\/SituationNumber>/.exec(xml);
  return match?.[1].trim();
}
