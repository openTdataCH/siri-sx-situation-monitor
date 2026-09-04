import { AffectedLineView, PtSituationListItem, TimeInterval } from '../models';
import { AffectedLineLinkService } from './affected-line-link.service';

describe('AffectedLineLinkService', () => {
  it('looks up line trips and builds an OJP link from the selected trip stops', async () => {
    const fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo(new Response(JSON.stringify({
      rows: [{
        departure_time: '08:15:00',
        departure_day_minutes: 495,
        stop_times_s: '8500010|08:15:00|08:15:00 -- 8500020|08:45:00|08:45:00'
      }]
    }), { status: 200 }));
    const line: AffectedLineView = {
      key: 'ch:1:sboid:100602|85:801:2682|310',
      ref: '85:801:2682',
      name: '310',
      operatorRef: 'ch:1:sboid:100602',
      affectedStopRefs: []
    };
    const situation = {
      validityPeriods: [new TimeInterval(
        new Date('2026-08-26T07:00:00+02:00'),
        new Date('2026-09-11T18:30:00+02:00')
      )]
    } as unknown as PtSituationListItem;

    const url = await new AffectedLineLinkService().build(
      line,
      situation,
      '2026-08-31',
      'de',
      new Date('2026-08-31T08:00:00+02:00')
    );

    const requestUrl = new URL(fetchSpy.calls.mostRecent().args[0] as string);
    expect(requestUrl.searchParams.get('route_short_name')).toBe('310');
    expect(requestUrl.searchParams.get('line_ref')).toBe('85:801:2682');
    expect(requestUrl.searchParams.get('service_day')).toBe('2026-08-31');

    const ojpUrl = new URL(url);
    expect(ojpUrl.searchParams.get('from')).toBe('8500010');
    expect(ojpUrl.searchParams.get('to')).toBe('8500020');
    expect(ojpUrl.searchParams.get('trip_datetime')).toBe('2026-08-31 08:15');
    expect(ojpUrl.searchParams.get('do_search')).toBe('yes');
  });

  it('uses the last distinct stop when a circular trip ends at its origin', async () => {
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(JSON.stringify({
      rows: [{
        departure_time: '14:37:00',
        departure_day_minutes: 877,
        stop_times_s: [
          'ch:1:sloid:78730|14:37:00|14:37:00',
          'ch:1:sloid:78731|14:45:00|14:45:00',
          'ch:1:sloid:78732|14:52:00|14:52:00',
          'ch:1:sloid:78730|15:00:00|15:00:00'
        ].join(' -- ')
      }]
    }), { status: 200 }));
    const line: AffectedLineView = {
      key: 'operator|line|circular',
      ref: 'line',
      name: 'circular',
      operatorRef: 'operator',
      affectedStopRefs: []
    };
    const situation = {
      validityPeriods: [new TimeInterval(
        new Date('2026-09-03T00:00:00+02:00'),
        new Date('2026-09-03T23:59:00+02:00')
      )]
    } as unknown as PtSituationListItem;

    const url = await new AffectedLineLinkService().build(
      line,
      situation,
      '2026-09-03',
      'de',
      new Date('2026-09-03T14:30:00+02:00')
    );
    const ojpUrl = new URL(url);

    expect(ojpUrl.searchParams.get('from')).toBe('ch:1:sloid:78730');
    expect(ojpUrl.searchParams.get('to')).toBe('ch:1:sloid:78732');
  });

  it('recognizes decorated GTFS SLOIDs as the affected origin stop', async () => {
    spyOn(globalThis, 'fetch').and.resolveTo(new Response(JSON.stringify({
      rows: [{
        departure_time: '14:37:00',
        departure_day_minutes: 877,
        stop_times_s: [
          'ch:1:sloid:78730_gen:missingSLOID_pf:B||14:37',
          'ch:1:sloid:90243_gen:missingSLOID_pf:B|14:37|14:37',
          'ch:1:sloid:78738|14:45|'
        ].join(' -- ')
      }]
    }), { status: 200 }));
    const line: AffectedLineView = {
      key: 'ch:1:sboid:100672|85:873:391|391',
      ref: '85:873:391',
      name: '391',
      operatorRef: 'ch:1:sboid:100672',
      affectedStopRefs: ['ch:1:sloid:78730']
    };
    const situation = {
      validityPeriods: [new TimeInterval(
        new Date('2026-09-03T04:30:00Z'),
        new Date('2026-09-03T15:00:44Z')
      )]
    } as unknown as PtSituationListItem;

    const url = await new AffectedLineLinkService().build(
      line,
      situation,
      '2026-09-03',
      'de',
      new Date('2026-09-03T14:37:00+02:00')
    );
    const ojpUrl = new URL(url);

    expect(ojpUrl.searchParams.get('from')).toBe('ch:1:sloid:78730');
    expect(ojpUrl.searchParams.get('to')).toBe('ch:1:sloid:78738');
  });
});
