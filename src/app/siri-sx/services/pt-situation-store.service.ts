import { computed, Injectable, signal } from '@angular/core';

import { PtSituation, PtSituationListItem } from '../models';

@Injectable({ providedIn: 'root' })
export class PtSituationStore {
  private readonly itemsState = signal<readonly PtSituationListItem[]>([]);
  private readonly selectedIdState = signal<string | null>(null);
  private readonly xmlBySituation = new Map<string, string>();
  private readonly selectedVersionState = signal<number | null>(null);
  private pending: PtSituationListItem[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  public readonly items = this.itemsState.asReadonly();
  public readonly selectedId = this.selectedIdState.asReadonly();
  public readonly selectedVersion = this.selectedVersionState.asReadonly();
  public readonly selected = computed(() => {
    const selectedId = this.selectedIdState();
    return this.itemsState().find((item) => item.id === selectedId && item.version === this.selectedVersionState());
  });

  public reset(): void {
    if (this.flushTimer !== undefined) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    this.pending = [];
    this.xmlBySituation.clear();
    this.selectedVersionState.set(null);
    this.itemsState.set([]);
    this.selectedIdState.set(null);
  }

  public enqueue(situation: PtSituation, xml?: string): void {
    if (xml !== undefined) this.xmlBySituation.set(this.key(situation), xml);
    this.pending.push(PtSituationListItem.initFromSituation(situation));
    if (this.pending.length >= 50) {
      this.flush();
    } else if (this.flushTimer === undefined) {
      this.flushTimer = setTimeout(() => this.flush(), 50);
    }
  }

  public flush(): void {
    if (this.flushTimer !== undefined) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (this.pending.length === 0) return;

    const batch = this.pending;
    this.pending = [];
    this.itemsState.update((items) => [...items, ...batch]);
    if (this.selectedIdState() === null) {
      this.select(batch[0].id, batch[0].version);
    }
  }

  public select(id: string | null, version?: number): void {
    this.selectedVersionState.set(version ?? this.itemsState().find((item) => item.id === id)?.version ?? null);
    this.selectedIdState.set(id);
  }

  public xmlFor(situation: Pick<PtSituationListItem, 'id' | 'version'>): string | undefined {
    return this.xmlBySituation.get(this.key(situation));
  }

  public key(situation: Pick<PtSituationListItem, 'id' | 'version'>): string {
    return JSON.stringify([situation.id, situation.version]);
  }
}
