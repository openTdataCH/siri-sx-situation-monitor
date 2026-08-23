import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';

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
  selector: 'app-siri-sx-browser',
  imports: [ScrollingModule],
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
  protected readonly actionCountFilter = signal<number | null>(null);
  protected readonly scopeTypeFilter = signal('');
  protected readonly validationIssuesOnly = signal(false);
  protected readonly activeView = signal<'messages' | 'invalid'>('messages');
  protected readonly selectedAction = signal<ActionSelection | null>(null);
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
    const actionCount = this.actionCountFilter();
    const scopeType = this.scopeTypeFilter();
    return this.facetBaseItems().filter((item) =>
      (!cause || item.alertCause === cause)
      && (actionCount === null || item.messages.length === actionCount)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
    );
  });

  protected readonly causeFacetItems = computed(() => {
    const operator = this.operatorFilter();
    const actionCount = this.actionCountFilter();
    const scopeType = this.scopeTypeFilter();
    return this.facetBaseItems().filter((item) =>
      (!operator || item.affectedOperatorRefs.includes(operator))
      && (actionCount === null || item.messages.length === actionCount)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
    );
  });

  protected readonly actionCountFacetItems = computed(() => {
    const operator = this.operatorFilter();
    const cause = this.causeFilter();
    const scopeType = this.scopeTypeFilter();
    return this.facetBaseItems().filter((item) =>
      (!operator || item.affectedOperatorRefs.includes(operator))
      && (!cause || item.alertCause === cause)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
    );
  });

  protected readonly scopeTypeFacetItems = computed(() => {
    const operator = this.operatorFilter();
    const cause = this.causeFilter();
    const actionCount = this.actionCountFilter();
    return this.facetBaseItems().filter((item) =>
      (!operator || item.affectedOperatorRefs.includes(operator))
      && (!cause || item.alertCause === cause)
      && (actionCount === null || item.messages.length === actionCount)
    );
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

  protected readonly actionCountOptions = computed(() => {
    const counts = new Map<number, number>();
    for (const item of this.actionCountFacetItems()) {
      counts.set(item.messages.length, (counts.get(item.messages.length) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([actionCount, situationCount]) => ({ actionCount, situationCount }))
      .sort((left, right) => left.actionCount - right.actionCount);
  });

  protected readonly scopeTypeOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.scopeTypeFacetItems()) {
      for (const scopeType of new Set(item.messages.map((action) => action.scopeType))) {
        counts.set(scopeType, (counts.get(scopeType) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([scopeType, situationCount]) => ({ scopeType, situationCount }))
      .sort((left, right) => left.scopeType.localeCompare(right.scopeType));
  });

  protected readonly filteredItems = computed(() => {
    const operator = this.operatorFilter();
    const cause = this.causeFilter();
    const actionCount = this.actionCountFilter();
    const scopeType = this.scopeTypeFilter();
    return this.facetBaseItems().filter((item) =>
      (!operator || item.affectedOperatorRefs.includes(operator))
      && (!cause || item.alertCause === cause)
      && (actionCount === null || item.messages.length === actionCount)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
    );
  });

  protected readonly resultRows = computed<SituationResultRow[]>(() =>
    this.filteredItems().flatMap((situation) => [
      {
        kind: 'situation' as const,
        key: `situation:${situation.id}`,
        situation
      },
      ...situation.messages.map((action, actionIndex) => ({
        kind: 'publishing-action' as const,
        key: `action:${situation.id}:${action.actionRef}:${actionIndex}`,
        parentId: situation.id,
        situation,
        action,
        actionIndex
      }))
    ])
  );

  protected readonly selectedActionView = computed(() => {
    const selection = this.selectedAction();
    if (!selection) return undefined;
    const situation = this.store.items().find((item) => item.id === selection.parentId);
    const action = situation?.messages[selection.actionIndex];
    return situation && action?.actionRef === selection.actionRef
      ? { situation, action }
      : undefined;
  });

  protected readonly detailMessages = computed(() => {
    const selectedAction = this.selectedActionView();
    return selectedAction ? [selectedAction.action] : (this.store.selected()?.messages ?? []);
  });

  private readonly synchronizeFilteredSelection = effect(() => {
    const items = this.filteredItems();
    const selectedId = this.store.selectedId();
    if (selectedId && items.some((item) => item.id === selectedId)) return;

    this.store.select(items[0]?.id ?? null);
    this.selectedAction.set(null);
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
    this.reconcileFacetSelections();
  }

  protected updateLanguage(event: Event): void {
    this.language.set((event.target as HTMLSelectElement).value as SupportedLanguage);
  }

  protected updateOperator(event: Event): void {
    this.operatorFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updateCause(event: Event): void {
    this.causeFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updateActionCount(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.actionCountFilter.set(value === '' ? null : Number(value));
    this.reconcileFacetSelections();
  }

  protected updateScopeType(event: Event): void {
    this.scopeTypeFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updateValidationIssuesOnly(event: Event): void {
    this.validationIssuesOnly.set((event.target as HTMLInputElement).checked);
    this.reconcileFacetSelections();
  }

  private reconcileFacetSelections(): void {
    for (let pass = 0; pass < 3; pass += 1) {
      let changed = false;
      const operator = this.operatorFilter();
      if (operator && !this.operatorOptions().some((option) => option.ref === operator)) {
        this.operatorFilter.set('');
        changed = true;
      }

      const cause = this.causeFilter();
      if (cause && !this.causeOptions().some((option) => option.cause === cause)) {
        this.causeFilter.set('');
        changed = true;
      }

      const actionCount = this.actionCountFilter();
      if (actionCount !== null
        && !this.actionCountOptions().some((option) => option.actionCount === actionCount)) {
        this.actionCountFilter.set(null);
        changed = true;
      }

      const scopeType = this.scopeTypeFilter();
      if (scopeType
        && !this.scopeTypeOptions().some((option) => option.scopeType === scopeType)) {
        this.scopeTypeFilter.set('');
        changed = true;
      }

      if (!changed) return;
    }
  }

  protected operatorName(sboid: string): string {
    return this.businessOrganisations.displayName(sboid, this.language());
  }

  protected operatorAtlasUrl(sboid: string): string {
    return `https://atlas.app.sbb.ch/business-organisation-directory/business-organisations/${sboid}`;
  }

  protected operatorCodes(item: PtSituationListItem): string {
    return item.affectedOperatorRefs
      .map((sboid) => this.businessOrganisations.shortName(sboid, this.language()))
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(', ');
  }

  protected select(item: PtSituationListItem): void {
    this.store.select(item.id);
    this.selectedAction.set(null);
  }

  protected selectAction(row: PublishingActionResultRow): void {
    this.store.select(row.parentId);
    this.selectedAction.set({
      parentId: row.parentId,
      actionRef: row.action.actionRef,
      actionIndex: row.actionIndex
    });
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

  protected actionSummary(action: PassengerMessageView): string {
    for (const size of ['medium', 'small', 'large'] as const) {
      const summary = action.content[size]?.summary;
      const value = summary ? localizedValue(summary, this.language()) : undefined;
      if (value) return value;
    }
    return action.actionRef;
  }

  protected isActionSelected(row: PublishingActionResultRow): boolean {
    const selected = this.selectedAction();
    return selected?.parentId === row.parentId
      && selected.actionRef === row.action.actionRef
      && selected.actionIndex === row.actionIndex;
  }

  protected formatPeriod(periods: readonly { start: Date; end: Date }[]): string {
    if (periods.length === 0) return 'No period';
    const start = periods.reduce((value, period) => period.start < value ? period.start : value, periods[0].start);
    const end = periods.reduce((value, period) => period.end > value ? period.end : value, periods[0].end);
    return `${start.toLocaleString()} – ${end.toLocaleString()}`;
  }

  protected readonly trackItem = (_index: number, item: PtSituationListItem): string => item.id;
  protected readonly trackResultRow = (_index: number, row: SituationResultRow): string => row.key;
}

interface SituationParentResultRow {
  kind: 'situation';
  key: string;
  situation: PtSituationListItem;
}

interface PublishingActionResultRow {
  kind: 'publishing-action';
  key: string;
  parentId: string;
  situation: PtSituationListItem;
  action: PassengerMessageView;
  actionIndex: number;
}

type SituationResultRow = SituationParentResultRow | PublishingActionResultRow;

interface ActionSelection {
  parentId: string;
  actionRef: string;
  actionIndex: number;
}

interface ParseState {
  status: 'idle' | 'loading' | 'success' | 'error';
  situationCount?: number;
  invalidSituationCount?: number;
  validationIssueCount?: number;
  message?: string;
}
