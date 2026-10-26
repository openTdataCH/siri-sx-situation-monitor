import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { AppComponent } from './app.component';
import { BusinessOrganisationService } from './business-organisations';
import { SiriSxStreamService } from './siri-sx/services';

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
});
