import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  LocalizedText,
  PassengerMessageView,
  PassengerTextContent,
  PtSituationListItem,
  SupportedLanguage,
  TextContentSize,
  localizedValue
} from './siri-sx/models';
import { PtSituationStore, SiriSxStreamService } from './siri-sx/services';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ScrollingModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private readonly siriSxStream = inject(SiriSxStreamService);
  protected readonly store = inject(PtSituationStore);

  protected readonly title = 'SIRI-SX Browser';
  protected readonly parseState = signal<ParseState>({ status: 'idle' });
  protected readonly searchTerm = signal('');
  protected readonly language = signal<SupportedLanguage>('de');
  protected readonly activeView = signal<'messages' | 'invalid'>('messages');
  protected readonly invalidSituations = this.siriSxStream.invalidSituations;
  protected readonly contentSizes: readonly TextContentSize[] = ['small', 'medium', 'large'];

  protected readonly filteredItems = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const language = this.language();
    if (!query) return this.store.items();

    return this.store.items().filter((item) => [
      item.id,
      item.alertCause,
      item.summary(language),
      item.description(language),
      ...item.affectedLineNames,
      ...item.affectedStopNames
    ].some((value) => value?.toLocaleLowerCase().includes(query)));
  });

  protected parseFeed(): void {
    this.store.reset();
    this.activeView.set('messages');
    this.parseState.set({
      status: 'loading',
      situationCount: 0,
      invalidSituationCount: 0,
      validationIssueCount: 0
    });

    this.siriSxStream.streamSituations().subscribe({
      next: (event) => {
        if (event.type === 'situation') {
          this.store.enqueue(event.situation);
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
          this.store.flush();
          this.parseState.update((state) => ({
            status: 'success',
            situationCount: event.validCount,
            invalidSituationCount: event.invalidCount,
            validationIssueCount: state.validationIssueCount ?? 0
          }));
        }
      },
      error: (error: unknown) => {
        this.store.flush();
        this.parseState.set({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to parse the SIRI-SX response.'
        });
      }
    });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateLanguage(event: Event): void {
    this.language.set((event.target as HTMLSelectElement).value as SupportedLanguage);
  }

  protected select(item: PtSituationListItem): void {
    this.store.select(item.id);
  }

  protected summary(item: PtSituationListItem): string {
    return item.summary(this.language());
  }

  protected description(item: PtSituationListItem): string | undefined {
    return item.description(this.language());
  }

  protected localized(text: LocalizedText | undefined): string | undefined {
    return text ? localizedValue(text, this.language()) : undefined;
  }

  protected messageContent(
    message: PassengerMessageView,
    size: TextContentSize
  ): PassengerTextContent | undefined {
    return message.content[size];
  }

  protected formatPeriod(periods: readonly { start: Date; end: Date }[]): string {
    if (periods.length === 0) return 'No period';
    const start = periods.reduce((value, period) => period.start < value ? period.start : value, periods[0].start);
    const end = periods.reduce((value, period) => period.end > value ? period.end : value, periods[0].end);
    return `${start.toLocaleString()} – ${end.toLocaleString()}`;
  }

  protected readonly trackItem = (_index: number, item: PtSituationListItem): string => item.id;
}

interface ParseState {
  status: 'idle' | 'loading' | 'success' | 'error';
  situationCount?: number;
  invalidSituationCount?: number;
  validationIssueCount?: number;
  message?: string;
}
