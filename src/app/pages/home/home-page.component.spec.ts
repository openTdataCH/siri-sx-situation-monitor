import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { LocalizedText, PtSituation, PublishingAction } from '../../siri-sx/models';
import { SiriSxStreamService } from '../../siri-sx/services';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  it('shows an error and does not stream without an owner parameter', async () => {
    const streamSituations = jasmine.createSpy('streamSituations');
    await configure(undefined, streamSituations);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect(streamSituations).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent)
      .toContain('Missing required owner query parameter');
  });

  it('renders one card per action belonging to the requested owner', async () => {
    const situation = {
      id: 'situation-1',
      version: 1,
      publishingActions: [
        action('wanted-owner', 'Wanted message'),
        action('another-owner', 'Other message')
      ]
    } as unknown as PtSituation;
    const streamSituations = jasmine.createSpy('streamSituations').and.returnValue(of(
      { type: 'situation' as const, situation, index: 1 },
      { type: 'complete' as const, count: 1, validCount: 1, invalidCount: 0 }
    ));
    await configure('wanted-owner', streamSituations);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.message-card');

    expect(streamSituations).toHaveBeenCalledOnceWith('wanted-owner', 'prod');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Wanted message');
    expect(cards[0].textContent).not.toContain('Other message');
  });

  it('shows an unplanned badge after the title', async () => {
    const situation = {
      id: 'unplanned-situation',
      version: 1,
      planned: false,
      publishingActions: [action('wanted-owner', 'Unplanned message')]
    } as unknown as PtSituation;
    const streamSituations = completedStream(situation);
    await configure('wanted-owner', streamSituations);

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const title = (fixture.nativeElement as HTMLElement).querySelector('.card-title');
    expect(title?.textContent).toContain('Unplanned message');
    expect(title?.querySelector('.badge')?.textContent).toContain('Unplanned');
  });

  it('uses the requested language', async () => {
    const situation = situationWithLocalizedAction();
    const streamSituations = completedStream(situation);
    await configure('wanted-owner', streamSituations, 'fr');

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.message-card')?.textContent)
      .toContain('Message français');
  });

  for (const lang of [undefined, 'invalid']) {
    it(`defaults to German when lang is ${lang ?? 'missing'}`, async () => {
      const situation = situationWithLocalizedAction();
      const streamSituations = completedStream(situation);
      await configure('wanted-owner', streamSituations, lang);

      const fixture = TestBed.createComponent(HomePageComponent);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('.message-card')?.textContent)
            .toContain('Deutsche Nachricht');
    });
  }

  it('uses the requested passenger text size', async () => {
    const situation = situationWithTextSizes();
    const streamSituations = completedStream(situation);
    await configure('wanted-owner', streamSituations, 'de', 'medium');

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    const card = (fixture.nativeElement as HTMLElement).querySelector('.message-card');
    expect(card?.textContent).toContain('Mittlere Nachricht');
    expect(card?.textContent).not.toContain('Grosse Nachricht');
  });

  for (const textSize of [undefined, 'invalid']) {
    it(`defaults to large when text_size is ${textSize ?? 'missing'}`, async () => {
      const situation = situationWithTextSizes();
      const streamSituations = completedStream(situation);
      await configure('wanted-owner', streamSituations, 'de', textSize);

      const fixture = TestBed.createComponent(HomePageComponent);
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('.message-card')?.textContent)
        .toContain('Grosse Nachricht');
    });
  }

  it('localizes the empty result message', async () => {
    const streamSituations = jasmine.createSpy('streamSituations').and.returnValue(of(
      { type: 'complete' as const, count: 0, validCount: 0, invalidCount: 0 }
    ));
    await configure('wanted-owner', streamSituations, 'it');

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Nessun messaggio trovato');
  });

  it('localizes the loading message', async () => {
    const streamSituations = jasmine.createSpy('streamSituations').and.returnValue(of());
    await configure('wanted-owner', streamSituations, 'fr');

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent)
      .toContain('Chargement des messages…');
  });

  it('uses the requested INT stage case-insensitively', async () => {
    const streamSituations = jasmine.createSpy('streamSituations').and.returnValue(of(
      { type: 'complete' as const, count: 0, validCount: 0, invalidCount: 0 }
    ));
    await configure('wanted-owner', streamSituations, 'de', 'large', 'INT');

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect(streamSituations).toHaveBeenCalledOnceWith('wanted-owner', 'int');
  });

  it('rejects an invalid stage without starting the stream', async () => {
    const streamSituations = jasmine.createSpy('streamSituations');
    await configure('wanted-owner', streamSituations, 'de', 'large', 'test');

    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    expect(streamSituations).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent)
      .toContain('Invalid stage query parameter');
  });
});

async function configure(
  owner: string | undefined,
  streamSituations: jasmine.Spy,
  lang?: string,
  textSize?: string,
  stage?: string
): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [HomePageComponent],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap({
              ...(owner === undefined ? {} : { owner }),
              ...(lang === undefined ? {} : { lang }),
              ...(textSize === undefined ? {} : { text_size: textSize }),
              ...(stage === undefined ? {} : { stage })
            })
          }
        }
      },
      {
        provide: SiriSxStreamService,
        useValue: { streamSituations }
      }
    ]
  }).compileComponents();
}

function situationWithLocalizedAction(): PtSituation {
  return {
    id: 'localized-situation',
    version: 1,
    publishingActions: [action('wanted-owner', {
      de: 'Deutsche Nachricht',
      fr: 'Message français'
    })]
  } as unknown as PtSituation;
}

function completedStream(situation: PtSituation): jasmine.Spy {
  return jasmine.createSpy('streamSituations').and.returnValue(of(
    { type: 'situation' as const, situation, index: 1 },
    { type: 'complete' as const, count: 1, validCount: 1, invalidCount: 0 }
  ));
}

function situationWithTextSizes(): PtSituation {
  const base = action('wanted-owner', { de: 'Grosse Nachricht' });
  return {
    id: 'sized-situation',
    version: 1,
    publishingActions: [{
      ...base,
      content: {
        ...base.content,
        medium: {
          ...base.content.large!,
          summary: { de: 'Mittlere Nachricht' }
        }
      }
    }]
  } as unknown as PtSituation;
}

function action(ownerRef: string, summary: string | LocalizedText): PublishingAction {
  const localized: LocalizedText = typeof summary === 'string' ? { en: summary } : summary;
  return {
    actionRef: `${ownerRef}-action`,
    ownerRef,
    recordedAtTime: new Date(),
    scopeType: 'line',
    perspectives: [],
    publicationWindows: [],
    content: {
      large: {
        summary: localized,
        reason: {},
        duration: {},
        description: {},
        consequence: {},
        recommendation: {},
        remark: {},
        infoLinks: []
      }
    },
    affects: []
  };
}
