import { computed, Injectable, signal } from '@angular/core';

import { PtSituation, PtSituationListItem } from '../models';

@Injectable({ providedIn: 'root' })
export class PtSituationStore {
  private readonly itemsState = signal<readonly PtSituationListItem[]>([]);
  private readonly selectedIdState = signal<string | null>(null);
  private pending: PtSituationListItem[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | undefined;

  public readonly items = this.itemsState.asReadonly();
  public readonly selectedId = this.selectedIdState.asReadonly();
  public readonly selected = computed(() => {
    const selectedId = this.selectedIdState();
    return this.itemsState().find((item) => item.id === selectedId);
  });

  public reset(): void {
    if (this.flushTimer !== undefined) clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    this.pending = [];
    this.itemsState.set([]);
    this.selectedIdState.set(null);
  }

  public enqueue(situation: PtSituation): void {
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
      this.selectedIdState.set(batch[0].id);
    }
  }

  public select(id: string | null): void {
    this.selectedIdState.set(id);
  }
}
