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
