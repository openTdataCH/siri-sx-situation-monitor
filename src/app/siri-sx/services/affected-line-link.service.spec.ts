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
});
