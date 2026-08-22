import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { PtSituation } from '../models';
import { SIRI_SX_ENDPOINT } from './siri-sx-http.service';

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
  private readonly endpoint = inject(SIRI_SX_ENDPOINT);
  private readonly invalidPoolState = signal<readonly InvalidPtSituation[]>([]);

  public readonly invalidSituations = this.invalidPoolState.asReadonly();

  public streamSituations(): Observable<SiriSxStreamEvent> {
    return new Observable((subscriber) => {
      this.invalidPoolState.set([]);
      let validCount = 0;
      const worker = new Worker(
        new URL('../workers/siri-sx-parser.worker', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
        if (data.type === 'situation') {
          try {
            const situation = PtSituation.initFromXml(data.xml);
            validCount += 1;
            subscriber.next({
              type: 'situation',
              situation,
              index: data.index
            });
          } catch (error: unknown) {
            const invalid: InvalidPtSituation = {
              index: data.index,
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
          subscriber.next({
            type: 'complete',
            count: data.count,
            validCount,
            invalidCount: this.invalidPoolState().length
          });
          subscriber.complete();
          worker.terminate();
          return;
        }

        subscriber.error(new Error(data.message));
        worker.terminate();
      };

      worker.onerror = (event) => {
        subscriber.error(new Error(event.message || 'SIRI-SX parser worker failed.'));
        worker.terminate();
      };

      worker.postMessage({ type: 'parse', url: this.endpoint });

      return () => worker.terminate();
    });
  }
}

function extractSituationNumber(xml: string): string | undefined {
  const match = /<SituationNumber>([^<]+)<\/SituationNumber>/.exec(xml);
  return match?.[1].trim();
}
