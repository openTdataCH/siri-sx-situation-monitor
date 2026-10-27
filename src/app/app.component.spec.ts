import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { AppComponent } from './app.component';
import { BusinessOrganisationService } from './business-organisations';
import { PtSituation } from './siri-sx/models';
import { situationXml } from './siri-sx/models/situation-test-fixture';
import { PtSituationStore, SiriSxStreamService } from './siri-sx/services';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        {
          provide: SiriSxStreamService,
          useValue: {
            invalidSituations: signal([]).asReadonly(),
            streamSituations: () => EMPTY
          }
        },
        {
          provide: BusinessOrganisationService,
          useValue: {
            load: () => Promise.resolve(),
            error: signal(undefined).asReadonly(),
            displayName: (sboid: string) => sboid,
            shortName: (sboid: string) => sboid
          }
        }
      ]
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.app-header h1')?.textContent).toContain('SIRI-SX Browser');
  });

  it('filters individual perspectives across combinations and retains exact matches', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const store = TestBed.inject(PtSituationStore);
    for (const [id, perspectives] of [
      ['stop-only', ['stopPoint']],
      ['combined', ['general', 'stopPoint', 'vehicleJourney']],
      ['general-only', ['general']],
      ['line-only', ['line']],
      ['no-perspective', []]
    ] as const) {
      const xml = situationXml(id).replace('<OwnerRef>',
        perspectives.map((perspective) => `<Perspective>${perspective}</Perspective>`).join('') + '<OwnerRef>');
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      // Two matching actions must still contribute only one situation to counts.
      if (id === 'combined') {
        const action = document.querySelector('PublishingAction')!;
        action.parentNode!.appendChild(action.cloneNode(true));
      }
      store.enqueue(PtSituation.initFromXml(new XMLSerializer().serializeToString(document)));
    }
    store.flush();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const select = element.querySelector<HTMLSelectElement>('#filter-perspective')!;
    const choose = (value: string): string[] => {
      select.value = value;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      return fixture.componentInstance['filteredItems']().map((item) => item.id);
    };
    expect(select.querySelector('option[value="contains:stopPoint"]')?.textContent)
      .toContain('Contains stopPoint (2)');
    expect(select.querySelector('option[value="contains:general"]')?.textContent)
      .toContain('Contains general (2)');
    expect(choose('contains:stopPoint')).toEqual(['stop-only', 'combined']);
    expect(select.value).toBe('contains:stopPoint');
    expect(choose('stopPoint')).toEqual(['stop-only']);
    expect(choose('general|stopPoint|vehicleJourney')).toEqual(['combined']);
    expect(choose('contains:vehicleJourney')).toEqual(['combined']);
    expect(choose('contains:general')).toEqual(['combined', 'general-only']);
    expect(choose('contains:line')).toEqual(['line-only']);
    expect(choose('')).toHaveSize(5);

    choose('contains:stopPoint');
    const search = element.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'general-only';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(select.value).toBe('');
    expect(fixture.componentInstance['filteredItems']().map((item) => item.id)).toEqual(['general-only']);
    expect(select.querySelector('option[value="contains:general"]')?.textContent)
      .toContain('Contains general (1)');
  });

  for (const viewMode of ['browser', 'timeline'] as const) {
    it(`shows the selected ID and version XML in ${viewMode}`, () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.componentRef.setInput('viewMode', viewMode);
      fixture.detectChanges();
      const store = TestBed.inject(PtSituationStore);
      const now = new Date();
      const start = new Date(now.getTime() - 3600000).toISOString();
      const end = new Date(now.getTime() + 3600000).toISOString();
      for (const [id, version] of [['same-id', 1], ['same-id', 2], ['other-id', 1]] as const) {
        const xml = situationXml(id, version)
          .replaceAll('2026-09-04T08:00:00Z', start).replaceAll('2026-09-05T08:00:00Z', end);
        store.enqueue(PtSituation.initFromXml(xml), xml);
      }
      store.flush();
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('app-situation-xml')).toBeNull();
      const xmlCheckbox = element.querySelector<HTMLInputElement>('input[aria-controls="situation-xml-panel"]')!;
      xmlCheckbox.click();
      fixture.detectChanges();
      expect(element.querySelector('.situation-metadata')).not.toBeNull();
      expect(element.querySelector('.xml-pane')).not.toBeNull();
      expect(element.querySelector('.detail-pane app-situation-xml')).toBeNull();
      for (const item of store.items()) {
        store.select(item.id, item.version);
        fixture.detectChanges();
        const code = element.querySelector('app-situation-xml code')!.textContent!;
        const document = new DOMParser().parseFromString(code, 'application/xml');
        expect(document.querySelector('SituationNumber')?.textContent).toBe(item.id);
        expect(document.querySelector('Version')?.textContent).toBe(String(item.version));
      }
      // An action selection must retain its parent's complete XML.
      const parent = store.items()[1];
      (fixture.componentInstance as any).selectAction({
        parentId: parent.id, situation: parent, action: parent.messages[0], actionIndex: 0
      });
      fixture.detectChanges();
      expect(element.querySelector('.detail-header')?.textContent).toContain('Publishing action');
      expect(element.querySelector('app-situation-xml code')?.textContent).toContain('<Version>2</Version>');
      xmlCheckbox.click();
      fixture.detectChanges();
      expect(element.querySelector('.xml-pane')).toBeNull();
      expect(element.querySelector('.situation-metadata')).not.toBeNull();
      (fixture.componentInstance as any).updateStage('int');
      fixture.detectChanges();
      expect(store.items()).toEqual([]);
      expect(store.xmlFor(parent)).toBeUndefined();
      expect(element.querySelector('app-situation-xml')).toBeNull();
    });
  }

});
