import { PtSituationStore } from './pt-situation-store.service';
import { PtSituation } from '../models';
import { situationXml } from '../models/situation-test-fixture';

describe('PtSituationStore XML', () => {
  it('keeps versions separate across streaming batches and clears pending XML on reset', () => {
    const store = new PtSituationStore();
    const first = PtSituation.initFromXml(situationXml('same', 1));
    const second = PtSituation.initFromXml(situationXml('same', 2));
    store.enqueue(first, situationXml('same', 1));
    store.flush();
    store.enqueue(second, situationXml('same', 2));
    store.flush();
    expect(store.selected()?.version).toBe(1);
    store.select('same', 2);
    expect(store.selected()?.version).toBe(2);
    expect(store.xmlFor(first)).toBe(situationXml('same', 1));
    expect(store.xmlFor(second)).toBe(situationXml('same', 2));
    store.enqueue(PtSituation.initFromXml(situationXml('pending')), situationXml('pending'));
    store.reset();
    store.flush();
    expect(store.items()).toEqual([]);
    expect(store.selected()).toBeUndefined();
    expect(store.xmlFor(first)).toBeUndefined();
    expect(store.xmlFor(second)).toBeUndefined();
    expect(store.xmlFor({ id: 'pending', version: 1 })).toBeUndefined();
  });
});
