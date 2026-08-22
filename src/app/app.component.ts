import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SiriSxStreamService } from './siri-sx/services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly siriSxStream = inject(SiriSxStreamService);

  protected readonly title = 'SIRI-SX Browser';
  protected readonly parseState = signal<ParseState>({ status: 'idle' });

  protected parseMock(): void {
    this.parseState.set({
      status: 'loading',
      situationCount: 0,
      invalidSituationCount: 0,
      validationIssueCount: 0
    });

    this.siriSxStream.streamSituations().subscribe({
      next: (event) => {
        if (event.type === 'situation') {
          this.parseState.update((state) => ({
            status: 'loading',
            situationCount: event.index,
            invalidSituationCount: state.invalidSituationCount ?? 0,
            validationIssueCount:
              (state.validationIssueCount ?? 0) + event.situation.validationIssues.length
          }));
        } else if (event.type === 'invalid-situation') {
          this.parseState.update((state) => ({
            ...state,
            status: 'loading',
            situationCount: event.invalid.index,
            invalidSituationCount: (state.invalidSituationCount ?? 0) + 1
          }));
        } else {
          this.parseState.update((state) => ({
            status: 'success',
            situationCount: event.validCount,
            invalidSituationCount: event.invalidCount,
            validationIssueCount: state.validationIssueCount ?? 0
          }));
        }
      },
      error: (error: unknown) => {
        this.parseState.set({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to parse the SIRI-SX response.'
        });
      }
    });
  }
}

interface ParseState {
  status: 'idle' | 'loading' | 'success' | 'error';
  situationCount?: number;
  invalidSituationCount?: number;
  validationIssueCount?: number;
  message?: string;
}
