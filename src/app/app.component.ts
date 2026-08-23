import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BusinessOrganisationService } from './business-organisations';
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
export class AppComponent implements OnInit {
  private readonly siriSxStream = inject(SiriSxStreamService);
  protected readonly businessOrganisations = inject(BusinessOrganisationService);
  protected readonly store = inject(PtSituationStore);

  protected readonly title = 'SIRI-SX Browser';
  protected readonly parseState = signal<ParseState>({ status: 'idle' });
  protected readonly searchTerm = signal('');
  protected readonly language = signal<SupportedLanguage>('de');
  protected readonly operatorFilter = signal('');
  protected readonly causeFilter = signal('');
  protected readonly validationIssuesOnly = signal(false);
  protected readonly activeView = signal<'messages' | 'invalid'>('messages');
  protected readonly invalidSituations = this.siriSxStream.invalidSituations;
  protected readonly contentSizes: readonly TextContentSize[] = ['small', 'medium', 'large'];

  protected readonly textFilteredItems = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const language = this.language();
    if (!query) return this.store.items();

    return this.store.items().filter((item) => [
      item.id,
      item.alertCause,
      item.summary(language),
      item.description(language),
      ...item.affectedOperatorRefs,
      ...item.affectedOperatorRefs.map((ref) =>
        this.businessOrganisations.displayName(ref, language)
      ),
      ...item.affectedLineNames,
      ...item.affectedStopNames
    ].some((value) => value?.toLocaleLowerCase().includes(query)));
  });

  protected readonly facetBaseItems = computed(() => this.validationIssuesOnly()
    ? this.textFilteredItems().filter((item) => item.validationIssues.length > 0)
    : this.textFilteredItems());

  protected readonly operatorFacetItems = computed(() => {
    const cause = this.causeFilter();
    return cause
      ? this.facetBaseItems().filter((item) => item.alertCause === cause)
      : this.facetBaseItems();
  });

  protected readonly causeFacetItems = computed(() => {
    const operator = this.operatorFilter();
    return operator
      ? this.facetBaseItems().filter((item) => item.affectedOperatorRefs.includes(operator))
      : this.facetBaseItems();
  });

  protected readonly operatorOptions = computed(() => {
    const counts = new Map<string, number>();
    const language = this.language();
    for (const item of this.operatorFacetItems()) {
      for (const operator of new Set(item.affectedOperatorRefs)) {
        counts.set(operator, (counts.get(operator) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([ref, situationCount]) => ({
        ref,
        label: this.businessOrganisations.displayName(ref, language),
        situationCount
      }))
      .sort((left, right) => left.label.localeCompare(right.label, language));
  });

  protected readonly causeOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.causeFacetItems()) {
      counts.set(item.alertCause, (counts.get(item.alertCause) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([cause, situationCount]) => ({ cause, situationCount }))
      .sort((left, right) => left.cause.localeCompare(right.cause));
  });

  protected readonly filteredItems = computed(() => {
    const operator = this.operatorFilter();
    const cause = this.causeFilter();
    return this.facetBaseItems().filter((item) =>
      (!operator || item.affectedOperatorRefs.includes(operator))
      && (!cause || item.alertCause === cause)
    );
  });

  public ngOnInit(): void {
    void this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    await this.businessOrganisations.load();
    this.parseFeed();
  }

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
    const selectedOperator = this.operatorFilter();
    if (selectedOperator && !this.operatorOptions().some((option) => option.ref === selectedOperator)) {
      this.operatorFilter.set('');
    }
    const selectedCause = this.causeFilter();
    if (selectedCause && !this.causeOptions().some((option) => option.cause === selectedCause)) {
      this.causeFilter.set('');
    }
  }

  protected updateLanguage(event: Event): void {
    this.language.set((event.target as HTMLSelectElement).value as SupportedLanguage);
  }

  protected updateOperator(event: Event): void {
    this.operatorFilter.set((event.target as HTMLSelectElement).value);
    const selectedCause = this.causeFilter();
    if (selectedCause && !this.causeOptions().some((option) => option.cause === selectedCause)) {
      this.causeFilter.set('');
    }
  }

  protected updateCause(event: Event): void {
    this.causeFilter.set((event.target as HTMLSelectElement).value);
    const selectedOperator = this.operatorFilter();
    if (selectedOperator && !this.operatorOptions().some((option) => option.ref === selectedOperator)) {
      this.operatorFilter.set('');
    }
  }

  protected updateValidationIssuesOnly(event: Event): void {
    this.validationIssuesOnly.set((event.target as HTMLInputElement).checked);
    const selectedOperator = this.operatorFilter();
    if (selectedOperator && !this.operatorOptions().some((option) => option.ref === selectedOperator)) {
      this.operatorFilter.set('');
    }
    const selectedCause = this.causeFilter();
    if (selectedCause && !this.causeOptions().some((option) => option.cause === selectedCause)) {
      this.causeFilter.set('');
    }
  }

  protected operatorName(sboid: string): string {
    return this.businessOrganisations.displayName(sboid, this.language());
  }

  protected operatorCodes(item: PtSituationListItem): string {
    return item.affectedOperatorRefs
      .map((sboid) => this.businessOrganisations.shortName(sboid, this.language()))
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(', ');
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
